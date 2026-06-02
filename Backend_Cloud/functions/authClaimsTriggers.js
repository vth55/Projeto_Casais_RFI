'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { buildAuthClaims, claimsAreUpToDate } = require('./authClaimsPolicy');

const APP_ID = process.env.GCLOUD_PROJECT || 'casais-rfid';
const USERS_PATH = `artifacts/${APP_ID}/public/data/users`;

async function syncAuthClaims(uid, profileData) {
  const auth = admin.auth();
  const user = await auth.getUser(uid);
  const currentClaims = user.customClaims || {};

  if (claimsAreUpToDate(profileData, currentClaims)) return;

  const nextClaims = buildAuthClaims(profileData, currentClaims);
  await auth.setCustomUserClaims(uid, nextClaims);
  console.log(
    `[authClaims] Synced ${uid}: role=${nextClaims.systemRole || 'none'}` +
    ` obra=${nextClaims.assignedObraId || 'none'}` +
    ` restricted=${nextClaims.restrictedToOwnObra ?? false}`
  );
}

exports.onUserProfileWrittenSyncClaims = onDocumentWritten(
  `${USERS_PATH}/{uid}`,
  async event => {
    const after = event.data?.after;
    const profileData = after?.exists ? after.data() : null;

    try {
      await syncAuthClaims(event.params.uid, profileData);
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
  syncAuthClaims,
};
