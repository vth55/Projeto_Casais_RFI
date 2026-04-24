/**
 * CASAIS Fleet Intelligence — Procore Bridge
 *
 * Cloud Function única que serve como ponte entre o frontend e a API REST do
 * Procore. Faz routing interno por path:
 *
 *   GET  /api/procore/authorize    → inicia OAuth2 flow (302 → Procore)
 *   GET  /api/procore/callback     → recebe ?code, troca por tokens, persiste
 *   GET  /api/procore/status       → JSON { connected, expires_at, last_sync_*, ... }
 *   POST /api/procore/disconnect   → apaga tokens
 *   GET  /api/procore/projects     → live read da API (lista de obras)
 *   GET  /api/procore/equipment    → live read da API (inventário)
 *   GET  /api/procore/directory    → live read da API (utilizadores)
 *   POST /api/procore/sync         → puxa tudo e persiste em Firestore
 *
 * Token storage:
 *   Firestore doc → artifacts/casais-rfid/public/data/integrations/procore
 *
 * Helper exportado:
 *   getValidAccessToken()  → re-usado nos chunks 1B/1C para chamadas à API.
 *
 * Secrets necessários (Firebase):
 *   PROCORE_CLIENT_ID
 *   PROCORE_CLIENT_SECRET
 *   PROCORE_COMPANY_ID
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

// ============================================
// CONSTANTES
// ============================================

const APP_ID = 'casais-rfid';
const INTEGRATION_DOC_PATH = `artifacts/${APP_ID}/public/data/integrations/procore`;

// Sandbox endpoints. Quando passar a produção, trocar para:
//   LOGIN_URL → https://login.procore.com
//   API_URL   → https://api.procore.com
const PROCORE_LOGIN_URL = 'https://login-sandbox.procore.com';
const PROCORE_API_URL = 'https://sandbox.procore.com';
const PROCORE_AUTH_URL = `${PROCORE_LOGIN_URL}/oauth/authorize`;
const PROCORE_TOKEN_URL = `${PROCORE_LOGIN_URL}/oauth/token`;

// REST API — Chunk 1B
const PROCORE_API_VERSION = '/rest/v1.0';
const PROCORE_PER_PAGE = 100;       // page size para todas as listagens
const PROCORE_MAX_PAGES = 50;       // safety cap → 5000 itens por recurso
const FIRESTORE_BATCH_LIMIT = 400;  // < limite hard de 500 ops/batch

// URL pública da Cloud Function (via Firebase Hosting rewrite).
// Tem de bater certo com um dos Redirect URIs configurados no portal Procore.
const REDIRECT_URI = 'https://casais-rfid.web.app/api/procore/callback';

// Margem de segurança para refresh: refrescamos o token 5min antes de expirar
const REFRESH_SAFETY_MARGIN_MS = 5 * 60 * 1000;

// ============================================
// SECRETS
// ============================================

const PROCORE_CLIENT_ID = defineSecret('PROCORE_CLIENT_ID');
const PROCORE_CLIENT_SECRET = defineSecret('PROCORE_CLIENT_SECRET');
const PROCORE_COMPANY_ID = defineSecret('PROCORE_COMPANY_ID');

// ============================================
// HELPERS
// ============================================

const db = () => admin.firestore();
const integrationDoc = () => db().doc(INTEGRATION_DOC_PATH);

/**
 * Persiste a resposta do token endpoint do Procore no Firestore.
 * O Procore devolve: { access_token, refresh_token, token_type, expires_in, created_at, ... }
 */
async function persistTokenResponse(tokenJson, { isRefresh = false } = {}) {
    const now = Date.now();
    const expiresInMs = (tokenJson.expires_in || 7200) * 1000;
    const expiresAt = admin.firestore.Timestamp.fromMillis(now + expiresInMs);

    const payload = {
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token,
        token_type: tokenJson.token_type || 'Bearer',
        scope: tokenJson.scope || null,
        expires_at: expiresAt,
        last_refreshed_at: admin.firestore.FieldValue.serverTimestamp(),
        company_id: process.env.PROCORE_COMPANY_ID || null,
    };

    if (!isRefresh) {
        payload.connected_at = admin.firestore.FieldValue.serverTimestamp();
    }

    await integrationDoc().set(payload, { merge: true });
    return payload;
}

/**
 * Troca o `code` recebido no callback por um par access/refresh token.
 */
async function exchangeCodeForToken(code) {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.PROCORE_CLIENT_ID,
        client_secret: process.env.PROCORE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
    });

    console.log('[procoreBridge] Token exchange →', PROCORE_TOKEN_URL);
    console.log('[procoreBridge] client_id:', process.env.PROCORE_CLIENT_ID?.substring(0, 10) + '...');
    console.log('[procoreBridge] redirect_uri:', REDIRECT_URI);

    const response = await fetch(PROCORE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('[procoreBridge] Token exchange FAILED:', response.status, errText);
        throw new Error(`Procore token exchange failed (${response.status}): ${errText}`);
    }

    return await response.json();
}

/**
 * Refresca o access token usando o refresh token persistido.
 */
