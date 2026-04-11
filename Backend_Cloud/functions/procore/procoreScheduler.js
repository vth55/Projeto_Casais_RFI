/**
 * CASAIS Fleet Intelligence — Procore Scheduler (Chunk 1C)
 *
 * Cron job que sincroniza periodicamente o catálogo do Procore para Firestore,
 * reutilizando o `runFullSync` exposto pelo `procoreBridge`. Cada execução é
 * idempotente (merge writes em batches) e isola falhas por recurso.
 *
 * Disparo:
 *   - Cloud Scheduler → "every 1 hours" (TZ Europe/Lisbon)
 *   - Saltado automaticamente se a integração ainda não tiver sido conectada
 *     (não há tokens em Firestore).
 *
 * Secrets necessários (mesmos do bridge):
 *   PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

const {
    runFullSync,
    PROCORE_CLIENT_ID,
    PROCORE_CLIENT_SECRET,
    PROCORE_COMPANY_ID,
} = require('./procoreBridge');

const APP_ID = 'casais-rfid';
const INTEGRATION_DOC_PATH = `artifacts/${APP_ID}/public/data/integrations/procore`;

/**
 * Verifica se a integração Procore foi conectada (existe pelo menos
 * um par access/refresh token persistido). Evita disparar a cron quando
 * nada está ligado e poupa logs de erro ruidosos.
 */
async function isProcoreConnected() {
    const snap = await admin.firestore().doc(INTEGRATION_DOC_PATH).get();
    if (!snap.exists) return false;
    const data = snap.data() || {};
    return !!(data.access_token && data.refresh_token);
}

const procoreScheduledSync = onSchedule(
    {
        schedule: 'every 1 hours',
        timeZone: 'Europe/Lisbon',
        secrets: [PROCORE_CLIENT_ID, PROCORE_CLIENT_SECRET, PROCORE_COMPANY_ID],
        region: 'us-central1',
        // 9 minutos é folgado para um sync de até 5000 itens por recurso.
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
            // Erros aqui são fatais (provavelmente token revogado). Não relançamos
            // para evitar retry agressivo do Scheduler — a próxima janela tentará
            // de novo. O estado vai para `last_sync_errors` no integrationDoc.
            console.error('[procoreScheduler] sync top-level error:', err);
            return null;
        }
    }
);

module.exports = {
    procoreScheduledSync,
};
