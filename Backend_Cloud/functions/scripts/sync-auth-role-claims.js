'use strict';

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'casais-rfid',
  });
}

const USERS_PATH = 'artifacts/casais-rfid/public/data/users';
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

async function main() {
  const auth = admin.auth();
  const users = await admin.firestore().collection(USERS_PATH).get();
  let updated = 0;

  for (const profile of users.docs) {
    try {
      const user = await auth.getUser(profile.id);
      const systemRole = normalizeSystemRole(profile.data().systemRole);
      if (user.customClaims?.systemRole === systemRole) continue;

      await auth.setCustomUserClaims(profile.id, {
        ...(user.customClaims || {}),
        systemRole,
      });
      updated++;
      console.log(`[sync-auth-role-claims] ${profile.id}: ${systemRole}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.warn(`[sync-auth-role-claims] Profile ${profile.id} has no Firebase Auth user`);
        continue;
      }
      throw error;
    }
  }

  console.log(`[sync-auth-role-claims] Done. Checked: ${users.size}; updated: ${updated}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
