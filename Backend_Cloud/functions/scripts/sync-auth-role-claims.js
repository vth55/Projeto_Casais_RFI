'use strict';

const admin = require('firebase-admin');
const { buildAuthClaims, claimsAreUpToDate } = require('../authClaimsPolicy');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'casais-rfid',
  });
}

const USERS_PATH = 'artifacts/casais-rfid/public/data/users';

async function main() {
  const auth = admin.auth();
  const users = await admin.firestore().collection(USERS_PATH).get();
  let updated = 0;
  let skipped = 0;

  for (const profile of users.docs) {
    try {
      const user = await auth.getUser(profile.id);
      const currentClaims = user.customClaims || {};
      const profileData = profile.data();

      if (claimsAreUpToDate(profileData, currentClaims)) {
        skipped++;
        continue;
      }

      const nextClaims = buildAuthClaims(profileData, currentClaims);
      await auth.setCustomUserClaims(profile.id, nextClaims);
      updated++;
      console.log(
        `[sync-auth-role-claims] ${profile.id}:` +
        ` role=${nextClaims.systemRole || 'none'}` +
        ` obra=${nextClaims.assignedObraId || 'none'}` +
        ` restricted=${nextClaims.restrictedToOwnObra ?? false}`
      );
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.warn(`[sync-auth-role-claims] Profile ${profile.id} has no Firebase Auth user`);
        continue;
      }
      throw error;
    }
  }

  console.log(
    `[sync-auth-role-claims] Done. Checked: ${users.size}; updated: ${updated}; skipped (already current): ${skipped}`
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
