/**
 * Apaga os equipamentos [REMOVIDO] do Procore sandbox via API.
 * Não requer browser — usa o token OAuth guardado no Firestore.
 *
 * Uso:
 *   node scripts/delete-removido-equipment.js [--dry-run]
 *
 * Após este script: o próximo procoreScheduledSync vai marcar os itens
 * como _removed_at na cache, e projectProcoreToPwa vai limpar os stubs PWA.
 */

const admin = require('firebase-admin');
const https = require('https');

const DRY_RUN = process.argv.includes('--dry-run');

if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });

const db = admin.firestore();
const INTEGRATION_PATH = 'artifacts/casais-rfid/public/data/integrations/procore';
const COMPANY_ID = '4283171';

function apiCall(method, path, token, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
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
        const req = https.request(opts, res => {
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
    console.log(`[delete-removido] modo: ${DRY_RUN ? 'DRY RUN' : 'REAL'}`);

    const snap = await db.doc(INTEGRATION_PATH).get();
    if (!snap.exists || !snap.data().access_token) {
        console.error('[delete-removido] Procore não conectado');
        process.exit(1);
    }
    const token = snap.data().access_token;

    // Buscar todos os equipamentos da empresa
    const res = await apiCall('GET', `/rest/v2.1/companies/${COMPANY_ID}/equipment_register?per_page=100`, token);
    if (res.status !== 200) {
        console.error('[delete-removido] erro ao listar equipamentos:', res.status, JSON.stringify(res.data).slice(0, 300));
        process.exit(1);
    }
    // v2.1 wraps results in { data: [...] }
    const equipment = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    if (!equipment.length) {
        console.error('[delete-removido] lista vazia ou formato inesperado');
        process.exit(1);
    }

    const toDelete = equipment.filter(e => String(e.name || '').includes('[REMOVIDO]'));
    console.log(`[delete-removido] ${equipment.length} equipamentos total, ${toDelete.length} com [REMOVIDO]`);
    if (toDelete.length === 0) {
        console.log('[delete-removido] nada para apagar.');
        return;
    }

    for (const eq of toDelete) {
        console.log(`[delete-removido] ${DRY_RUN ? '[DRY] ' : ''}DELETE id=${eq.id} name="${eq.name}"`);
        if (DRY_RUN) continue;

        // Tentar DELETE v2.1
        const del = await apiCall('DELETE', `/rest/v2.1/companies/${COMPANY_ID}/equipment_register/${eq.id}`, token);
        if (del.status >= 200 && del.status < 300) {
            console.log(`[delete-removido]   OK (${del.status})`);
            continue;
        }

        // Fallback: PATCH status para archived/inactive
        console.warn(`[delete-removido]   DELETE ${del.status} — tentando archive via PATCH...`);
        const patch = await apiCall('PATCH', `/rest/v2.1/companies/${COMPANY_ID}/equipment_register/${eq.id}`, token, {
            equipment: { status: 'inactive' },
        });
        if (patch.status >= 200 && patch.status < 300) {
            console.log(`[delete-removido]   archived OK (${patch.status})`);
        } else {
            console.error(`[delete-removido]   PATCH também falhou (${patch.status}):`, JSON.stringify(patch.data).slice(0, 200));
        }
    }

    console.log('[delete-removido] done');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
