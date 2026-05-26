// LEGACY — heavy machines model pré-pivot 2026-05
// Opera sobre `sessions` (heavy machines) para testar o Procore exporter.
// Mantido como fixture de teste do Procore exporter — NÃO remover.
/**
 * test-export-session.js — Cria uma sessão de teste e verifica o export para o Procore.
 * Confirma: description format, billable, operador linkado, equipment_id handling.
 *
 * Uso: node scripts/test-export-session.js
 */

const admin = require('firebase-admin');
const https = require('https');

if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });

const db = admin.firestore();
const BASE = 'artifacts/casais-rfid/public/data';
const INTEGRATION_PATH = `${BASE}/integrations/procore`;
const COMPANY_ID = '4283171';
const PROJECT_ID = '328122';

function procoreGet(path, token) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'sandbox.procore.com',
            path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Procore-Company-Id': COMPANY_ID,
                'Accept': 'application/json',
            },
        }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, data: raw }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    // Get a machine with a long name for description truncation test
    const machinesSnap = await db.collection(`${BASE}/machines`).limit(20).get();
    const machines = machinesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const testMachine = machines.find(m => m.name && m.name.length > 18 && !m.name.includes('REMOVIDO') && !m.name.includes('TEST'));

    if (!testMachine) { console.error('No suitable machine found'); process.exit(1); }
    console.log(`\nUsing machine: "${testMachine.name}" (id=${testMachine.id})`);
    console.log(`procoreEquipmentId: ${testMachine.procoreEquipmentId || 'none'}`);

    // Get an operator
    const opsSnap = await db.collection(`${BASE}/operators`).limit(5).get();
    const op = opsSnap.docs[0];
    if (!op) { console.error('No operator found'); process.exit(1); }
    const opData = op.data();
    console.log(`Using operator: "${opData.name}" (id=${op.id})`);

    // Create a test session (ACTIVE → triggers onSessionStart)
    const sessionRef = db.collection(`${BASE}/sessions`).doc();
    const now = admin.firestore.Timestamp.now();
    const sessionData = {
        machineId: testMachine.id,
        operatorId: op.id,
        startTime: now,
        status: 'ACTIVE',
        obraId: testMachine.obraId || null,
        source: 'TEST_SCRIPT',
        testMode: true,
    };
    await sessionRef.set(sessionData);
    console.log(`\n→ Session created: ${sessionRef.id}`);
    console.log('→ Waiting 12s for Cloud Function trigger...');
    await sleep(12000);

    // Check if Procore export was written back
    const sessionSnap = await sessionRef.get();
    const sData = sessionSnap.data();
    if (sData.procoreExport) {
        const pe = sData.procoreExport;
        console.log(`\n✓ procoreExport found:`);
        console.log(`  exported: ${pe.exported}`);
        console.log(`  timecardId: ${pe.timecardId || 'null'}`);
        console.log(`  projectId: ${pe.projectId}`);
        console.log(`  reason: ${pe.reason || 'ok'}`);

        if (pe.timecardId) {
            // Fetch timecard from Procore to verify fields
            const snap = await db.doc(INTEGRATION_PATH).get();
            const token = snap.data()?.access_token;
            console.log('\n→ Fetching timecard from Procore...');
            const tc = await procoreGet(
                `/rest/v1.0/projects/${PROJECT_ID}/timecard_entries/${pe.timecardId}`,
                token
            );
            if (tc.status === 200 && tc.data) {
                const t = tc.data;
                console.log(`\n✓ Timecard ${pe.timecardId}:`);
                console.log(`  description: "${t.description}"`);
                console.log(`  description length: ${(t.description || '').length} chars`);
                console.log(`  hours: ${t.hours}`);
                console.log(`  billable: ${t.billable}`);
                console.log(`  equipment_id: ${t.equipment_id ?? 'null'}`);
                console.log(`  login_information_id: ${t.login_information_id}`);

                const truncOk = !t.description?.includes('…') || t.description.length <= 60;
                console.log(`\n${truncOk ? '✓' : '✗'} Description truncation: ${t.description?.length <= 60 ? 'OK (≤60)' : 'TOO LONG'}`);
                console.log(`${t.billable ? '✓' : '✗'} billable = true`);
                console.log(`${t.login_information_id ? '✓' : '✗'} operator linked`);
            } else {
                console.log(`  Procore GET failed: ${tc.status}`);
            }
        }
    } else {
        console.log('\n⚠ No procoreExport field yet — may still be processing or export failed');
        console.log('  Session data:', JSON.stringify(sData, null, 2).slice(0, 500));
    }

    // Close the session
    console.log('\n→ Closing session...');
    await sleep(2000);
    await sessionRef.update({
        status: 'CLOSED',
        endTime: admin.firestore.Timestamp.now(),
        durationHours: 0.05,
    });
    console.log('→ Session closed. Check Cloud Functions logs for end-timecard export.');

    process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
