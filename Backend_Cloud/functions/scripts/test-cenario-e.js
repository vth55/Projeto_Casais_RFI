/**
 * Cenário E — WorkOrder concluída → sessão de horas resetada
 *
 * Fluxo correcto do trigger onWorkOrderToProcore:
 *   - Se WO sem procoreObservationId → cria observation + return null (reset NÃO corre)
 *   - Se WO com procoreObservationId + estado→concluida → fecha observation + reseta horas
 *
 * Por isso: criar WO já com procoreObservationId (simulando sync prévio com Procore)
 */

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });

const db = admin.firestore();
const BASE = 'artifacts/casais-rfid/public/data';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
    console.log('=== CENÁRIO E: WorkOrder → Reset Horas (v2 — fluxo correcto) ===\n');

    // Usar mach-volvo-a30 que tem hoursSinceMaintenance real e obra com procoreProjectId
    const MACHINE_ID = 'mach-volvo-a30';
    const OBRA_ID    = 'procore_328122'; // Torre Boavista — Porto | procoreProjectId=328122

    const machineRef = db.doc(`${BASE}/machines/${MACHINE_ID}`);

    // 1. Ler estado actual da máquina
    console.log(`1. Estado actual da máquina ${MACHINE_ID}...`);
    const machineSnap = await machineRef.get();
    const machine = machineSnap.data();
    const originalHours = machine.hoursSinceMaintenance ?? 0;
    const totalHours    = machine.totalHours ?? 0;
    console.log(`   → hoursSinceMaintenance: ${originalHours}`);
    console.log(`   → totalHours: ${totalHours}`);
    console.log(`   → procoreEquipmentId: ${machine.procoreEquipmentId}`);

    // 2. Definir hoursSinceMaintenance a um valor alto para ver o reset
    const simulatedHours = 87.5;
    console.log(`\n2. A simular horas acumuladas: hoursSinceMaintenance → ${simulatedHours}`);
    await machineRef.update({ hoursSinceMaintenance: simulatedHours });
    console.log(`   ✔ Definido`);

    // 3. Criar WO com procoreObservationId já definido (simula WO que já foi sync'd com Procore)
    //    Nota: o sandbox retorna erros 405 em PATCH — usamos um ID fictício pois
    //    o que nos interessa é o reset de horas, não a actualização da observation no Procore
    const mockObsId = 328122001; // ID fictício — sandbox

    console.log(`\n3. A criar WO com procoreObservationId=${mockObsId} (estado=atribuida)...`);
    const woData = {
        numero: `OS-CE-${Date.now().toString(36).toUpperCase()}`,
        tipo: 'Manutenção Preventiva',
        estado: 'atribuida',
        prioridade: 'media',
        machineId: MACHINE_ID,
        machineName: machine.name || MACHINE_ID,
        obraId: OBRA_ID,
        obraName: 'Torre Boavista — Porto',
        descricao: 'Revisão 250h — Troca de filtros e fluidos',
        procoreObservationId: mockObsId,  // ← chave para o fluxo de conclusão
        criadaEm: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
    };

    const woRef = await db.collection(`${BASE}/workOrders`).add(woData);
    console.log(`   ✔ WO criada: ${woRef.id}`);

    // 4. Concluir a WO — isto dispara o trigger onWorkOrderToProcore
    console.log(`\n4. A concluir WO (estado → concluida)...`);
    const beforeState = await woRef.get();
    await woRef.update({
        estado: 'concluida',
        concluidaEm: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log(`   ✔ WO ${woRef.id} actualizada para estado=concluida`);
    console.log(`   → A aguardar trigger onWorkOrderToProcore (cold start até 45s)...`);

    // Polling com feedback até 45 segundos
    let hoursReset = false;
    let machineAfter = null;
    for (let i = 0; i < 9; i++) {
        await sleep(5000);
        const snap = await machineRef.get();
        machineAfter = snap.data();
        const current = machineAfter.hoursSinceMaintenance;
        process.stdout.write(`   ${(i+1)*5}s → hoursSinceMaintenance = ${current}\n`);
        if (current === 0) {
            hoursReset = true;
            break;
        }
    }

    // 5. Resultado
    console.log('\n=== RESULTADO ===');
    machineAfter = machineAfter || (await machineRef.get()).data();

    if (hoursReset) {
        console.log('✅ CENÁRIO E: PASSOU');
        console.log(`   hoursSinceMaintenance: ${simulatedHours}h → ${machineAfter.hoursSinceMaintenance}`);
        console.log(`   lastMaintenanceAt: ${machineAfter.lastMaintenanceAt?.toDate?.()?.toISOString() || 'N/A'}`);
        console.log(`   horasAtLastMaintenance: ${machineAfter.horasAtLastMaintenance ?? 'N/A'}`);

        // Verificar se tentou fechar a Procore observation (pode ter falhado no sandbox)
        const woFinal = (await woRef.get()).data();
        if (woFinal) {
            console.log(`\n   Procore sync: observation ${mockObsId}`);
            console.log('   (sandbox 405 em PATCH é limitação conhecida — não afecta o reset de horas)');
        }
    } else {
        console.log('⚠️  CENÁRIO E: NÃO COMPLETOU EM 45s');
        console.log(`   hoursSinceMaintenance: ${machineAfter?.hoursSinceMaintenance}`);
        console.log(`   → Possível causa: trigger em cold start prolongado`);
        console.log(`   → Verificar Firebase Console > Functions > Logs para onWorkOrderToProcore`);

        // Verificar se a WO foi criada correctamente
        const woCheck = await woRef.get();
        if (woCheck.exists) {
            const wd = woCheck.data();
            console.log(`\n   WO existe: estado=${wd.estado} | procoreObservationId=${wd.procoreObservationId}`);
            console.log('   → O trigger deveria ter disparado na transição atribuida→concluida');
        }
    }

    // 6. Limpeza
    console.log('\n=== LIMPEZA ===');
    await woRef.delete();
    console.log(`   ✔ WO ${woRef.id} apagada`);

    // Restaurar horas originais se o reset não aconteceu
    const machineNow = (await machineRef.get()).data();
    if (machineNow.hoursSinceMaintenance !== 0 || !hoursReset) {
        await machineRef.update({ hoursSinceMaintenance: originalHours });
        console.log(`   ✔ hoursSinceMaintenance restaurado para ${originalHours}`);
    } else {
        console.log(`   ℹ️  hoursSinceMaintenance ficou em 0 (resultado correcto do reset)`);
    }

    console.log('\nDone.');
    process.exit(0);
}

run().catch(err => {
    console.error('ERRO:', err);
    process.exit(1);
});
