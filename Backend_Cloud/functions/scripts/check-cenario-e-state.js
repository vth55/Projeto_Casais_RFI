// LEGACY — heavy machines model pré-pivot 2026-05
// Opera sobre `machines` para diagnóstico do Cenário E (Procore integration tests).
/**
 * check-cenario-e-state.js — Verifica estado actual para diagnóstico Cenário E
 */
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();
const BASE = 'artifacts/casais-rfid/public/data';

async function main() {
    // 1. Verificar obras com procoreProjectId
    console.log('=== OBRAS COM procoreProjectId ===');
    const obras = await db.collection(`${BASE}/obras`).limit(20).get();
    for (const d of obras.docs) {
        const dd = d.data();
        console.log(`  ${d.id} | "${dd.name}" | procoreProjectId=${dd.procoreProjectId || 'NULL'} | status=${dd.status}`);
    }

    // 2. Verificar máquinas com obraId ligado a obra com procoreProjectId
    console.log('\n=== MÁQUINAS COM obraId ===');
    const machines = await db.collection(`${BASE}/machines`).limit(30).get();
    for (const d of machines.docs) {
        const dd = d.data();
        const oid = dd.localizacao?.obraId || dd.obraId;
        console.log(`  ${d.id} | "${dd.name}" | obraId=${oid || 'NULL'} | procoreEqId=${dd.procoreEquipmentId || 'NULL'} | hoursSinceMaint=${dd.hoursSinceMaintenance ?? 'NULL'}`);
    }

    // 3. Verificar se há WOs activas
    console.log('\n=== WORK ORDERS ACTIVAS ===');
    const wos = await db.collection(`${BASE}/workOrders`).limit(10).get();
    if (wos.empty) console.log('  (nenhuma)');
    for (const d of wos.docs) {
        const dd = d.data();
        console.log(`  ${d.id} | estado=${dd.estado} | machineId=${dd.machineId} | obraId=${dd.obraId} | obsId=${dd.procoreObservationId || 'NULL'}`);
    }

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
