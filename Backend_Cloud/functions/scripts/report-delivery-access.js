'use strict';

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'casais-rfid',
  });
}

const USERS_COLLECTION = 'artifacts/casais-rfid/public/data/users';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    args[key] = next && !next.startsWith('--') ? next : true;
    if (args[key] === next) i += 1;
  }
  return args;
}

function formatTimestamp(value) {
  if (!value) return 'nunca';
  if (value.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function loadProfiles(emailFilter) {
  const db = admin.firestore();
  const snap = await db.collection(USERS_COLLECTION).get();
  return snap.docs
    .map((doc) => ({ uid: doc.id, ...doc.data() }))
    .filter((profile) => {
      if (emailFilter) return String(profile.email || '').toLowerCase() === emailFilter;
      return profile.deliveryAccount === true || profile.accountPurpose === 'delivery-review';
    })
    .sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const emailFilter = args.email ? String(args.email).trim().toLowerCase() : null;
  const profiles = await loadProfiles(emailFilter);

  if (!profiles.length) {
    console.log(emailFilter
      ? `No delivery profile found for ${emailFilter}`
      : 'No delivery profiles found.');
    return;
  }

  console.log('CASAIS Fleet Intelligence - Delivery access report');
  console.log(`Generated at: ${new Date().toISOString()}`);
  console.log('');

  for (const profile of profiles) {
    let authUser = null;
    try {
      authUser = await admin.auth().getUser(profile.uid);
    } catch (error) {
      console.warn(`[WARN] No Firebase Auth user for uid=${profile.uid}: ${error.message}`);
    }

    console.log(`Email:        ${profile.email || authUser?.email || 'n/a'}`);
    console.log(`Name:         ${profile.name || authUser?.displayName || 'n/a'}`);
    console.log(`UID:          ${profile.uid}`);
    console.log(`Role:         ${profile.systemRole || 'n/a'}`);
    console.log(`Auth created: ${authUser?.metadata?.creationTime || 'n/a'}`);
    console.log(`Auth login:   ${authUser?.metadata?.lastSignInTime || 'nunca'}`);
    console.log(`PWA seen:     ${formatTimestamp(profile.lastSeenAt)}`);
    console.log(`Disabled:     ${authUser?.disabled === true ? 'sim' : 'nao'}`);
    console.log('-'.repeat(72));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
