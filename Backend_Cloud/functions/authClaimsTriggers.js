'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

const APP_ID = process.env.GCLOUD_PROJECT || 'casais-rfid';
const USERS_PATH = `artifacts/${APP_ID}/public/data/users`;
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

function normalizeSystemRole(role) {
  return ALLOWED_SYSTEM_ROLES.has(role) ? role : 'operador';
}

async function setSystemRoleClaim(uid, role) {
  const auth = admin.auth();
  const user = await auth.getUser(uid);
  const currentClaims = user.customClaims || {};
  const systemRole = role ? normalizeSystemRole(role) : null;

  if (currentClaims.systemRole === systemRole) return;

  const nextClaims = { ...currentClaims };
  if (systemRole) nextClaims.systemRole = systemRole;
  else delete nextClaims.systemRole;

  await auth.setCustomUserClaims(uid, nextClaims);
  console.log(`[authClaims] Synced ${uid}: ${systemRole || 'removed'}`);
}

exports.onUserProfileWrittenSyncClaims = onDocumentWritten(
  `${USERS_PATH}/{uid}`,
  async event => {
    const after = event.data?.after;
    const role = after?.exists ? after.data()?.systemRole : null;

    try {
      await setSystemRoleClaim(event.params.uid, role);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.warn(`[authClaims] User ${event.params.uid} not found in Firebase Auth`);
        return;
      }
      throw error;
    }
  },
);

exports.__test = {
  normalizeSystemRole,
  setSystemRoleClaim,
};
