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
const {
  PROCORE_ENDPOINTS,
  API_VERSION: PROCORE_API_VERSION,
  PER_PAGE: PROCORE_PER_PAGE,
  MAX_PAGES: PROCORE_MAX_PAGES,
  FIRESTORE_BATCH_LIMIT,
  REFRESH_SAFETY_MARGIN_MS,
  REFRESH_LOCK_TTL_MS,
  REFRESH_MAX_RETRIES,
} = require('./config');

// ============================================
// CONSTANTES
// ============================================

const APP_ID = 'casais-rfid';
const INTEGRATION_DOC_PATH = `artifacts/${APP_ID}/public/data/integrations/procore`;

// Procore endpoints (dev sandbox or production based on ENVIRONMENT)
const PROCORE_LOGIN_URL = PROCORE_ENDPOINTS.LOGIN_URL;
const PROCORE_API_URL = PROCORE_ENDPOINTS.API_BASE;
const PROCORE_AUTH_URL = PROCORE_ENDPOINTS.AUTH_URL;
const PROCORE_TOKEN_URL = PROCORE_ENDPOINTS.TOKEN_URL;

// URL pública da Cloud Function (via Firebase Hosting rewrite).
// Tem de bater certo com um dos Redirect URIs configurados no portal Procore.
const REDIRECT_URI = 'https://casais-rfid.web.app/api/procore/callback';

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
        // Limpa marcadores de erro/lock — refresh ou auth com sucesso
        needs_reauth: admin.firestore.FieldValue.delete(),
        last_refresh_error: admin.firestore.FieldValue.delete(),
        last_refresh_error_at: admin.firestore.FieldValue.delete(),
        refresh_lock_until: admin.firestore.FieldValue.delete(),
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
 * Retries em falhas transitórias (5xx, network). Falhas 400/401 (refresh_token
 * inválido ou expirado) NÃO retentam — propagam imediatamente.
 */
async function refreshAccessToken(currentRefreshToken) {
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentRefreshToken,
        client_id: process.env.PROCORE_CLIENT_ID,
        client_secret: process.env.PROCORE_CLIENT_SECRET,
    });

    let lastErr;
    for (let attempt = 1; attempt <= (REFRESH_MAX_RETRIES || 3); attempt++) {
        try {
            const response = await fetch(PROCORE_TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            });

            if (!response.ok) {
                const errText = await response.text();
                // 400/401 = refresh_token invalido/expirado. Não retentar — precisa de re-auth.
                if (response.status === 400 || response.status === 401) {
                    await integrationDoc().set({
                        last_refresh_error: `${response.status}: ${errText}`,
                        last_refresh_error_at: admin.firestore.FieldValue.serverTimestamp(),
                        needs_reauth: true,
                    }, { merge: true });
                    throw new Error(`PROCORE_REAUTH_REQUIRED: refresh_token rejeitado (${response.status}). Visite /api/procore/authorize.`);
                }
                throw new Error(`Procore token refresh failed (${response.status}): ${errText}`);
            }

            const tokenJson = await response.json();
            await persistTokenResponse(tokenJson, { isRefresh: true });
            return tokenJson;
        } catch (err) {
            lastErr = err;
            if (err.message?.startsWith('PROCORE_REAUTH_REQUIRED')) throw err;
            if (attempt < (REFRESH_MAX_RETRIES || 3)) {
                const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                console.warn(`[procoreBridge] refresh tentativa ${attempt} falhou (${err.message}). Retry em ${backoffMs}ms`);
                await new Promise(r => setTimeout(r, backoffMs));
            }
        }
    }
    throw lastErr;
}

/**
 * Tenta adquirir o lock de refresh com TTL. Retorna true se conseguiu.
 * Usado para prevenir refresh concorrente (race condition do refresh_token rotation).
 */
async function acquireRefreshLock() {
    try {
        const lockExpiresAt = Date.now() + (REFRESH_LOCK_TTL_MS || 30000);
        await db().runTransaction(async (t) => {
            const snap = await t.get(integrationDoc());
            const data = snap.data() || {};
            const heldUntil = data.refresh_lock_until?.toMillis?.() || 0;
            if (heldUntil > Date.now()) {
                throw new Error('LOCK_HELD');
            }
            t.set(integrationDoc(), {
                refresh_lock_until: admin.firestore.Timestamp.fromMillis(lockExpiresAt),
            }, { merge: true });
        });
        return true;
    } catch (err) {
        if (err.message === 'LOCK_HELD') return false;
        throw err;
    }
}

