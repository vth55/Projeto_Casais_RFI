/**
 * Script de simulação de webhooks Procore para demo
 *
 * O sandbox Procore não envia webhooks outbound.
 * Este script simula os eventos assinando-os com HMAC correctamente.
 *
 * Uso:
 *   node scripts/demo-webhook-sim.js [scenario]
 *
 * Scenarios:
 *   create-machine      Procore → PWA: nova máquina aparece no PWA
 *   update-machine      Procore → PWA: máquina renomeada no PWA
 *   delete-machine      Procore → PWA: máquina removida no PWA
 *   create-obra         Procore → PWA: nova obra aparece no PWA
 *   all                 Todos os cenários acima em sequência (default)
 */

const https = require('https');
const crypto = require('crypto');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();

const WEBHOOK_URL = 'https://procorewebhookreceiver-mtaqaropqq-uc.a.run.app';
const INTEGRATION_PATH = 'artifacts/casais-rfid/public/data/integrations/procore';

const DEMO_EQUIPMENT_ID = `DEMO-${Date.now().toString(36).toUpperCase()}`;
const DEMO_PROJECT_ID   = `DEMO-PROJ-${Date.now().toString(36).toUpperCase()}`;
const DEMO_USER_ID      = `DEMO-USER-${Date.now().toString(36).toUpperCase()}`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function sendWebhook(secret, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const sig  = crypto.createHmac('sha256', secret).update(body).digest('hex');
        const url  = new URL(WEBHOOK_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'x-procore-signature': sig,
            },
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function checkFirestore(collection, field, value, timeout = 8000) {
    const path = `artifacts/casais-rfid/public/data/${collection}`;
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        const snap = await db.collection(path).where(field, '==', value).limit(1).get();
        if (!snap.empty) return snap.docs[0];
        await wait(1000);
    }
    return null;
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

async function scenarioCreateMachine(secret) {
    console.log('\n📡 CENÁRIO: Procore → PWA | Equipamento CRIADO no Procore');
    console.log(`   Equipment ID: ${DEMO_EQUIPMENT_ID}`);

    const r = await sendWebhook(secret, {
        resource_name: 'Equipment',
        event_type: 'CREATE',
        payload: { id: DEMO_EQUIPMENT_ID, name: `Escavadora Demo ${DEMO_EQUIPMENT_ID.slice(-6)}` },
    });
    console.log(`   Webhook enviado → HTTP ${r.status}`);

    console.log('   ⏳ A aguardar criação no Firestore...');
    const doc = await checkFirestore('machines', 'procoreEquipmentId', DEMO_EQUIPMENT_ID);
    if (doc) {
        console.log(`   ✅ Máquina criada na PWA: id=${doc.id} name="${doc.data().name}"`);
        return true;
    } else {
        console.log('   ❌ Máquina não apareceu no Firestore (timeout 8s)');
        return false;
    }
}

async function scenarioUpdateMachine(secret) {
    console.log('\n📡 CENÁRIO: Procore → PWA | Equipamento RENOMEADO no Procore');
    const newName = `Escavadora Demo [RENOMEADA] ${DEMO_EQUIPMENT_ID.slice(-6)}`;

    const r = await sendWebhook(secret, {
        resource_name: 'Equipment',
        event_type: 'UPDATE',
        payload: { id: DEMO_EQUIPMENT_ID, name: newName },
    });
    console.log(`   Webhook enviado → HTTP ${r.status}`);

    await wait(3000);
    const doc = await checkFirestore('machines', 'procoreEquipmentId', DEMO_EQUIPMENT_ID);
    if (doc && doc.data().name === newName) {
        console.log(`   ✅ Nome actualizado na PWA: "${doc.data().name}"`);
        return true;
    } else {
        console.log(`   ⚠️  Nome actual: "${doc?.data().name}" (esperado: "${newName}")`);
        return false;
    }
}

async function scenarioDeleteMachine(secret) {
    console.log('\n📡 CENÁRIO: Procore → PWA | Equipamento ELIMINADO no Procore');

    const r = await sendWebhook(secret, {
        resource_name: 'Equipment',
        event_type: 'DELETE',
        payload: { id: DEMO_EQUIPMENT_ID },
    });
    console.log(`   Webhook enviado → HTTP ${r.status}`);

    await wait(3000);
    const doc = await checkFirestore('machines', 'procoreEquipmentId', DEMO_EQUIPMENT_ID, 4000);
    if (!doc) {
        console.log('   ✅ Máquina removida da PWA');
        return true;
    } else {
        // Pode ter ficado marcada com procore_removed (para máquinas reais)
        const pd = doc.data();
        if (pd.pairingStatus === 'procore_removed') {
            console.log('   ✅ Máquina marcada procore_removed na PWA');
            return true;
        }
        console.log('   ⚠️  Máquina ainda existe:', JSON.stringify(pd));
        return false;
    }
}

async function scenarioCreateObra(secret) {
    console.log('\n📡 CENÁRIO: Procore → PWA | Projecto CRIADO no Procore');
    console.log(`   Project ID: ${DEMO_PROJECT_ID}`);

    const r = await sendWebhook(secret, {
        resource_name: 'Project',
        event_type: 'CREATE',
        payload: { id: DEMO_PROJECT_ID, name: `Obra Demo ${DEMO_PROJECT_ID.slice(-6)}` },
    });
    console.log(`   Webhook enviado → HTTP ${r.status}`);

    console.log('   ⏳ A aguardar criação no Firestore...');
    const doc = await checkFirestore('obras', 'procoreProjectId', DEMO_PROJECT_ID);
    if (doc) {
        console.log(`   ✅ Obra criada na PWA: id=${doc.id} name="${doc.data().name}"`);
        // Cleanup
        await db.doc(`artifacts/casais-rfid/public/data/obras/${doc.id}`).delete();
        console.log('   🧹 Obra de demo eliminada');
        return true;
    } else {
        console.log('   ❌ Obra não apareceu no Firestore (timeout 8s)');
        return false;
    }
}

async function scenarioCreateOperator(secret) {
    console.log('\n📡 CENÁRIO: Procore → PWA | Operador CRIADO no Procore Directory');
    console.log(`   User ID: ${DEMO_USER_ID}`);

    const r = await sendWebhook(secret, {
        resource_name: 'Directory',
        event_type: 'CREATE',
        payload: { id: DEMO_USER_ID, first_name: 'Demo', last_name: 'Operador Webhook', email_address: 'demo.webhook@casais.pt' },
    });
    console.log(`   Webhook enviado → HTTP ${r.status}`);

    console.log('   ⏳ A aguardar criação no Firestore...');
    const doc = await checkFirestore('operators', 'procoreUserId', DEMO_USER_ID);
    if (doc) {
        console.log(`   ✅ Operador criado na PWA: id=${doc.id} name="${doc.data().name}"`);
        await db.doc(`artifacts/casais-rfid/public/data/operators/${doc.id}`).delete();
        console.log('   🧹 Operador de demo eliminado');
        return true;
    } else {
        console.log('   ❌ Operador não apareceu no Firestore (timeout 8s)');
        return false;
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const scenario = process.argv[2] || 'all';
    console.log('=== CASAIS FLEET INTELLIGENCE — Demo Webhook Simulator ===');
    console.log(`Scenario: ${scenario}`);

    // Obter secret do Firestore
    const snap = await db.doc(INTEGRATION_PATH).get();
    if (!snap.exists) throw new Error('Integração Procore não conectada');
    // O secret está no Secret Manager — usar o valor hardcoded (não no Firestore por segurança)
    const secret = process.env.PROCORE_WEBHOOK_SECRET || 'gEl91KVekzdRsp0UB8GctDYTuQSLoy7Oqv45PXma';

    const results = {};

    if (scenario === 'create-machine' || scenario === 'all') {
        results['create-machine'] = await scenarioCreateMachine(secret);
        if (scenario !== 'all') { process.exit(0); }
        await wait(2000);
    }
    if (scenario === 'update-machine' || scenario === 'all') {
        results['update-machine'] = await scenarioUpdateMachine(secret);
        if (scenario !== 'all') { process.exit(0); }
        await wait(2000);
    }
    if (scenario === 'delete-machine' || scenario === 'all') {
        results['delete-machine'] = await scenarioDeleteMachine(secret);
        if (scenario !== 'all') { process.exit(0); }
        await wait(2000);
    }
    if (scenario === 'create-obra' || scenario === 'all') {
        results['create-obra'] = await scenarioCreateObra(secret);
        if (scenario !== 'all') { process.exit(0); }
        await wait(2000);
    }
    if (scenario === 'create-operator' || scenario === 'all') {
        results['create-operator'] = await scenarioCreateOperator(secret);
    }

    console.log('\n=== RESULTADOS ===');
    let pass = 0, fail = 0;
    for (const [k, v] of Object.entries(results)) {
        console.log(`  ${v ? '✅' : '❌'} ${k}`);
        v ? pass++ : fail++;
    }
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('[demo-webhook-sim] erro:', e.message); process.exit(1); });
