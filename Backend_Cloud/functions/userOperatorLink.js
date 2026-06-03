'use strict';

/**
 * userOperatorLink.js — helpers puros para a ligação users/{uid} ↔ operators/{id}
 *
 * Sem dependências Firebase. Usados pelo backfill script e por futuros triggers.
 *
 * A ligação é bidirecional:
 *   users/{uid}.operatorId  = operatorId
 *   operators/{operatorId}.userId = uid
 *
 * Regras:
 *   - Nunca heurística por nome — só por email exacto.
 *   - Nunca sobrescrever um link existente para um valor diferente.
 *   - Se ambíguo (múltiplos candidatos por email), reportar mas não escrever.
 */

/**
 * Returns the update payload to apply on both sides of the link.
 *
 * @param {{ id: string }} userProfile   users/{uid} data — must include .id (the uid)
 * @param {{ id: string }} operatorDoc   operators/{operatorId} data — must include .id
 * @returns {{ userPatch: { operatorId: string }, operatorPatch: { userId: string } }}
 */
function buildUserOperatorLinkPatch(userProfile, operatorDoc) {
  return {
    userPatch: { operatorId: operatorDoc.id },
    operatorPatch: { userId: userProfile.id },
  };
}

/**
 * Returns true if both documents already point to each other.
 * Used to skip unnecessary writes (idempotent backfill).
 *
 * @param {{ id: string, operatorId?: string }} userProfile
 * @param {{ id: string, userId?: string }} operatorDoc
 * @returns {boolean}
 */
function isUserOperatorLinkCurrent(userProfile, operatorDoc) {
  return (
    userProfile?.operatorId === operatorDoc?.id &&
    operatorDoc?.userId === userProfile?.id
  );
}

/**
 * Given a list of operators and users, computes all safe proposed links.
 * Matching is by normalised email only. Returns separate lists for:
 *   - proposed: safe to link (one match on each side, no existing conflict)
 *   - ambiguous: multiple candidates — do not link
 *   - alreadyLinked: already correct on both sides
 *   - conflicts: existing link points elsewhere — do not overwrite
 *
 * @param {Array<{id:string, email?:string, userId?:string}>} operators
 * @param {Array<{id:string, email?:string, operatorId?:string}>} users
 * @returns {{
 *   proposed: Array<{uid:string, operatorId:string, email:string}>,
 *   ambiguous: Array<{email:string, candidateUids:string[]}>,
 *   alreadyLinked: number,
 *   conflicts: Array<{uid:string, operatorId:string, existingUserId:string}>,
 * }}
 */
function computeLinkProposals(operators, users) {
  const proposed = [];
  const ambiguous = [];
  const conflicts = [];
  let alreadyLinked = 0;

  // Build email → user index
  const usersByEmail = new Map();
  for (const user of users) {
    const email = normaliseEmail(user.email);
    if (!email) continue;
    if (!usersByEmail.has(email)) usersByEmail.set(email, []);
    usersByEmail.get(email).push(user);
  }

  for (const operator of operators) {
    const opEmail = normaliseEmail(operator.email);
    if (!opEmail) continue;

    const candidates = usersByEmail.get(opEmail) || [];

    if (candidates.length === 0) continue;

    if (candidates.length > 1) {
      ambiguous.push({ email: opEmail, candidateUids: candidates.map(u => u.id) });
      continue;
    }

    const user = candidates[0];

    if (isUserOperatorLinkCurrent(user, operator)) {
      alreadyLinked++;
      continue;
    }

    // Conflict: operator already linked to a DIFFERENT user
    if (operator.userId && operator.userId !== user.id) {
      conflicts.push({ uid: user.id, operatorId: operator.id, existingUserId: operator.userId });
      continue;
    }

    // Conflict: user already linked to a DIFFERENT operator
    if (user.operatorId && user.operatorId !== operator.id) {
      conflicts.push({ uid: user.id, operatorId: operator.id, existingUserId: operator.userId || null });
      continue;
    }

    proposed.push({ uid: user.id, operatorId: operator.id, email: opEmail });
  }

  return { proposed, ambiguous, alreadyLinked, conflicts };
}

function normaliseEmail(email) {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

module.exports = {
  buildUserOperatorLinkPatch,
  isUserOperatorLinkCurrent,
  computeLinkProposals,
  normaliseEmail,
};
