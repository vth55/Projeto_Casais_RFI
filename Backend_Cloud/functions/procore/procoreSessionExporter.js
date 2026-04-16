/**
 * CASAIS Fleet Intelligence — Procore Session Exporter
 *
 * Sends equipment sessions to Procore as Timecard Entries.
 *
 * Features:
 *   - Automatic token refresh (transparent to callers)
 *   - Parallel entity resolution (project + user + equipment)
 *   - Idempotency: skips sessions already successfully exported
 *   - Retry queueing: failed exports are persisted with backoff timestamps
 *     and picked up by the `procoreExportRetry` Cloud Function scheduler
 *
 * Event types:
 *   - 'start': Marks operator clock-in (hours: 0)
 *   - 'end':   Creates final timecard with real hours (CLOSED / AUTO_CLOSED)
 */

const admin = require('firebase-admin');

// ─── Procore environment ─────────────────────────────────────────────────────
// Sandbox enquanto estamos em desenvolvimento. Quando passar a produção, trocar
// para `https://api.procore.com` + `https://login.procore.com`.
// IMPORTANTE: tem de estar alinhado com procoreBridge.js (PROCORE_BASE_URL)
// senão o token emitido numa base não é aceite na outra.
const PROCORE_BASE_URL = 'https://sandbox.procore.com';
const PROCORE_TOKEN_URL = `${PROCORE_BASE_URL}/oauth/token`;
const PROCORE_API_URL = `${PROCORE_BASE_URL}/rest/v1.0`;

// ─── Path constants ──────────────────────────────────────────────────────────

const APP_ID = 'casais-rfid';
const PROCORE_INTEGRATION_PATH = `artifacts/${APP_ID}/public/data/integrations/procore`;
const PROJECTS_COLLECTION  = `${PROCORE_INTEGRATION_PATH}/projects`;
const DIRECTORY_COLLECTION = `${PROCORE_INTEGRATION_PATH}/directory`;
const EQUIPMENT_COLLECTION = `${PROCORE_INTEGRATION_PATH}/equipment`;
const OBRAS_PATH     = `artifacts/${APP_ID}/public/data/obras`;
const OPERATORS_PATH = `artifacts/${APP_ID}/public/data/operators`;
const MACHINES_PATH  = `artifacts/${APP_ID}/public/data/machines`;
const SESSIONS_PATH  = `artifacts/${APP_ID}/public/data/sessions`;

// ─── Retry config ────────────────────────────────────────────────────────────

const MAX_RETRY_ATTEMPTS = 3;
// Minutes to wait before each successive retry attempt (attempt 0, 1, 2)
const RETRY_BACKOFF_MINUTES = [5, 20, 60];

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Normalise a string for fuzzy entity matching.
 * Strips diacritics, lowercases, and collapses non-alphanumeric runs into
 * single spaces so that "Escavadoras Hidráulicas" matches "escavadoras hidraulicas".
 *
 * @param {string} str - Raw input string (name, email, identifier, etc.)
 * @returns {string} Normalised lowercase string suitable for comparison.
 */
