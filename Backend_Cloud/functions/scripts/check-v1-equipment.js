/**
 * check-v1-equipment.js — Verifica quais equipamentos estão disponíveis via v1.0
 * no projeto Procore 328122 (sandbox).
 *
 * Uso: node scripts/check-v1-equipment.js
 */

const admin = require('firebase-admin');
const https = require('https');

if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });

const db = admin.firestore();
const INTEGRATION_PATH = 'artifacts/casais-rfid/public/data/integrations/procore';
const COMPANY_ID = '4283171';
const PROJECT_ID = '328122';
const SANDBOX_HOST = 'sandbox.procore.com';

function apiGet(path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SANDBOX_HOST,
            path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Procore-Company-Id': COMPANY_ID,
                'Accept': 'application/json',
            },
        };
        const req = https.request(options, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                let data;
                try { data = JSON.parse(raw); } catch { data = raw; }
                resolve({ status: res.statusCode, data });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    const snap = await db.doc(INTEGRATION_PATH).get();
    const token = snap.data()?.access_token;
    if (!token) { console.error('No access token in Firestore'); process.exit(1); }

    console.log('\n=== v1.0 Project Equipment ===');
    const r1 = await apiGet(`/rest/v1.0/projects/${PROJECT_ID}/equipment`, token);
    console.log(`Status: ${r1.status}`);
    const items = Array.isArray(r1.data) ? r1.data : (r1.data?.data || r1.data);
    if (Array.isArray(items)) {
        console.log(`Count: ${items.length}`);
        items.slice(0, 20).forEach(e => {
            console.log(`  id=${e.id} | name="${e.name}" | equipment_id="${e.equipment_id}" | status="${e.status}"`);
        });
    } else {
        console.log('Response:', JSON.stringify(r1.data, null, 2).slice(0, 1000));
    }

    console.log('\n=== v1.0 Company Equipment ===');
    const r1b = await apiGet(`/rest/v1.0/companies/${COMPANY_ID}/equipment`, token);
    console.log(`Status: ${r1b.status}`);
    const items1b = Array.isArray(r1b.data) ? r1b.data : (r1b.data?.data || r1b.data);
    if (Array.isArray(items1b)) {
        console.log(`Count: ${items1b.length}`);
        items1b.slice(0, 20).forEach(e => {
            console.log(`  id=${e.id} | name="${e.name}" | equipment_id="${e.equipment_id}"`);
        });
    } else {
        console.log('Response:', JSON.stringify(r1b.data, null, 2).slice(0, 500));
    }

    console.log('\n=== v2.1 Company Equipment (for comparison) ===');
    const r2 = await apiGet(`/rest/v2.1/companies/${COMPANY_ID}/equipment_register?per_page=20`, token);
    console.log(`Status: ${r2.status}`);
    const items2 = Array.isArray(r2.data) ? r2.data : (r2.data?.data || r2.data);
    if (Array.isArray(items2)) {
        console.log(`Count: ${items2.length}`);
        items2.slice(0, 10).forEach(e => {
            console.log(`  ULID=${e.id} | name="${e.name}" | equip_id="${e.equipment_id}"`);
        });
    } else {
        console.log('Response:', JSON.stringify(r2.data, null, 2).slice(0, 500));
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
