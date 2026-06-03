'use strict';

/**
 * obraScope.js — helper puro para calcular obraScopeIds
 *
 * Usado pelos triggers onToolMovementWritten e onToolTransferScopeSync
 * e pelo backfill script. Sem dependências Firebase.
 */

const SCOPE_EXCLUDE = new Set(['', 'WAREHOUSE']);

/** Incrementado quando a lógica de cálculo muda, forçando re-backfill. */
const SCOPE_VERSION = 1;

/**
 * Builds the stable sorted array of obra IDs that a document touches.
 *
 * Accepts:
 *   tool_movements  → { fromObraId, toObraId }
 *   tool_transfers  → { from: { obraId }, to: { obraId } }
 *
 * Filters: null, undefined, '', 'WAREHOUSE'.
 * Deduplicates and sorts for stable comparison.
 *
 * @param {Object|null} docData Firestore document data
 * @returns {string[]} Sorted, deduplicated array of obra IDs
 */
function buildObraScopeIds(docData) {
  const candidates = [
    docData?.fromObraId,       // tool_movements
    docData?.toObraId,         // tool_movements
    docData?.from?.obraId,     // tool_transfers
    docData?.to?.obraId,       // tool_transfers
  ];
  const normalized = candidates
    .filter(id => typeof id === 'string')
    .map(id => id.trim())
    .filter(id => !SCOPE_EXCLUDE.has(id));
  return [...new Set(normalized)].sort();
}

/**
 * Returns true if the document already has correct obraScopeIds and scopeVersion.
 * Used to prevent unnecessary Firestore writes (and therefore trigger loops).
 *
 * @param {Object|null} currentData  current document data
 * @param {string[]} expectedScope  output of buildObraScopeIds
 * @returns {boolean}
 */
function scopeIsUpToDate(currentData, expectedScope) {
  if (currentData?.scopeVersion !== SCOPE_VERSION) return false;
  const current = currentData?.obraScopeIds;
  if (!Array.isArray(current)) return false;
  if (current.length !== expectedScope.length) return false;
  return expectedScope.every((id, i) => current[i] === id);
}

module.exports = { buildObraScopeIds, scopeIsUpToDate, SCOPE_VERSION };
