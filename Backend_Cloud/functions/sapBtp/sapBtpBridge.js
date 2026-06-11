'use strict';

/**
 * SAP BTP Bridge — mapeamento PWA Firestore → SAP BTP OData.
 *
 * Este módulo traduz eventos do domínio PWA (tool_sessions, damage reports,
 * transfers) para chamadas ao sapBtpClient. NÃO regista triggers — é chamado
 * explicitamente a partir de Cloud Functions quando SAP_BTP_ENABLED=true.
 *
 * Quando a flag está desligada, todas as funções retornam { skipped: true }
 * sem nenhuma chamada HTTP (comportamento seguro por defeito).
 */

const {
  getEquipmentByCode,
  patchEquipmentById,
  patchEquipmentByCode,
  createFaultReport,
  createMovement,
} = require('./sapBtpClient');

// Mapeamento de status PWA → BTP
const STATUS_MAP = {
  available: 'AVAILABLE',
  in_use: 'IN_USE',
  session_active: 'IN_USE',
  maintenance: 'MAINTENANCE',
  damage: 'MAINTENANCE',
  transfer: 'IN_TRANSFER',
};

function mapStatus(pwaStatus) {
  return STATUS_MAP[pwaStatus?.toLowerCase()] || 'AVAILABLE';
}

/**
 * Constrói o patch OData a partir dos campos PWA.
 * Mapeia: tool / operator / location → campos BTP Equipment.
 */
function buildEquipmentPatch(tool, operator, location, eventType) {
  const patch = {};

  if (location?.name) patch.currentLocationName = location.name;
  if (operator?.name) patch.lastSeenBy = operator.name;
  if (location?.timestamp) patch.lastSeenAt = location.timestamp;
  if (location?.gps?.latitude != null) patch.latitude = location.gps.latitude;
  if (location?.gps?.longitude != null) patch.longitude = location.gps.longitude;
  if (tool?.currentObraName) patch.assignedProject = tool.currentObraName;

  // Status derivado do tipo de evento
  if (eventType === 'checkout' || eventType === 'session_start') {
    patch.status = 'IN_USE';
  } else if (eventType === 'checkin' || eventType === 'session_end') {
    patch.status = 'AVAILABLE';
  } else if (tool?.status) {
    patch.status = mapStatus(tool.status);
  }

  return patch;
}

/**
 * Sincroniza localização/status de uma ferramenta para o SAP BTP Equipment.
 *
 * @param {object} params
 * @param {object} params.tool       — ferramenta Firestore (tool.code/serialNumber/internalCode, status, currentObraName)
 * @param {object} params.operator   — operador (name, id)
 * @param {object} params.location   — { name, timestamp, gps: { latitude, longitude } }
 * @param {string} params.eventType  — 'checkout' | 'checkin' | 'session_start' | 'session_end' | outros
 *
 * @returns { skipped, ok, error, ... }
 */
async function syncToolLocationToSapBtp({ tool, operator, location, eventType }) {
  const equipmentCode = tool?.code || tool?.serialNumber || tool?.internalCode;
  if (!equipmentCode) {
    return { ok: false, error: 'missing equipmentCode (tool.code/serialNumber/internalCode)' };
  }

  console.log(`[sapBtpBridge] syncToolLocation code=${equipmentCode} event=${eventType}`);

  const patch = buildEquipmentPatch(tool, operator, location, eventType);
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'nothing to patch — check tool/operator/location fields' };
  }

  const result = await patchEquipmentByCode(equipmentCode, patch);

  if (result.skipped) {
    console.log(`[sapBtpBridge] syncToolLocation skipped — SAP_BTP_DISABLED`);
  } else if (!result.ok) {
    console.warn(`[sapBtpBridge] syncToolLocation failed code=${equipmentCode}: ${JSON.stringify(result)}`);
  } else {
    console.log(`[sapBtpBridge] syncToolLocation OK code=${equipmentCode}`);
  }

  return result;
}

/**
 * Sincroniza um relatório de avaria para SAP BTP FaultReport + marca Equipment.
 *
 * @param {object} params
 * @param {object} params.tool        — ferramenta (code/serialNumber/internalCode)
 * @param {object} params.maintenance — { type, description, notes, reportedAt }
 * @param {object} params.operator    — operador (name, id)
 *
 * @returns { skipped, ok, faultResult, patchResult }
 */
