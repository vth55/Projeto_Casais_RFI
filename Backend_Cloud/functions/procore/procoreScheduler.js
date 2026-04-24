/**
 * CASAIS Fleet Intelligence — Procore Scheduler (Chunk 1C + Phase 3)
 *
 * Dois cron jobs:
 *   1. procoreScheduledSync  — horário, puxa catálogo Procore → Firestore
 *   2. procoreDailyWriteback — diário (23:30 Lisbon), agrega sessões RFID do dia
 *      e envia Timecards, Daily Logs e Cost Entries para o Procore
 *
 * Secrets necessários (mesmos do bridge):
 *   PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

const {
    runFullSync,
    createDailyLog,
    createCostEntry,
    PROCORE_CLIENT_ID,
    PROCORE_CLIENT_SECRET,
    PROCORE_COMPANY_ID,
} = require('./procoreBridge');

const APP_ID = 'casais-rfid';
const INTEGRATION_DOC_PATH = `artifacts/${APP_ID}/public/data/integrations/procore`;
const SESSIONS_PATH  = `artifacts/${APP_ID}/public/data/sessions`;
const MACHINES_PATH  = `artifacts/${APP_ID}/public/data/machines`;
const OPERATORS_PATH = `artifacts/${APP_ID}/public/data/operators`;
const OBRAS_PATH     = `artifacts/${APP_ID}/public/data/obras`;
const PROJECTS_COLLECTION = `${INTEGRATION_DOC_PATH}/projects`;

// ============================================
// HELPERS
// ============================================

async function isProcoreConnected() {
    const snap = await admin.firestore().doc(INTEGRATION_DOC_PATH).get();
    if (!snap.exists) return false;
    const data = snap.data() || {};
    return !!(data.access_token && data.refresh_token);
}

function normalizeForMatching(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

async function findProcoreProjectId(obraName) {
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
    return null;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// ============================================
// CRON 1 — Sync horário (catálogo Procore → Firestore)
// ============================================

const procoreScheduledSync = onSchedule(
    {
        schedule: 'every 1 hours',
        timeZone: 'Europe/Lisbon',
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
        timeoutSeconds: 540,
        memory: '512MiB',
    },
    async (event) => {
        console.log('[procoreScheduler] tick →', event?.scheduleTime || new Date().toISOString());

        if (!(await isProcoreConnected())) {
            console.log('[procoreScheduler] integração não conectada — sync ignorado.');
            return null;
        }

        try {
            const result = await runFullSync({ trigger: 'cron' });
            const hasErrors = Object.keys(result.errors || {}).length > 0;

            if (hasErrors) {
                console.warn(
                    `[procoreScheduler] sync parcial em ${result.duration_ms}ms — ` +
                    `errors=${Object.keys(result.errors).join(',')}`
                );
            } else {
                console.log(
                    `[procoreScheduler] sync OK em ${result.duration_ms}ms — ` +
                    `projects=${result.projects}, equipment=${result.equipment}, directory=${result.directory}`
                );
            }
            return null;
        } catch (err) {
            console.error('[procoreScheduler] sync top-level error:', err);
            return null;
        }
    }
);

// ============================================
// CRON 2 — Writeback diário (sessões RFID → Procore)
// ============================================

/**
 * Agrega sessões RFID finalizadas do dia, agrupa por obra, e envia:
 *   - Daily Log por projeto (resumo do dia)
 *   - Cost Entries por sessão com combustível registado
 *
 * Os Timecards individuais já são enviados em real-time pelo
 * procoreSessionExporter (fire-and-forget no endSession). Este cron
 * complementa com Daily Logs e Costs que só fazem sentido em agregação diária.
 */
