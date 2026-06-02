/**
 * migrate-obras-gps-schema.js
 *
 * Migrates obras GPS fields to the canonical schema:
 *   gps: { latitude, longitude, source, confirmedAt, updatedAt }
 *   gpsStatus: 'confirmed' | 'unconfirmed' | 'missing'
 *
 * Handles 3 legacy formats:
 *   - gps.lat / gps.lng  (transitional)
 *   - lat / lng root     (pre-2026)
 *
 * Rules:
 *   - Dry-run by default. Pass --apply to write.
 *   - Never deletes existing fields (non-destructive).
 *   - Idempotent: skips obras already in canonical format with gpsStatus set.
 *   - Sets source='legacy', gpsStatus='unconfirmed' for migrated records.
 *
 * Usage:
 *   node scripts/migrate-obras-gps-schema.js          # dry-run
 *   node scripts/migrate-obras-gps-schema.js --apply  # write
 */

const admin = require('firebase-admin');

const APPLY = process.argv.includes('--apply');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const APP_ID = 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;

function resolveGps(data) {
  // Resolve coordinates from any legacy format.
  // Returns { latitude, longitude } or null.
  const latitude =
    data?.gps?.latitude ??
    data?.gps?.lat ??
    data?.lat;
  const longitude =
    data?.gps?.longitude ??
    data?.gps?.lng ??
    data?.lng;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  return { latitude, longitude };
}

function needsMigration(data) {
  // Already canonical if gps.latitude/longitude + gpsStatus are all set.
  const hasCanonicalGps =
    typeof data?.gps?.latitude === 'number' &&
    typeof data?.gps?.longitude === 'number' &&
    typeof data?.gps?.source === 'string';
  const hasGpsStatus = typeof data?.gpsStatus === 'string';
  return !(hasCanonicalGps && hasGpsStatus);
}

async function main() {
  console.log(`[migrate-obras-gps] mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  const snap = await db.collection(`${BASE}/obras`).get();
  console.log(`[migrate-obras-gps] ${snap.size} obras found`);

  let skipped = 0;
  let toMigrate = 0;
  let written = 0;
  let noGps = 0;

  const batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();

    if (!needsMigration(data)) {
      skipped++;
      continue;
    }

    const resolved = resolveGps(data);
    const now = admin.firestore.Timestamp.now();

    let update;
    if (resolved) {
      update = {
        gps: {
          ...data.gps,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          source: data?.gps?.source ?? 'legacy',
          confirmedAt: data?.gps?.confirmedAt ?? null,
          updatedAt: now,
        },
        gpsStatus: data.gpsStatus ?? 'unconfirmed',
      };
      toMigrate++;
      console.log(`  [migrate] ${docSnap.id} — lat=${resolved.latitude} lng=${resolved.longitude} → canonical`);
    } else {
      update = {
        gpsStatus: 'missing',
      };
      noGps++;
      console.log(`  [no-gps] ${docSnap.id} — no coordinates found → gpsStatus=missing`);
    }

    if (APPLY) {
      batch.update(docSnap.ref, update);
      batchCount++;

      // Firestore batch limit is 500 writes.
      if (batchCount === 490) {
        await batch.commit();
        console.log(`[migrate-obras-gps] committed batch of ${batchCount}`);
        batchCount = 0;
      }
    }
  }

  if (APPLY && batchCount > 0) {
    await batch.commit();
    written = toMigrate + noGps;
    console.log(`[migrate-obras-gps] committed final batch of ${batchCount}`);
  }

  console.log(`\n[migrate-obras-gps] summary:`);
  console.log(`  already canonical (skipped): ${skipped}`);
  console.log(`  migrated with coords:        ${toMigrate}`);
  console.log(`  marked missing (no coords):  ${noGps}`);
  if (APPLY) {
    console.log(`  total written:               ${written}`);
  } else {
    console.log(`  (dry run — nothing written; pass --apply to write)`);
  }
}

main().catch((err) => {
  console.error('[migrate-obras-gps] fatal:', err);
  process.exit(1);
});
