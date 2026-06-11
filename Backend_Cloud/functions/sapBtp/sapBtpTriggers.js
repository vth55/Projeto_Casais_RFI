'use strict';

/**
 * sapBtpTriggers.js — Cloud Function triggers que ligam eventos Firestore ao SAP BTP.
 *
 * onToolMaintenanceCreated: quando tool_maintenance criado com type DAMAGE/FAULT/etc,
 * sincroniza para SAP BTP FaultReports de forma não-fatal.
 *
 * SAP_BTP_ENABLED=false por defeito — sem esta flag, nenhuma chamada HTTP é feita.
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { syncDamageReportToSapBtp } = require('./sapBtpBridge');

const APP_ID = process.env.GCLOUD_PROJECT || 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;
const TOOL_MAINTENANCE_PATH = `${BASE}/tool_maintenance`;

const DAMAGE_TYPES = new Set(['DAMAGE', 'FAULT', 'BREAKDOWN', 'AVARIA']);

/**
 * Trigger: onDocumentCreated em tool_maintenance.
 * Só sincroniza tipos de avaria (DAMAGE/FAULT/BREAKDOWN/AVARIA) — não manutenção preventiva.
 * Usa toolCode se disponível; fallback para toolId como identificador.
 * Non-fatal: falhas do BTP nunca quebram o trigger.
 */
exports.onToolMaintenanceCreated = onDocumentCreated(
  { document: `${TOOL_MAINTENANCE_PATH}/{maintenanceId}`, region: 'europe-west1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const typeUpper = (data.type || '').toUpperCase();
    if (!DAMAGE_TYPES.has(typeUpper)) {
      console.log(`[sapBtpTriggers] ${event.params.maintenanceId}: type=${data.type} skipped (not a damage type)`);
      return;
    }

    const toolCode = data.toolCode || data.toolId;
    if (!toolCode) {
      console.warn(`[sapBtpTriggers] ${event.params.maintenanceId}: sem toolCode/toolId — BTP sync ignorado`);
      return;
    }

    console.log(`[sapBtpTriggers] onToolMaintenanceCreated: ${event.params.maintenanceId} type=${data.type} tool=${toolCode}`);

    syncDamageReportToSapBtp({
      tool: { code: toolCode },
      maintenance: {
        type: data.type || 'DAMAGE',
        description: data.description || data.notes || '',
        reportedAt: data.reportedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
      operator: {
        name: data.operatorName || data.reportedBy || data.operatorId || 'unknown',
      },
    }).catch(err => console.warn('[sapBtpTriggers] damage sync non-fatal:', err.message));
  }
);

exports.__test = { DAMAGE_TYPES, TOOL_MAINTENANCE_PATH };
