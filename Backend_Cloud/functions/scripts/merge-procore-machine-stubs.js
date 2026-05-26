// LEGACY — heavy machines model pré-pivot 2026-05
// Opera sobre a colecção `machines` para consolidar stubs Procore.
// Mantido para o Procore exporter — NÃO remover.
/**
 * Migração: merge procore_* stubs → mach-* docs
 *
 * Problema: procorePwaProjector criava procore_<id> stubs sem verificar se
 * já existia um mach-* com o mesmo nome. Resultado: ~7 duplicados.
 *
 * O que este script faz:
 *   1. Para cada procore_* stub que corresponde (por nome) a um mach-*, copia os
 *      campos Procore (procoreEquipmentId, etc.) para o mach-*, e apaga o stub.
 *   2. Stubs sem correspondência de nome ficam (são máquinas exclusivas do Procore).
 *
 * Uso:
 *   node scripts/merge-procore-machine-stubs.js [--dry-run]
 */

const admin = require('firebase-admin');

const DRY_RUN = process.argv.includes('--dry-run');

if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });

const db = admin.firestore();
const MACHINES_PATH = 'artifacts/casais-rfid/public/data/machines';

function normalizeStr(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

async function main() {
    console.log(`[merge-stubs] modo: ${DRY_RUN ? 'DRY RUN' : 'REAL'}`);

    const snap = await db.collection(MACHINES_PATH).get();
    const allMachines = snap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() }));

    const stubs    = allMachines.filter(m => m.id.startsWith('procore_'));
    const manuals  = allMachines.filter(m => !m.id.startsWith('procore_'));

    console.log(`[merge-stubs] ${manuals.length} manual docs, ${stubs.length} procore stubs`);

    // Build name index for manual docs
    const manualByName = new Map();
    for (const m of manuals) {
        const norm = normalizeStr(m.data.name || '');
        if (norm) manualByName.set(norm, m);
    }

    let merged = 0;
    let orphaned = 0;

    for (const stub of stubs) {
        const normName = normalizeStr(stub.data.name || '');
        const match = normName ? manualByName.get(normName) : null;

        if (!match) {
            console.log(`[merge-stubs]   ORPHAN  ${stub.id} — "${stub.data.name}" (sem correspondência, fica)`);
            orphaned++;
            continue;
        }

        const procoreFields = {};
        const fieldsToMerge = [
            'procoreEquipmentId', 'procoreEquipmentNumber', 'procoreCategoryRaw',
            'procoreSyncedAt', 'source', 'pairingStatus', 'rfidReaderId',
        ];
        for (const f of fieldsToMerge) {
            if (stub.data[f] !== undefined) procoreFields[f] = stub.data[f];
        }

        console.log(
            `[merge-stubs]   MERGE   ${stub.id} → ${match.id} | "${stub.data.name}" | ` +
            `procoreId=${procoreFields.procoreEquipmentId}`
        );

        if (!DRY_RUN) {
            const batch = db.batch();
            batch.set(match.ref, procoreFields, { merge: true });
            batch.delete(stub.ref);
            await batch.commit();
        }

        merged++;
    }

    console.log(`[merge-stubs] done — merged: ${merged}, orphaned (kept): ${orphaned}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