function normalizeForMatching(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * Calculate the next retry timestamp using exponential backoff.
 * Returns `null` when the maximum number of retry attempts has been exhausted,
 * signalling that the export should be marked as permanently failed.
 *
 * @param {number} attemptsDone - Number of retry attempts already executed (0-indexed).
 * @returns {FirebaseFirestore.Timestamp|null} Firestore Timestamp for the next retry window, or null.
 */
function buildNextRetryTimestamp(attemptsDone) {
    if (attemptsDone >= MAX_RETRY_ATTEMPTS) return null;
    const delayMs = (RETRY_BACKOFF_MINUTES[attemptsDone] || 60) * 60_000;
    return admin.firestore.Timestamp.fromMillis(Date.now() + delayMs);
}

// ─── Token management & HTTP ─────────────────────────────────────────────────

/**
 * Execute an authenticated Procore REST call.
 * Transparently refreshes the OAuth token when it is about to expire (< 60s).
 */
async function procoreFetch(endpoint, options = {}) {
    const integRef = admin.firestore().doc(PROCORE_INTEGRATION_PATH);
    const snap = await integRef.get();
    if (!snap.exists) throw new Error('PROCORE_NOT_CONNECTED');

    const data = snap.data();
    let token = data.access_token;

    // Refresh if token expires within 60 seconds
    if ((data.expires_at || 0) - 60_000 <= Date.now()) {
        if (!data.refresh_token) throw new Error('PROCORE_NO_REFRESH_TOKEN');

        console.log('[procoreSessionExporter] token expiring — refreshing...');
        const refreshRes = await fetch(PROCORE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type:    'refresh_token',
                refresh_token: data.refresh_token,
                client_id:     process.env.PROCORE_CLIENT_ID,
                client_secret: process.env.PROCORE_CLIENT_SECRET,
            }),
        });

        if (!refreshRes.ok) {
            const body = await refreshRes.text();
            throw new Error(`PROCORE_TOKEN_REFRESH_FAILED: ${body}`);
        }

        const newTokens = await refreshRes.json();
        token = newTokens.access_token;

        await integRef.update({
            access_token:  newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at:    Date.now() + (newTokens.expires_in * 1000),
        });
        console.log('[procoreSessionExporter] token refreshed');
    }

    const url = `${PROCORE_API_URL}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization':      `Bearer ${token}`,
            'Content-Type':       'application/json',
            'Procore-Company-Id': String(data.company_id),
            ...options.headers,
        },
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`PROCORE_API_ERROR:${res.status}: ${errText}`);
    }

    return res.json();
}

// ─── Integration check ───────────────────────────────────────────────────────

/**
 * Check whether the Procore integration has valid OAuth credentials stored.
 * @returns {Promise<boolean>} `true` if both access and refresh tokens exist.
 */
async function isProcoreConnected() {
    const snap = await admin.firestore().doc(PROCORE_INTEGRATION_PATH).get();
    if (!snap.exists) return false;
    const d = snap.data() || {};
    return !!(d.access_token && d.refresh_token);
}

// ─── Entity matching (fuzzy, normalised) ─────────────────────────────────────

/**
 * Search the cached Procore projects collection for a project whose name
 * fuzzy-matches the given obra name. Uses substring inclusion in both
 * directions to accommodate partial names.
 *
 * @param {string} obraName - Work site name from the Casais system.
 * @returns {Promise<{id: number, name: string}|null>} Matched project or null.
 */
async function findProcoreProject(obraName) {
    if (!obraName) return null;
    const snap = await admin.firestore().collection(PROJECTS_COLLECTION).limit(200).get();
    const target = normalizeForMatching(obraName);
    for (const doc of snap.docs) {
        const p = doc.data();
        const name = normalizeForMatching(p.name || p.display_name || p.project_number);
        if (name && (name === target || name.includes(target) || target.includes(name))) {
            return { id: p.id, name: p.name };
        }
    }
    console.warn(`[procoreSessionExporter] no project match for: "${obraName}"`);
    return null;
}

/**
 * Find a Procore directory user by exact email match.
 *
 * @param {string} operatorEmail - Operator email from the Casais system.
 * @returns {Promise<{id: number, name: string}|null>} Matched user or null.
 */
async function findProcoreUser(operatorEmail) {
    if (!operatorEmail) return null;
    const snap = await admin.firestore().collection(DIRECTORY_COLLECTION).limit(200).get();
    const emailLower = operatorEmail.toLowerCase().trim();
    for (const doc of snap.docs) {
        const u = doc.data();
        const uEmail = (u.email_address || u.email || '').toLowerCase().trim();
        if (uEmail === emailLower) {
            return { id: u.id, name: u.name };
        }
    }
    console.warn(`[procoreSessionExporter] no user match for: "${operatorEmail}"`);
    return null;
}

/**
 * Find a Procore equipment entry by fuzzy name/number match.
 *
 * @param {string} identifier - Machine name or ID from the Casais system.
 * @returns {Promise<{id: number, name: string}|null>} Matched equipment or null.
 */
async function findProcoreEquipment(identifier) {
    if (!identifier) return null;
    const snap = await admin.firestore().collection(EQUIPMENT_COLLECTION).limit(200).get();
    const target = normalizeForMatching(identifier);
    for (const doc of snap.docs) {
        const e = doc.data();
        const name = normalizeForMatching(e.name || e.equipment_number || e.number);
        if (name && (name === target || name.includes(target) || target.includes(name))) {
            return { id: e.id, name: e.name };
        }
    }
    return null;
}

// ─── Firestore loaders ───────────────────────────────────────────────────────

/** @param {string} obraId @returns {Promise<object|null>} Obra document data. */
async function getObraById(obraId) {
    if (!obraId) return null;
    const snap = await admin.firestore().doc(`${OBRAS_PATH}/${obraId}`).get();
    return snap.exists ? snap.data() : null;
}

/** @param {string} operatorId @returns {Promise<object|null>} Operator document data. */
async function getOperatorById(operatorId) {
    if (!operatorId) return null;
    const snap = await admin.firestore().doc(`${OPERATORS_PATH}/${operatorId}`).get();
    return snap.exists ? snap.data() : null;
}

/** @param {string} machineId @returns {Promise<object|null>} Machine document data. */
async function getMachineById(machineId) {
    if (!machineId) return null;
    const snap = await admin.firestore().doc(`${MACHINES_PATH}/${machineId}`).get();
    return snap.exists ? snap.data() : null;
}

// ─── Timecard creation ───────────────────────────────────────────────────────

/**
 * Create a Timecard Entry on Procore for a given project.
 *
 * @param {number} projectId - Procore project ID.
 * @param {object} params
 * @param {string} params.date - Entry date (YYYY-MM-DD).
 * @param {number} params.hours - Duration in decimal hours.
 * @param {string} params.description - Human-readable session summary.
 * @param {number} params.loginInfoId - Procore user (login_information) ID.
 * @param {number} [params.equipmentId] - Optional Procore equipment ID.
 * @param {string} [params.notes] - Optional freeform notes.
 * @returns {Promise<object>} Procore API response (created timecard).
 */
async function createTimecardEntry(projectId, { date, hours, description, loginInfoId, equipmentId, notes }) {
    const payload = {
        date,
        hours,
        description,
        login_information_id: loginInfoId,
    };
    if (notes)       payload.notes        = notes;
    if (equipmentId) payload.equipment_id = equipmentId;

    const result = await procoreFetch(`/projects/${projectId}/timecard_entries`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    console.log(`[procoreSessionExporter] timecard created id=${result.id} | ${date} | ${hours.toFixed(2)}h`);
    return result;
}

// ─── Session export strategies ───────────────────────────────────────────────

/**
 * Resolve all required Procore entities in parallel.
 * Returns { project, user, equipment } — project + user are required for export.
 */
async function resolveEntities(machineData, operatorData, obraData) {
    const [project, user, equipment] = await Promise.all([
        findProcoreProject(obraData?.workName),
        findProcoreUser(operatorData?.email),
        findProcoreEquipment(machineData?.name || machineData?.id),
    ]);
    return { project, user, equipment };
}

/**
 * Build and POST a clock-in (hours: 0) timecard entry to Procore.
 * @returns {Promise<object>} Export result with `exported: true/false`.
 */
async function _doExportStart(sessionData, machineData, operatorData, obraData) {
    const { project, user, equipment } = await resolveEntities(machineData, operatorData, obraData);

    if (!project) return { exported: false, reason: 'no_project_match', obraName: obraData?.workName };
    if (!user)    return { exported: false, reason: 'no_user_match',    operatorEmail: operatorData?.email };

    const date = new Date().toISOString().split('T')[0];
    const timecard = await createTimecardEntry(project.id, {
        date,
        hours:       0,
        description: `Entrada: ${machineData?.name || 'Máquina'} — ${operatorData?.name || 'Operador'}`,
        loginInfoId: user.id,
        equipmentId: equipment?.id,
        notes:       `Sessão iniciada às ${new Date().toLocaleTimeString('pt-PT')}`,
    });

    return {
        exported:     true,
        type:         'start',
        projectId:    project.id,
        projectName:  project.name,
        userId:       user.id,
        userName:     user.name,
        timecardId:   timecard.id,
        timecardDate: date,
    };
}

/**
 * Build and POST a session-end timecard entry to Procore with real hours.
 * @returns {Promise<object>} Export result with `exported: true/false`.
 */
async function _doExportEnd(sessionData, machineData, operatorData, obraData) {
    const { project, user, equipment } = await resolveEntities(machineData, operatorData, obraData);

    if (!project) return { exported: false, reason: 'no_project_match', obraName: obraData?.workName };
    if (!user)    return { exported: false, reason: 'no_user_match',    operatorEmail: operatorData?.email };

    const endTime   = sessionData.endTime?.toDate   ? sessionData.endTime.toDate()   : new Date(sessionData.endTime);
    const startTime = sessionData.startTime?.toDate ? sessionData.startTime.toDate() : new Date(sessionData.startTime);
    const hours     = sessionData.durationHours || ((endTime - startTime) / 3_600_000);
    const date      = endTime.toISOString().split('T')[0];

    const startStr = startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const endStr   = endTime.toLocaleTimeString('pt-PT',   { hour: '2-digit', minute: '2-digit' });

    const timecard = await createTimecardEntry(project.id, {
        date,
        hours,
        description: `Sessão: ${machineData?.name || 'Máquina'} (${hours.toFixed(2)}h)`,
        loginInfoId: user.id,
        equipmentId: equipment?.id,
        notes:       `${startStr} → ${endStr}`,
    });

    return {
        exported:     true,
        type:         'end',
        projectId:    project.id,
        projectName:  project.name,
        userId:       user.id,
        userName:     user.name,
        timecardId:   timecard.id,
        timecardDate: date,
        hours,
    };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Export a session to Procore by sessionId and event type ('start' | 'end').
 *
 * Idempotent: if the session was already successfully exported for this event
 * type, the function returns the cached result without hitting the Procore API.
 *
 * On failure, the export result is persisted on the session document with a
 * `nextRetryAfter` timestamp so the retry scheduler can pick it up.
 */
async function exportSessionToProcore(sessionId, eventType) {
    const sessionRef  = admin.firestore().doc(`${SESSIONS_PATH}/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) throw new Error(`Session not found: ${sessionId}`);

    const sessionData = sessionSnap.data();

    // ── Idempotency guard ────────────────────────────────────────────────────
    const existing = sessionData.procoreExport;
    if (existing?.exported === true && existing?.type === eventType) {
        return existing;
    }

    // ── Check integration is active ──────────────────────────────────────────
    if (!(await isProcoreConnected())) {
        return { exported: false, reason: 'not_connected' };
    }

    // ── Load related entities ────────────────────────────────────────────────
    const [machineData, operatorData] = await Promise.all([
        getMachineById(sessionData.machineId),
        getOperatorById(sessionData.cardId),
    ]);

    // Resolve obra: prefer explicit session obraId, fall back to machine location
    const obraId = sessionData.obraId
        || machineData?.location?.workId
        || machineData?.obraId;

    let obraData = null;
    if (obraId) {
        obraData = await getObraById(obraId);
    } else if (machineData?.location?.workName) {
        // Synthetic obra object from machine location when no obraId is stored
        obraData = { workName: machineData.location.workName };
    }

    // ── Execute export strategy ──────────────────────────────────────────────
    let result;
    try {
        result = eventType === 'start'
            ? await _doExportStart(sessionData, machineData, operatorData, obraData)
            : await _doExportEnd(sessionData, machineData, operatorData, obraData);
    } catch (err) {
        console.error(`[procoreSessionExporter] ${eventType} export threw:`, err.message);
        result = { exported: false, reason: 'api_error', error: err.message };
    }

    // ── Persist result on session document ───────────────────────────────────
    const now          = admin.firestore.Timestamp.now();
    const prevAttempts = sessionData.procoreExport?.retryCount || 0;

    if (result.exported) {
        await sessionRef.set({
            procoreExport: { ...result, exportedAt: now, retryCount: prevAttempts },
        }, { merge: true });
    } else {
        // Persist failure with next-retry window so scheduler can pick it up
        await sessionRef.set({
            procoreExport: {
                ...result,
                exported:       false,
                eventType,
                retryCount:     prevAttempts + 1,
                lastAttemptAt:  now,
                nextRetryAfter: buildNextRetryTimestamp(prevAttempts),
            },
        }, { merge: true });

        console.warn(`[procoreSessionExporter] session ${sessionId} queued for retry (attempt ${prevAttempts + 1}/${MAX_RETRY_ATTEMPTS})`);
    }

    return result;
}

