/**
 * Regista webhooks no Procore para o sandbox 4283171
 *
 * Fluxo correcto da API v1.0:
 *   1. POST /webhooks/hooks → cria o hook (URL destino)
 *   2. POST /webhooks/hooks/{id}/triggers → associa cada evento
 *
 * Uso:
 *   node scripts/register-procore-webhooks.js [--dry-run]
 */

const admin = require('firebase-admin');
const https = require('https');

const DRY_RUN = process.argv.includes('--dry-run');

if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });

const db = admin.firestore();
const INTEGRATION_PATH = 'artifacts/casais-rfid/public/data/integrations/procore';
const COMPANY_ID = '4283171';
const WEBHOOK_URL = 'https://us-central1-casais-rfid.cloudfunctions.net/procoreWebhookReceiver';

// Procore usa "event_type" no payload e nos triggers (não "action")
const HOOK_TRIGGERS = [
    { resource_name: 'Equipment', event_type: 'create' },
    { resource_name: 'Equipment', event_type: 'update' },
    { resource_name: 'Equipment', event_type: 'delete' },
    { resource_name: 'Project',   event_type: 'create' },
    { resource_name: 'Project',   event_type: 'update' },
    { resource_name: 'Directory', event_type: 'create' },
    { resource_name: 'Directory', event_type: 'update' },
];

function apiCall(method, path, token, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'sandbox.procore.com',
            path,
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Procore-Company-Id': COMPANY_ID,
                'Content-Type': 'application/json',
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
            },
        };
        const req = https.request(options, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, data: body }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function main() {
    console.log(`[webhooks] modo: ${DRY_RUN ? 'DRY RUN' : 'REAL'}`);

    const snap = await db.doc(INTEGRATION_PATH).get();
    if (!snap.exists || !snap.data().access_token) {
        console.error('[webhooks] Procore não conectado — token ausente.');
        process.exit(1);
    }
    const token = snap.data().access_token;

    // ── Passo 1: Listar hooks existentes ──────────────────────
    console.log('\n[webhooks] === Passo 1: Listar hooks ===');
    const listRes = await apiCall('GET', `/rest/v1.0/webhooks/hooks?company_id=${COMPANY_ID}`, token);
    console.log(`[webhooks] GET hooks → ${listRes.status}: ${JSON.stringify(listRes.data).slice(0, 500)}`);

    const existing = Array.isArray(listRes.data) ? listRes.data : [];
    let hookId = existing.find(h => h.destination_url === WEBHOOK_URL || h.delivery_url === WEBHOOK_URL)?.id;

    // ── Passo 2: Criar hook se não existir ────────────────────
    if (!hookId) {
        console.log('\n[webhooks] === Passo 2: Criar hook ===');
        if (!DRY_RUN) {
            const createRes = await apiCall('POST', `/rest/v1.0/webhooks/hooks?company_id=${COMPANY_ID}`, token, {
                hook: {
                    destination_url: WEBHOOK_URL,
                    company_id: parseInt(COMPANY_ID),
                    api_version: 'v2.0',
                },
            });
            console.log(`[webhooks] POST hooks → ${createRes.status}: ${JSON.stringify(createRes.data).slice(0, 300)}`);
            hookId = createRes.data?.id;
        } else {
            console.log('[webhooks] [DRY] Criaria hook novo');
            hookId = 'DRY_HOOK_ID';
        }
    } else {
        console.log(`[webhooks] Hook existente: id=${hookId}`);
    }

    if (!hookId) {
        console.error('[webhooks] Não foi possível obter/criar hook ID — abortando.');
        process.exit(1);
    }

    // ── Passo 3: Listar triggers do hook ──────────────────────
    console.log(`\n[webhooks] === Passo 3: Listar triggers do hook ${hookId} ===`);
    const triggersRes = await apiCall('GET', `/rest/v1.0/webhooks/hooks/${hookId}/triggers?company_id=${COMPANY_ID}`, token);
    console.log(`[webhooks] GET triggers → ${triggersRes.status}: ${JSON.stringify(triggersRes.data).slice(0, 500)}`);
    const existingTriggers = Array.isArray(triggersRes.data) ? triggersRes.data : [];

    // ── Passo 4: Criar triggers em falta ──────────────────────
    console.log(`\n[webhooks] === Passo 4: Criar triggers em falta ===`);
    for (const trig of HOOK_TRIGGERS) {
        const exists = existingTriggers.some(
            t => t.resource_name === trig.resource_name && t.action === trig.action
        );
        if (exists) {
            console.log(`[webhooks] SKIP (existe): ${trig.resource_name}.${trig.action}`);
            continue;
        }

        console.log(`[webhooks] ${DRY_RUN ? '[DRY] ' : ''}CREATE trigger: ${trig.resource_name}.${trig.action}`);
        if (!DRY_RUN) {
            const r = await apiCall(
                'POST',
                `/rest/v1.0/webhooks/hooks/${hookId}/triggers?company_id=${COMPANY_ID}`,
                token,
                { trigger: { resource_name: trig.resource_name, event_type: trig.event_type } }
            );
            const ok = r.status >= 200 && r.status < 300;
            console.log(`[webhooks]   → ${r.status} ${ok ? 'OK' : 'FAILED'}: ${JSON.stringify(r.data).slice(0, 200)}`);
        }
    }

    console.log('\n[webhooks] done');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
