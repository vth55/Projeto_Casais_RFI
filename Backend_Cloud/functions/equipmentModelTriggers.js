/**
 * Triggers Firestore para manter equipment_models.unitCount / activeUnitCount
 * sincronizados com tools (pivot 2026-05).
 *
 * Cache denormalizado:
 * - unitCount: total de tools que referenciam o modelId
 * - activeUnitCount: total excluindo tools com status RETIRED
 *
 * Sem estes triggers, o cliente teria de agregar em runtime — viável para
 * <500 unidades mas degrada com escala. Os triggers garantem consistência
 * O(1) na leitura do catálogo.
 */

const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

const APP_ID = process.env.GCLOUD_PROJECT || 'casais-rfid';
const TOOLS_PATH = `artifacts/${APP_ID}/public/data/tools`;
const MODELS_PATH = `artifacts/${APP_ID}/public/data/equipment_models`;

async function recomputeModelCounts(modelId) {
  if (!modelId) return;
  const db = admin.firestore();
  const toolsSnap = await db.collection(TOOLS_PATH).where('modelId', '==', modelId).get();
  const tools = toolsSnap.docs.map(d => d.data());
  const unitCount = tools.length;
  const activeUnitCount = tools.filter(t => t.status !== 'RETIRED').length;
  await db.collection(MODELS_PATH).doc(modelId).update({
    unitCount,
    activeUnitCount,
    updatedAt: admin.firestore.Timestamp.now(),
  }).catch(err => {
    // Se o model não existe, ignorar (tool órfão)
    if (err.code !== 5 /* NOT_FOUND */) throw err;
  });
}

exports.onToolCreated = onDocumentCreated(`${TOOLS_PATH}/{toolId}`, async (event) => {
  const data = event.data?.data();
  if (data?.modelId) {
    await recomputeModelCounts(data.modelId);
  }
});

exports.onToolDeleted = onDocumentDeleted(`${TOOLS_PATH}/{toolId}`, async (event) => {
  const data = event.data?.data();
  if (data?.modelId) {
    await recomputeModelCounts(data.modelId);
  }
});

exports.onToolUpdated = onDocumentUpdated(`${TOOLS_PATH}/{toolId}`, async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;
  // Recompute se modelId mudou (rebranding) ou se status mudou para/de RETIRED
  const modelChanged = before.modelId !== after.modelId;
  const retirementChanged = (before.status === 'RETIRED') !== (after.status === 'RETIRED');
  if (modelChanged) {
    if (before.modelId) await recomputeModelCounts(before.modelId);
    if (after.modelId) await recomputeModelCounts(after.modelId);
  } else if (retirementChanged && after.modelId) {
    await recomputeModelCounts(after.modelId);
  }
});
