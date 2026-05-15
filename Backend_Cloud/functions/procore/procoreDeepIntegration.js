/**
 * CASAIS Fleet Intelligence — Procore Deep Integration (Sprint 3)
 *
 * Cloud Functions:
 *   equipmentLogsDailyAgg   — Scheduler 23:55 Lisbon. Agrega horas RFID do dia → equipment_logs Procore.
 *   procoreWebhookReceiver  — HTTP. Recebe webhooks Procore (HMAC-SHA256 validado).
 *   onAvariaCreated         — Firestore trigger. Avaria → Procore Observation.
 *   onWorkOrderToProcore    — Firestore trigger. WorkOrder criada/concluída → Procore Observation.
 *   procoreSyncQueueRun     — Scheduler 15min. Processa fila de retry de operações falhadas.
 *   procoreTokenRefresh     — Scheduler 6h. Refresh proactivo do token OAuth antes de expirar.
 *   pullProcoreCache        — Scheduler diário 00:30. Pulls cost_codes + vendors → procore_cache.
 *
 * Secrets: PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID, PROCORE_WEBHOOK_SECRET
 */

const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

const {
    PROCORE_CLIENT_ID,
    PROCORE_CLIENT_SECRET,
    PROCORE_COMPANY_ID,
    createEquipmentLog,
    createObservation,
    updateObservation,
    getCostCodes,
    getVendors,
    archiveEquipment,
    createEquipment,
    updateEquipment,
    associateEquipmentToProject,
    createDirectoryUser,
    getValidAccessToken: _getToken,
} = require('./procoreBridge');

const PROCORE_WEBHOOK_SECRET = defineSecret('PROCORE_WEBHOOK_SECRET');

const APP_ID = 'casais-rfid';
const BASE   = `artifacts/${APP_ID}/public/data`;
const INTEGRATION_PATH  = `${BASE}/integrations/procore`;
const SESSIONS_PATH     = `${BASE}/sessions`;
const MACHINES_PATH     = `${BASE}/machines`;
const OBRAS_PATH        = `${BASE}/obras`;
const AVARIAS_PATH      = `${BASE}/avarias`;
const OPERATORS_PATH    = `${BASE}/operators`;
const WORK_ORDERS_PATH  = `${BASE}/workOrders`;
const SYNC_QUEUE_PATH   = `${BASE}/procoreSyncQueue`;
const PROCORE_CACHE_PATH = `${BASE}/procore_cache`;

const db = () => admin.firestore();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function isProcoreConnected() {
    const snap = await db().doc(INTEGRATION_PATH).get();
    if (!snap.exists) return false;
    const d = snap.data() || {};
    return !!(d.access_token && d.refresh_token);
}

async function getProcoreProjectId(obraId) {
    if (!obraId || obraId === 'estaleiro') return null;
    const snap = await db().doc(`${OBRAS_PATH}/${obraId}`).get();
    return snap.exists ? (snap.data().procoreProjectId || null) : null;
}

async function getMachineData(machineId) {
    if (!machineId) return null;
    const snap = await db().doc(`${MACHINES_PATH}/${machineId}`).get();
    return snap.exists ? snap.data() : null;
}

function formatDate(d) {
    return d.toISOString().split('T')[0];
}

/** Enqueue failed operation for retry */
async function enqueueSync(operation, payload, procoreProjectId = null) {
    const now = admin.firestore.Timestamp.now();
    return db().collection(SYNC_QUEUE_PATH).add({
        operation,
        payload,
        procoreProjectId,
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        nextRetryAt: now,
        lastError: null,
        createdAt: now,
        updatedAt: now,
    });
}

// ─── 3.3 Equipment Logs Daily Aggregation ────────────────────────────────────

