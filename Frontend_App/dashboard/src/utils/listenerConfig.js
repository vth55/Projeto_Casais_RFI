'use strict';
/**
 * listenerConfig.js — pure helper for scoped Firestore listener decisions.
 *
 * No Firebase imports — testable without mocks.
 *
 * Listener scope rules:
 *   - tools: ALWAYS global (NFC lookup by nfcTagId requires full collection scan)
 *   - tool_alerts: ALWAYS global (no obraId field in schema — SAP_SYNC_FAILURE has no obra)
 *   - operators/userProfiles: not scoped in this phase
 *   - All other operational collections: scoped when restrictedToOwnObra === true
 *
 * Three modes:
 *   'global'  — unfiltered listener (admin/it/gestor or any non-restricted role)
 *   'scoped'  — filtered by assignedObraId (restricted user with obra assigned)
 *   'empty'   — no listener, return [] (restricted user WITHOUT assignedObraId)
 *              A global query would succeed now but fail after rules enforcement.
 */

/**
 * @param {object|null} currentUser  — useAuthStore.currentUser
 * @returns {{ mode: 'global'|'scoped'|'empty', assignedObraId?: string }}
 */
export function computeListenerScope(currentUser) {
  const restrictedRoles = new Set(['encarregado_obra', 'operador']);
  const isRestricted = currentUser?.restrictedToOwnObra === true ||
    (currentUser?.restrictedToOwnObra === undefined && restrictedRoles.has(currentUser?.systemRole));

  if (!isRestricted) return { mode: 'global' };

  const assignedObraId = currentUser.assignedObraId || null;
  if (!assignedObraId) return { mode: 'empty' };

  return { mode: 'scoped', assignedObraId };
}