const procoreDailyWriteback = onSchedule(
    {
        schedule: 'every day 23:30',
        timeZone: 'Europe/Lisbon',
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
        timeoutSeconds: 540,
        memory: '512MiB',
    },
    async (event) => {
        const today = new Date();
        const dateStr = formatDate(today);
        console.log(`[procoreDailyWriteback] run for ${dateStr}`);

        if (!(await isProcoreConnected())) {
            console.log('[procoreDailyWriteback] integração não conectada — ignorado.');
            return null;
        }

        const summary = {
            dailyLogs: { created: 0, errors: 0 },
            costEntries: { created: 0, errors: 0 },
        };

        try {
            // ── Buscar sessões finalizadas de hoje ──────────────────────
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            const sessionsSnap = await admin.firestore()
                .collection(SESSIONS_PATH)
                .where('status', 'in', ['CLOSED', 'AUTO_CLOSED'])
                .where('endTime', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
                .where('endTime', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
                .get();

            if (sessionsSnap.empty) {
                console.log('[procoreDailyWriteback] nenhuma sessão finalizada hoje — nada a enviar.');
                return null;
            }

            console.log(`[procoreDailyWriteback] ${sessionsSnap.size} sessões finalizadas hoje`);

            // ── Enriquecer sessões com dados de máquina/operador/obra ───
            const sessions = await Promise.all(sessionsSnap.docs.map(async (doc) => {
                const s = doc.data();
                s._id = doc.id;

                try {
                    const [machine, operator] = await Promise.all([
                        s.machineId ? admin.firestore().doc(`${MACHINES_PATH}/${s.machineId}`).get() : null,
                        s.cardId ? admin.firestore().doc(`${OPERATORS_PATH}/${s.cardId}`).get() : null,
                    ]);

                    s._machine = machine?.exists ? machine.data() : null;
                    s._operator = operator?.exists ? operator.data() : null;

                    const obraId = s.obraId || s._machine?.location?.workId || s._machine?.obraId;
                    if (obraId) {
                        const obraSnap = await admin.firestore().doc(`${OBRAS_PATH}/${obraId}`).get();
                        s._obra = obraSnap.exists ? obraSnap.data() : null;
                    } else if (s._machine?.location?.workName) {
                        s._obra = { workName: s._machine.location.workName };
                    }
                } catch (err) {
                    console.error(`[procoreDailyWriteback] failed to enrich session ${s._id}:`, err.message);
                    s._machine = null;
                    s._operator = null;
                    s._obra = null;
                }

                return s;
            }));

            // ── Agrupar por obra ────────────────────────────────────────
            const byObra = {};
            for (const s of sessions) {
                const obraName = s._obra?.workName || s._obra?.name || 'Sem Obra';
                if (!byObra[obraName]) {
                    byObra[obraName] = { sessions: [], totalHours: 0, totalFuel: 0, operators: new Set(), machines: new Set() };
                }
                const group = byObra[obraName];
                group.sessions.push(s);

                const hours = s.durationHours || 0;
                group.totalHours += hours;
                group.totalFuel += (s.fuelUsed || 0);

                if (s._operator?.name) group.operators.add(s._operator.name);
                if (s._machine?.name)  group.machines.add(s._machine.name);
            }

            // ── Ler custo de combustível uma vez (fora do loop) ────────
            const settingsSnap = await admin.firestore()
                .doc(`artifacts/${APP_ID}/public/data/settings/fuelCost`)
                .get();
            const fuelCostPerLitre = settingsSnap.exists
                ? (settingsSnap.data()?.pricePerLitre || 1.65)
                : 1.65;

            // ── Enviar Daily Logs + Cost Entries por obra ───────────────
            for (const [obraName, group] of Object.entries(byObra)) {
                const project = await findProcoreProjectId(obraName);
                if (!project) {
                    console.warn(`[procoreDailyWriteback] sem match Procore para obra "${obraName}" — skip`);
                    continue;
                }

                // ── Daily Log ───────────────────────────────────────────
                try {
                    const machineList = [...group.machines].join(', ');
                    const operatorList = [...group.operators].join(', ');

                    await createDailyLog(
                        {
                            project_id: project.id,
                            date: dateStr,
                            description: `Casais IoT — ${group.sessions.length} sessões, ${group.totalHours.toFixed(1)}h totais, ${group.machines.size} máquinas`,
                        },
                        {
                            headcount: group.operators.size,
                            notes: [
                                `Máquinas: ${machineList || 'N/A'}`,
                                `Operadores: ${operatorList || 'N/A'}`,
                                group.totalFuel > 0 ? `Combustível total: ${group.totalFuel.toFixed(1)}L` : null,
                            ].filter(Boolean).join('\n'),
                        }
                    );

                    summary.dailyLogs.created++;
                } catch (err) {
                    console.error(`[procoreDailyWriteback] daily_log failed for "${obraName}":`, err.message);
                    summary.dailyLogs.errors++;
                }

                // ── Cost Entries (combustível por sessão) ───────────────
                // Usa consumptionRate (L/h) definido na ficha da máquina na PWA.
                // Fallback: fuelUsed do registo de sessão (se existir).

                for (const s of group.sessions) {
                    // Calcular litros consumidos — fonte preferencial: consumptionRate da máquina
                    const consumptionRate = s._machine?.consumptionRate || 0; // L/h definido na PWA
                    const durationH = s.durationHours || 0;
                    const litros = consumptionRate > 0
                        ? parseFloat((consumptionRate * durationH).toFixed(2))
                        : (s.fuelUsed || 0); // fallback: campo direto da sessão

                    if (litros <= 0) continue;

                    try {
                        const machineName = s._machine?.name || s.machineId || 'Máquina';
                        const amount = parseFloat((litros * fuelCostPerLitre).toFixed(2));

                        await createCostEntry(
                            {
                                project_id: project.id,
                                date: dateStr,
                                description: `Combustível — ${machineName}`,
                                amount,
                            },
                            {
                                cost_type: 'fuel',
                                quantity: litros,
                                unit_cost: fuelCostPerLitre,
                                unit: 'L',
                            }
                        );

                        summary.costEntries.created++;
                    } catch (err) {
                        console.error(`[procoreDailyWriteback] cost_entry failed for session ${s._id}:`, err.message);
                        summary.costEntries.errors++;
                    }
                }
            }

            // ── Persistir meta do writeback ─────────────────────────────
            await admin.firestore().doc(INTEGRATION_DOC_PATH).set({
                last_writeback_at: admin.firestore.FieldValue.serverTimestamp(),
                last_writeback_date: dateStr,
                last_writeback_summary: {
                    sessions: sessionsSnap.size,
                    daily_logs: summary.dailyLogs,
                    cost_entries: summary.costEntries,
                },
            }, { merge: true });

            console.log(
                `[procoreDailyWriteback] done — ` +
                `daily_logs=${summary.dailyLogs.created}/${summary.dailyLogs.created + summary.dailyLogs.errors}, ` +
                `cost_entries=${summary.costEntries.created}/${summary.costEntries.created + summary.costEntries.errors}`
            );

        } catch (err) {
            console.error('[procoreDailyWriteback] top-level error:', err);
        }

        return null;
    }
);

module.exports = {
    procoreScheduledSync,
    procoreDailyWriteback,
};