async function syncDamageReportToSapBtp({ tool, maintenance, operator }) {
  const equipmentCode = tool?.code || tool?.serialNumber || tool?.internalCode;
  if (!equipmentCode) {
    return { ok: false, error: 'missing equipmentCode (tool.code/serialNumber/internalCode)' };
  }

  console.log(`[sapBtpBridge] syncDamageReport code=${equipmentCode}`);

  const found = await getEquipmentByCode(equipmentCode);
  if (found.skipped) return found;
  if (!found.ok) return found;
  if (!found.equipment) return { ok: false, error: `Equipment not found: ${equipmentCode}` };

  const equipmentId = found.equipment.ID;

  const faultPayload = {
    equipment_ID: equipmentId,
    faultType: maintenance?.type || 'DAMAGE',
    status: 'OPEN',
    reportedBy: operator?.name || operator?.id || 'unknown',
    description: maintenance?.description || maintenance?.notes || '',
    ...(maintenance?.reportedAt ? { reportedAt: maintenance.reportedAt } : {}),
  };

  const [faultResult, patchResult] = await Promise.all([
    createFaultReport(faultPayload),
    patchEquipmentById(equipmentId, { status: 'MAINTENANCE', hasOpenFault: true }),
  ]);

  if (!faultResult.ok) {
    console.warn(`[sapBtpBridge] createFaultReport failed code=${equipmentCode}: ${JSON.stringify(faultResult)}`);
  }
  if (!patchResult.ok) {
    console.warn(`[sapBtpBridge] patch hasOpenFault failed code=${equipmentCode}: ${JSON.stringify(patchResult)}`);
  }

  return {
    ok: faultResult.ok && patchResult.ok,
    faultResult,
    patchResult,
  };
}

/**
 * Sincroniza um movimento de transferência para SAP BTP Movement + actualiza Equipment.
 *
 * @param {object} params
 * @param {object} params.transfer  — { fromLocation, toLocation, origin, destination, transferredAt }
 * @param {object} params.tool      — ferramenta (code/serialNumber/internalCode)
 * @param {object} params.operator  — operador (name, id)
 *
 * @returns { skipped, ok, movementResult, patchResult }
 */
async function syncTransferMovementToSapBtp({ transfer, tool, operator }) {
  const equipmentCode = tool?.code || tool?.serialNumber || tool?.internalCode;
  if (!equipmentCode) {
    return { ok: false, error: 'missing equipmentCode (tool.code/serialNumber/internalCode)' };
  }

  console.log(`[sapBtpBridge] syncTransferMovement code=${equipmentCode}`);

  const found = await getEquipmentByCode(equipmentCode);
  if (found.skipped) return found;
  if (!found.ok) return found;
  if (!found.equipment) return { ok: false, error: `Equipment not found: ${equipmentCode}` };

  const equipmentId = found.equipment.ID;
  const toLocation = transfer?.toLocation || transfer?.destination || '';

  const movementPayload = {
    equipment_ID: equipmentId,
    movementType: 'NFC_TRANSFER',
    fromLocation: transfer?.fromLocation || transfer?.origin || '',
    toLocation,
    createdBy: operator?.name || operator?.id || 'unknown',
    ...(transfer?.transferredAt ? { createdAt: transfer.transferredAt } : {}),
  };

  const [movResult, patchResult] = await Promise.all([
    createMovement(movementPayload),
    patchEquipmentById(equipmentId, {
      status: 'IN_TRANSFER',
      currentLocationName: toLocation,
      ...(operator?.name ? { lastSeenBy: operator.name } : {}),
    }),
  ]);

  if (!movResult.ok) {
    console.warn(`[sapBtpBridge] createMovement failed code=${equipmentCode}: ${JSON.stringify(movResult)}`);
  }
  if (!patchResult.ok) {
    console.warn(`[sapBtpBridge] patch transfer failed code=${equipmentCode}: ${JSON.stringify(patchResult)}`);
  }

  return {
    ok: movResult.ok && patchResult.ok,
    movementResult: movResult,
    patchResult,
  };
}

module.exports = {
  syncToolLocationToSapBtp,
  syncDamageReportToSapBtp,
  syncTransferMovementToSapBtp,
  __test: {
    mapStatus,
    buildEquipmentPatch,
    STATUS_MAP,
  },
};
