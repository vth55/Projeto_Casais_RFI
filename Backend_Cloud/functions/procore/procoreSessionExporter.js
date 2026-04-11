/**
 * CASAIS Fleet Intelligence — Procore Session Exporter
 *
 * Envia sessões da nossa app para o Procore (Timecard Entries).
 * Triggers:
 *   - startSession: Envia presença inicial (hours: 0, marca entrada)
 *   - endSession: Envia timecard com horas reais
 *
 * Matching automático:
 *   - Obra → Procore Project (por nome normalizado)
 *   - Operador → Procore User (por email)
 *   - Máquina → Procore Equipment (por código de equipamento)
 */

const admin = require('firebase-admin');

const APP_ID = 'casais-rfid';
const PROCORE_INTEGRATION_PATH = `artifacts/${APP_ID}/public/data/integrations/procore`;
const PROJECTS_COLLECTION = `${PROCORE_INTEGRATION_PATH}/projects`;
const DIRECTORY_COLLECTION = `${PROCORE_INTEGRATION_PATH}/directory`;
const EQUIPMENT_COLLECTION = `${PROCORE_INTEGRATION_PATH}/equipment`;
const OBRAS_PATH = `artifacts/${APP_ID}/public/data/obras`;
const OPERATORS_PATH = `artifacts/${APP_ID}/public/data/operators`;
const MACHINES_PATH = `artifacts/${APP_ID}/public/data/machines`;

function normalizeForMatching(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

async function isProcoreConnected() {
    const snap = await admin.firestore().doc(PROCORE_INTEGRATION_PATH).get();
    if (!snap.exists) return false;
    const data = snap.data() || {};
    return !!(data.access_token && data.refresh_token);
}

async function getValidToken() {
    const snap = await admin.firestore().doc(PROCORE_INTEGRATION_PATH).get();
    if (!snap.exists) {
        throw new Error('PROCORE_NOT_CONNECTED');
    }
    const data = snap.data();
    const now = Date.now();
    const expiresAt = data.expires_at || 0;

    if (expiresAt - 60000 > now) {
        return data.access_token;
    }

    if (!data.refresh_token) {
        throw new Error('PROCORE_NO_REFRESH_TOKEN');
    }

    console.log('[procoreSessionExporter] refreshing token...');
    const response = await fetch('https://login.procore.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: data.refresh_token,
            client_id: process.env.PROCORE_CLIENT_ID,
            client_secret: process.env.PROCORE_CLIENT_SECRET,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`PROCORE_TOKEN_REFRESH_FAILED: ${err}`);
    }

    const newTokens = await response.json();
    const newExpiresAt = Date.now() + (newTokens.expires_in * 1000);

    await snap.ref.update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: newExpiresAt,
    });

    console.log('[procoreSessionExporter] token refreshed successfully');
    return newTokens.access_token;
}

