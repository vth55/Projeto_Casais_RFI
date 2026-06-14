'use strict';

const admin = require('firebase-admin');
const { buildAuthClaims } = require('../authClaimsPolicy');

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

function usage() {
  console.log(`
Usage:
  node scripts/create-delivery-admin-user.js --email pessoa@example.com --password "temporaria123" --name "Avaliador TCC"

Creates or updates a Firebase Auth account with systemRole=admin and marks it as a delivery reviewer account.
`);
}

async function createOrUpdateUser({ email, password, name }) {
  const auth = admin.auth();

  try {
    const created = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });
    console.log(`[AUTH] Created ${email} uid=${created.uid}`);
    return created;
  } catch (error) {
    if (error.code !== 'auth/email-already-exists') throw error;

    const existing = await auth.getUserByEmail(email);
    const updated = await auth.updateUser(existing.uid, {
      password,
      displayName: name,
      emailVerified: true,
      disabled: false,
    });
    console.log(`[AUTH] Updated ${email} uid=${updated.uid}`);
    return updated;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email || '').trim().toLowerCase();
  const password = String(args.password || '');
  const name = String(args.name || 'Avaliador TCC').trim();

  if (!email || !password || password.length < 6) {
    usage();
    throw new Error('Missing --email or --password with at least 6 characters.');
  }

  const user = await createOrUpdateUser({ email, password, name });
  const now = admin.firestore.FieldValue.serverTimestamp();
  const profileRef = admin.firestore().doc(`${USERS_COLLECTION}/${user.uid}`);

  await profileRef.set(
    {
      email,
      name,
      systemRole: 'admin',
      deliveryAccount: true,
      accountPurpose: 'delivery-review',
      accessTrackingEnabled: true,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );

  const profile = (await profileRef.get()).data();
  const claims = buildAuthClaims(profile, user.customClaims || {});
  await admin.auth().setCustomUserClaims(user.uid, claims);

  console.log(`[FIRESTORE] Profile saved at ${USERS_COLLECTION}/${user.uid}`);
  console.log(`[CLAIMS] systemRole=${claims.systemRole} restricted=${claims.restrictedToOwnObra}`);
  console.log('');
  console.log('Delivery account ready:');
  console.log(`  Email:    ${email}`);
  console.log(`  Name:     ${name}`);
  console.log(`  Role:     admin`);
  console.log(`  Password: ${password}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
