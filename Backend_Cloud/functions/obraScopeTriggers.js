'use strict';

/**
 * obraScopeTriggers.js — mantém obraScopeIds em tool_movements e tool_transfers
 *
 * Dois triggers independentes do SAP. Calculam e escrevem obraScopeIds apenas
 * quando o campo está ausente ou desactualizado (no-op check evita loop infinito).
 *
 * Separado de sapTransferBridge.js de propósito: não mistura lógica SAP com RBAC.
 * O trigger SAP (onToolTransferWritten) continua inalterado.
 */

const admin = require('firebase-admin');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { buildObraScopeIds, scopeIsUpToDate, SCOPE_VERSION } = require('./obraScope');

const APP_ID = process.env.GCLOUD_PROJECT || 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;
const MOVEMENTS_PATH = `${BASE}/tool_movements`;
const TRANSFERS_PATH = `${BASE}/tool_transfers`;

const REGION = 'europe-west1';

/**
 * Builds the Firestore update payload for scope fields.
 * @param {string[]} obraScopeIds
 * @returns {Object}
 */
function buildScopeUpdate(obraScopeIds) {
  return {
    obraScopeIds,
    scopeVersion: SCOPE_VERSION,
    scopeUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Trigger: tool_movements — sincroniza obraScopeIds em cada create/update.
 * No-op se scope já está correcto (evita loop infinito).
 */
exports.onToolMovementWritten = onDocumentWritten(
  { document: `${MOVEMENTS_PATH}/{movementId}`, region: REGION },
  async (event) => {
    const afterSnap = event.data?.after;
    if (!afterSnap?.exists) return;  // delete — ignorar

    const afterData = afterSnap.data();
    const expectedScope = buildObraScopeIds(afterData);

    if (scopeIsUpToDate(afterData, expectedScope)) return;

    await afterSnap.ref.update(buildScopeUpdate(expectedScope));
    console.log(`[obraScope] movement ${event.params.movementId}: scope=${JSON.stringify(expectedScope)}`);
  },
);

/**
 * Trigger: tool_transfers — sincroniza obraScopeIds em cada create/update.
 * Separado do onToolTransferWritten (SAP) — não interfere com a queue SAP.
 * No-op se scope já está correcto.
 */
exports.onToolTransferScopeSync = onDocumentWritten(
  { document: `${TRANSFERS_PATH}/{transferId}`, region: REGION },
  async (event) => {
    const afterSnap = event.data?.after;
    if (!afterSnap?.exists) return;  // delete — ignorar

    const afterData = afterSnap.data();
    const expectedScope = buildObraScopeIds(afterData);

    if (scopeIsUpToDate(afterData, expectedScope)) return;

    await afterSnap.ref.update(buildScopeUpdate(expectedScope));
    console.log(`[obraScope] transfer ${event.params.transferId}: scope=${JSON.stringify(expectedScope)}`);
  },
);

exports.__test = {
  buildScopeUpdate,
};
