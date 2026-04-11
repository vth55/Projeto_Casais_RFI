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

function normalizeForMatching(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

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
        const refreshRes = await fetch('https://login.procore.com/oauth/token', {
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

    const url = `https://api.procore.com/rest/v1.0${endpoint}`;
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

async function isProcoreConnected() {
    const snap = await admin.firestore().doc(PROCORE_INTEGRATION_PATH).get();
    if (!snap.exists) return false;
    const d = snap.data() || {};
    return !!(d.access_token && d.refresh_token);
}

// ─── Entity matching (fuzzy, normalised) ─────────────────────────────────────

async function findProcoreProject(obraName) {
    if (!obraName) return null;
    const snap = await admin.firestore().collection(PROJECTS_COLLECTION).limit(200).get();
    const target = normalizeForMatching(obraName);
    for (const doc of snap.docs) {
        const p = doc.data();
        const name = normalizeForMatching(p.name || p.display_name || p.project_number);
        if (name && (name === target || name.includes(target) || target.includes(name))) {
            console.log(`[procoreSessionExporter] matched project: ${p.name} (id:${p.id})`);
            return { id: p.id, name: p.name };
        }
    }
    console.log(`[procoreSessionExporter] no project match for: "${obraName}"`);
    return null;
}

async function findProcoreUser(operatorEmail) {
    if (!operatorEmail) return null;
    const snap = await admin.firestore().collection(DIRECTORY_COLLECTION).limit(200).get();
    const emailLower = operatorEmail.toLowerCase().trim();
    for (const doc of snap.docs) {
        const u = doc.data();
        const uEmail = (u.email_address || u.email || '').toLowerCase().trim();
        if (uEmail === emailLower) {
            console.log(`[procoreSessionExporter] matched user: ${u.name} (id:${u.id})`);
            return { id: u.id, name: u.name };
        }
    }
    console.log(`[procoreSessionExporter] no user match for: "${operatorEmail}"`);
    return null;
}

async function findProcoreEquipment(identifier) {
    if (!identifier) return null;
    const snap = await admin.firestore().collection(EQUIPMENT_COLLECTION).limit(200).get();
    const target = normalizeForMatching(identifier);
    for (const doc of snap.docs) {
        const e = doc.data();
        const name = normalizeForMatching(e.name || e.equipment_number || e.number);
        if (name && (name === target || name.includes(target) || target.includes(name))) {
            console.log(`[procoreSessionExporter] matched equipment: ${e.name} (id:${e.id})`);
            return { id: e.id, name: e.name };
        }
    }
    return null;
}

// ─── Firestore loaders ───────────────────────────────────────────────────────

async function getObraById(obraId) {
    if (!obraId) return null;
    const snap = await admin.firestore().doc(`${OBRAS_PATH}/${obraId}`).get();
    return snap.exists ? snap.data() : null;
}

async function getOperatorById(operatorId) {
    if (!operatorId) return null;
    const snap = await admin.firestore().doc(`${OPERATORS_PATH}/${operatorId}`).get();
    return snap.exists ? snap.data() : null;
}

async function getMachineById(machineId) {
    if (!machineId) return null;
    const snap = await admin.firestore().doc(`${MACHINES_PATH}/${machineId}`).get();
    return snap.exists ? snap.data() : null;
}

// ─── Timecard creation ───────────────────────────────────────────────────────

async function createTimecardEntry(projectId, { date, hours, description, loginInfoId, equipmentId, notes }) {
    const payload = {
        date,
        hours,
        description,
        login_information_id: loginInfoId,
    };
    if (notes)       payload.notes        = notes;
    if (equipmentId) payload.equipment_id = equipmentId;

    console.log(`[procoreSessionExporter] POST /projects/${projectId}/timecard_entries | ${date} | ${hours.toFixed(2)}h`);
    const result = await procoreFetch(`/projects/${projectId}/timecard_entries`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    console.log(`[procoreSessionExporter] timecard created id=${result.id}`);
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
        console.log(`[procoreSessionExporter] session ${sessionId} already exported (${eventType}) — skipping`);
        return existing;
    }

    // ── Check integration is active ──────────────────────────────────────────
    if (!(await isProcoreConnected())) {
        console.log('[procoreSessionExporter] Procore not connected — skipping');
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

        console.log(`[procoreSessionExporter] session ${sessionId} queued for retry (attempt ${prevAttempts + 1}/${MAX_RETRY_ATTEMPTS})`);
    }

    return result;
}

/**
 * Retry all sessions where Procore export previously failed and the
 * backoff window has elapsed.  Called by `procoreExportRetry` Cloud Function.
 */
async function retryFailedExports() {
    if (!(await isProcoreConnected())) {
        console.log('[procoreSessionExporter] Procore not connected — retry run skipped');
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
        console.log('[procoreSessionExporter] no failed exports ready for retry');
        return { retried: 0, succeeded: 0 };
    }

    let retried = 0, succeeded = 0;

    for (const doc of failedSnap.docs) {
        const session    = doc.data();
        const eventType  = session.procoreExport?.eventType || 'end';
        const retryCount = session.procoreExport?.retryCount || 0;

        if (retryCount >= MAX_RETRY_ATTEMPTS) {
            console.log(`[procoreSessionExporter] session ${doc.id} — max retries reached, marking as given up`);
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

        console.log(`[procoreSessionExporter] retrying session ${doc.id} (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}, type=${eventType})`);
        retried++;

        try {
            const result = await exportSessionToProcore(doc.id, eventType);
            if (result.exported) {
                succeeded++;
                console.log(`[procoreSessionExporter] retry succeeded for ${doc.id} — timecardId=${result.timecardId}`);
            }
        } catch (err) {
            console.error(`[procoreSessionExporter] retry threw for ${doc.id}:`, err.message);
        }
    }

    console.log(`[procoreSessionExporter] retry run complete — retried=${retried} succeeded=${succeeded}`);
    return { retried, succeeded };
}

// ─── Legacy compat (kept for backwards compat with any direct callers) ────────

async function exportSessionStart(sessionData, machineData, operatorData, obraData) {
    if (!(await isProcoreConnected())) return { exported: false, reason: 'not_connected' };
    try {
        return await _doExportStart(sessionData, machineData, operatorData, obraData);
    } catch (err) {
        console.error('[procoreSessionExporter] exportSessionStart failed:', err.message);
        return { exported: false, reason: 'api_error', error: err.message };
    }
}

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