async function releaseRefreshLock() {
    try {
        await integrationDoc().set({
            refresh_lock_until: admin.firestore.FieldValue.delete(),
        }, { merge: true });
    } catch (err) {
        console.warn('[procoreBridge] releaseRefreshLock falhou (não crítico):', err.message);
    }
}

/**
 * HELPER PÚBLICO — devolve um access token válido, refrescando se necessário.
 *
 * Estratégia:
 *  - Se token ainda fresh → devolve.
 *  - Se expira < margem → tenta adquirir lock de refresh.
 *    - Lock adquirido → refresca e devolve novo token.
 *    - Lock detido por outra invocação → aguarda 2s e relê (a outra terá actualizado).
 *  - Se refresh_token rejeitado (400/401) → marca `needs_reauth: true` e lança erro claro.
 *
 * @returns {Promise<string>} access_token válido
 * @throws {Error} se integração não conectada ou refresh_token expirou (precisa re-auth)
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
    if (data.needs_reauth) {
        throw new Error('PROCORE_REAUTH_REQUIRED: refresh_token expirado. Visite /api/procore/authorize.');
    }

    const expiresAtMs = data.expires_at?.toMillis ? data.expires_at.toMillis() : (data.expires_at || 0);
    const isExpiringSoon = Date.now() + REFRESH_SAFETY_MARGIN_MS >= expiresAtMs;

    if (!isExpiringSoon) return data.access_token;

    // Token a expirar — tentar refresh com lock para evitar concorrência
    const gotLock = await acquireRefreshLock();
    if (gotLock) {
        try {
            console.log('[procoreBridge] Access token a expirar — a refrescar (lock detido)');
            const refreshed = await refreshAccessToken(data.refresh_token);
            return refreshed.access_token;
        } finally {
            await releaseRefreshLock();
        }
    }

    // Outra invocação está a refrescar — aguardar e relê
    console.log('[procoreBridge] Refresh em curso noutra invocação — a aguardar...');
    await new Promise(r => setTimeout(r, 2000));
    const fresh = await integrationDoc().get();
    const freshData = fresh.data() || {};
    if (freshData.needs_reauth) {
        throw new Error('PROCORE_REAUTH_REQUIRED: refresh_token expirado durante refresh concorrente.');
    }
    return freshData.access_token || data.access_token;
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

    // 204 No Content — DELETE success with empty body
    if (response.status === 204) {
        return { data: null, total: null, page: 1, perPage: 0 };
    }

    const responseJson = await response.json();

    // v2.x APIs envolvem a resposta em { data: ..., meta: { total_count: N } }
    // v1.x devolvem o array/objecto directamente com paginação nos headers
    const isV2 = endpoint.startsWith('/rest/v2');
    const data  = isV2 ? responseJson.data  : responseJson;
    const total = isV2
        ? (responseJson.meta?.total_count ?? null)
        : (response.headers.get('total') ? parseInt(response.headers.get('total'), 10) : null);
    const perPageHeader = response.headers.get('per-page');

    return {
        data,
        total,
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
 * GET /rest/v2.1/companies/{company_id}/equipment_register
 * Inventário de equipamentos (API v2.1 — endpoint definitivo confirmado pela Procore).
 */
