/**
 * Remove itens da procoreSyncQueue que nunca terão sucesso (IDs fictícios / sandbox limitations).
 * node scripts/cleanup-sync-queue.js [--dry-run]
 */
const admin = require('firebase-admin');
const DRY_RUN = process.argv.includes('--dry-run');
if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();
const QUEUE_PATH = 'artifacts/casais-rfid/public/data/procoreSyncQueue';

async function main() {
    console.log(`[cleanup-queue] modo: ${DRY_RUN ? 'DRY RUN' : 'REAL'}`);
    const snap = await db.collection(QUEUE_PATH).get();
    console.log(`[cleanup-queue] ${snap.size} itens na queue`);

    for (const doc of snap.docs) {
        const d = doc.data();
        console.log(`[cleanup-queue] ${doc.id}: op=${d.operation} attempts=${d.attempts} payload=${JSON.stringify(d.payload).slice(0, 100)}`);

        const isPhantomArchive = d.operation === 'archive_equipment' && d.payload?.procoreEquipmentId === 'FAKE-PROCORE-ID-QA-TEST';
        const isObservationFailure = d.operation === 'create_observation';

        if (isPhantomArchive || isObservationFailure) {
            const reason = isPhantomArchive ? 'ID fictício de teste' : 'Observations não activo no sandbox';
            console.log(`[cleanup-queue] ${DRY_RUN ? '[DRY] ' : ''}DELETE ${doc.id} — ${reason}`);
            if (!DRY_RUN) await doc.ref.delete();
        }
    }
    console.log('[cleanup-queue] done');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
