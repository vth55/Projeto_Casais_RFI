'use strict';

/**
 * SAP BTP Client — HTTP client isolado para o OData endpoint do CAP deployed.
 *
 * Feature flag: SAP_BTP_ENABLED=true (por defeito false).
 * Quando desligado, todas as funções retornam { skipped: true } sem chamadas HTTP.
 *
 * Env vars:
 *   SAP_BTP_ENABLED      — 'true' para activar (default: false)
 *   SAP_BTP_BASE_URL     — URL base do serviço OData (sem trailing /)
 *   SAP_BTP_TIMEOUT_MS   — timeout por pedido em ms (default: 10000)
 */

const SAP_BTP_BASE_URL = (process.env.SAP_BTP_BASE_URL || 'https://casais-fiori-demo-srv.cfapps.us10-001.hana.ondemand.com/equipment').replace(/\/$/, '');
const SAP_BTP_TIMEOUT_MS = parseInt(process.env.SAP_BTP_TIMEOUT_MS || '10000', 10);

function isEnabled() {
  return process.env.SAP_BTP_ENABLED === 'true';
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SAP_BTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseResponse(res) {
  return res.json().catch(() => ({}));
}

/**
 * GET /Equipments?$filter=equipmentCode eq '<code>'&$top=1
 * Retorna { ok: true, equipment } ou { ok: false, error }.
 * equipment é null se não encontrado.
 */
async function getEquipmentByCode(equipmentCode) {
  if (!isEnabled()) return { skipped: true, reason: 'SAP_BTP_DISABLED' };
  if (!equipmentCode) return { ok: false, error: 'equipmentCode required' };

  const filter = `equipmentCode eq '${equipmentCode}'`;
  const url = `${SAP_BTP_BASE_URL}/Equipments?$filter=${encodeURIComponent(filter)}&$top=1`;

  try {
    const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
    const body = await parseResponse(res);
    if (!res.ok) return { ok: false, status: res.status, body };
    const equipment = (body?.value || [])[0] || null;
    return { ok: true, equipment };
  } catch (err) {
    console.warn(`[sapBtpClient] getEquipmentByCode error: ${err.message}`);
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  }
}

/**
 * PATCH /Equipments(<id>) com payload.
 * Retorna { ok: true } ou { ok: false, ... }.
 */
async function patchEquipmentById(id, payload) {
  if (!isEnabled()) return { skipped: true, reason: 'SAP_BTP_DISABLED' };
  if (!id) return { ok: false, error: 'id required' };
  if (!payload || Object.keys(payload).length === 0) return { ok: false, error: 'payload required' };

  const url = `${SAP_BTP_BASE_URL}/Equipments(${id})`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await parseResponse(res);
    if (!res.ok) return { ok: false, status: res.status, body };
    return { ok: true, body };
  } catch (err) {
    console.warn(`[sapBtpClient] patchEquipmentById error: ${err.message}`);
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  }
}

/**
 * Resolve equipmentCode → ID e faz PATCH.
 * Combina getEquipmentByCode + patchEquipmentById.
 */
async function patchEquipmentByCode(equipmentCode, payload) {
  if (!isEnabled()) return { skipped: true, reason: 'SAP_BTP_DISABLED' };

  const found = await getEquipmentByCode(equipmentCode);
  if (found.skipped || !found.ok) return found;
  if (!found.equipment) return { ok: false, error: `Equipment not found: ${equipmentCode}` };

  return patchEquipmentById(found.equipment.ID, payload);
}

/**
 * POST /FaultReports com payload.
 */
async function createFaultReport(payload) {
  if (!isEnabled()) return { skipped: true, reason: 'SAP_BTP_DISABLED' };
  if (!payload) return { ok: false, error: 'payload required' };

  const url = `${SAP_BTP_BASE_URL}/FaultReports`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await parseResponse(res);
    if (!res.ok) return { ok: false, status: res.status, body };
    return { ok: true, body };
  } catch (err) {
    console.warn(`[sapBtpClient] createFaultReport error: ${err.message}`);
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  }
}

/**
 * POST /Movements com payload.
 */
async function createMovement(payload) {
  if (!isEnabled()) return { skipped: true, reason: 'SAP_BTP_DISABLED' };
  if (!payload) return { ok: false, error: 'payload required' };

  const url = `${SAP_BTP_BASE_URL}/Movements`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await parseResponse(res);
    if (!res.ok) return { ok: false, status: res.status, body };
    return { ok: true, body };
  } catch (err) {
    console.warn(`[sapBtpClient] createMovement error: ${err.message}`);
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  }
}

module.exports = {
  getEquipmentByCode,
  patchEquipmentById,
  patchEquipmentByCode,
  createFaultReport,
  createMovement,
  __test: { isEnabled },
};