exports.equipmentLogsDailyAgg = onSchedule(
    {
        schedule: 'every day 23:55',
        timeZone: 'Europe/Lisbon',
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
        timeoutSeconds: 540,
        memory: '512MiB',
    },
    async () => {
        if (!(await isProcoreConnected())) {
            console.log('[equipmentLogsDailyAgg] não conectado — skip');
            return null;
        }

        const today = new Date();
        const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay   = new Date(today); endOfDay.setHours(23, 59, 59, 999);
        const dateStr = formatDate(today);

        const snap = await db().collection(SESSIONS_PATH)
            .where('status', 'in', ['CLOSED', 'AUTO_CLOSED'])
            .where('endTime', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
            .where('endTime', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
            .get();

        if (snap.empty) {
            console.log('[equipmentLogsDailyAgg] nenhuma sessão hoje');
            return null;
        }

        // Group by machineId + obraId
        const groups = {};
        for (const doc of snap.docs) {
            const s = doc.data();
            const key = `${s.machineId}::${s.obraId || 'unknown'}`;
            if (!groups[key]) groups[key] = { machineId: s.machineId, obraId: s.obraId, totalHours: 0 };
            groups[key].totalHours += s.durationHours || 0;
        }

        let created = 0, enqueued = 0;

        for (const g of Object.values(groups)) {
            const machine = await getMachineData(g.machineId);
            if (!machine?.procoreEquipmentId) continue;

            const procoreProjectId = await getProcoreProjectId(g.obraId);
            if (!procoreProjectId) continue;

            const hours = Math.round(g.totalHours * 100) / 100;
            if (hours <= 0) continue;

            try {
                await createEquipmentLog(procoreProjectId, {
                    equipmentId: machine.procoreEquipmentId,
                    date: dateStr,
                    hours,
                    description: `CASAIS Fleet IoT — ${machine.name || g.machineId}`,
                });
                created++;
            } catch (err) {
                console.error(`[equipmentLogsDailyAgg] falha ${g.machineId}:`, err.message);
                await enqueueSync('create_equipment_log', {
                    equipmentId: machine.procoreEquipmentId,
                    date: dateStr, hours,
                    description: `CASAIS Fleet IoT — ${machine.name || g.machineId}`,
                }, procoreProjectId);
                enqueued++;
            }
        }

        console.log(`[equipmentLogsDailyAgg] done — created=${created} enqueued=${enqueued}`);
        return null;
    }
);

// ─── 3.4 Webhook Receiver + 3.5 Webhook Triggers ─────────────────────────────

exports.procoreWebhookReceiver = onRequest(
    {
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID, PROCORE_WEBHOOK_SECRET],
        region: 'us-central1',
        cors: false,
    },
    async (req, res) => {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

        // HMAC validation (T3.05 / TP.05)
        const secret = process.env.PROCORE_WEBHOOK_SECRET;
        if (secret) {
            const signature = req.headers['x-procore-signature'] || req.headers['x-webhook-signature'] || '';
            const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(req.body);
            const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
            // timingSafeEqual exige buffers do mesmo tamanho — comparar via utf8 strings
            const sigBuf = Buffer.from(signature, 'utf8');
            const expBuf = Buffer.from(expected, 'utf8');
            if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
                console.warn('[webhook] HMAC mismatch — rejecting');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        } else {
            console.warn('[webhook] PROCORE_WEBHOOK_SECRET não configurado — HMAC não validado');
        }

        const event = req.body;
        const { resource_name, event_type, payload } = event || {};
        console.log(`[webhook] ${resource_name}.${event_type}`, JSON.stringify(payload)?.substring(0, 200));

        try {
            await processWebhookEvent(resource_name, event_type, payload || {});
            return res.json({ received: true });
        } catch (err) {
            console.error('[webhook] processing error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    }
);

async function processWebhookEvent(resourceName, eventType, payload) {
    const now = admin.firestore.Timestamp.now();
    // Procore envia event_type em UPPERCASE (CREATE, UPDATE, DELETE)
    const evt = String(eventType || '').toUpperCase();

    if (resourceName === 'Equipment' && evt === 'CREATE') {
        const eqId = payload.id;
        if (!eqId) return;
        const existing = await db().collection(MACHINES_PATH)
            .where('procoreEquipmentId', '==', eqId).limit(1).get();
        if (!existing.empty) return;
        await db().collection(MACHINES_PATH).add({
            name: payload.name || `Equipamento Procore #${eqId}`,
            procoreEquipmentId: eqId,
            status: 'idle',
            source: 'procore_webhook',
            estadoOperacional: 'disponivel',
            localizacao: { type: 'estaleiro', obraId: 'estaleiro', obraName: 'Estaleiro' },
            createdAt: now,
            updatedAt: now,
        });
        console.log(`[webhook] Equipment.CREATE → stub criado procoreEquipmentId=${eqId}`);
    }

    if (resourceName === 'Equipment' && evt === 'UPDATE') {
        const eqId = payload.id;
        if (!eqId) return;
        const snap = await db().collection(MACHINES_PATH)
            .where('procoreEquipmentId', '==', eqId).limit(1).get();
        if (snap.empty) return;
        await snap.docs[0].ref.update({
            lastSyncSource: 'procore_webhook',
            updatedAt: now,
            ...(payload.name ? { name: payload.name } : {}),
        });
        console.log(`[webhook] Equipment.UPDATE id=${eqId}`);
    }

    if (resourceName === 'Equipment' && evt === 'DELETE') {
        const eqId = payload.id;
        if (!eqId) return;
        const snap = await db().collection(MACHINES_PATH)
            .where('procoreEquipmentId', '==', eqId).limit(1).get();
        if (snap.empty) return;
        const doc = snap.docs[0];
        if (doc.id.startsWith('procore_')) {
            await doc.ref.delete();
            console.log(`[webhook] Equipment.DELETE → stub ${doc.id} apagado`);
        } else {
            await doc.ref.set({
                procoreEquipmentId: admin.firestore.FieldValue.delete(),
                pairingStatus: 'procore_removed',
                procoreRemovedAt: now,
            }, { merge: true });
            console.log(`[webhook] Equipment.DELETE → ${doc.id} marcado procore_removed`);
        }
    }

    if (resourceName === 'Project' && evt === 'CREATE') {
        const projectId = payload.id;
        if (!projectId) return;
        const existing = await db().collection(OBRAS_PATH)
            .where('procoreProjectId', '==', projectId).limit(1).get();
        if (!existing.empty) return;
        await db().collection(OBRAS_PATH).add({
            name: payload.name || `Projecto Procore #${projectId}`,
            procoreProjectId: projectId,
            status: 'ACTIVE',
            precisaRfid: true,
            source: 'procore_webhook',
            createdAt: now,
            updatedAt: now,
        });
        console.log(`[webhook] Project.CREATE → obra criada procoreProjectId=${projectId}`);
    }

    if (resourceName === 'Project' && evt === 'UPDATE') {
        const projectId = payload.id;
        if (!projectId) return;
        const snap = await db().collection(OBRAS_PATH)
            .where('procoreProjectId', '==', projectId).limit(1).get();
        if (snap.empty) return;
        await snap.docs[0].ref.update({
            ...(payload.name ? { name: payload.name } : {}),
            lastSyncSource: 'procore_webhook',
            updatedAt: now,
        });
        console.log(`[webhook] Project.UPDATE id=${projectId}`);
    }

    if (resourceName === 'Directory' && evt === 'CREATE') {
        const userId = payload.id;
        if (!userId) return;
        const existing = await db().collection(OPERATORS_PATH)
            .where('procoreUserId', '==', String(userId)).limit(1).get();
        if (!existing.empty) return;
        const fullName = [payload.first_name, payload.last_name].filter(Boolean).join(' ')
            || payload.name || `Utilizador Procore #${userId}`;
        await db().collection(OPERATORS_PATH).add({
            name: fullName,
            procoreUserId: String(userId),
            email: payload.email_address || null,
            role: 'operador',
            source: 'procore_webhook',
            pairingStatus: 'paired',
            createdAt: now,
            updatedAt: now,
        });
        console.log(`[webhook] Directory.CREATE → operator criado procoreUserId=${userId}`);
    }

    if (resourceName === 'Directory' && evt === 'UPDATE') {
        const userId = payload.id;
        if (!userId) return;
        const snap = await db().collection(OPERATORS_PATH)
            .where('procoreUserId', '==', String(userId)).limit(1).get();
        if (snap.empty) return;
        const fullName = [payload.first_name, payload.last_name].filter(Boolean).join(' ');
        await snap.docs[0].ref.update({
            ...(fullName ? { name: fullName } : {}),
            ...(payload.email_address ? { email: payload.email_address } : {}),
            lastSyncSource: 'procore_webhook',
            updatedAt: now,
        });
        console.log(`[webhook] Directory.UPDATE id=${userId}`);
    }
}

// ─── 3.7 Avarias → Procore Observations ──────────────────────────────────────

exports.onAvariaCreatedToProcore = onDocumentCreated(
    {
        document: `${AVARIAS_PATH}/{avariaId}`,
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
    },
    async (event) => {
        const avaria  = event.data.data();
        const avariaId = event.params.avariaId;

        if (!(await isProcoreConnected())) return null;

        // Determine procoreProjectId from machine's current obra
        const machine = await getMachineData(avaria.machineId);
        const obraId  = avaria.obraId || machine?.localizacao?.obraId || machine?.obraId;
        const procoreProjectId = await getProcoreProjectId(obraId);

        if (!procoreProjectId) {
            console.log(`[onAvariaCreated] sem procoreProjectId para avaria ${avariaId} — skip`);
            return null;
        }

        const machineName  = machine?.name || avaria.machineId || 'Máquina';
        const obraName     = avaria.obraName || machine?.localizacao?.obraName || 'Obra';

        try {
            const observation = await createObservation(procoreProjectId, {
                name: `Avaria: ${avaria.tipo || 'Geral'} — ${machineName}`,
                description: [
                    `Máquina: ${machineName}`,
                    `Obra: ${obraName}`,
                    `Descrição: ${avaria.descricao || ''}`,
                    `Prioridade: ${avaria.prioridade || 'normal'}`,
                    `Reportado por: ${avaria.reportadoPor || 'Sistema'}`,
                ].join('\n'),
                status: 'initiated',
                datetimeInitiated: avaria.createdAt?.toDate
                    ? avaria.createdAt.toDate().toISOString()
                    : new Date().toISOString(),
            });

            await event.data.ref.update({
                procoreObservationId: observation?.id || null,
                procoreSynced: true,
                procoreSyncedAt: admin.firestore.Timestamp.now(),
            });

            console.log(`[onAvariaCreated] observation ${observation?.id} criada para avaria ${avariaId}`);
        } catch (err) {
            console.error(`[onAvariaCreated] falha para ${avariaId}:`, err.message);
            await enqueueSync('create_observation', {
                avariaId,
                procoreProjectId,
                name: `Avaria: ${avaria.tipo || 'Geral'} — ${machineName}`,
                description: avaria.descricao || '',
            }, procoreProjectId);
        }

        return null;
    }
);

// ─── 3.8 WorkOrders → Procore Observations ───────────────────────────────────

exports.onWorkOrderToProcore = onDocumentUpdated(
    {
        document: `${WORK_ORDERS_PATH}/{workOrderId}`,
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
    },
    async (event) => {
        const before  = event.data.before.data();
        const after   = event.data.after.data();
        const woId    = event.params.workOrderId;

        if (!(await isProcoreConnected())) return null;

        const machine = await getMachineData(after.machineId);
        const obraId  = after.obraId || machine?.localizacao?.obraId;
        const procoreProjectId = await getProcoreProjectId(obraId);
        if (!procoreProjectId) return null;

        const machineName = machine?.name || after.machineId || 'Máquina';

        // Criar observation quando WorkOrder é criada (ou estado muda para atribuida)
        if (!before.procoreObservationId && !after.procoreObservationId) {
            try {
                const obs = await createObservation(procoreProjectId, {
                    name: `OS ${after.numero || woId}: ${after.tipo || 'Manutenção'} — ${machineName}`,
                    description: [
                        `OS: ${after.numero || woId}`,
                        `Tipo: ${after.tipo || 'N/A'}`,
                        `Máquina: ${machineName}`,
                        `Prioridade: ${after.prioridade || 'normal'}`,
                        after.descricao ? `Descrição: ${after.descricao}` : null,
                    ].filter(Boolean).join('\n'),
                    status: 'initiated',
                });
                await event.data.after.ref.update({ procoreObservationId: obs?.id || null });
                console.log(`[onWorkOrderToProcore] observation criada para WO ${woId}`);
            } catch (err) {
                console.error(`[onWorkOrderToProcore] create failed ${woId}:`, err.message);
                await enqueueSync('create_observation_workorder', { woId, procoreProjectId }, procoreProjectId);
            }
            return null;
        }

        // Fechar observation quando WorkOrder é concluída
        const becameConcluida = before.estado !== 'concluida' && after.estado === 'concluida';
        if (becameConcluida && after.procoreObservationId) {
            try {
                await updateObservation(procoreProjectId, after.procoreObservationId, {
                    status: 'closed',
                    description: `${after.descricao || ''}\n\nConcluída em: ${after.concluidaEm?.toDate?.()?.toISOString() || new Date().toISOString()}`,
                });
                console.log(`[onWorkOrderToProcore] observation ${after.procoreObservationId} fechada`);
            } catch (err) {
                console.error(`[onWorkOrderToProcore] update failed ${woId}:`, err.message);
                await enqueueSync('update_observation', {
                    procoreProjectId,
                    observationId: after.procoreObservationId,
                    updates: { status: 'closed' },
                }, procoreProjectId);
            }
        }

        return null;
    }
);

// ─── 3.9 procoreSyncQueue Processor ──────────────────────────────────────────

exports.procoreSyncQueueRun = onSchedule(
    {
        schedule: 'every 15 minutes',
        timeZone: 'Europe/Lisbon',
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
        timeoutSeconds: 300,
    },
    async () => {
        if (!(await isProcoreConnected())) return null;

        const now = admin.firestore.Timestamp.now();
        const pendingSnap = await db().collection(SYNC_QUEUE_PATH)
            .where('status', '==', 'pending')
            .where('nextRetryAt', '<=', now)
            .orderBy('nextRetryAt', 'asc')
            .limit(20)
            .get();

        if (pendingSnap.empty) {
            console.log('[syncQueue] nada pendente');
            return null;
        }

        let succeeded = 0, failed = 0;

        for (const doc of pendingSnap.docs) {
            const item = doc.data();
            await doc.ref.update({ status: 'processing', updatedAt: now });

            try {
                await executeQueueItem(item);
                await doc.ref.update({ status: 'done', updatedAt: admin.firestore.Timestamp.now() });
                succeeded++;
            } catch (err) {
                const attempts = (item.attempts || 0) + 1;
                const maxAttempts = item.maxAttempts || 5;
                // Exponential backoff: 5min, 20min, 60min, 3h, 12h
                const backoffMinutes = [5, 20, 60, 180, 720][Math.min(attempts - 1, 4)];
                const nextRetry = admin.firestore.Timestamp.fromMillis(
                    Date.now() + backoffMinutes * 60 * 1000
                );
                const newStatus = attempts >= maxAttempts ? 'failed' : 'pending';
                await doc.ref.update({
                    status: newStatus,
                    attempts,
                    lastError: err.message,
                    nextRetryAt: nextRetry,
                    updatedAt: admin.firestore.Timestamp.now(),
                });
                failed++;
                console.error(`[syncQueue] ${item.operation} tentativa=${attempts}/${maxAttempts}:`, err.message);
            }
        }

        console.log(`[syncQueue] done — succeeded=${succeeded} failed=${failed}`);
        return null;
    }
);

async function executeQueueItem(item) {
    const { operation, payload, procoreProjectId } = item;

    if (operation === 'create_equipment_log') {
        await createEquipmentLog(procoreProjectId, payload);
    } else if (operation === 'create_observation' || operation === 'create_observation_workorder') {
        await createObservation(procoreProjectId, payload);
    } else if (operation === 'update_observation') {
        await updateObservation(procoreProjectId, payload.observationId, payload.updates);
    } else if (operation === 'archive_equipment') {
        const result = await archiveEquipment(payload.procoreEquipmentId);
        if (!result.success) throw new Error(result.error || 'archive_equipment failed');
    } else if (operation === 'create_equipment') {
        const result = await createEquipment({ name: payload.name });
        const procoreId = result.data?.id;
        if (procoreId && payload.machineId) {
            await db().doc(`${MACHINES_PATH}/${payload.machineId}`).update({
                procoreEquipmentId: procoreId,
                pairingStatus: 'paired',
                lastSyncSource: 'pwa_created',
                updatedAt: admin.firestore.Timestamp.now(),
            });
        }
    } else {
        throw new Error(`Operação desconhecida: ${operation}`);
    }
}

// ─── 3.10 OAuth Proactive Refresh ────────────────────────────────────────────

exports.procoreTokenRefresh = onSchedule(
    {
        schedule: 'every 6 hours',
        timeZone: 'Europe/Lisbon',
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
    },
    async () => {
        if (!(await isProcoreConnected())) return null;
        try {
            // getValidAccessToken() already refreshes if within REFRESH_SAFETY_MARGIN_MS.
            // Calling it proactively ensures the token is always fresh even if no other
            // function has been invoked recently.
            await _getToken();
            console.log('[procoreTokenRefresh] token verificado/refrescado');
        } catch (err) {
            console.error('[procoreTokenRefresh] falha:', err.message);
        }
        return null;
    }
);

// ─── 3.6 Pull cost_codes + vendors → procore_cache ───────────────────────────

exports.pullProcoreCache = onSchedule(
    {
        schedule: 'every day 00:30',
        timeZone: 'Europe/Lisbon',
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
        timeoutSeconds: 300,
    },
    async () => {
        if (!(await isProcoreConnected())) return null;

        const now = admin.firestore.Timestamp.now();
        let vendorCount = 0, costCodeProjects = 0;

        // Pull vendors (company-level)
        try {
            const vendors = await getVendors();
            const batch = db().batch();
            for (const v of vendors) {
                const ref = db().doc(`${PROCORE_CACHE_PATH}/vendors/${v.id}`);
                batch.set(ref, { ...v, _cachedAt: now }, { merge: true });
            }
            await batch.commit();
            vendorCount = vendors.length;
            console.log(`[pullProcoreCache] vendors cached: ${vendorCount}`);
        } catch (err) {
            console.error('[pullProcoreCache] vendors failed:', err.message);
        }

        // Pull cost_codes for all active obras that have a procoreProjectId
        const obrasSnap = await db().collection(OBRAS_PATH)
            .where('status', '==', 'ACTIVE').limit(50).get();

        for (const obraDoc of obrasSnap.docs) {
            const obra = obraDoc.data();
            if (!obra.procoreProjectId) continue;
            try {
                const codes = await getCostCodes(obra.procoreProjectId);
                const batch = db().batch();
                for (const c of codes) {
                    const ref = db().doc(`${PROCORE_CACHE_PATH}/cost_codes/${obra.procoreProjectId}_${c.id}`);
                    batch.set(ref, { ...c, procoreProjectId: obra.procoreProjectId, _cachedAt: now }, { merge: true });
                }
                await batch.commit();
                costCodeProjects++;
            } catch (err) {
                console.error(`[pullProcoreCache] cost_codes for obra ${obraDoc.id}:`, err.message);
            }
        }

        console.log(`[pullProcoreCache] done — vendors=${vendorCount} cost_code_projects=${costCodeProjects}`);

        await db().doc(INTEGRATION_PATH).set({
            last_cache_pull_at: now,
            last_cache_summary: { vendors: vendorCount, cost_code_projects: costCodeProjects },
        }, { merge: true });

        return null;
    }
);

// ─── PWA → Procore: máquina apagada na PWA → arquivar no Procore ─────────────

exports.onMachineDeletedToProcore = onDocumentDeleted(
    {
        document: `artifacts/casais-rfid/public/data/machines/{machineId}`,
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
    },
    async (event) => {
        const machine = event.data?.data();
        if (!machine) return null;

        const procoreEquipmentId = machine.procoreEquipmentId;
        if (!procoreEquipmentId) return null; // máquina sem ligação Procore — nada a fazer

        const machineId = event.params.machineId;
        console.log(`[onMachineDeleted] machine ${machineId} tinha procoreEquipmentId=${procoreEquipmentId} — a arquivar no Procore`);

        try {
            if (!(await isProcoreConnected())) {
                console.log('[onMachineDeleted] Procore não conectado — skip');
                return null;
            }

            const result = await archiveEquipment(procoreEquipmentId);
            if (result.success) {
                console.log(`[onMachineDeleted] Procore equipment ${procoreEquipmentId} arquivado via ${result.method}`);
            } else {
                console.error(`[onMachineDeleted] falha ao arquivar ${procoreEquipmentId}:`, result.error);
                // Colocar na fila de retry
                await enqueueSync('archive_equipment', { procoreEquipmentId, machineId }, null);
            }
        } catch (err) {
            console.error('[onMachineDeleted] erro:', err.message);
            await enqueueSync('archive_equipment', { procoreEquipmentId, machineId }, null);
        }

        return null;
    }
);

// ─── PWA → Procore: máquina criada na PWA → criar equipamento no Procore ──────

exports.onMachineCreatedToProcore = onDocumentCreated(
    {
        document: `artifacts/casais-rfid/public/data/machines/{machineId}`,
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
    },
    async (event) => {
        const machine = event.data.data();
        const machineId = event.params.machineId;

        if (!machine || !machine.name) return null;
        // Stubs vindos do Procore não precisam de ser re-criados
        if (machineId.startsWith('procore_')) return null;
        if (machine.source === 'procore' || machine.source === 'procore_webhook') return null;
        // Já emparelhado (criado pelo sync) — não duplicar
        if (machine.procoreEquipmentId) return null;

        if (!(await isProcoreConnected())) return null;

        console.log(`[onMachineCreated] nova máquina ${machineId} (${machine.name}) → criar no Procore`);

        try {
            // Ler defaults da config (status, category, type obrigatórios na API v2.1)
            const cfgSnap = await db().doc(INTEGRATION_PATH).get();
            const defaults = cfgSnap.data()?.equipmentDefaults || {};
            const idNum = `PWA-${Date.now().toString(36).toUpperCase()}`;
            const payload = {
                name: machine.name,
                identification_number: idNum,
                ownership: 'owned',
                ...(defaults.status_id   ? { status_id:   defaults.status_id }   : {}),
                ...(defaults.category_id ? { category_id: defaults.category_id } : {}),
                ...(defaults.type_id     ? { type_id:     defaults.type_id }     : {}),
            };
            const result = await createEquipment(payload);
            const procoreId = result.data?.id;
            if (!procoreId) throw new Error('Procore não devolveu ID');

            await db().doc(`${MACHINES_PATH}/${machineId}`).update({
                procoreEquipmentId: procoreId,
                pairingStatus: 'paired',
                lastSyncSource: 'pwa_created',
                updatedAt: admin.firestore.Timestamp.now(),
            });
            console.log(`[onMachineCreated] Procore equipment ${procoreId} criado para ${machineId}`);

            // Associar ao projecto se estiver numa obra
            const obraId = machine.localizacao?.obraId;
            if (obraId && obraId !== 'estaleiro') {
                const procoreProjectId = await getProcoreProjectId(obraId);
                if (procoreProjectId) {
                    await associateEquipmentToProject(procoreId, procoreProjectId);
                    console.log(`[onMachineCreated] associado ao projecto ${procoreProjectId}`);
                }
            }
        } catch (err) {
            console.error(`[onMachineCreated] erro: ${err.message}`);
            await enqueueSync('create_equipment', { machineId, name: machine.name }, null);
        }

        return null;
    }
);

// ─── PWA → Procore: nome de máquina alterado na PWA → actualizar no Procore ───

exports.onMachineUpdatedToProcore = onDocumentUpdated(
    {
        document: `artifacts/casais-rfid/public/data/machines/{machineId}`,
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
    },
    async (event) => {
        const before = event.data.before.data();
        const after  = event.data.after.data();
        const machineId = event.params.machineId;

        if (!after.procoreEquipmentId) return null;
        // Evitar loop: ignorar updates vindos do sync/webhook
        if (after.lastSyncSource === 'procore_webhook' || after.lastSyncSource === 'procore_sync') return null;
        // Só actuar se o nome mudou
        if (before.name === after.name) return null;

        if (!(await isProcoreConnected())) return null;

        console.log(`[onMachineUpdated] ${machineId}: "${before.name}" → "${after.name}"`);

        try {
            await updateEquipment(after.procoreEquipmentId, { name: after.name });
            console.log(`[onMachineUpdated] Procore equipment ${after.procoreEquipmentId} actualizado`);
        } catch (err) {
            console.error(`[onMachineUpdated] erro: ${err.message}`);
        }

        return null;
    }
);

// ─── PWA → Procore: operador criado na PWA → criar no Procore Directory ──────

exports.onOperatorCreatedToProcore = onDocumentCreated(
    {
        document: `${OPERATORS_PATH}/{operatorId}`,
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
    },
    async (event) => {
        const op = event.data.data();
        const operatorId = event.params.operatorId;

        if (!op || !op.name) return null;
        if (op.source === 'procore' || op.source === 'procore_webhook') return null;
        if (op.procoreUserId) return null;

        if (!(await isProcoreConnected())) return null;

        const nameParts = op.name.trim().split(/\s+/);
        const firstName = nameParts[0] || op.name;
        const lastName  = nameParts.slice(1).join(' ') || '';
        // Procore exige email — gerar placeholder se ausente
        const email = op.email || `${operatorId.toLowerCase().replace(/[^a-z0-9]/g, '')}@demo.casais.pt`;

        console.log(`[onOperatorCreated] ${operatorId} (${op.name}) → criar no Procore Directory`);

        try {
            const user = await createDirectoryUser({ firstName, lastName, email });
            const procoreId = user?.id;
            if (!procoreId) throw new Error('Procore não devolveu ID do utilizador');

            await db().doc(`${OPERATORS_PATH}/${operatorId}`).update({
                procoreUserId: String(procoreId),
                pairingStatus: 'paired',
                lastSyncSource: 'pwa_created',
                updatedAt: admin.firestore.Timestamp.now(),
            });
            console.log(`[onOperatorCreated] Procore user ${procoreId} criado para ${operatorId}`);
        } catch (err) {
            console.error(`[onOperatorCreated] erro: ${err.message}`);
            await db().doc(`${OPERATORS_PATH}/${operatorId}`).update({
                pairingStatus: 'unpairable',
                pairingError: err.message.slice(0, 200),
                updatedAt: admin.firestore.Timestamp.now(),
            }).catch(() => {});
        }

        return null;
    }
);
