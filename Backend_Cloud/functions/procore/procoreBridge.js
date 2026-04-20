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

    const expiresAtMs = data.expires_at?.toMillis?.() || 0;
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
 */
async function fetchEquipment() {
    const companyId = process.env.PROCORE_COMPANY_ID;
    return procoreFetchAll(`${PROCORE_API_VERSION}/companies/${companyId}/equipment`);
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
 * Cria um Daily Log no Procore para um projeto numa data específica.
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
    const endpoint = `${PROCORE_API_VERSION}/projects/${project_id}/daily_logs`;

    const payload = {
        log_date: date,
        description,
    };

    if (opts.weather)   payload.weather_conditions = opts.weather;
    if (opts.headcount) payload.headcount = opts.headcount;
    if (opts.notes)     payload.notes = opts.notes;

    const result = await procoreFetch(endpoint, {
        method: 'POST',
        body: payload,
    });

    console.log(`[procoreBridge] daily_log created id=${result.data?.id} | ${date} | ${description.slice(0, 60)}`);
    return result.data;
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
        const expiresAtMs = data.expires_at?.toMillis?.() || 0;
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
            if (req.method === 'GET' && action === 'authorize') {
                return handleAuthorize(req, res);
            }
            if (req.method === 'GET' && action === 'callback') {
                return await handleCallback(req, res);
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
            if (req.method === 'GET' && action === 'directory') {
                return await handleDirectory(req, res);
            }
            if ((req.method === 'POST' || req.method === 'GET') && action === 'sync') {
                return await handleSync(req, res);
            }
            if (req.method === 'POST' && action === 'writeback') {
                return await handleWriteback(req, res);
            }

            return res.status(404).json({
                error: 'Unknown procore action',
                hint: 'Try /api/procore/{authorize|callback|status|disconnect|projects|equipment|directory|sync|writeback}',
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
    // Write-back (Phase 2 + 3)
    createTimecardEntry,
    createDailyLog,
    createCostEntry,
    // Re-exportar os secrets para que index.js os possa associar a outras functions:
    PROCORE_CLIENT_ID,
    PROCORE_CLIENT_SECRET,
    PROCORE_COMPANY_ID,
};
