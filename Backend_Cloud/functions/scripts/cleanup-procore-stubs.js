/**
 * Apaga documentos procore_* do Firestore que já têm equivalente mach-* emparelhado.
 * node scripts/cleanup-procore-stubs.js [--dry-run]
 */
const admin = require('firebase-admin');
const DRY_RUN = process.argv.includes('--dry-run');
if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();
const MACHINES_PATH = 'artifacts/casais-rfid/public/data/machines';

async function main() {
    console.log(`[cleanup-stubs] modo: ${DRY_RUN ? 'DRY RUN' : 'REAL'}`);
    const snap = await db.collection(MACHINES_PATH).get();
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Índice por procoreEquipmentId para stubs reais (mach-*)
    const pairedIds = new Set(
        all
            .filter(m => !m.id.startsWith('procore_') && m.procoreEquipmentId)
            .map(m => String(m.procoreEquipmentId))
    );

    const stubs = all.filter(m => m.id.startsWith('procore_'));
    console.log(`[cleanup-stubs] ${stubs.length} stubs procore_*, ${pairedIds.size} maquinas pareadas`);

    let deleted = 0;
    let kept = 0;

    for (const stub of stubs) {
        const eqId = String(stub.id.replace('procore_', ''));
        // Se há mach-* pareado com este ID, o stub é redundante
        if (pairedIds.has(eqId) || pairedIds.has(stub.procoreEquipmentId ? String(stub.procoreEquipmentId) : '')) {
            console.log(`[cleanup-stubs] ${DRY_RUN ? '[DRY] ' : ''}DELETE ${stub.id} (pareado com mach-*)`);
            if (!DRY_RUN) await db.collection(MACHINES_PATH).doc(stub.id).delete();
            deleted++;
        } else if (stub._removed_at) {
            console.log(`[cleanup-stubs] ${DRY_RUN ? '[DRY] ' : ''}DELETE ${stub.id} (_removed_at definido)`);
            if (!DRY_RUN) await db.collection(MACHINES_PATH).doc(stub.id).delete();
            deleted++;
        } else {
            console.log(`[cleanup-stubs] MANTER ${stub.id} (sem equivalente — pode ser equipamento novo)`);
            kept++;
        }
    }

    console.log(`[cleanup-stubs] done — ${deleted} apagados, ${kept} mantidos`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