async function refreshAccessToken(currentRefreshToken) {
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentRefreshToken,
        client_id: process.env.PROCORE_CLIENT_ID,
        client_secret: process.env.PROCORE_CLIENT_SECRET,
    });

    const response = await fetch(PROCORE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Procore token refresh failed (${response.status}): ${errText}`);
    }

    const tokenJson = await response.json();
    await persistTokenResponse(tokenJson, { isRefresh: true });
    return tokenJson;
}

/**
 * HELPER PÚBLICO — devolve um access token válido, refrescando se necessário.
 * Vai ser usado pelos chunks 1B e 1C para chamadas à API Procore.
 *
 * @returns {Promise<string>} access_token válido
 * @throws {Error} se a integração ainda não estiver conectada
 */
async function getValidAccessToken() {
    const snap = await integrationDoc().get();
    if (!snap.exists) {
        throw new Error('PROCORE_NOT_CONNECTED: Nenhum token guardado. Visite /api/procore/authorize.');
    }

    const data = snap.data();
    if (!data.access_token || !data.refresh_token) {
        throw new Error('PROCORE_NOT_CONNECTED: Tokens incompletos.');
    }

    const expiresAtMs = data.expires_at?.toMillis ? data.expires_at.toMillis() : (data.expires_at || 0);
    const isExpiringSoon = Date.now() + REFRESH_SAFETY_MARGIN_MS >= expiresAtMs;

    if (isExpiringSoon) {
        console.log('[procoreBridge] Access token a expirar — a refrescar...');
        const refreshed = await refreshAccessToken(data.refresh_token);
        return refreshed.access_token;
    }

    return data.access_token;
}

// ============================================
// PROCORE REST API — leitura (Chunk 1B)
// ============================================

/**
 * Wrapper genérico para chamadas autenticadas à API REST do Procore.
 * Garante token válido, injecta `Procore-Company-Id` e parseia erros.
 *
 * @param {string} endpoint  ex: '/rest/v1.0/projects'
 * @param {object} [opts]
 * @param {object} [opts.query]   query string params
 * @param {string} [opts.method]  default 'GET'
 * @param {object} [opts.body]    JSON body para POST/PUT/PATCH
 * @returns {Promise<{ data: any, total: number|null, page: number, perPage: number }>}
 */
async function procoreFetch(endpoint, { query = {}, method = 'GET', body } = {}) {
    const accessToken = await getValidAccessToken();
    const companyId = process.env.PROCORE_COMPANY_ID;
    if (!companyId) {
        throw new Error('PROCORE_COMPANY_ID secret não está configurado.');
    }

    const url = new URL(`${PROCORE_API_URL}${endpoint}`);
    Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
            url.searchParams.set(k, String(v));
        }
    });

    const fetchOpts = {
        method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Procore-Company-Id': companyId,
            'Accept': 'application/json',
        },
    };

    if (body !== undefined) {
        fetchOpts.headers['Content-Type'] = 'application/json';
        fetchOpts.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), fetchOpts);

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(
            `Procore API ${method} ${endpoint} → ${response.status}: ${errText.slice(0, 500)}`
        );
    }

    const totalHeader = response.headers.get('total');
    const perPageHeader = response.headers.get('per-page');
    const data = await response.json();

    return {
        data,
        total: totalHeader ? parseInt(totalHeader, 10) : null,
        page: parseInt(query.page || '1', 10),
        perPage: perPageHeader ? parseInt(perPageHeader, 10) : PROCORE_PER_PAGE,
    };
}

/**
 * Pagina automaticamente um endpoint do Procore até esgotar resultados,
 * respeitando o cap de segurança `PROCORE_MAX_PAGES`.
 */
async function procoreFetchAll(endpoint, baseQuery = {}) {
    const all = [];
    for (let page = 1; page <= PROCORE_MAX_PAGES; page++) {
        const { data } = await procoreFetch(endpoint, {
            query: { ...baseQuery, page, per_page: PROCORE_PER_PAGE },
        });

        if (!Array.isArray(data) || data.length === 0) break;
        all.push(...data);
        if (data.length < PROCORE_PER_PAGE) break;
    }
    return all;
}

// ---------- Resource fetchers ----------

/**
 * GET /rest/v1.0/projects?company_id=...
 * Lista de projetos (obras) acessíveis à conta. Maps 1:1 a "Obras" no Casais Fleet.
 */
async function fetchProjects() {
    return procoreFetchAll(`${PROCORE_API_VERSION}/projects`, {
        company_id: process.env.PROCORE_COMPANY_ID,
    });
}

/**
 * GET /rest/v1.0/companies/{company_id}/equipment
 * Inventário de equipamentos a nível de empresa. Cruza com `machines` no Casais.
 * Tenta múltiplas versões da API (v1.0 legacy, v1.1 managed).
 */
async function fetchEquipment() {
    const companyId = process.env.PROCORE_COMPANY_ID;
    // Tentar primeiro a versão legacy (v1.0)
    try {
        return await procoreFetchAll(`${PROCORE_API_VERSION}/companies/${companyId}/equipment`);
    } catch (legacyErr) {
        console.log('[procoreBridge] Legacy equipment failed, trying managed equipment (v1.1)...');
        // Fallback para managed equipment v1.1
        try {
            return await procoreFetchAll(`/rest/v1.1/companies/${companyId}/managed_equipment`);
        } catch (managedErr) {
            console.error('[procoreBridge] Both equipment endpoints failed');
            throw legacyErr; // throw original error
        }
    }
}

/**
 * GET /rest/v1.0/companies/{company_id}/users
 * Diretório de utilizadores (operadores, encarregados, engenheiros).
 * Cruza com `operators` no Casais.
 */
async function fetchDirectory() {
    const companyId = process.env.PROCORE_COMPANY_ID;
    return procoreFetchAll(`${PROCORE_API_VERSION}/companies/${companyId}/users`);
}

// ---------- Equipment Setup (Configurable Fieldsets + Create) ----------

/**
 * Diagnóstico completo do estado de Equipment no Procore.
 * Testa múltiplos endpoints para determinar qual funciona no sandbox.
 */
async function diagnoseEquipment() {
    const companyId = process.env.PROCORE_COMPANY_ID;
    const results = {
        company_id: companyId,
        endpoints_tested: [],
        working_endpoint: null,
        fieldsets: null,
        categories: null,
        recommendation: null,
    };

    // 1. Testar endpoint legacy equipment
    try {
        const { data } = await procoreFetch(`${PROCORE_API_VERSION}/companies/${companyId}/equipment`, {
            query: { per_page: 1 },
        });
        results.endpoints_tested.push({ endpoint: 'v1.0/equipment', status: 'ok', count: Array.isArray(data) ? data.length : '?' });
        results.working_endpoint = 'v1.0/equipment';
    } catch (err) {
        results.endpoints_tested.push({ endpoint: 'v1.0/equipment', status: 'error', error: err.message.slice(0, 200) });
    }

    // 2. Testar endpoint managed equipment v1.1
    try {
        const { data } = await procoreFetch(`/rest/v1.1/companies/${companyId}/managed_equipment`, {
            query: { per_page: 1 },
        });
        results.endpoints_tested.push({ endpoint: 'v1.1/managed_equipment', status: 'ok', count: Array.isArray(data) ? data.length : '?' });
        if (!results.working_endpoint) results.working_endpoint = 'v1.1/managed_equipment';
    } catch (err) {
        results.endpoints_tested.push({ endpoint: 'v1.1/managed_equipment', status: 'error', error: err.message.slice(0, 200) });
    }

    // 3. Listar configurable fieldsets
    try {
        const { data } = await procoreFetch(`${PROCORE_API_VERSION}/configurable_field_sets`, {
            query: { company_id: companyId },
        });
        results.fieldsets = Array.isArray(data) ? data : [data];
    } catch (err) {
        // Tentar com tool filter
        try {
            const { data } = await procoreFetch(`${PROCORE_API_VERSION}/companies/${companyId}/configurable_field_sets`, {
                query: {},
            });
            results.fieldsets = Array.isArray(data) ? data : [data];
        } catch (err2) {
            results.fieldsets = { error: err.message.slice(0, 200), alt_error: err2.message.slice(0, 200) };
        }
    }

    // 4. Tentar listar categorias de equipment
    try {
        const { data } = await procoreFetch(`${PROCORE_API_VERSION}/companies/${companyId}/equipment/categories`, {
            query: {},
        });
        results.categories = Array.isArray(data) ? data : [data];
    } catch (err) {
        results.categories = { error: err.message.slice(0, 200) };
    }

    // 5. Tentar criar um fieldset para equipment
    try {
        const { data } = await procoreFetch(`${PROCORE_API_VERSION}/configurable_field_sets`, {
            method: 'POST',
            body: {
                configurable_field_set: {
                    name: 'Default Equipment Fieldset',
                    tool: 'equipment',
                    company_id: parseInt(companyId, 10),
                },
            },
        });
        results.fieldset_create = { status: 'ok', data };
    } catch (err) {
        results.fieldset_create = { status: 'error', error: err.message.slice(0, 300) };
    }

    // 6. Testar endpoint de tools da empresa
    try {
        const { data } = await procoreFetch(`${PROCORE_API_VERSION}/companies/${companyId}/tools`, {
            query: {},
        });
        const equipmentTools = Array.isArray(data)
            ? data.filter(t => t.name?.toLowerCase().includes('equipment') || t.key?.toLowerCase().includes('equipment'))
            : [];
        results.company_tools = { total: Array.isArray(data) ? data.length : '?', equipment_tools: equipmentTools };
    } catch (err) {
        results.company_tools = { error: err.message.slice(0, 200) };
    }

    // 7. Tentar POST de equipment mesmo com GET a dar 404
    try {
        const testEquipment = {
            equipment: {
                name: '__test_probe__',
                equipment_id: 'TEST-PROBE-001',
            },
        };
        const { data } = await procoreFetch(`${PROCORE_API_VERSION}/companies/${companyId}/equipment`, {
            method: 'POST',
            body: testEquipment,
        });
        results.equipment_post_probe = { status: 'ok', data };
    } catch (err) {
        results.equipment_post_probe = { status: 'error', error: err.message.slice(0, 300) };
    }

    // 8. Tentar managed equipment POST (v1.1)
    try {
        const testManaged = {
            managed_equipment: {
                name: '__test_probe__',
            },
        };
        const { data } = await procoreFetch(`/rest/v1.1/companies/${companyId}/managed_equipment`, {
            method: 'POST',
            body: testManaged,
        });
        results.managed_equipment_post_probe = { status: 'ok', data };
    } catch (err) {
        results.managed_equipment_post_probe = { status: 'error', error: err.message.slice(0, 300) };
    }

    // 9. Tentar endpoints a nível de PROJETO (equipment pode estar project-level)
    try {
        // Primeiro buscar os projectos que temos
        const projects = await fetchProjects();
        if (projects.length > 0) {
            const projectId = projects[0].id;
            results.project_level = { project_id: projectId, project_name: projects[0].name };

            // Tentar equipment a nível de projecto
            const projectEndpoints = [
                { name: 'project_equipment_v1.0', path: `${PROCORE_API_VERSION}/projects/${projectId}/equipment` },
                { name: 'project_managed_equipment_v1.1', path: `/rest/v1.1/projects/${projectId}/managed_equipment` },
                { name: 'project_equipment_logs', path: `${PROCORE_API_VERSION}/projects/${projectId}/equipment_logs` },
                { name: 'project_daily_equipment_logs', path: `${PROCORE_API_VERSION}/projects/${projectId}/daily_logs/equipment_logs` },
                { name: 'project_tools', path: `${PROCORE_API_VERSION}/projects/${projectId}/tools` },
            ];

            results.project_level.endpoints = [];
            for (const ep of projectEndpoints) {
                try {
                    const { data } = await procoreFetch(ep.path, { query: { per_page: 1 } });
                    results.project_level.endpoints.push({
                        name: ep.name,
                        status: 'ok',
                        count: Array.isArray(data) ? data.length : '?',
                        sample: Array.isArray(data) ? data.slice(0, 2) : data,
                    });
                } catch (err) {
                    results.project_level.endpoints.push({
                        name: ep.name,
                        status: 'error',
                        error: err.message.slice(0, 200),
                    });
                }
            }
        }
    } catch (err) {
        results.project_level = { error: err.message.slice(0, 200) };
    }

    // 10. Listar TODAS as tools disponíveis no projecto (sem limit)
    if (results.project_level?.project_id) {
        try {
            const projectId = results.project_level.project_id;
            const { data } = await procoreFetch(`${PROCORE_API_VERSION}/projects/${projectId}/tools`, {
                query: { per_page: 100 },
            });
            results.project_level.all_tools = Array.isArray(data) ? data : [data];
        } catch (err) {
            results.project_level.all_tools_error = err.message.slice(0, 200);
        }
    }

    // 11. Tentar ATIVAR tools de equipment no projecto via PATCH
    if (results.project_level?.all_tools) {
        const projectId = results.project_level.project_id;
        const equipmentTools = results.project_level.all_tools.filter(
            t => ['managed_equipment', 'equipment_register', 'timesheets'].includes(t.engine_name) && !t.is_active
        );
        results.project_level.tool_activation = [];

        for (const tool of equipmentTools) {
            // Formato correcto: PATCH /projects/{id}/tools com body { "tools": [{ "id": ..., "is_active": true }] }
            try {
                const { data } = await procoreFetch(`${PROCORE_API_VERSION}/projects/${projectId}/tools`, {
                    method: 'PATCH',
                    body: {
                        tools: [{ id: tool.id, is_active: true }],
                    },
                });
                results.project_level.tool_activation.push({
                    tool: tool.engine_name,
                    id: tool.id,
                    status: 'ok',
                    data: Array.isArray(data) ? data.find(t => t.id === tool.id) : data,
                });
            } catch (err) {
                // Tentar formato alternativo: array no toplevel
                try {
                    const { data } = await procoreFetch(`${PROCORE_API_VERSION}/projects/${projectId}/tools`, {
                        method: 'PATCH',
                        body: [{ id: tool.id, is_active: true }],
                    });
                    results.project_level.tool_activation.push({
                        tool: tool.engine_name,
                        id: tool.id,
                        status: 'ok_alt',
                        data: Array.isArray(data) ? data.find(t => t.id === tool.id) : data,
                    });
                } catch (err2) {
                    results.project_level.tool_activation.push({
                        tool: tool.engine_name,
                        id: tool.id,
                        status: 'error',
                        error: err.message.slice(0, 200),
                        alt_error: err2.message.slice(0, 200),
                    });
                }
            }
        }
    }

    // 13. Recomendação baseada nos resultados
    const projectOk = results.project_level?.endpoints?.some(e => e.status === 'ok');
    const toolActivated = results.project_level?.tool_activation?.some(t => t.status === 'ok');
    if (results.working_endpoint) {
        results.recommendation = `Endpoint ${results.working_endpoint} funciona. Pode criar equipamentos via POST.`;
    } else if (results.equipment_post_probe?.status === 'ok' || results.managed_equipment_post_probe?.status === 'ok') {
        results.recommendation = 'GET falha mas POST funciona — endpoint de criação está activo.';
    } else if (results.fieldset_create?.status === 'ok') {
        results.recommendation = 'Fieldset criado com sucesso — retry GET de equipment agora.';
    } else if (projectOk) {
        const workingEps = results.project_level.endpoints.filter(e => e.status === 'ok').map(e => e.name);
        results.recommendation = `Company-level bloqueado mas project-level funciona: ${workingEps.join(', ')}. Usar endpoints a nível de projecto.`;
    } else if (toolActivated) {
        results.recommendation = 'Tool de equipment activada com sucesso! Corra o diagnóstico novamente para verificar se os endpoints agora respondem.';
    } else {
        results.recommendation = 'Nenhum endpoint de equipment responde (company nem project level). A ferramenta Equipment precisa de ser activada no Procore Admin > Company Tools.';
    }

    return results;
}

/**
 * Cria um equipamento no Procore via API REST.
 * Tenta v1.0 (legacy) primeiro, depois v1.1 (managed).
 *
 * @param {object} equipmentData
 * @param {string} equipmentData.name           Nome do equipamento (ex: "Escavadora 01")
 * @param {string} [equipmentData.equipment_id] ID interno (ex: "ESC-001")
 * @param {string} [equipmentData.category]     Categoria
 * @param {string} [equipmentData.type]         Tipo
 * @param {string} [equipmentData.make]         Fabricante
 * @param {string} [equipmentData.model]        Modelo
 * @param {string} [equipmentData.serial_number] Número de série
 * @param {number} [equipmentData.year]         Ano
 * @param {string} [equipmentData.status]       Estado (active, inactive, etc.)
 * @param {string} [equipmentData.ownership]    owned, rented, subcontracted
 * @returns {Promise<{data: object, endpoint: string}>}
 */
async function createEquipment(equipmentData) {
    const companyId = process.env.PROCORE_COMPANY_ID;

    // Tentar legacy endpoint primeiro (v1.0)
    try {
        const result = await procoreFetch(
            `${PROCORE_API_VERSION}/companies/${companyId}/equipment`,
            {
                method: 'POST',
                body: { equipment: equipmentData },
            }
        );
        console.log(`[procoreBridge] equipment created (v1.0) id=${result.data?.id} name=${equipmentData.name}`);
        return { data: result.data, endpoint: 'v1.0/equipment' };
    } catch (legacyErr) {
        console.log('[procoreBridge] Legacy equipment POST failed:', legacyErr.message.slice(0, 200));

        // Tentar managed equipment v1.1
        try {
            const result = await procoreFetch(
                `/rest/v1.1/companies/${companyId}/managed_equipment`,
                {
                    method: 'POST',
                    body: { managed_equipment: equipmentData },
                }
            );
            console.log(`[procoreBridge] equipment created (v1.1) id=${result.data?.id} name=${equipmentData.name}`);
            return { data: result.data, endpoint: 'v1.1/managed_equipment' };
        } catch (managedErr) {
            console.error('[procoreBridge] Both equipment create endpoints failed');
            // Devolver ambos os erros para diagnóstico
            const error = new Error(
                `Legacy: ${legacyErr.message.slice(0, 300)} | Managed: ${managedErr.message.slice(0, 300)}`
            );
            throw error;
        }
    }
}

// ---------- Persistência Firestore ----------

/**
 * Escreve uma coleção de items numa subcoleção da integração Procore.
 * Usa batches de 400 ops e merge para ser idempotente entre syncs.
 *
 * Path: artifacts/casais-rfid/public/data/integrations/procore/{subcollection}/{id}
 */
async function persistCollection(subcollection, items, idField = 'id') {
    if (!Array.isArray(items) || items.length === 0) return 0;

    const colRef = integrationDoc().collection(subcollection);
    const firestore = db();
    let written = 0;

    for (let i = 0; i < items.length; i += FIRESTORE_BATCH_LIMIT) {
        const slice = items.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = firestore.batch();

        slice.forEach((item) => {
            const rawId = item?.[idField];
            if (rawId === undefined || rawId === null) return;
            const docId = String(rawId);
            batch.set(
                colRef.doc(docId),
                {
                    ...item,
                    _synced_at: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );
            written++;
        });

        await batch.commit();
    }

    return written;
}

// ============================================
// PROCORE WRITE-BACK — Timecard Entries (Phase 2)
// ============================================

/**
 * Cria uma entrada de Timecard no Procore via POST à API REST.
 *
 * @param {object} params
 * @param {string} params.project_id        ID da obra no Procore
 * @param {string} params.date              Data no formato YYYY-MM-DD
 * @param {number} params.hours             Duração em horas (ex: 7.5)
 * @param {string} params.description       Descrição da sessão (ex: "Sessão IoT — ESC-042")
 * @param {number} params.login_information_id  ID do operador (Procore user ID)
 * @param {object} [opts]
 * @param {string} [opts.notes]             Notas adicionais
 * @param {number} [opts.equipment_id]      ID do equipamento associado
 * @returns {Promise<object>} Resposta JSON do Procore
 */
async function createTimecardEntry({ project_id, date, hours, description, login_information_id }, opts = {}) {
    const endpoint = `${PROCORE_API_VERSION}/projects/${project_id}/timecard_entries`;

    const payload = {
        date,
        hours,
        description,
        login_information_id,
    };

    if (opts.notes) {
        payload.notes = opts.notes;
    }
    if (opts.equipment_id) {
        payload.equipment_id = opts.equipment_id;
    }

    const result = await procoreFetch(endpoint, {
        method: 'POST',
        body: payload,
    });

    console.log(`[procoreBridge] timecard created id=${result.data?.id} | ${date} | ${hours}h`);
    return result.data;
}

// ============================================
// PROCORE WRITE-BACK — Daily Logs (Phase 3)
// ============================================

/**
 * Cria um Daily Log (notes_log) no Procore para um projeto numa data específica.
 *
 * A API de Daily Logs do Procore organiza-se por sub-tipos:
 *   - notes_logs    → notas gerais (o nosso resumo diário)
 *   - quantity_logs → quantidades de trabalho
 *   - equipment_logs → uso de equipamento (requer Equipment tool activo)
 *
 * Usamos notes_logs como veículo principal porque está sempre disponível.
 *
 * @param {object} params
 * @param {string} params.project_id        ID da obra no Procore
 * @param {string} params.date              Data no formato YYYY-MM-DD
 * @param {string} params.description       Resumo do dia (ex: "3 máquinas activas, 12.5h totais")
 * @param {object} [opts]
 * @param {string} [opts.weather]           Condições meteorológicas (ex: "Limpo, 22°C")
 * @param {number} [opts.headcount]         Nº de operadores activos nesse dia
 * @param {string} [opts.notes]             Notas adicionais (detalhe por máquina/operador)
 * @returns {Promise<object>} Resposta JSON do Procore
 */
async function createDailyLog({ project_id, date, description }, opts = {}) {
    // Tentar notes_log primeiro (sempre disponível)
    const notesEndpoint = `${PROCORE_API_VERSION}/projects/${project_id}/daily_logs/notes_logs`;

    const body = [];
    // Entrada principal — resumo IoT
    const mainNote = {
        notes_log: {
            log_date: date,
            body: description,
        },
    };
    if (opts.notes) {
        mainNote.notes_log.body += `\n\n${opts.notes}`;
    }

    try {
        const result = await procoreFetch(notesEndpoint, {
            method: 'POST',
            body: mainNote,
        });
        console.log(`[procoreBridge] daily_log (notes_log) created id=${result.data?.id} | ${date}`);
        return result.data;
    } catch (notesErr) {
        // Fallback: tentar endpoint genérico daily_logs
        console.log('[procoreBridge] notes_log failed, trying generic daily_logs...');
        const genericEndpoint = `${PROCORE_API_VERSION}/projects/${project_id}/daily_logs`;
        const payload = {
            log_date: date,
            description,
        };
        if (opts.weather)   payload.weather_conditions = opts.weather;
        if (opts.headcount) payload.headcount = opts.headcount;
        if (opts.notes)     payload.notes = opts.notes;

        const result = await procoreFetch(genericEndpoint, {
            method: 'POST',
            body: payload,
        });
        console.log(`[procoreBridge] daily_log (generic) created id=${result.data?.id} | ${date}`);
        return result.data;
    }
}

// ============================================
// PROCORE WRITE-BACK — Cost Entries (Phase 3)
// ============================================

/**
 * Cria uma entrada de custo directo no Procore.
 * Usado para registar custos de combustível, horas de equipamento, etc.
 *
 * @param {object} params
 * @param {string} params.project_id           ID da obra no Procore
 * @param {string} params.date                 Data no formato YYYY-MM-DD
 * @param {string} params.description          Descrição do custo
 * @param {number} params.amount               Valor monetário (EUR)
 * @param {object} [opts]
 * @param {string} [opts.cost_type]            Tipo: 'equipment'|'fuel'|'labor' (default: 'equipment')
 * @param {number} [opts.quantity]             Quantidade (ex: litros, horas)
 * @param {number} [opts.unit_cost]            Custo unitário
 * @param {string} [opts.unit]                 Unidade (ex: 'L', 'h', '€')
 * @param {number} [opts.equipment_id]         ID do equipamento no Procore
 * @returns {Promise<object>} Resposta JSON do Procore
 */
async function createCostEntry({ project_id, date, description, amount }, opts = {}) {
    const endpoint = `${PROCORE_API_VERSION}/projects/${project_id}/direct_costs`;

    const payload = {
        direct_cost: {
            invoice_date: date,
            description,
            status: 'approved',
        },
    };

    const lineItem = {
        description,
        amount: amount || 0,
    };
    if (opts.quantity)  lineItem.quantity  = opts.quantity;
    if (opts.unit_cost) lineItem.unit_cost = opts.unit_cost;
    if (opts.unit)      lineItem.uom       = opts.unit;

    payload.direct_cost.line_items = [lineItem];

    const result = await procoreFetch(endpoint, {
        method: 'POST',
        body: payload,
    });

    console.log(`[procoreBridge] cost_entry created id=${result.data?.id} | ${date} | €${amount}`);
    return result.data;
}

// ============================================
// HANDLERS POR ROTA
// ============================================

/**
 * GET /authorize → 302 para o Procore OAuth consent screen.
 */
function handleAuthorize(req, res) {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.PROCORE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        // state opcional para CSRF — para já não usamos pois é um flow manual de admin
    });
    const url = `${PROCORE_AUTH_URL}?${params.toString()}`;
    res.redirect(302, url);
}

/**
 * GET /callback?code=... → troca code por tokens, persiste, redireciona para a app.
 */
async function handleCallback(req, res) {
    const { code, error, error_description } = req.query;

    if (error) {
        console.error('[procoreBridge] /callback erro do Procore:', error, error_description);
        return res
            .status(400)
            .send(`<h1>Procore OAuth Error</h1><p>${error}: ${error_description || ''}</p>`);
    }

    if (!code) {
        return res.status(400).send('<h1>Missing ?code parameter</h1>');
    }

    try {
        const tokenJson = await exchangeCodeForToken(code);
        await persistTokenResponse(tokenJson);
        console.log('[procoreBridge] OAuth callback — tokens persisted');

        // Página simples de sucesso. Mais à frente o ConfiguracoesView fará polling /status.
        res.status(200).send(`
            <!DOCTYPE html>
            <html lang="pt">
            <head>
                <meta charset="utf-8">
                <title>Procore conectado</title>
                <style>
                    body {
                        font-family: -apple-system, system-ui, sans-serif;
                        background: #f4f6f8;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .card {
                        background: white;
                        padding: 48px 56px;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.08);
                        text-align: center;
                        max-width: 460px;
                    }
                    h1 { color: #005EB8; margin: 0 0 12px; }
                    p { color: #4a5568; margin: 0 0 24px; }
                    a {
                        display: inline-block;
                        background: #005EB8;
                        color: white;
                        padding: 12px 28px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Procore conectado</h1>
                    <p>A integração com o Procore foi estabelecida com sucesso. Já podes voltar à app Casais Fleet Intelligence.</p>
                    <a href="https://casais-rfid.web.app">Voltar à app</a>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('[procoreBridge] /callback exception:', err);
        res.status(500).send(`<h1>Procore connection failed</h1><pre>${err.message}</pre>`);
    }
}

/**
 * GET /status → JSON com estado da conexão.
 */
async function handleStatus(req, res) {
    try {
        const snap = await integrationDoc().get();
        if (!snap.exists) {
            return res.json({ connected: false });
        }

        const data = snap.data();
        const expiresAtMs = data.expires_at?.toMillis ? data.expires_at.toMillis() : (data.expires_at || 0);
        const now = Date.now();

        return res.json({
            connected: !!data.access_token,
            expires_at: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
            expires_in_seconds: expiresAtMs ? Math.max(0, Math.floor((expiresAtMs - now) / 1000)) : 0,
            connected_at: data.connected_at?.toMillis?.()
                ? new Date(data.connected_at.toMillis()).toISOString()
                : null,
            last_refreshed_at: data.last_refreshed_at?.toMillis?.()
                ? new Date(data.last_refreshed_at.toMillis()).toISOString()
                : null,
            company_id: data.company_id || null,
            scope: data.scope || null,
            // Chunk 1B — sync meta
            last_sync_at: data.last_sync_at?.toMillis?.()
                ? new Date(data.last_sync_at.toMillis()).toISOString()
                : null,
            last_sync_duration_ms: data.last_sync_duration_ms || null,
            last_sync_counts: data.last_sync_counts || null,
            last_sync_errors: data.last_sync_errors || null,
        });
    } catch (err) {
        console.error('[procoreBridge] /status exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * GET /projects → JSON com a lista de projetos (live, sem persistência).
 */
async function handleProjects(req, res) {
    try {
        const projects = await fetchProjects();
        return res.json({ count: projects.length, projects });
    } catch (err) {
        console.error('[procoreBridge] /projects exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * GET /equipment → JSON com inventário de equipamentos da empresa.
 */
async function handleEquipment(req, res) {
    try {
        const equipment = await fetchEquipment();
        return res.json({ count: equipment.length, equipment });
    } catch (err) {
        console.error('[procoreBridge] /equipment exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * GET /directory → JSON com utilizadores da empresa.
 */
async function handleDirectory(req, res) {
    try {
        const directory = await fetchDirectory();
        return res.json({ count: directory.length, directory });
    } catch (err) {
        console.error('[procoreBridge] /directory exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * Núcleo de sincronização. Reutilizável tanto pelo handler HTTP `/sync`
 * (Chunk 1B) como pelo Cloud Scheduler (Chunk 1C).
 *
 * @param {object} [opts]
 * @param {string} [opts.trigger='manual']  rótulo para logs/meta ('manual'|'cron')
 * @returns {Promise<{projects:number, equipment:number, directory:number, errors:object, duration_ms:number, trigger:string}>}
 */
async function runFullSync({ trigger = 'manual' } = {}) {
    const startedAt = Date.now();
    const summary = {
        projects: 0,
        equipment: 0,
        directory: 0,
        errors: {},
    };

    // Cada recurso é independente — falha de um não bloqueia os outros.
    try {
        const projects = await fetchProjects();
        summary.projects = await persistCollection('projects', projects);
    } catch (err) {
        console.error(`[procoreSync:${trigger}] projects error:`, err);
        summary.errors.projects = err.message;
    }

    try {
        const equipment = await fetchEquipment();
        summary.equipment = await persistCollection('equipment', equipment);
    } catch (err) {
        console.error(`[procoreSync:${trigger}] equipment error:`, err);
        summary.errors.equipment = err.message;
    }

    try {
        const directory = await fetchDirectory();
        summary.directory = await persistCollection('directory', directory);
    } catch (err) {
        console.error(`[procoreSync:${trigger}] directory error:`, err);
        summary.errors.directory = err.message;
    }

    const durationMs = Date.now() - startedAt;
    const hasErrors = Object.keys(summary.errors).length > 0;

    try {
        await integrationDoc().set(
            {
                last_sync_at: admin.firestore.FieldValue.serverTimestamp(),
                last_sync_duration_ms: durationMs,
                last_sync_trigger: trigger,
                last_sync_counts: {
                    projects: summary.projects,
                    equipment: summary.equipment,
                    directory: summary.directory,
                },
                last_sync_errors: hasErrors ? summary.errors : null,
            },
            { merge: true }
        );
    } catch (err) {
        console.error(`[procoreSync:${trigger}] meta write failed:`, err);
    }

    console.log(
        `[procoreSync:${trigger}] done in ${durationMs}ms — ` +
        `projects=${summary.projects}, equipment=${summary.equipment}, directory=${summary.directory}, ` +
        `errors=${hasErrors ? Object.keys(summary.errors).join(',') : 'none'}`
    );

    return { ...summary, duration_ms: durationMs, trigger };
}

/**
 * POST /sync → wrapper HTTP do `runFullSync`. Devolve 200 (clean) ou 207 (parcial).
 */
async function handleSync(req, res) {
    try {
        const result = await runFullSync({ trigger: 'manual' });
        const hasErrors = Object.keys(result.errors).length > 0;
        return res.status(hasErrors ? 207 : 200).json(result);
    } catch (err) {
        console.error('[procoreBridge] /sync top-level error:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * POST /disconnect → apaga o documento de integração.
 */
async function handleDisconnect(req, res) {
    try {
        await integrationDoc().delete();
        return res.json({ disconnected: true });
    } catch (err) {
        console.error('[procoreBridge] /disconnect exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * GET /equipment-diagnose → diagnóstico completo do estado de Equipment no Procore.
 * Testa endpoints, fieldsets, categorias e devolve recomendação.
 */
async function handleEquipmentDiagnose(req, res) {
    try {
        const diagnosis = await diagnoseEquipment();
        return res.json(diagnosis);
    } catch (err) {
        console.error('[procoreBridge] /equipment-diagnose exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * GET /equipment-test → teste rápido pós-activação de tools.
 * Tenta todos os endpoints possíveis para listar e criar equipment.
 */
async function handleEquipmentTest(req, res) {
    const companyId = process.env.PROCORE_COMPANY_ID;
    const results = { company_id: companyId, tests: [] };

    // Buscar projecto
    let projectId;
    try {
        const projects = await fetchProjects();
        projectId = projects[0]?.id;
        results.project_id = projectId;
    } catch (err) {
        return res.status(500).json({ error: 'Cannot fetch projects: ' + err.message });
    }

    // Lista de endpoints a testar (GET e POST)
    const tests = [
        // Company level
        { name: 'company_equipment_GET', method: 'GET', path: `${PROCORE_API_VERSION}/companies/${companyId}/equipment` },
        { name: 'company_managed_GET', method: 'GET', path: `/rest/v1.1/companies/${companyId}/managed_equipment` },
        // Project level
        { name: 'project_equipment_GET', method: 'GET', path: `${PROCORE_API_VERSION}/projects/${projectId}/equipment` },
        { name: 'project_managed_GET', method: 'GET', path: `/rest/v1.1/projects/${projectId}/managed_equipment` },
        { name: 'project_equipment_logs_GET', method: 'GET', path: `${PROCORE_API_VERSION}/projects/${projectId}/equipment_logs` },
        // POST attempts
        { name: 'company_equipment_POST', method: 'POST', path: `${PROCORE_API_VERSION}/companies/${companyId}/equipment`, body: { equipment: { name: 'Test Probe', equipment_id: 'PROBE-001' } } },
        { name: 'company_managed_POST', method: 'POST', path: `/rest/v1.1/companies/${companyId}/managed_equipment`, body: { managed_equipment: { name: 'Test Probe' } } },
        { name: 'project_equipment_POST', method: 'POST', path: `${PROCORE_API_VERSION}/projects/${projectId}/equipment`, body: { equipment: { name: 'Test Probe', equipment_id: 'PROBE-001' } } },
        { name: 'project_managed_POST', method: 'POST', path: `/rest/v1.1/projects/${projectId}/managed_equipment`, body: { managed_equipment: { name: 'Test Probe' } } },
    ];

    for (const test of tests) {
        try {
            const opts = { method: test.method };
            if (test.method === 'GET') opts.query = { per_page: 5 };
            if (test.body) opts.body = test.body;

            const { data } = await procoreFetch(test.path, opts);
            results.tests.push({
                name: test.name,
                status: 'ok',
                data: Array.isArray(data) ? { count: data.length, sample: data.slice(0, 2) } : data,
            });
        } catch (err) {
            results.tests.push({
                name: test.name,
                status: 'error',
                code: err.message.match(/→ (\d+):/)?.[1] || '?',
                error: err.message.slice(0, 300),
            });
        }
    }

    const working = results.tests.filter(t => t.status === 'ok');
    results.summary = working.length > 0
        ? `${working.length} endpoint(s) funcionam: ${working.map(w => w.name).join(', ')}`
        : 'Nenhum endpoint funciona ainda. Equipment pode não estar disponível nesta sandbox.';

    return res.json(results);
}

/**
 * POST /equipment-create → cria um equipamento no Procore.
 *
 * Body esperado:
 * {
 *   "name": "Escavadora 01",
 *   "equipment_id": "ESC-001",
 *   "category": "Heavy Equipment",
 *   "type": "Excavator",
 *   "make": "CAT",
 *   "model": "320F",
 *   "year": 2022,
 *   "status": "active",
 *   "ownership": "owned"
 * }
 */
async function handleEquipmentCreate(req, res) {
    try {
        const equipmentData = req.body;

        if (!equipmentData || !equipmentData.name) {
            return res.status(400).json({
                error: 'Missing required field: name',
                hint: 'POST body must include at least { "name": "..." }',
                received: equipmentData,
            });
        }

        const result = await createEquipment(equipmentData);
        return res.status(201).json({
            success: true,
            endpoint_used: result.endpoint,
            equipment: result.data,
        });
    } catch (err) {
        console.error('[procoreBridge] /equipment-create exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * POST /equipment-bulk → cria múltiplos equipamentos de uma vez.
 *
 * Body esperado:
 * {
 *   "items": [
 *     { "name": "Escavadora 01", "equipment_id": "ESC-001", ... },
 *     { "name": "Grua 02", "equipment_id": "GRU-002", ... }
 *   ]
 * }
 */
async function handleEquipmentBulk(req, res) {
    try {
        const { items } = req.body || {};

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: 'Missing or empty items array',
                hint: 'POST body must include { "items": [{ "name": "..." }, ...] }',
            });
        }

        const results = [];
        const errors = [];

        for (const item of items) {
            try {
                const result = await createEquipment(item);
                results.push({ name: item.name, success: true, id: result.data?.id, endpoint: result.endpoint });
            } catch (err) {
                errors.push({ name: item.name, success: false, error: err.message.slice(0, 300) });
            }
        }

        const status = errors.length === 0 ? 201 : (results.length > 0 ? 207 : 500);
        return res.status(status).json({
            total: items.length,
            created: results.length,
            failed: errors.length,
            results,
            errors,
        });
    } catch (err) {
        console.error('[procoreBridge] /equipment-bulk exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * POST /daily-log → cria um Daily Log no Procore (teste manual).
 *
 * Body esperado:
 * {
 *   "project_id": "12345",
 *   "date": "2026-04-23",
 *   "description": "Casais IoT — 5 sessões, 22.5h totais, 3 máquinas",
 *   "notes": "Máquinas: ESC-001, GRU-002\nOperadores: João, Maria",
 *   "headcount": 2
 * }
 */
async function handleDailyLog(req, res) {
    try {
        const { project_id, date, description, notes, headcount, weather } = req.body || {};

        if (!project_id || !date || !description) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['project_id', 'date', 'description'],
                received: { project_id, date, description },
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                error: 'Invalid date format',
                expected: 'YYYY-MM-DD',
                received: date,
            });
        }

        const result = await createDailyLog(
            { project_id, date, description },
            { notes, headcount, weather }
        );

        return res.status(201).json({
            success: true,
            daily_log: result,
        });
    } catch (err) {
        console.error('[procoreBridge] /daily-log exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * POST /writeback → cria um Timecard Entry no Procore (teste manual).
 *
 * Body esperado:
 * {
 *   "project_id": "12345",
 *   "date": "2026-04-06",
 *   "hours": 7.5,
 *   "description": "Sessão IoT — ESC-042",
 *   "login_information_id": 98765,
 *   "notes": "Opcional",
 *   "equipment_id": 111
 * }
 */
async function handleWriteback(req, res) {
    try {
        const { project_id, date, hours, description, login_information_id, notes, equipment_id } = req.body || {};

        if (!project_id || !date || !hours || !description || !login_information_id) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['project_id', 'date', 'hours', 'description', 'login_information_id'],
                received: { project_id, date, hours, description, login_information_id },
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                error: 'Invalid date format',
                expected: 'YYYY-MM-DD',
                received: date,
            });
        }

        if (typeof hours !== 'number' || hours <= 0 || hours > 24) {
            return res.status(400).json({
                error: 'Invalid hours value',
                expected: 'Number between 0 and 24',
                received: hours,
            });
        }

        const result = await createTimecardEntry(
            { project_id, date, hours, description, login_information_id },
            { notes, equipment_id }
        );

        return res.status(201).json({
            success: true,
            timecard: result,
        });
    } catch (err) {
        console.error('[procoreBridge] /writeback exception:', err);
        return res.status(500).json({ error: err.message });
    }
}

// ============================================
// EXPORT — CLOUD FUNCTION
// ============================================

const procoreBridge = onRequest(
    {
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
        cors: true,
    },
    async (req, res) => {
        // O path completo chega como `/api/procore/<action>` por causa do hosting rewrite.
        // Normalizamos extraindo apenas a última parte significativa.
        const path = (req.path || '').replace(/\/+$/, '');
        const action = path.split('/').pop() || '';

        try {
            // ── Rotas públicas (OAuth flow) ─────────────────────────────
            if (req.method === 'GET' && action === 'authorize') {
                return handleAuthorize(req, res);
            }
            if (req.method === 'GET' && action === 'callback') {
                return await handleCallback(req, res);
            }

            // ── Auth check para todas as outras rotas ───────────────────
            const authHeader = req.headers.authorization || '';
            const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
            if (!idToken) {
                return res.status(401).json({ error: 'Missing Authorization header' });
            }
            try {
                req._user = await admin.auth().verifyIdToken(idToken);
            } catch (authErr) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
            if (req.method === 'GET' && action === 'status') {
                return await handleStatus(req, res);
            }
            if ((req.method === 'POST' || req.method === 'DELETE') && action === 'disconnect') {
                return await handleDisconnect(req, res);
            }
            // Chunk 1B — leitura da API REST
            if (req.method === 'GET' && action === 'projects') {
                return await handleProjects(req, res);
            }
            if (req.method === 'GET' && action === 'equipment') {
                return await handleEquipment(req, res);
            }
            if (req.method === 'GET' && action === 'equipment-diagnose') {
                return await handleEquipmentDiagnose(req, res);
            }
            if (req.method === 'GET' && action === 'equipment-test') {
                return await handleEquipmentTest(req, res);
            }
            if (req.method === 'POST' && action === 'equipment-create') {
                return await handleEquipmentCreate(req, res);
            }
            if (req.method === 'POST' && action === 'equipment-bulk') {
                return await handleEquipmentBulk(req, res);
            }
            if (req.method === 'GET' && action === 'directory') {
                return await handleDirectory(req, res);
            }
            if ((req.method === 'POST' || req.method === 'GET') && action === 'sync') {
                return await handleSync(req, res);
            }
            if (req.method === 'POST' && action === 'daily-log') {
                return await handleDailyLog(req, res);
            }
            if (req.method === 'POST' && action === 'writeback') {
                return await handleWriteback(req, res);
            }

            return res.status(404).json({
                error: 'Unknown procore action',
                hint: 'Try /api/procore/{authorize|callback|status|disconnect|projects|equipment|equipment-diagnose|equipment-create|equipment-bulk|directory|sync|daily-log|writeback}',
                received: { method: req.method, path: req.path, action },
            });
        } catch (err) {
            console.error('[procoreBridge] Top-level exception:', err);
            return res.status(500).json({ error: err.message });
        }
    }
);

module.exports = {
    procoreBridge,
    // Helpers OAuth (Chunk 1A)
    getValidAccessToken,
    PROCORE_API_URL,
    // Helpers REST API (Chunk 1B) — re-utilizáveis em jobs agendados (Chunk 1C):
    procoreFetch,
    procoreFetchAll,
    fetchProjects,
    fetchEquipment,
    fetchDirectory,
    persistCollection,
    runFullSync, // ← consumido pelo procoreScheduler (Chunk 1C)
    // Equipment setup
    diagnoseEquipment,
    createEquipment,
    // Write-back (Phase 2 + 3)
    createTimecardEntry,
    createDailyLog,
    createCostEntry,
    // Re-exportar os secrets para que index.js os possa associar a outras functions:
    PROCORE_CLIENT_ID,
    PROCORE_CLIENT_SECRET,
    PROCORE_COMPANY_ID,
};
