/**
 * Regista webhooks no Procore para o sandbox 4283171
 *
 * Uso:
 *   node scripts/register-procore-webhooks.js [--dry-run]
 *
 * Requer token válido no Firestore (integrations/procore.access_token)
 */

const admin = require('firebase-admin');
const https = require('https');

const DRY_RUN = process.argv.includes('--dry-run');

if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });

const db = admin.firestore();
const INTEGRATION_PATH = 'artifacts/casais-rfid/public/data/integrations/procore';
const COMPANY_ID = '4283171';
const WEBHOOK_URL = 'https://us-central1-casais-rfid.cloudfunctions.net/procoreWebhookReceiver';

const HOOK_TRIGGERS = [
    { resource: 'Equipment', actions: ['create', 'update', 'delete'] },
    { resource: 'Project', actions: ['create', 'update'] },
    { resource: 'Directory', actions: ['create', 'update'] },
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

    // Listar hooks existentes
    const listRes = await apiCall('GET', `/rest/v1.0/webhooks/hooks?company_id=${COMPANY_ID}`, token);
    console.log(`[webhooks] hooks existentes: ${JSON.stringify(listRes.data)}`);

    const existing = Array.isArray(listRes.data) ? listRes.data : [];
    const existingUrls = existing.map(h => h.delivery_url || h.url);

    for (const trigger of HOOK_TRIGGERS) {
        for (const action of trigger.actions) {
            const alreadyRegistered = existing.some(
                h => (h.delivery_url || h.url) === WEBHOOK_URL &&
                     h.resource_name === trigger.resource &&
                     h.action === action
            );
            if (alreadyRegistered) {
                console.log(`[webhooks] SKIP (already exists): ${trigger.resource}.${action}`);
                continue;
            }

            console.log(`[webhooks] ${DRY_RUN ? '[DRY] ' : ''}CREATE: ${trigger.resource}.${action} → ${WEBHOOK_URL}`);

            if (!DRY_RUN) {
                const res = await apiCall('POST', `/rest/v1.0/webhooks/hooks?company_id=${COMPANY_ID}`, token, {
                    hook: {
                        destination_url: WEBHOOK_URL,
                        resource_name: trigger.resource,
                        action,
                        company_id: parseInt(COMPANY_ID),
                        api_version: 'v1.0',
                    },
                });
                if (res.status >= 200 && res.status < 300) {
                    console.log(`[webhooks]   created id=${res.data?.id || '?'}`);
                } else {
                    console.error(`[webhooks]   FAILED ${res.status}:`, JSON.stringify(res.data));
                }
            }
        }
    }

    console.log('[webhooks] done');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