/**
 * Retry all sessions where Procore export previously failed and the
 * backoff window has elapsed.  Called by `procoreExportRetry` Cloud Function.
 */
async function retryFailedExports() {
    if (!(await isProcoreConnected())) {
        return { retried: 0, succeeded: 0 };
    }

    const now = admin.firestore.Timestamp.now();

    const failedSnap = await admin.firestore()
        .collection(SESSIONS_PATH)
        .where('procoreExport.exported',       '==', false)
        .where('procoreExport.nextRetryAfter', '<=', now)
        .limit(50)
        .get();

    if (failedSnap.empty) {
        return { retried: 0, succeeded: 0 };
    }

    let retried = 0, succeeded = 0;

    for (const doc of failedSnap.docs) {
        const session    = doc.data();
        const eventType  = session.procoreExport?.eventType || 'end';
        const retryCount = session.procoreExport?.retryCount || 0;

        if (retryCount >= MAX_RETRY_ATTEMPTS) {
            console.warn(`[procoreSessionExporter] session ${doc.id} — max retries reached, giving up`);
            await doc.ref.set({
                procoreExport: {
                    ...session.procoreExport,
                    nextRetryAfter: null,
                    gaveUp:         true,
                    gaveUpAt:       admin.firestore.Timestamp.now(),
                },
            }, { merge: true });
            continue;
        }

        retried++;

        try {
            const result = await exportSessionToProcore(doc.id, eventType);
            if (result.exported) succeeded++;
        } catch (err) {
            console.error(`[procoreSessionExporter] retry threw for ${doc.id}:`, err.message);
        }
    }

    console.log(`[procoreSessionExporter] retry run complete — retried=${retried} succeeded=${succeeded}`);
    return { retried, succeeded };
}