async function fetchEquipment() {
    const companyId = process.env.PROCORE_COMPANY_ID;
    return procoreFetchAll(`/rest/v2.1/companies/${companyId}/equipment_register`);
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
 * Diagnóstico do estado de Equipment no Procore (v2.1).
 * Testa o endpoint correcto confirmado pela Procore Support (Marie V., 2026-05-12).
 */
async function diagnoseEquipment() {
    const companyId = process.env.PROCORE_COMPANY_ID;
    const results = {
        company_id: companyId,
        endpoints_tested: [],
        working_endpoint: null,
        fieldsets: null,
        post_probe: null,
        recommendation: null,
    };

    // 1. Testar GET v2.1/equipment_register (endpoint correcto)
    try {
        const { data } = await procoreFetch(`/rest/v2.1/companies/${companyId}/equipment_register`, {
            query: { per_page: 1 },
        });
        results.endpoints_tested.push({ endpoint: 'v2.1/equipment_register', status: 'ok', count: Array.isArray(data) ? data.length : '?' });
        results.working_endpoint = 'v2.1/equipment_register';
    } catch (err) {
        results.endpoints_tested.push({ endpoint: 'v2.1/equipment_register', status: 'error', error: err.message.slice(0, 200) });
    }

    // 2. Listar configurable fieldsets por projecto (conforme documentação Procore)
    try {
        const projects = await fetchProjects();
        if (projects.length > 0) {
            const projectId = projects[0].id;
            const { data } = await procoreFetch(`${PROCORE_API_VERSION}/projects/${projectId}/configurable_field_sets`, {
                query: {},
            });
            results.fieldsets = Array.isArray(data) ? data : [data];
        }
    } catch (err) {
        results.fieldsets = { error: err.message.slice(0, 200) };
    }

    // 3. Probe de POST v2.1 com corpo plano (sem wrapper)
    try {
        const { data } = await procoreFetch(`/rest/v2.1/companies/${companyId}/equipment_register`, {
            method: 'POST',
            body: { name: '__test_probe__', equipment_id: 'TEST-PROBE-001' },
        });
        results.post_probe = { status: 'ok', id: data?.id };
    } catch (err) {
        results.post_probe = { status: 'error', error: err.message.slice(0, 300) };
    }

    // 4. Recomendação
    if (results.working_endpoint) {
        results.recommendation = 'Endpoint v2.1/equipment_register funciona. Pode criar e listar equipamentos.';
    } else if (results.post_probe?.status === 'ok') {
        results.recommendation = 'GET falhou mas POST funcionou — tool activa mas sem itens ainda.';
    } else {
        results.recommendation = 'Endpoint v2.1/equipment_register não responde. Verificar se "Equipment" tool está activa no Project Admin → Tool Settings.';
    }

    return results;
}

/**
 * Cria um equipamento no Procore via API REST v2.1.
 * Body é plano (sem wrapper) conforme documentação oficial:
 * POST /rest/v2.1/companies/{company_id}/equipment_register
 *
 * @param {object} equipmentData
 * @param {string} equipmentData.name                Nome do equipamento (ex: "Escavadora 01")
 * @param {string} [equipmentData.equipment_id]      ID interno (ex: "ESC-001")
 * @param {string} [equipmentData.identification_number] Número de série/matrícula
 * @param {number} [equipmentData.year]              Ano
 * @param {string} [equipmentData.ownership]         'OWNED' | 'RENTED' | 'LEASED'
 * @param {number} [equipmentData.rate_per_hour]     Taxa horária
 * @param {string} [equipmentData.serial_number]     Número de série
 * @returns {Promise<{data: object, endpoint: string}>}
 */
async function createEquipment(equipmentData) {
    const companyId = process.env.PROCORE_COMPANY_ID;
    const result = await procoreFetch(
        `/rest/v2.1/companies/${companyId}/equipment_register`,
        { method: 'POST', body: equipmentData }
    );
    console.log(`[procoreBridge] equipment created (v2.1) id=${result.data?.id} name=${equipmentData.name}`);
    return { data: result.data, endpoint: 'v2.1/equipment_register' };
}

async function updateEquipment(equipmentId, fieldsToUpdate) {
    const companyId = process.env.PROCORE_COMPANY_ID;
    const result = await procoreFetch(
        `/rest/v2.1/companies/${companyId}/equipment_register/${equipmentId}`,
        { method: 'PATCH', body: { equipment: fieldsToUpdate } }
    );
    console.log(`[procoreBridge] equipment updated (v2.1) id=${equipmentId}`);
    return result;
}

async function createDirectoryUser({ firstName, lastName, email }) {
    const companyId = process.env.PROCORE_COMPANY_ID;
    const result = await procoreFetch(
        `/rest/v1.0/companies/${companyId}/users`,
        { method: 'POST', body: { user: { first_name: firstName, last_name: lastName || '', email_address: email, is_employee: true } } }
    );
    console.log(`[procoreBridge] directory user created id=${result.data?.id} name="${firstName} ${lastName}"`);
    return result.data;
}

// ---------- Persistência Firestore ----------

/**
 * Escreve uma coleção de items numa subcoleção da integração Procore.
 * Usa batches de 400 ops e merge para ser idempotente entre syncs.
 *
 * Path: artifacts/casais-rfid/public/data/integrations/procore/{subcollection}/{id}
 */
async function persistCollection(subcollection, items, idField = 'id', { mirror = false } = {}) {
    if (!Array.isArray(items)) return 0;

    const colRef = integrationDoc().collection(subcollection);
    const firestore = db();
    const serverTs = admin.firestore.FieldValue.serverTimestamp;
    let written = 0;

    // Upsert incoming items
    for (let i = 0; i < items.length; i += FIRESTORE_BATCH_LIMIT) {
        const slice = items.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = firestore.batch();

        slice.forEach((item) => {
            const rawId = item?.[idField];
            if (rawId === undefined || rawId === null) return;
            const docId = String(rawId);
            batch.set(
                colRef.doc(docId),
                { ...item, _synced_at: serverTs(), _removed_at: null },
                { merge: true }
            );
            written++;
        });

        await batch.commit();
    }

    // Mirror mode: mark docs no longer returned by Procore with _removed_at
    if (mirror && items.length > 0) {
        const incomingIds = new Set(items.map(i => String(i?.[idField])).filter(Boolean));
        const existing = await colRef.select().get();
        const stale = existing.docs.filter(d => !incomingIds.has(d.id) && !d.data()._removed_at);

        for (let i = 0; i < stale.length; i += FIRESTORE_BATCH_LIMIT) {
            const batch = firestore.batch();
            stale.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach(d => {
                batch.update(d.ref, { _removed_at: serverTs() });
            });
            await batch.commit();
        }

        if (stale.length > 0) {
            console.log(`[persistCollection] ${subcollection}: ${stale.length} items marked _removed_at`);
        }
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

/**
 * Cria uma Observation (avaria ou WorkOrder) no Procore.
 * Endpoint: POST /rest/v1.0/projects/{project_id}/observations/items
 */
async function createObservation(projectId, { name, description, status = 'initiated', typeId = null, datetimeInitiated = null } = {}) {
    const endpoint = `${PROCORE_API_VERSION}/projects/${projectId}/observations/items`;
    const payload = {
        observation_item: {
            name: name || 'Avaria CASAIS Fleet',
            description: description || '',
            status,
            datetime_initiated: datetimeInitiated || new Date().toISOString(),
        },
    };
    if (typeId) payload.observation_item.type_id = typeId;

    const result = await procoreFetch(endpoint, { method: 'POST', body: payload });
    console.log(`[procoreBridge] observation created id=${result.data?.id} project=${projectId}`);
    return result.data;
}

/**
 * Actualiza uma Observation existente no Procore.
 * Endpoint: PATCH /rest/v1.0/projects/{project_id}/observations/items/{id}
 */
async function updateObservation(projectId, observationId, updates = {}) {
    const endpoint = `${PROCORE_API_VERSION}/projects/${projectId}/observations/items/${observationId}`;
    const result = await procoreFetch(endpoint, {
        method: 'PATCH',
        body: { observation_item: updates },
    });
    console.log(`[procoreBridge] observation updated id=${observationId}`);
    return result.data;
}

/**
 * Cria um Equipment Log no Procore (uso de equipamento por dia).
 * Requer Equipment Tool activo no projecto.
 * Endpoint: POST /rest/v1.0/projects/{project_id}/equipment_logs
 */
async function createEquipmentLog(projectId, { equipmentId, date, hours, description = '' } = {}) {
    const endpoint = `${PROCORE_API_VERSION}/projects/${projectId}/equipment_logs`;
    const payload = {
        equipment_log: {
            equipment_id: equipmentId,
            date,
            hours,
            description,
        },
    };
    const result = await procoreFetch(endpoint, { method: 'POST', body: payload });
    console.log(`[procoreBridge] equipment_log created id=${result.data?.id} eq=${equipmentId} ${date} ${hours}h`);
    return result.data;
}

/**
 * Busca cost codes de um projecto Procore.
 * Endpoint: GET /rest/v1.0/projects/{project_id}/cost_codes
 */
async function getCostCodes(projectId) {
    const endpoint = `${PROCORE_API_VERSION}/projects/${projectId}/cost_codes`;
    const items = await procoreFetchAll(endpoint, { per_page: 100 });
    return items;
}

/**
 * Busca vendors/fornecedores da empresa Procore.
 * Endpoint: GET /rest/v1.0/companies/{company_id}/vendors
 */
async function getVendors() {
    const companyId = process.env.PROCORE_COMPANY_ID;
    const endpoint = `${PROCORE_API_VERSION}/companies/${companyId}/vendors`;
    const items = await procoreFetchAll(endpoint, { per_page: 100 });
    return items;
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
            connected: !!data.access_token && !data.needs_reauth,
            needs_reauth: !!data.needs_reauth,
            last_refresh_error: data.last_refresh_error || null,
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
 * GET /companies → lista empresas acessíveis com o token actual (útil para descobrir Company ID de produção).
 * Faz fetch directo sem exigir PROCORE_COMPANY_ID.
 */
async function handleCompanies(req, res) {
    try {
        const accessToken = await getValidAccessToken();
        const url = `${PROCORE_API_URL}${PROCORE_API_VERSION}/companies`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
        });
        const data = await response.json();
        const companies = Array.isArray(data) ? data : [data];
        return res.json({
            count: companies.length,
            companies: companies.map(c => ({ id: c.id, name: c.name, is_active: c.is_active })),
        });
    } catch (err) {
        console.error('[procoreBridge] /companies exception:', err);
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

// ============================================
// CUSTOM FIELDS — discovery & write-back
// ============================================

/**
 * Lê os configurable field sets de um tool do Procore.
 * @param {'equipment'|'directory'} tool
 */
async function fetchConfigurableFieldSets(tool) {
    // Procore exige consulta a nível de projecto (confirmado pela Support, 2026-05-12)
    const projects = await fetchProjects();
    if (projects.length === 0) return [];
    const projectId = projects[0].id;
    const { data } = await procoreFetch(`${PROCORE_API_VERSION}/projects/${projectId}/configurable_field_sets`, {
        query: { tool },
    });
    return Array.isArray(data) ? data : [];
}

/**
 * Descobre os IDs dos custom fields pelo label esperado.
 * Retorna mapa { rfidReaderId: {id, label}, pwaMachineId: {id, label}, ... }
 */
async function discoverCustomFieldIds(tool, expectedLabels) {
    const fieldSets = await fetchConfigurableFieldSets(tool);
    const found = {};
    for (const fs of fieldSets) {
        for (const field of (fs.configurable_fields || [])) {
            const labelNorm = (field.label || '').toLowerCase().trim();
            for (const [key, expectedLabel] of Object.entries(expectedLabels)) {
                if (labelNorm === expectedLabel.toLowerCase()) {
                    found[key] = { id: field.id, label: field.label, data_type: field.data_type };
                }
            }
        }
    }
    return found;
}

/**
 * Descobre e persiste os IDs dos custom fields no Firestore.
 * Deve ser chamado uma vez após criação dos campos no portal Procore.
 */
async function discoverAndPersistCustomFields() {
    const EQUIPMENT_LABELS = { rfidReaderId: 'RFID Reader ID', pwaMachineId: 'PWA Machine ID' };
    const PERSON_LABELS    = { rfidCardId: 'RFID Card ID', pwaOperatorId: 'PWA Operator ID' };

    const [equipmentFields, personFields] = await Promise.all([
        discoverCustomFieldIds('equipment', EQUIPMENT_LABELS),
        discoverCustomFieldIds('directory', PERSON_LABELS),
    ]);

    const missing = [
        ...Object.entries(EQUIPMENT_LABELS).filter(([k]) => !equipmentFields[k]).map(([,l]) => `Equipment: "${l}"`),
        ...Object.entries(PERSON_LABELS).filter(([k]) => !personFields[k]).map(([,l]) => `Directory: "${l}"`),
    ];

    const customFields = {
        equipment: equipmentFields,
        person: personFields,
        discoveredAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await integrationDoc().set({ customFields }, { merge: true });
    console.log('[procoreBridge] custom fields discovered:', JSON.stringify({ equipment: equipmentFields, person: personFields }));

    return { equipment: equipmentFields, person: personFields, missing };
}

/**
 * PATCH de um custom field num equipment do Procore.
 * fieldKey: 'rfidReaderId' | 'pwaMachineId'
 */
async function patchEquipmentCustomField(equipmentId, fieldKey, value) {
    const snap = await integrationDoc().get();
    const fieldDef = snap.data()?.customFields?.equipment?.[fieldKey];
    if (!fieldDef?.id) throw new Error(`CUSTOM_FIELDS_NOT_DISCOVERED: equipment.${fieldKey}`);
    // v2.1: body plano (sem wrapper), endpoint equipment_register
    await procoreFetch(`/rest/v2.1/companies/${process.env.PROCORE_COMPANY_ID}/equipment_register/${equipmentId}`, {
        method: 'PATCH',
        body: { [`custom_field_${fieldDef.id}`]: value },
    });
}

/**
 * PATCH de um custom field numa pessoa do directório Procore.
 * fieldKey: 'rfidCardId' | 'pwaOperatorId'
 */
async function patchDirectoryCustomField(userId, fieldKey, value) {
    const snap = await integrationDoc().get();
    const fieldDef = snap.data()?.customFields?.person?.[fieldKey];
    if (!fieldDef?.id) throw new Error(`CUSTOM_FIELDS_NOT_DISCOVERED: person.${fieldKey}`);
    await procoreFetch(`${PROCORE_API_VERSION}/companies/${process.env.PROCORE_COMPANY_ID}/users/${userId}`, {
        method: 'PATCH',
        body: { user: { [`custom_field_${fieldDef.id}`]: value } },
    });
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleCustomFieldsDiscover(req, res) {
    try {
        const result = await discoverAndPersistCustomFields();
        return res.status(200).json({ ok: true, ...result });
    } catch (err) {
        console.error('[procoreBridge] custom-fields-discover error:', err);
        return res.status(500).json({ error: err.message });
    }
}

async function handleCustomFieldsStatus(req, res) {
    try {
        const snap = await integrationDoc().get();
        const customFields = snap.data()?.customFields || null;
        return res.status(200).json({ customFields });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function handlePairEquipment(req, res) {
    const { equipmentId, rfidReaderId, pwaMachineId } = req.body || {};
    if (!equipmentId || !rfidReaderId || !pwaMachineId) {
        return res.status(400).json({ error: 'equipmentId, rfidReaderId e pwaMachineId são obrigatórios' });
    }
    try {
        // Escrever em Procore
        await Promise.all([
            patchEquipmentCustomField(equipmentId, 'rfidReaderId', String(rfidReaderId)),
            patchEquipmentCustomField(equipmentId, 'pwaMachineId', String(pwaMachineId)),
        ]);
        // Actualizar machine stub na PWA
        const machineRef = db().doc(`artifacts/casais-rfid/public/data/machines/${pwaMachineId}`);
        await machineRef.set({
            rfidReaderId: String(rfidReaderId),
            pairingStatus: 'paired',
            pairedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`[procoreBridge] paired equipment ${equipmentId} ↔ RFID ${rfidReaderId} (${pwaMachineId})`);
        return res.status(200).json({ ok: true });
    } catch (err) {
        if (err.message.startsWith('CUSTOM_FIELDS_NOT_DISCOVERED')) {
            return res.status(412).json({
                error: err.message,
                hint: 'Cria os custom fields no Procore Admin e corre /api/procore/custom-fields-discover',
            });
        }
        console.error('[procoreBridge] pair-equipment error:', err);
        return res.status(500).json({ error: err.message });
    }
}

async function handlePairOperator(req, res) {
    const { procoreUserId, cardId } = req.body || {};
    if (!procoreUserId || !cardId) {
        return res.status(400).json({ error: 'procoreUserId e cardId são obrigatórios' });
    }
    const firestore = db();
    const pendingRef = firestore.doc(`artifacts/casais-rfid/public/data/pending_operators/${procoreUserId}`);
    const operatorRef = firestore.doc(`artifacts/casais-rfid/public/data/operators/${cardId}`);
    try {
        await firestore.runTransaction(async (tx) => {
            const pendingSnap = await tx.get(pendingRef);
            if (!pendingSnap.exists) throw new Error('PENDING_OPERATOR_NOT_FOUND');
            const existingOp = await tx.get(operatorRef);
            if (existingOp.exists) throw new Error('ALREADY_PAIRED: cardId já associado a um operador');

            const pending = pendingSnap.data();
            tx.set(operatorRef, {
                name: pending.name,
                email: pending.email,
                registeredAt: admin.firestore.FieldValue.serverTimestamp(),
                procoreUserId: pending.procoreUserId,
                source: 'procore',
                pairingStatus: 'paired',
                pairedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.delete(pendingRef);
        });

        // Escrever em Procore (fora da transação — falha não é crítica)
        try {
            await Promise.all([
                patchDirectoryCustomField(procoreUserId, 'rfidCardId', String(cardId)),
                patchDirectoryCustomField(procoreUserId, 'pwaOperatorId', String(cardId)),
            ]);
        } catch (patchErr) {
            console.warn(`[procoreBridge] pair-operator Procore PATCH failed (não crítico): ${patchErr.message}`);
        }

        console.log(`[procoreBridge] paired operator ${procoreUserId} ↔ cardId ${cardId}`);
        return res.status(200).json({ ok: true });
    } catch (err) {
        if (err.message.startsWith('CUSTOM_FIELDS_NOT_DISCOVERED')) {
            return res.status(412).json({ error: err.message, hint: 'Corre /api/procore/custom-fields-discover' });
        }
        if (err.message === 'PENDING_OPERATOR_NOT_FOUND') return res.status(404).json({ error: err.message });
        if (err.message.startsWith('ALREADY_PAIRED')) return res.status(409).json({ error: err.message });
        console.error('[procoreBridge] pair-operator error:', err);
        return res.status(500).json({ error: err.message });
    }
}

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
        // Auto-set default project when only one exists (covers sandbox demos and new installs)
        if (projects.length === 1) {
            const intSnap = await integrationDoc().get();
            if (!intSnap.data()?.defaultProcoreProjectId) {
                await integrationDoc().set({
                    defaultProcoreProjectId: projects[0].id,
                    defaultProcoreProjectName: projects[0].name,
                }, { merge: true });
                console.log(`[procoreSync:${trigger}] auto-set default project: ${projects[0].name} (${projects[0].id})`);
            }
        }
    } catch (err) {
        console.error(`[procoreSync:${trigger}] projects error:`, err);
        summary.errors.projects = err.message;
    }

    try {
        const equipment = await fetchEquipment();
        // TODO (Phase 2): filtrar só ownership_type === 'owned' antes de persistir.
        // Maquinas Rented/Subcontracted não têm sensor RFID e não devem gerar sessões na PWA.
        // Ex: const ownedEquipment = equipment.filter(e => e.ownership_type === 'owned');
        summary.equipment = await persistCollection('equipment', equipment, 'id', { mirror: true });
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
        const { projectProcoreToPwa } = require('./procorePwaProjector');
        const result = await runFullSync({ trigger: 'manual' });
        // Projectar Procore → PWA após sync manual também
        try {
            const proj = await projectProcoreToPwa();
            result.projection = proj;
        } catch (projErr) {
            console.error('[procoreBridge] projection error (não crítico):', projErr.message);
            result.projectionError = projErr.message;
        }
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

    // Endpoints a testar — apenas v2.1 (confirmado pela Procore Support, 2026-05-12)
    const tests = [
        { name: 'equipment_register_GET', method: 'GET', path: `/rest/v2.1/companies/${companyId}/equipment_register` },
        { name: 'equipment_register_POST', method: 'POST', path: `/rest/v2.1/companies/${companyId}/equipment_register`, body: { name: 'Test Probe', equipment_id: 'PROBE-001' } },
        { name: 'project_configurable_fieldsets_GET', method: 'GET', path: `${PROCORE_API_VERSION}/projects/${projectId}/configurable_field_sets` },
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
            if (req.method === 'GET' && action === 'companies') {
                return await handleCompanies(req, res);
            }
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
            // Bidirectional sync — custom fields & pairing
            if (req.method === 'GET' && action === 'custom-fields-discover') {
                return await handleCustomFieldsDiscover(req, res);
            }
            if (req.method === 'GET' && action === 'custom-fields-status') {
                return await handleCustomFieldsStatus(req, res);
            }
            if (req.method === 'POST' && action === 'pair-equipment') {
                return await handlePairEquipment(req, res);
            }
            if (req.method === 'POST' && action === 'pair-operator') {
                return await handlePairOperator(req, res);
            }
            return res.status(404).json({
                error: 'Unknown procore action',
                hint: 'Try /api/procore/{authorize|callback|status|disconnect|companies|projects|equipment|equipment-diagnose|equipment-create|equipment-bulk|directory|sync|daily-log|writeback|custom-fields-discover|custom-fields-status|pair-equipment|pair-operator}',
                received: { method: req.method, path: req.path, action },
            });
        } catch (err) {
            console.error('[procoreBridge] Top-level exception:', err);
            return res.status(500).json({ error: err.message });
        }
    }
);

/**
 * Associa um equipamento a um projecto Procore.
 * POST /rest/v1.0/projects/{projectId}/equipment
 * Retorna false (sem throw) se o Equipment API não estiver disponível (sandbox 404).
 */
async function associateEquipmentToProject(procoreEquipmentId, procoreProjectId) {
    try {
        await procoreFetch(`${PROCORE_API_VERSION}/projects/${procoreProjectId}/equipment`, {
            method: 'POST',
            body: { equipment: { equipment_id: procoreEquipmentId } },
        });
        return true;
    } catch (err) {
        console.warn(`[procoreBridge] associateEquipmentToProject failed (expected in sandbox):`, err.message);
        return false;
    }
}

/**
 * Remove a associação de um equipamento a um projecto Procore.
 * DELETE /rest/v1.0/projects/{projectId}/equipment/{id}
 * Retorna false (sem throw) se o Equipment API não estiver disponível.
 */
async function removeEquipmentFromProject(procoreEquipmentId, procoreProjectId) {
    try {
        await procoreFetch(`${PROCORE_API_VERSION}/projects/${procoreProjectId}/equipment/${procoreEquipmentId}`, {
            method: 'DELETE',
        });
        return true;
    } catch (err) {
        console.warn(`[procoreBridge] removeEquipmentFromProject failed (expected in sandbox):`, err.message);
        return false;
    }
}

/**
 * Arquiva (ou apaga) um equipamento no Procore a partir do ID Procore.
 * Tenta DELETE primeiro; se o sandbox retornar 405, faz PATCH para inactive.
 * Retorna { method, success, status }.
 */
async function archiveEquipment(procoreEquipmentId) {
    const companyId = process.env.PROCORE_COMPANY_ID;
    const endpoint = `/rest/v2.1/companies/${companyId}/equipment_register/${procoreEquipmentId}`;

    // 1. Tentar DELETE
    try {
        await procoreFetch(endpoint, { method: 'DELETE' });
        console.log(`[archiveEquipment] DELETE OK — ${procoreEquipmentId}`);
        return { method: 'delete', success: true, status: 204 };
    } catch (delErr) {
        // 405 = sandbox não suporta DELETE; qualquer outro erro relança
        if (!delErr.message.includes('→ 405')) throw delErr;
        console.log(`[archiveEquipment] DELETE 405 — fallback PATCH inactive: ${procoreEquipmentId}`);
    }

    // 2. Fallback: PATCH status inactive
    try {
        await procoreFetch(endpoint, {
            method: 'PATCH',
            body: { equipment: { status: 'inactive' } },
        });
        console.log(`[archiveEquipment] PATCH inactive OK — ${procoreEquipmentId}`);
        return { method: 'patch', success: true, status: 200 };
    } catch (patchErr) {
        console.error(`[archiveEquipment] PATCH também falhou — ${procoreEquipmentId}: ${patchErr.message}`);
        return { method: 'patch', success: false, error: patchErr.message };
    }
}

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
    createDirectoryUser,
    // Bidirectional sync — custom fields & pairing
    discoverAndPersistCustomFields,
    patchEquipmentCustomField,
    patchDirectoryCustomField,
    // Bidirectional obra assignment
    associateEquipmentToProject,
    removeEquipmentFromProject,
    // Bidirectional deletion
    archiveEquipment,
    updateEquipment,
    // Write-back (Phase 2 + 3)
    createTimecardEntry,
    createDailyLog,
    createCostEntry,
    // Sprint 3 — Deep Integration
    createObservation,
    updateObservation,
    createEquipmentLog,
    getCostCodes,
    getVendors,
    // Re-exportar os secrets para que index.js os possa associar a outras functions:
    PROCORE_CLIENT_ID,
    PROCORE_CLIENT_SECRET,
    PROCORE_COMPANY_ID,
};