async function procoreFetch(endpoint, options = {}) {
    const snap = await admin.firestore().doc(PROCORE_INTEGRATION_PATH).get();
    if (!snap.exists) {
        throw new Error('PROCORE_NOT_CONNECTED');
    }

    const data = snap.data();
    const now = Date.now();
    const expiresAt = data.expires_at || 0;
    let token = data.access_token;

    if (expiresAt - 60000 <= now) {
        if (!data.refresh_token) {
            throw new Error('PROCORE_NO_REFRESH_TOKEN');
        }
        console.log('[procoreSessionExporter] refreshing token...');
        const response = await fetch('https://login.procore.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'refresh_token',
                refresh_token: data.refresh_token,
                client_id: process.env.PROCORE_CLIENT_ID,
                client_secret: process.env.PROCORE_CLIENT_SECRET,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`PROCORE_TOKEN_REFRESH_FAILED: ${err}`);
        }

        const newTokens = await response.json();
        const newExpiresAt = Date.now() + (newTokens.expires_in * 1000);
        token = newTokens.access_token;

        await snap.ref.update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: newExpiresAt,
        });
        console.log('[procoreSessionExporter] token refreshed successfully');
    }

    const companyId = data.company_id;
    const url = `https://api.procore.com/rest/v1.0${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Procore-Company-Id': companyId,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`PROCORE_API_ERROR: ${response.status} - ${errText}`);
    }

    return response.json();
}

async function findProcoreProject(obraName) {
    if (!obraName) return null;

    const snap = await admin.firestore().collection(PROJECTS_COLLECTION).limit(100).get();
    const normalizedTarget = normalizeForMatching(obraName);

    for (const doc of snap.docs) {
        const p = doc.data();
        const pName = normalizeForMatching(p.name || p.display_name || p.project_number);
        if (pName && (pName === normalizedTarget || pName.includes(normalizedTarget) || normalizedTarget.includes(pName))) {
            console.log(`[procoreSessionExporter] matched project: ${p.name} (id: ${p.id})`);
            return { id: p.id, name: p.name };
        }
    }

    console.log(`[procoreSessionExporter] no project match for: ${obraName}`);
    return null;
}

async function findProcoreUser(operatorEmail) {
    if (!operatorEmail) return null;

    const snap = await admin.firestore().collection(DIRECTORY_COLLECTION).limit(100).get();
    const emailLower = operatorEmail.toLowerCase().trim();

    for (const doc of snap.docs) {
        const u = doc.data();
        const uEmail = (u.email_address || u.email || '').toLowerCase().trim();
        if (uEmail === emailLower) {
            console.log(`[procoreSessionExporter] matched user: ${u.name} (id: ${u.id})`);
            return { id: u.id, name: u.name };
        }
    }

    console.log(`[procoreSessionExporter] no user match for: ${operatorEmail}`);
    return null;
}

async function findProcoreEquipment(machineCode) {
    if (!machineCode) return null;

    const snap = await admin.firestore().collection(EQUIPMENT_COLLECTION).limit(100).get();
    const normalizedTarget = normalizeForMatching(machineCode);

    for (const doc of snap.docs) {
        const e = doc.data();
        const eName = normalizeForMatching(e.name || e.equipment_number || e.number);
        if (eName && (eName === normalizedTarget || eName.includes(normalizedTarget) || normalizedTarget.includes(eName))) {
            console.log(`[procoreSessionExporter] matched equipment: ${e.name} (id: ${e.id})`);
            return { id: e.id, name: e.name };
        }
    }

    console.log(`[procoreSessionExporter] no equipment match for: ${machineCode}`);
    return null;
}

async function createTimecardEntry(projectId, date, hours, description, loginInfoId, equipmentId = null, notes = null) {
    const endpoint = `/projects/${projectId}/timecard_entries`;

    const payload = {
        date,
        hours,
        description,
        login_information_id: loginInfoId,
    };

    if (notes) payload.notes = notes;
    if (equipmentId) payload.equipment_id = equipmentId;

    console.log(`[procoreSessionExporter] creating timecard → ${endpoint} | ${date} | ${hours}h | ${description}`);

    const result = await procoreFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    console.log(`[procoreSessionExporter] timecard created: id=${result.id}`);
    return result;
}

async function exportSessionStart(sessionData, machineData, operatorData, obraData) {
    if (!(await isProcoreConnected())) {
        console.log('[procoreSessionExporter] Procore not connected, skipping export');
        return { exported: false, reason: 'not_connected' };
    }

    const procoreProject = await findProcoreProject(obraData?.workName);
    const procoreUser = await findProcoreUser(operatorData?.email);
    const procoreEquipment = await findProcoreEquipment(machineData?.name || machineData?.id);

    if (!procoreProject) {
        console.log('[procoreSessionExporter] no project match, skipping start export');
        return { exported: false, reason: 'no_project_match', obraName: obraData?.workName };
    }

    if (!procoreUser) {
        console.log('[procoreSessionExporter] no user match, skipping start export');
        return { exported: false, reason: 'no_user_match', operatorEmail: operatorData?.email };
    }

    const startDate = new Date().toISOString().split('T')[0];
    const description = `Entrada: ${machineData?.name || 'Máquina'} - ${operatorData?.name || 'Operador'}`;

    try {
        const timecard = await createTimecardEntry(
            procoreProject.id,
            startDate,
            0,
            description,
            procoreUser.id,
            procoreEquipment?.id,
            `Sessão iniciada às ${new Date().toLocaleTimeString('pt-PT')}`
        );

        return {
            exported: true,
            type: 'start',
            projectId: procoreProject.id,
            projectName: procoreProject.name,
            userId: procoreUser.id,
            userName: procoreUser.name,
            timecardId: timecard.id,
            timecardDate: startDate,
        };
    } catch (err) {
        console.error('[procoreSessionExporter] start export failed:', err.message);
        return { exported: false, reason: 'api_error', error: err.message };
    }
}

async function exportSessionEnd(sessionData, machineData, operatorData, obraData) {
    if (!(await isProcoreConnected())) {
        console.log('[procoreSessionExporter] Procore not connected, skipping export');
        return { exported: false, reason: 'not_connected' };
    }

    const procoreProject = await findProcoreProject(obraData?.workName);
    const procoreUser = await findProcoreUser(operatorData?.email);
    const procoreEquipment = await findProcoreEquipment(machineData?.name || machineData?.id);

    if (!procoreProject) {
        console.log('[procoreSessionExporter] no project match, skipping end export');
        return { exported: false, reason: 'no_project_match', obraName: obraData?.workName };
    }

    if (!procoreUser) {
        console.log('[procoreSessionExporter] no user match, skipping end export');
        return { exported: false, reason: 'no_user_match', operatorEmail: operatorData?.email };
    }

    const endTime = sessionData.endTime?.toDate ? sessionData.endTime.toDate() : new Date(sessionData.endTime);
    const startTime = sessionData.startTime?.toDate ? sessionData.startTime.toDate() : new Date(sessionData.startTime);
    const date = endTime.toISOString().split('T')[0];
    const hours = sessionData.durationHours || ((endTime - startTime) / (1000 * 60 * 60));
    const description = `Sessão: ${machineData?.name || 'Máquina'} (${hours.toFixed(2)}h)`;

    const startTimeStr = startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const notes = `Sessão das ${startTimeStr} às ${endTimeStr}`;

    try {
        const timecard = await createTimecardEntry(
            procoreProject.id,
            date,
            hours,
            description,
            procoreUser.id,
            procoreEquipment?.id,
            notes
        );

        return {
            exported: true,
            type: 'end',
            projectId: procoreProject.id,
            projectName: procoreProject.name,
            userId: procoreUser.id,
            userName: procoreUser.name,
            timecardId: timecard.id,
            timecardDate: date,
            hours: hours,
        };
    } catch (err) {
        console.error('[procoreSessionExporter] end export failed:', err.message);
        return { exported: false, reason: 'api_error', error: err.message };
    }
}

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

async function exportSessionToProcore(sessionId, eventType) {
    const sessionSnap = await admin.firestore().doc(`artifacts/${APP_ID}/public/data/sessions/${sessionId}`).get();
    if (!sessionSnap.exists) {
        throw new Error(`Session not found: ${sessionId}`);
    }

    const sessionData = sessionSnap.data();
    const machineData = await getMachineById(sessionData.machineId);
    const operatorData = await getOperatorById(sessionData.cardId);

    const obraId = sessionData.obraId || machineData?.obraId;
    const obraData = obraId ? await getObraById(obraId) : null;

    if (eventType === 'start') {
        return exportSessionStart(sessionData, machineData, operatorData, obraData);
    } else {
        return exportSessionEnd(sessionData, machineData, operatorData, obraData);
    }
}

module.exports = {
    exportSessionStart,
    exportSessionEnd,
    exportSessionToProcore,
    isProcoreConnected,
};