// ─── Legacy compat (kept for backwards compat with any direct callers) ────────

/**
 * @deprecated Use {@link exportSessionToProcore} instead. Kept for backwards compatibility.
 */
async function exportSessionStart(sessionData, machineData, operatorData, obraData) {
    if (!(await isProcoreConnected())) return { exported: false, reason: 'not_connected' };
    try {
        return await _doExportStart(sessionData, machineData, operatorData, obraData);
    } catch (err) {
        console.error('[procoreSessionExporter] exportSessionStart failed:', err.message);
        return { exported: false, reason: 'api_error', error: err.message };
    }
}

/**
 * @deprecated Use {@link exportSessionToProcore} instead. Kept for backwards compatibility.
 */
async function exportSessionEnd(sessionData, machineData, operatorData, obraData) {
    if (!(await isProcoreConnected())) return { exported: false, reason: 'not_connected' };
    try {
        return await _doExportEnd(sessionData, machineData, operatorData, obraData);
    } catch (err) {
        console.error('[procoreSessionExporter] exportSessionEnd failed:', err.message);
        return { exported: false, reason: 'api_error', error: err.message };
    }
}

module.exports = {
    exportSessionToProcore,
    retryFailedExports,
    exportSessionStart,
    exportSessionEnd,
    isProcoreConnected,
};
