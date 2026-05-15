/**
 * QA SCRIPT — Procore Integration Check
 * Casais Fleet Intelligence — 2026-05-15
 *
 * Tarefas:
 *   T1 — Lista equipamentos no Procore sandbox (GET equipment_register v2.1)
 *   T2 — Lista webhooks activos
 *   T3 — Cria equipamento de teste, aguarda, verifica Firestore
 *   T4 — Tenta DELETE, fallback PATCH inactive, verifica Firestore
 *
 * Uso:
 *   node scripts/qa-procore-check.js [--skip-create]
 *
 * --skip-create: salta T3+T4 (apenas leitura)
 */

const admin = require('firebase-admin');
const https = require('https');

if (!admin.apps.length) admin.initializeApp({ projectId: 'casais-rfid' });

const db = admin.firestore();
const INTEGRATION_PATH = 'artifacts/casais-rfid/public/data/integrations/procore';
const COMPANY_ID = '4283171';
const SANDBOX_HOST = 'sandbox.procore.com';

const SKIP_CREATE = process.argv.includes('--skip-create');

// ─── helpers ─────────────────────────────────────────────────────────────────

function apiCall(method, path, token, body) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: SANDBOX_HOST,
            path,
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Procore-Company-Id': COMPANY_ID,
                'Accept': 'application/json',
                ...(payload
                    ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
                    : {}),
            },
        };
        const req = https.request(options, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                let data;
                try { data = JSON.parse(raw); } catch { data = raw; }
                resolve({ status: res.statusCode, headers: res.headers, data });
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function divider(title) {
    console.log('\n' + '═'.repeat(60));
    console.log(`  ${title}`);
    console.log('═'.repeat(60));
}

// ─── T1 — Equipamentos ────────────────────────────────────────────────────────

async function task1_listEquipment(token) {
    divider('T1 — Equipamentos no Procore Sandbox');

    const res = await apiCall('GET',
        `/rest/v2.1/companies/${COMPANY_ID}/equipment_register?per_page=100`,
        token
    );

    console.log(`HTTP status: ${res.status}`);

    if (res.status !== 200) {
        console.error('ERRO — resposta inesperada:', JSON.stringify(res.data, null, 2));
        return [];
    }

    // v2.1 resposta: { data: [...], meta: { total_count: N } }
    const items = Array.isArray(res.data?.data) ? res.data.data
                : Array.isArray(res.data)       ? res.data
                : [];

    const totalCount = res.data?.meta?.total_count ?? items.length;

    console.log(`Total registado (meta.total_count): ${totalCount}`);
    console.log(`Items recebidos nesta página:       ${items.length}`);

    let removidoCount = 0;
    console.log('\n--- Lista de equipamentos ---');
    for (const eq of items) {
        const name   = eq.name || eq.description || '(sem nome)';
        const status = eq.status?.name || eq.status || eq.status_id || '(status desconhecido)';
        const id     = eq.id || eq.equipment_id || '?';
        const ownership = eq.ownership_type || '-';
        const isRemovido = name.includes('[REMOVIDO]');
        if (isRemovido) removidoCount++;
        console.log(`  id=${id}  name="${name}"  status="${status}"  ownership="${ownership}"${isRemovido ? '  *** [REMOVIDO]' : ''}`);
    }

    console.log(`\nEquipamentos com [REMOVIDO] no nome: ${removidoCount}`);
    return items;
}

// ─── T2 — Webhooks ────────────────────────────────────────────────────────────

async function task2_listWebhooks(token) {
    divider('T2 — Webhooks activos');

    const EXPECTED_ID = 326843;

    const res = await apiCall('GET',
        `/rest/v1.0/webhooks/hooks?company_id=${COMPANY_ID}`,
        token
    );

    console.log(`HTTP status: ${res.status}`);

    if (res.status !== 200) {
        console.error('ERRO — resposta:', JSON.stringify(res.data, null, 2));
        return;
    }

    const hooks = Array.isArray(res.data) ? res.data : [];
    console.log(`Total webhooks: ${hooks.length}`);

    if (hooks.length === 0) {
        console.log('  (nenhum webhook registado)');
        return;
    }

    console.log('\n--- Lista de webhooks ---');
    let foundExpected = false;
    for (const h of hooks) {
        const id  = h.id;
        const url = h.delivery_url || h.url || h.destination_url || '?';
        const res_name = h.resource_name || h.api_object_name || '?';
        const action   = h.action || '?';
        const active   = h.active !== undefined ? h.active : '?';
        if (id === EXPECTED_ID) foundExpected = true;
        console.log(`  id=${id}  resource="${res_name}"  action="${action}"  active=${active}`);
        console.log(`         url="${url}"`);
    }

    console.log(`\nWebhook id=${EXPECTED_ID} ${foundExpected ? 'ENCONTRADO ✓' : 'NÃO encontrado ✗'}`);
}

// ─── T3 — Criar equipamento de teste ─────────────────────────────────────────

async function task3_createEquipment(token) {
    divider('T3 — Criar equipamento de teste (Procore → PWA)');

    // ULIDs estáveis do sandbox (FINDINGS.md 2026-05-12)
    const STATUS_ACTIVE_ULID   = '01KPRV693GQFM6FCM77D59YKFT';
    const CATEGORY_TERRA_ULID  = '01KQCGF5S8GME0ZQNGKXPS9WN8';
    const TYPE_ESCAV_ULID      = '01KQCGFKFZK4P5H84XG98SYPM6';

    const equipment_id = `QA-TEST-${Date.now()}`;
    const body = {
        name: 'QA Test Sync - DELETE ME',
        equipment_id,
        status_id: STATUS_ACTIVE_ULID,
        category_id: CATEGORY_TERRA_ULID,
        type_id: TYPE_ESCAV_ULID,
        ownership: 'owned',
    };

    console.log('POST body:', JSON.stringify(body, null, 2));

    const res = await apiCall('POST',
        `/rest/v2.1/companies/${COMPANY_ID}/equipment_register`,
        token,
        body
    );

    console.log(`\nHTTP status: ${res.status}`);

    if (res.status !== 201 && res.status !== 200) {
        console.error('ERRO ao criar equipamento:', JSON.stringify(res.data, null, 2));
        return null;
    }

    // v2.1: resposta em { data: {...} }
    const created = res.data?.data || res.data;
    const createdId = created?.id || created?.equipment_id || '?';

    console.log(`Equipamento criado com sucesso!`);
    console.log(`  ULID/id: ${createdId}`);
    console.log(`  nome:    ${created?.name}`);
    console.log(`  status:  ${created?.status?.name || created?.status_id}`);

    // Aguardar 6 segundos para webhook disparar
    console.log('\nAguardando 6 segundos (janela webhook)...');
    await sleep(6000);

    // Verificar Firestore
    const firestoreEquipPath = `${INTEGRATION_PATH}/equipment/${createdId}`;
    console.log(`\nA verificar Firestore em: ${firestoreEquipPath}`);

    const snap = await db.doc(firestoreEquipPath).get();
    if (snap.exists) {
        const d = snap.data();
        console.log('Firestore ENCONTROU o equipamento! (webhook funcionou)');
        console.log(`  name:         ${d.name}`);
        console.log(`  _synced_at:   ${d._synced_at?.toDate?.()}`);
        console.log(`  procore_id:   ${d.procore_id || d.id}`);
    } else {
        console.log('Firestore NAO encontrou o equipamento ainda.');
        console.log('(sync agendado corre de hora em hora — webhook pode não ter disparado)');

        // Tentar também a path machines (projector usa procore_<ULID>)
        const machinesPath = `artifacts/casais-rfid/public/data/machines/procore_${createdId}`;
        const machineSnap = await db.doc(machinesPath).get();
        if (machineSnap.exists) {
            console.log(`Mas encontrou em machines/${machineSnap.id} — sync correto via projector!`);
        }
    }

    return createdId;
}

// ─── T4 — Deletar equipamento de teste ───────────────────────────────────────

async function task4_deleteEquipment(token, equipmentId) {
    divider('T4 — Deletar equipamento de teste');

    if (!equipmentId) {
        console.log('SKIP — equipmentId nulo (T3 falhou ou --skip-create activo)');
        return;
    }

    console.log(`Equipamento alvo: ${equipmentId}`);

    // --- Tentativa DELETE ---
    console.log('\n[4a] Tentando DELETE...');
    const delRes = await apiCall('DELETE',
        `/rest/v2.1/companies/${COMPANY_ID}/equipment_register/${equipmentId}`,
        token
    );
    console.log(`DELETE HTTP status: ${delRes.status}`);
    if (delRes.status === 204 || delRes.status === 200) {
        console.log('DELETE bem-sucedido!');
    } else if (delRes.status === 405) {
        console.log('DELETE retornou 405 Method Not Allowed — COMPORTAMENTO ESPERADO no sandbox');
        console.log('(limitacao sandbox documentada em FINDINGS.md / project_procore_sandbox_limitations.md)');
    } else {
        console.log('DELETE retornou status inesperado:', JSON.stringify(delRes.data));
    }

    // --- Fallback PATCH com status inactive ---
    const STATUS_INACTIVE_ULID = '01KPRV6BKYAZSM28AY99YN7QBM';  // "Inactive" status ULID (tentativa)
    console.log('\n[4b] Fallback: PATCH para marcar como inactivo...');
    const patchBody = {
        name: 'QA Test Sync - DELETE ME [REMOVIDO]',
        status_id: STATUS_INACTIVE_ULID,
    };
    const patchRes = await apiCall('PATCH',
        `/rest/v2.1/companies/${COMPANY_ID}/equipment_register/${equipmentId}`,
        token,
        patchBody
    );
    console.log(`PATCH HTTP status: ${patchRes.status}`);
    if (patchRes.status === 200) {
        const patched = patchRes.data?.data || patchRes.data;
        console.log('PATCH respondeu 200');
        console.log(`  status actual: ${patched?.status?.name || patched?.status_id || '?'}`);
        console.log('  NOTA: sandbox pode retornar 200 mas nao aplicar o status (limitacao documentada)');
    } else {
        console.log('PATCH erro:', JSON.stringify(patchRes.data));
    }

    // Aguardar 10 segundos
    console.log('\nAguardando 10 segundos para propagacao...');
    await sleep(10000);

    // Verificar _removed_at no Firestore
    const firestoreEquipPath = `${INTEGRATION_PATH}/equipment/${equipmentId}`;
    console.log(`\nA verificar Firestore em: ${firestoreEquipPath}`);
    const snap = await db.doc(firestoreEquipPath).get();
    if (snap.exists) {
        const d = snap.data();
        const removedAt = d._removed_at;
        if (removedAt) {
            console.log(`Firestore reflectiu remoção! _removed_at = ${removedAt?.toDate?.()}`);
        } else {
            console.log('Firestore tem o documento mas _removed_at está ausente.');
            console.log(`  name:   ${d.name}`);
            console.log(`  status: ${d.status || d.status_id || '?'}`);
            console.log('  (sync horário ainda não correu — normal)');
        }
    } else {
        console.log('Documento não existe em Firestore (pode ter sido removido pelo sync ou nunca foi synced).');
    }

    // Verificar também na coleção machines
    const machinesPath = `artifacts/casais-rfid/public/data/machines/procore_${equipmentId}`;
    const machineSnap = await db.doc(machinesPath).get();
    if (machineSnap.exists) {
        const md = machineSnap.data();
        console.log(`\nMachines/${machineSnap.id}:`);
        console.log(`  _removed_at: ${md._removed_at?.toDate?.() || 'ausente'}`);
        console.log(`  status:      ${md.status || '?'}`);
    }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('='.repeat(60));
    console.log('  QA PROCORE CHECK — Casais Fleet Intelligence');
    console.log(`  Data: ${new Date().toISOString()}`);
    console.log(`  Sandbox: ${SANDBOX_HOST} | Company: ${COMPANY_ID}`);
    console.log(`  Skip create: ${SKIP_CREATE}`);
    console.log('='.repeat(60));

    // Ler token do Firestore
    const snap = await db.doc(INTEGRATION_PATH).get();
    if (!snap.exists || !snap.data().access_token) {
        console.error('FATAL — Procore nao conectado. Token ausente em Firestore.');
        console.error(`  Path: ${INTEGRATION_PATH}`);
        process.exit(1);
    }

    const data = snap.data();
    const token = data.access_token;
    const expiresAt = data.expires_at?.toMillis ? new Date(data.expires_at.toMillis()) : '?';
    const connectedAt = data.connected_at?.toDate ? data.connected_at.toDate() : '?';

    console.log(`\nToken encontrado em Firestore.`);
    console.log(`  expires_at:   ${expiresAt}`);
    console.log(`  connected_at: ${connectedAt}`);
    console.log(`  needs_reauth: ${data.needs_reauth || false}`);
    console.log(`  token (prefix): ${token.substring(0, 12)}...`);

    // Executar tarefas
    const equipmentList = await task1_listEquipment(token);
    await task2_listWebhooks(token);

    let createdId = null;
    if (!SKIP_CREATE) {
        createdId = await task3_createEquipment(token);
        await task4_deleteEquipment(token, createdId);
    } else {
        console.log('\n[T3/T4 SKIP] --skip-create activo');
    }

    divider('SUMÁRIO FINAL');
    console.log(`Equipamentos no sandbox:  ${equipmentList.length}`);
    console.log(`[REMOVIDO] no nome:       ${equipmentList.filter(e => (e.name || '').includes('[REMOVIDO]')).length}`);
    console.log(`Equipamento criado (T3):  ${createdId || 'N/A'}`);
    console.log(`\nFim do QA. Verificar output acima para detalhes.`);
    console.log('='.repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('\n[FATAL]', e.message);
        console.error(e.stack);
        process.exit(1);
    });
