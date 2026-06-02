/**
 * Firestore triggers for keeping equipment_models.unitCount / activeUnitCount
 * synchronized with tools (pivot 2026-05).
 *
 * Denormalized cache:
 * - unitCount: total tools referencing the modelId
 * - activeUnitCount: total tools excluding status RETIRED
 *
 * Eventos individuais aplicam deltas idempotentes com FieldValue.increment.
 * reconcileUnitCounts (scheduled) continua como rede de seguranca para corrigir
 * dados antigos ou falhas operacionais sem recriar estado.
 */

const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

const APP_ID = process.env.GCLOUD_PROJECT || 'casais-rfid';
const TOOLS_PATH = `artifacts/${APP_ID}/public/data/tools`;
const MODELS_PATH = `artifacts/${APP_ID}/public/data/equipment_models`;
const COUNTER_EVENTS_PATH = `artifacts/${APP_ID}/public/data/equipment_model_counter_events`;

function buildCounterDeltas(before, after) {
  const deltas = new Map();

  const addDelta = (tool, multiplier) => {
    if (!tool?.modelId) return;
    const current = deltas.get(tool.modelId) || { unitCount: 0, activeUnitCount: 0 };
    current.unitCount += multiplier;
    if (tool.status !== 'RETIRED') current.activeUnitCount += multiplier;
    deltas.set(tool.modelId, current);
  };

  addDelta(before, -1);
  addDelta(after, 1);

  return [...deltas.entries()]
    .map(([modelId, delta]) => ({ modelId, ...delta }))
    .filter(delta => delta.unitCount || delta.activeUnitCount);
}

async function applyCounterEvent(eventId, deltas) {
  if (!eventId || !deltas.length) return;

  const db = admin.firestore();
  const eventRef = db.collection(COUNTER_EVENTS_PATH).doc(String(eventId).replaceAll('/', '_'));
  const modelRefs = deltas.map(delta => db.collection(MODELS_PATH).doc(delta.modelId));

  await db.runTransaction(async transaction => {
    const eventSnap = await transaction.get(eventRef);
    if (eventSnap.exists) return;

    const modelSnaps = await transaction.getAll(...modelRefs);
    const missingModelIds = [];

    modelSnaps.forEach((modelSnap, index) => {
      const delta = deltas[index];
      if (!modelSnap.exists) {
        missingModelIds.push(delta.modelId);
        return;
      }

      transaction.update(modelSnap.ref, {
        unitCount: admin.firestore.FieldValue.increment(delta.unitCount),
        activeUnitCount: admin.firestore.FieldValue.increment(delta.activeUnitCount),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });

    transaction.create(eventRef, {
      eventId,
      deltas,
      missingModelIds,
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (missingModelIds.length) {
      console.warn(`[equipmentModelTriggers] Missing models for counter event ${eventId}: ${missingModelIds.join(', ')}`);
    }
  });
}

async function recomputeModelCounts(modelId) {
  if (!modelId) {
    console.warn('[equipmentModelTriggers] Ignored recompute without modelId');
    return;
  }

  const db = admin.firestore();
  const modelRef = db.collection(MODELS_PATH).doc(modelId);
  const modelSnap = await modelRef.get();
  if (!modelSnap.exists) {
    console.warn(`[equipmentModelTriggers] Model ${modelId} not found; cannot update unit counters`);
    return;
  }

  const toolsSnap = await db.collection(TOOLS_PATH).where('modelId', '==', modelId).get();
  const tools = toolsSnap.docs.map(d => d.data());
  const unitCount = tools.length;
  const activeUnitCount = tools.filter(t => t.status !== 'RETIRED').length;

  await modelRef.update({
    unitCount,
    activeUnitCount,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

exports.onToolCreated = onDocumentCreated(`${TOOLS_PATH}/{toolId}`, async (event) => {
  const data = event.data?.data();
  if (data?.modelId) {
    await applyCounterEvent(event.id, buildCounterDeltas(null, data));
  } else {
    console.warn(`[equipmentModelTriggers] Tool ${event.params.toolId} created without modelId`);
  }
});

exports.onToolDeleted = onDocumentDeleted(`${TOOLS_PATH}/{toolId}`, async (event) => {
  const data = event.data?.data();
  if (data?.modelId) {
    await applyCounterEvent(event.id, buildCounterDeltas(data, null));
  } else {
    console.warn(`[equipmentModelTriggers] Tool ${event.params.toolId} deleted without modelId`);
  }
});

exports.onToolUpdated = onDocumentUpdated(`${TOOLS_PATH}/{toolId}`, async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;

  const deltas = buildCounterDeltas(before, after);
  if (deltas.length) {
    await applyCounterEvent(event.id, deltas);
  } else if ((before.status === 'RETIRED') !== (after.status === 'RETIRED') && !after.modelId) {
    console.warn(`[equipmentModelTriggers] Tool ${event.params.toolId} changed retirement status without modelId`);
  }
});

// ──────────────────────────────────────────────────────────
// Scheduled: reconcileUnitCounts
// Corre uma vez por dia às 23:00 UTC.
// Fonte de verdade: recomputeModelCounts (não FieldValue.increment).
// Idempotente — correr duas vezes não causa problemas.
// ──────────────────────────────────────────────────────────
exports.reconcileUnitCounts = onSchedule(
  {
    schedule: '0 23 * * *',   // todos os dias às 23:00 UTC
    timeZone: 'UTC',
    region: 'europe-west1',
  },
  async (_event) => {
    const db = admin.firestore();
    const modelsSnap = await db.collection(MODELS_PATH).get();

    if (modelsSnap.empty) {
      console.log('[reconcileUnitCounts] Nenhum modelo encontrado — nada a reconciliar.');
      return;
    }

    let fixed = 0;
    let checked = 0;
    const log = [];

    for (const modelDoc of modelsSnap.docs) {
      const modelId = modelDoc.id;
      const modelData = modelDoc.data();
      checked++;

      // Contar tools por modelId no Firestore
      const toolsSnap = await db.collection(TOOLS_PATH)
        .where('modelId', '==', modelId)
        .get();

      const tools = toolsSnap.docs.map(d => d.data());
      const expectedUnitCount = tools.length;
      const expectedActiveUnitCount = tools.filter(t => t.status !== 'RETIRED').length;

      const currentUnitCount = modelData.unitCount ?? null;
      const currentActiveUnitCount = modelData.activeUnitCount ?? null;

      const needsFix =
        currentUnitCount !== expectedUnitCount ||
        currentActiveUnitCount !== expectedActiveUnitCount;

      const entry = {
        modelId,
        expected: { unitCount: expectedUnitCount, activeUnitCount: expectedActiveUnitCount },
        actual:   { unitCount: currentUnitCount,  activeUnitCount: currentActiveUnitCount },
        fixed: needsFix,
      };
      log.push(entry);

      if (needsFix) {
        await modelDoc.ref.update({
          unitCount: expectedUnitCount,
          activeUnitCount: expectedActiveUnitCount,
          updatedAt: admin.firestore.Timestamp.now(),
        });
        fixed++;
        console.log(`[reconcileUnitCounts] Fixed ${modelId}: unitCount ${currentUnitCount}→${expectedUnitCount}, activeUnitCount ${currentActiveUnitCount}→${expectedActiveUnitCount}`);
      }
    }

    console.log(`[reconcileUnitCounts] Done — checked: ${checked}, fixed: ${fixed}`);
    console.log('[reconcileUnitCounts] Detail:', JSON.stringify(log));
    return { checked, fixed, log };
  }
);

exports.__test = {
  buildCounterDeltas,
  applyCounterEvent,
};
