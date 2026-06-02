'use strict';

const ALLOWED_SYSTEM_ROLES = new Set([
  'admin',
  'it',
  'gestor',
  'gestor_frota',
  'gestor_financeiro',
  'gestor_sustentabilidade',
  'encarregado_obra',
  'tecnico_manutencao',
  'logistica',
  'operador',
]);

// Roles that are scoped to a single obra and cannot see cross-obra data
const RESTRICTED_TO_OWN_OBRA_ROLES = new Set(['encarregado_obra', 'operador']);

function normalizeSystemRole(role) {
  return ALLOWED_SYSTEM_ROLES.has(role) ? role : 'operador';
}

/**
 * Builds the full custom claims object from a Firestore user profile.
 * Preserves any existing claims not managed by this policy.
 *
 * Managed fields: systemRole, assignedObraId, restrictedToOwnObra.
 *
 * When profile is null or has no systemRole (e.g. doc deleted), all three
 * managed fields are removed from claims.
 *
 * @param {object|null} profile - Firestore user document data
 * @param {object} currentClaims - Existing Firebase Auth custom claims
 * @returns {object} New claims object ready to pass to setCustomUserClaims
 */
function buildAuthClaims(profile, currentClaims) {
  const next = { ...currentClaims };

  if (!profile || !profile.systemRole) {
    delete next.systemRole;
    delete next.assignedObraId;
    delete next.restrictedToOwnObra;
    return next;
  }

  next.systemRole = normalizeSystemRole(profile.systemRole);
  next.restrictedToOwnObra = RESTRICTED_TO_OWN_OBRA_ROLES.has(next.systemRole);

  const obraId = profile.assignedObraId ?? null;
  if (obraId !== null) {
    next.assignedObraId = obraId;
  } else {
    delete next.assignedObraId;
  }

  return next;
}

/**
 * Returns true if the current claims already match what buildAuthClaims would produce.
 * Avoids unnecessary Firebase Auth writes.
 */
function claimsAreUpToDate(profile, currentClaims) {
  const next = buildAuthClaims(profile || {}, currentClaims);
  return (
    currentClaims.systemRole === next.systemRole &&
    (currentClaims.assignedObraId ?? null) === (next.assignedObraId ?? null) &&
    Boolean(currentClaims.restrictedToOwnObra) === Boolean(next.restrictedToOwnObra)
  );
}

module.exports = {
  ALLOWED_SYSTEM_ROLES,
  RESTRICTED_TO_OWN_OBRA_ROLES,
  normalizeSystemRole,
  buildAuthClaims,
  claimsAreUpToDate,
};
