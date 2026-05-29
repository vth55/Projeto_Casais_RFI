/**
 * Firestore triggers for keeping equipment_models.unitCount / activeUnitCount
 * synchronized with tools (pivot 2026-05).
 *
 * Denormalized cache:
 * - unitCount: total tools referencing the modelId
 * - activeUnitCount: total tools excluding status RETIRED
 */

const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

const APP_ID = process.env.GCLOUD_PROJECT || 'casais-rfid';
const TOOLS_PATH = `artifacts/${APP_ID}/public/data/tools`;
const MODELS_PATH = `artifacts/${APP_ID}/public/data/equipment_models`;

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
    await recomputeModelCounts(data.modelId);
  } else {
    console.warn(`[equipmentModelTriggers] Tool ${event.params.toolId} created without modelId`);
  }
});

exports.onToolDeleted = onDocumentDeleted(`${TOOLS_PATH}/{toolId}`, async (event) => {
  const data = event.data?.data();
  if (data?.modelId) {
    await recomputeModelCounts(data.modelId);
  } else {
    console.warn(`[equipmentModelTriggers] Tool ${event.params.toolId} deleted without modelId`);
  }
});

exports.onToolUpdated = onDocumentUpdated(`${TOOLS_PATH}/{toolId}`, async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;

  const modelChanged = before.modelId !== after.modelId;
  const retirementChanged = (before.status === 'RETIRED') !== (after.status === 'RETIRED');

  if (modelChanged) {
    if (before.modelId) await recomputeModelCounts(before.modelId);
    else console.warn(`[equipmentModelTriggers] Tool ${event.params.toolId} had no previous modelId`);

    if (after.modelId) await recomputeModelCounts(after.modelId);
    else console.warn(`[equipmentModelTriggers] Tool ${event.params.toolId} updated without modelId`);
  } else if (retirementChanged && after.modelId) {
    await recomputeModelCounts(after.modelId);
  } else if (retirementChanged) {
    console.warn(`[equipmentModelTriggers] Tool ${event.params.toolId} changed retirement status without modelId`);
  }
});
