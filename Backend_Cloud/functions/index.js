/**
 * CASAIS Fleet Intelligence - Cloud Functions
 *
 * Funções disponíveis:
 * - handleSessionTrigger: Processar scans RFID
 * - onAlertCreated: Enviar email quando alerta é criado
 * - resendAlertEmail: Reenviar email de validação
 * - autoCloseStuckSessions: Cron job para fechar sessões abandonadas
 * - detectDispatchTimeout: Cron job de 2h — máquinas em trânsito >48h sem confirmação RFID
 * - procoreBridge: Integração OAuth2 + REST API Procore (Chunks 1A/1B)
 * - procoreScheduledSync: Cron job horário de sincronização Procore → Firestore (Chunk 1C)
 * - procoreSessionExport: Exportar sessões para Procore (Timecard Entries)
 * - procoreDailyWriteback: Cron diário (23:30) — Daily Logs + Cost Entries ao Procore
 * - procoreExportRetry: Cron job (30 min) de retry de exports Procore falhados
 * - onSessionCorrected: Trigger Firestore — re-exporta Timecard para Procore quando sessão é corrigida
 * Sprint 3 — Deep Integration:
 * - equipmentLogsDailyAgg: Cron 23:55 — equipment_logs por máquina/obra no Procore
 * - procoreWebhookReceiver: HTTP — recebe webhooks Procore com HMAC validation
 * - onAvariaCreatedToProcore: Trigger — avaria criada -> Procore Observation
 * - onWorkOrderToProcore: Trigger — WorkOrder criada/concluida -> Procore Observation
 * - procoreSyncQueueRun: Cron 15min — retry de operacoes Procore falhadas
 * - procoreTokenRefresh: Cron 6h — refresh proactivo do token OAuth
 * - pullProcoreCache: Cron diario 00:30 — cost_codes + vendors -> procore_cache
 */

const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const procoreSessionExporter = require('./procore/procoreSessionExporter');
const {
    procoreBridge,
    PROCORE_CLIENT_ID: _PCI,
    PROCORE_CLIENT_SECRET: _PCS,
    PROCORE_COMPANY_ID: _PCID,
    associateEquipmentToProject,
    removeEquipmentFromProject,
} = require('./procore/procoreBridge');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const APP_ID = 'casais-rfid';
const SESSIONS_PATH = `artifacts/${APP_ID}/public/data/sessions`;
const MACHINES_PATH = `artifacts/${APP_ID}/public/data/machines`;
const OPERATORS_PATH = `artifacts/${APP_ID}/public/data/operators`;
const UNREGISTERED_SCANS_PATH = `artifacts/${APP_ID}/public/data/unregistered_scans`;
const SCAN_BUFFER_PATH = `artifacts/${APP_ID}/public/data/scan_buffer`;
const ALERTS_PATH = `artifacts/${APP_ID}/public/data/alerts`;
const SETTINGS_PATH = `artifacts/${APP_ID}/public/data/settings`;
const LOCATION_CARDS_PATH = `artifacts/${APP_ID}/public/data/location_cards`;
const RFID_LOCATION_CARDS_PATH = `artifacts/${APP_ID}/public/data/rfidLocationCards`;
const MACHINE_LOCATION_EVENTS_PATH = `artifacts/${APP_ID}/public/data/machineLocationEvents`;
const OBRAS_PATH = `artifacts/${APP_ID}/public/data/obras`;

// ============================================
// CONFIGURAÇÃO DE EMAIL
// ============================================

// Criar transporter de email usando variáveis de ambiente
// Para configurar: firebase functions:secrets:set EMAIL_HOST EMAIL_PORT EMAIL_USER EMAIL_PASS
// Ou definir no .env.local para desenvolvimento
const getEmailTransporter = (smtpConfig = null) => {
    // Se fornecido smtpConfig diretamente (para testes), usar esse
    if (smtpConfig && smtpConfig.user && smtpConfig.pass) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
            },
        });
    }

    // Tentar usar variáveis de ambiente
    const emailHost = process.env.EMAIL_HOST;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailHost || !emailUser) {
        console.log('⚠️ Email não configurado via env - usando modo de desenvolvimento');
        return null;
    }

    return nodemailer.createTransport({
        host: emailHost,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
};

// Template de email para validação de sessão
const generateValidationEmailHtml = (alert, validationUrl) => {
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const alertTypeText = {
        'LONG_SESSION': 'Sessão longa - validação necessária',
        'AUTO_CLOSE': 'Sessão fechada automaticamente',
        'MAINTENANCE': 'Manutenção programada',
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #005EB8; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px; background: #f9f9f9; }
        .alert-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .details table { width: 100%; }
        .details td { padding: 8px 0; border-bottom: 1px solid #eee; }
        .details td:first-child { font-weight: bold; width: 40%; }
        .button { display: inline-block; background: #005EB8; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CASAIS Fleet Intelligence</h1>
        </div>
        <div class="content">
            <h2>Validação de Sessão Necessária</h2>

            <div class="alert-box">
                <strong>⚠️ ${alertTypeText[alert.type] || 'Alerta de Sessão'}</strong>
                <p>A sessão abaixo requer a sua validação ou correção.</p>
            </div>

            <div class="details">
                <table>
                    <tr>
                        <td>Máquina:</td>
                        <td>${alert.machineName || alert.machineId}</td>
                    </tr>
                    <tr>
                        <td>Obra:</td>
                        <td>${alert.obraName || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Início:</td>
                        <td>${formatDate(alert.originalStartTime)}</td>
                    </tr>
                    <tr>
                        <td>Fim:</td>
                        <td>${formatDate(alert.originalEndTime)}</td>
                    </tr>
                    <tr>
                        <td>Duração:</td>
                        <td>${alert.originalDurationHours?.toFixed(1) || 'N/A'} horas</td>
                    </tr>
                </table>
            </div>

            <p style="text-align: center;">
                <a href="${validationUrl}" class="button">Validar Sessão</a>
            </p>

            <p style="font-size: 12px; color: #666;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="${validationUrl}">${validationUrl}</a>
            </p>
        </div>
        <div class="footer">
            <p>CASAIS Fleet Intelligence - Sistema de Gestão de Frotas</p>
            <p>Este é um email automático. Por favor não responda diretamente.</p>
        </div>
    </div>
</body>
</html>
    `;
};

// Enviar email de validação
const sendValidationEmail = async (alert, smtpConfig = null, baseUrl = null, isResend = false) => {
    const transporter = getEmailTransporter(smtpConfig);

    // Construir URL de validação
    const appBaseUrl = baseUrl || process.env.APP_URL || 'https://casais-fleet.web.app';
    const validationUrl = `${appBaseUrl}/validar/${alert.validationToken}`;

    if (!transporter) {
        // Modo desenvolvimento - apenas log
        console.log('📧 [DEV MODE] Email de validação:');
        console.log(`   Para: ${alert.operatorEmail}`);
        console.log(`   Assunto: ${isResend ? '[Lembrete] ' : ''}Validação de Sessão - ${alert.machineName}`);
        console.log(`   URL: ${validationUrl}`);
        return { success: true, mode: 'dev', validationUrl };
    }

    try {
        const fromEmail = smtpConfig?.user || process.env.EMAIL_FROM || 'noreply@casais.pt';
        const mailOptions = {
            from: `"CASAIS Fleet" <${fromEmail}>`,
            to: alert.operatorEmail,
            subject: `${isResend ? '[Lembrete] ' : ''}Validação de Sessão - ${alert.machineName || alert.machineId}`,
            html: generateValidationEmailHtml(alert, validationUrl),
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email enviado para ${alert.operatorEmail}`);
        return { success: true, validationUrl };
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// TARIFÁRIOS — Helpers de cálculo de custo
// ============================================

function getTariffForDate(date, tariffHistory) {
    if (!tariffHistory || tariffHistory.length === 0) return null;
    const sorted = [...tariffHistory].sort((a, b) => {
        const aMs = a.validFrom?.toMillis ? a.validFrom.toMillis() : new Date(a.validFrom).getTime();
        const bMs = b.validFrom?.toMillis ? b.validFrom.toMillis() : new Date(b.validFrom).getTime();
        return bMs - aMs;
    });
    for (const tariff of sorted) {
        const from = tariff.validFrom?.toDate ? tariff.validFrom.toDate() : new Date(tariff.validFrom);
        const until = tariff.validUntil?.toDate
            ? tariff.validUntil.toDate()
            : tariff.validUntil ? new Date(tariff.validUntil) : new Date('2099-12-31');
        if (date >= from && date <= until) return tariff;
    }
    return sorted[sorted.length - 1];
}

function calculateSessionCost(durationHours, tariff) {
    if (!tariff || typeof tariff.totalCostPerHour !== 'number') return null;
    const h = Math.round(durationHours * 100) / 100;
    const opCost = tariff.type === 'MACHINE_AND_OPERATOR' ? (tariff.operatorCostPerHour || 0) : 0;
    return {
        costs: {
            hours: h,
            costPerHour: tariff.totalCostPerHour,
            totalCost: Math.round(h * tariff.totalCostPerHour * 100) / 100,
            breakdown: {
                machineCost: Math.round(h * tariff.machineCostPerHour * 100) / 100,
                operatorCost: Math.round(h * opCost * 100) / 100,
            },
        },
        tariffSnapshot: {
            id: tariff.id,
            type: tariff.type,
            machineCostPerHour: tariff.machineCostPerHour,
            operatorCostPerHour: opCost,
            totalCostPerHour: tariff.totalCostPerHour,
            snapshot: { validFrom: tariff.validFrom, validUntil: tariff.validUntil || null },
        },
    };
}

exports.handleSessionTrigger = onRequest(
    {
        secrets: [_PCI, _PCS, _PCID],
        region: 'us-central1',
        cors: true,
    },
    async (req, res) => {
    res.set('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas POST permitido.' });
    }

    const body = req.body || {};
    const { cardId, machineId } = body;
    if (!cardId || !machineId) {
        return res.status(400).json({ error: 'Faltam dados (cardId ou machineId).' });
    }

    // Validação de input — prevenir path traversal e payloads maliciosos
    const VALID_ID_REGEX = /^[A-Za-z0-9_\-]{1,80}$/;
    const normalizedCard = String(cardId).toUpperCase().trim();
    let normalizedMachine = String(machineId).trim();

    if (!VALID_ID_REGEX.test(normalizedCard) || !VALID_ID_REGEX.test(normalizedMachine)) {
        return res.status(400).json({ error: 'cardId ou machineId contém caracteres inválidos.' });
    }
    const timestamp = admin.firestore.Timestamp.now();

    try {
        await db.doc(`${SCAN_BUFFER_PATH}/latest`).set({
            cardId: normalizedCard,
            machineId: normalizedMachine,
            timestamp: timestamp
        }, { merge: true });

        // Resolver rfidReaderId → machineId.
        // O hardware pode enviar o seu próprio ID fixo (ex: "READER-001") em vez do
        // doc ID do Firestore. Se não encontrar doc directo, tenta lookup por rfidReaderId.
        {
            const directSnap = await db.doc(`${MACHINES_PATH}/${normalizedMachine}`).get();
            if (!directSnap.exists) {
                const byReader = await db.collection(MACHINES_PATH)
                    .where('rfidReaderId', '==', normalizedMachine)
                    .limit(1)
                    .get();
                if (!byReader.empty) {
                    console.log(`[session] rfidReaderId '${normalizedMachine}' → machineId '${byReader.docs[0].id}'`);
                    normalizedMachine = byReader.docs[0].id;
                }
            }
        }

        // ============================================
        // VERIFICAR SE É CARTÃO DE LOCALIZAÇÃO
        // Cartões LOC_ mudam localizacao + estadoOperacional da máquina
        // Distingue estaleiro vs obra pelo campo tipo no cartão
        // ============================================
        if (normalizedCard.startsWith('LOC_')) {
            console.log(`📍 Cartão de localização detectado: ${normalizedCard}`);

            // Procurar primeiro na nova coleção rfidLocationCards, fallback na antiga
            let locationCard = null;
            const newCardSnap = await db.doc(`${RFID_LOCATION_CARDS_PATH}/${normalizedCard}`).get();
            if (newCardSnap.exists) {
                locationCard = newCardSnap.data();
            } else {
                const oldCardSnap = await db.doc(`${LOCATION_CARDS_PATH}/${normalizedCard}`).get();
                if (!oldCardSnap.exists) {
                    console.log(`❌ Cartão de localização não registado: ${normalizedCard}`);
                    return res.status(404).json({
                        status: 'LOCATION_NOT_FOUND',
                        message: 'Cartão de localização não registado no sistema.'
                    });
                }
                locationCard = oldCardSnap.data();
            }

            const machineRef = db.doc(`${MACHINES_PATH}/${normalizedMachine}`);
            const machineSnap = await machineRef.get();

            if (!machineSnap.exists) {
                return res.status(404).json({
                    status: 'MACHINE_NOT_FOUND',
                    message: 'Máquina não encontrada.'
                });
            }

            const machineData = machineSnap.data();
            const previousLocalizacao = machineData.localizacao || machineData.location || null;
            const isEstaleiro = locationCard.tipo === 'estaleiro' || locationCard.obraId === 'estaleiro';

            // Verificar se este scan confirma um despacho pendente
            const despachoPendente = machineData.despachoPendente;
            const confirmaDespacho = !isEstaleiro && despachoPendente && despachoPendente.obraId === locationCard.obraId;

            const novoEstado = isEstaleiro ? 'disponivel' : 'em_obra';

            const novaLocalizacao = {
                obraId: locationCard.obraId,
                obraName: locationCard.obraName,
                gps: locationCard.gps || null,
                type: isEstaleiro ? 'estaleiro' : 'obra',
                updatedAt: timestamp,
                cardId: normalizedCard,
            };

            const machineUpdate = {
                localizacao: novaLocalizacao,
                estadoOperacional: novoEstado,
                // Campo legacy mantido temporariamente para compatibilidade do frontend
                location: {
                    workId: locationCard.obraId,
                    workName: locationCard.obraName,
                    gps: locationCard.gps || null,
                    updatedAt: timestamp,
                    updatedBy: normalizedCard,
                },
            };

            if (isEstaleiro) {
                machineUpdate.movedToYardAt = timestamp;
                machineUpdate.status = 'IDLE';
            } else {
                machineUpdate.movedToYardAt = admin.firestore.FieldValue.delete();
            }

            if (confirmaDespacho) {
                machineUpdate.despachoPendente = admin.firestore.FieldValue.delete();
            }

            await machineRef.update(machineUpdate);

            // Registar evento em machineLocationEvents
            const eventType = isEstaleiro ? 'entrada_estaleiro' : (confirmaDespacho ? 'chegada_obra_confirmada' : 'chegada_obra');
            await db.collection(MACHINE_LOCATION_EVENTS_PATH).add({
                machineId: normalizedMachine,
                type: eventType,
                from: previousLocalizacao?.obraName || previousLocalizacao?.workName || 'Sem localização',
                fromObraId: previousLocalizacao?.obraId || previousLocalizacao?.workId || null,
                to: locationCard.obraName,
                toObraId: locationCard.obraId,
                timestamp: timestamp,
                cardId: normalizedCard,
                confirmedDespacho: confirmaDespacho || false,
                procoreEquipmentId: machineData.procoreEquipmentId || null,
            });

            // Sincronizar com Procore se máquina tem equipamento e o cartão tem projecto Procore
            if (!isEstaleiro && machineData.procoreEquipmentId && locationCard.procoreProjectId) {
                associateEquipmentToProject(machineData.procoreEquipmentId, locationCard.procoreProjectId)
                    .catch(err => console.error('[Procore] associateEquipment error:', err));
            }

            console.log(`✅ Máquina ${normalizedMachine} → ${locationCard.obraName} [${novoEstado}]${confirmaDespacho ? ' ✓ despacho confirmado' : ''}`);

            return res.json({
                status: confirmaDespacho ? 'ARRIVAL_CONFIRMED' : 'LOCATION_CHANGED',
                machine: normalizedMachine,
                newLocation: locationCard.obraName,
                obraId: locationCard.obraId,
                estadoOperacional: novoEstado,
                confirmedDespacho: confirmaDespacho || false,
                message: confirmaDespacho
                    ? `Chegada confirmada em: ${locationCard.obraName}`
                    : `Localização alterada para: ${locationCard.obraName}`
            });
        }

        // ============================================
        // LÓGICA NORMAL DE SESSÃO (cartão de operador)
        // ============================================
        const activeSessionQuery = await db.collection(SESSIONS_PATH)
            .where('machineId', '==', normalizedMachine)
            .where('endTime', '==', null)
            .limit(1)
            .get();

        if (activeSessionQuery.empty) {
            const operatorDocRef = db.doc(`${OPERATORS_PATH}/${normalizedCard}`);
            const operatorSnap = await operatorDocRef.get();

            if (!operatorSnap.exists) {
                await db.collection(UNREGISTERED_SCANS_PATH).doc(normalizedCard).set({
                    id: normalizedCard,
                    machineId: normalizedMachine,
                    timestamp: timestamp,
                    type: 'access_attempt',
                    resolved: false
                }, { merge: true });

                console.log(`Acesso bloqueado: ${normalizedCard}`);
                return res.status(403).json({
                    status: 'DENIED',
                    message: 'Acesso negado. Cartão não registado.'
                });
            }
        }

        const machineRef = db.doc(`${MACHINES_PATH}/${normalizedMachine}`);

        if (!activeSessionQuery.empty) {
            const sessionDoc = activeSessionQuery.docs[0];
            const sessionData = sessionDoc.data();
            const startTime = sessionData.startTime.toDate();
            const endTime = new Date();

            // LÓGICA DE SWITCH: Se o cartão for DIFERENTE, fechamos a sessão do anterior e abrimos para o novo
            const isSwitch = sessionData.cardId !== normalizedCard;

            if (isSwitch) {
                console.log(`🔄 [SWITCH] Operador ${normalizedCard} a interromper sessão de ${sessionData.cardId} na máquina ${normalizedMachine}`);
            }

            const durationHours = (endTime - startTime) / (1000 * 60 * 60);

            // Calcular custo com base no tarifário vigente da máquina
            const machineSnap = await machineRef.get();
            const machineData = machineSnap.exists ? machineSnap.data() : {};
            const tariffHistory = machineData.tariffHistory
                || (machineData.currentTariff ? [machineData.currentTariff] : []);
            const activeTariff = getTariffForDate(startTime, tariffHistory);
            const costResult = calculateSessionCost(durationHours, activeTariff);

            console.log(`${isSwitch ? '🔄' : '🔒'} Sessão encerrada: ${normalizedMachine} | ${durationHours.toFixed(2)}h`);
            
            // Atualizar a sessão anterior
            await sessionDoc.ref.update({
                endTime: admin.firestore.Timestamp.fromDate(endTime),
                durationHours: durationHours,
                status: 'CLOSED',
                ...(isSwitch ? { 
                    interruptedBy: normalizedCard,
                    closeMethod: 'SWITCH' 
                } : { 
                    closeMethod: 'MANUAL' 
                }),
                ...(costResult ? { costs: costResult.costs, tariff: costResult.tariffSnapshot } : {}),
            });

            // Exportar sessão terminada para o Procore (fire-and-forget)
            procoreSessionExporter.exportSessionToProcore(sessionDoc.id, 'end').catch((err) => {
                console.error('[Procore] export end failed:', err.message);
            });

            // Se for um SWITCH, precisamos de criar a NOVA sessão IMEDIATAMENTE
            if (isSwitch) {
                const newSession = {
                    cardId: normalizedCard,
                    machineId: normalizedMachine,
                    startTime: admin.firestore.Timestamp.fromDate(endTime), // Começa onde a outra acabou
                    endTime: null,
                    durationHours: 0,
                    status: 'OPEN',
                    previousSessionId: sessionDoc.id
                };

                const newSessionRef = await db.collection(SESSIONS_PATH).add(newSession);
                
                // Exportar início da nova sessão para o Procore
                procoreSessionExporter.exportSessionToProcore(newSessionRef.id, 'start').catch((err) => {
                    console.error('[Procore] switch start failed:', err.message);
                });

                await machineRef.update({
                    status: 'ACTIVE',
                    lastOperator: normalizedCard,
                    lastSwitchAt: admin.firestore.Timestamp.fromDate(endTime)
                });

                return res.json({ 
                    status: 'START', 
                    type: 'SWITCH',
                    message: `Sessão anterior fechada (${durationHours.toFixed(2)}h). Nova sessão iniciada.` 
                });
            }

            // Se não for switch, é um fecho normal
            await db.runTransaction(async (t) => {
                const mDoc = await t.get(machineRef);
                if (!mDoc.exists) return;
                const newTotal = (mDoc.data().totalHours || 0) + durationHours;
                t.update(machineRef, {
                    totalHours: newTotal,
                    status: 'IDLE',
                    lastOperator: normalizedCard
                });
            });

            return res.json({ status: 'STOP', duration: durationHours.toFixed(2) });
        } else {
            const newSession = {
                cardId: normalizedCard,
                machineId: normalizedMachine,
                startTime: admin.firestore.Timestamp.now(),
                endTime: null,
                durationHours: 0,
                status: 'OPEN'
            };

            const sessionRef = await db.collection(SESSIONS_PATH).add(newSession);

            // Exportar sessão iniciada para o Procore (fire-and-forget)
            procoreSessionExporter.exportSessionToProcore(sessionRef.id, 'start').catch((err) => {
                console.error('[Procore] export start failed:', err.message);
            });

            await machineRef.set({
                status: 'ACTIVE',
                lastOperator: normalizedCard
            }, { merge: true });

            console.log(`Sessão iniciada: ${normalizedCard} em ${normalizedMachine}`);
            return res.json({ status: 'START' });
        }

    } catch (error) {
        console.error("Erro no servidor:", error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================
// CLOUD FUNCTION: ENVIO DE EMAIL QUANDO ALERTA É CRIADO
// ============================================

/**
 * Trigger Firestore: Enviar email quando um novo alerta é criado
 */
exports.onAlertCreated = onDocumentCreated(
    {
        document: `${ALERTS_PATH}/{alertId}`,
    },
    async (event) => {
        const snapshot = event.data;
        const alertId = event.params.alertId;
        const alert = snapshot.data();

        console.log(`📢 Novo alerta criado: ${alertId} (${alert.type})`);

        // Verificar se tem email do operador
        if (!alert.operatorEmail) {
            console.warn(`⚠️ Alerta ${alertId} sem email de operador`);
            return null;
        }

        // Enviar email
        const result = await sendValidationEmail(alert);

        if (result.success) {
            // Atualizar alerta com timestamp de envio
            await snapshot.ref.update({
                emailSentAt: admin.firestore.Timestamp.now(),
                emailStatus: 'SENT',
            });
        } else {
            // Registar falha
            await snapshot.ref.update({
                emailStatus: 'FAILED',
                emailError: result.error,
            });
        }

        return result;
    });

// ============================================
// CLOUD FUNCTION: REENVIAR EMAIL
// ============================================

/**
 * HTTP Function: Reenviar email de validação
 * POST /resendAlertEmail
 * Body: { alertId: string }
 */
exports.resendAlertEmail = onRequest(async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas POST permitido' });
    }

    const { alertId } = req.body;
    if (!alertId) {
        return res.status(400).json({ error: 'alertId é obrigatório' });
    }

    try {
        const alertRef = db.doc(`${ALERTS_PATH}/${alertId}`);
        const alertSnap = await alertRef.get();

        if (!alertSnap.exists) {
            return res.status(404).json({ error: 'Alerta não encontrado' });
        }

        const alert = alertSnap.data();

        // Verificar se alerta ainda está pendente
        if (alert.status !== 'PENDING') {
            return res.status(400).json({ error: 'Alerta já foi processado' });
        }

        // Enviar email
        const result = await sendValidationEmail(alert, null, null, true);

        if (result.success) {
            // Atualizar contador de reenvios
            const newCount = (alert.emailResendCount || 0) + 1;

            await alertRef.update({
                emailResendCount: newCount,
                lastEmailResendAt: admin.firestore.Timestamp.now(),
                auditLog: admin.firestore.FieldValue.arrayUnion({
                    action: 'EMAIL_RESENT',
                    timestamp: admin.firestore.Timestamp.now(),
                    details: `Email reenviado (${newCount}x)`,
                }),
            });

            return res.json({ success: true, resendCount: newCount });
        } else {
            return res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Erro ao reenviar email:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================
// CLOUD FUNCTION: AUTO-CLOSE DE SESSÕES ABANDONADAS
// ============================================

/**
 * Scheduled Function: Executar a cada 5 minutos
 * Fecha automaticamente sessões ABANDONADAS (fallback de segurança)
 * NOTA: O fecho normal acontece em tempo real quando operador faz scan de saída
 */
exports.autoCloseStuckSessions = onSchedule(
    {
        schedule: 'every 5 minutes',
        timeZone: 'Europe/Lisbon',
        secrets: [_PCI, _PCS, _PCID],
        region: 'us-central1',
    },
    async (event) => {
        console.log('🔄 Iniciando auto-close de sessões abandonadas...');

        try {
            // Obter configuração de thresholds
            const configSnap = await db.doc(`${SETTINGS_PATH}/alertConfig`).get();
            const config = configSnap.exists ? configSnap.data() : {};
            const globalAutoCloseHours = config.globalConfig?.autoCloseHours || 14;

            // Buscar sessões abertas (cap de segurança: 500 sessões)
            const openSessionsQuery = await db.collection(SESSIONS_PATH)
                .where('status', '==', 'OPEN')
                .limit(500)
                .get();

            if (openSessionsQuery.empty) {
                console.log('✅ Nenhuma sessão aberta encontrada');
                return null;
            }

            const now = new Date();
            let closedCount = 0;
            let alertsCreated = 0;

            for (const sessionDoc of openSessionsQuery.docs) {
                const session = sessionDoc.data();
                const startTime = session.startTime?.toDate ? session.startTime.toDate() : new Date(session.startTime);
                const hoursOpen = (now - startTime) / (1000 * 60 * 60);

                // Obter threshold específico para esta máquina/categoria
                let autoCloseThreshold = globalAutoCloseHours;

                // Verificar se há threshold específico para a máquina
                if (config.machineConfigs && config.machineConfigs[session.machineId]) {
                    autoCloseThreshold = config.machineConfigs[session.machineId].autoCloseHours || autoCloseThreshold;
                }
                // Verificar threshold de categoria (se tivermos essa info)
                else if (session.categoryId && config.categoryConfigs && config.categoryConfigs[session.categoryId]) {
                    autoCloseThreshold = config.categoryConfigs[session.categoryId].autoCloseHours || autoCloseThreshold;
                }

                // Se excedeu o threshold, fechar automaticamente
                if (hoursOpen >= autoCloseThreshold) {
                    const endTime = now;
                    const durationHours = hoursOpen;

                    // Fechar sessão
                    await sessionDoc.ref.update({
                        endTime: admin.firestore.Timestamp.fromDate(endTime),
                        durationHours: durationHours,
                        status: 'AUTO_CLOSED',
                        autoClosedAt: admin.firestore.Timestamp.now(),
                        autoCloseReason: `Sessão aberta há ${hoursOpen.toFixed(1)} horas (limite: ${autoCloseThreshold}h)`,
                    });

                    // Exportar sessão auto-fechada para o Procore (fire-and-forget)
                    procoreSessionExporter.exportSessionToProcore(sessionDoc.id, 'end').catch((err) => {
                        console.error('[Procore] auto-close export failed:', err.message);
                    });

                    // Atualizar máquina
                    const machineRef = db.doc(`${MACHINES_PATH}/${session.machineId}`);
                    await db.runTransaction(async (t) => {
                        const mDoc = await t.get(machineRef);
                        if (mDoc.exists) {
                            const newTotal = (mDoc.data().totalHours || 0) + durationHours;
                            t.update(machineRef, {
                                totalHours: newTotal,
                                status: 'IDLE',
                            });
                        }
                    });

                    // Obter dados do operador
                    let operatorData = {};
                    if (session.cardId) {
                        const operatorSnap = await db.doc(`${OPERATORS_PATH}/${session.cardId}`).get();
                        if (operatorSnap.exists) {
                            operatorData = operatorSnap.data();
                        }
                    }

                    // Obter dados da máquina
                    let machineData = {};
                    const machineSnap = await machineRef.get();
                    if (machineSnap.exists) {
                        machineData = machineSnap.data();
                    }

                    // Criar alerta AUTO_CLOSE (obrigatório validar)
                    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const validationToken = generateToken();

                    await db.doc(`${ALERTS_PATH}/${alertId}`).set({
                        id: alertId,
                        validationToken,
                        type: 'AUTO_CLOSE',
                        status: 'PENDING',

                        sessionId: sessionDoc.id,
                        machineId: session.machineId,
                        machineName: machineData.name || session.machineId,
                        operatorId: session.cardId,
                        operatorName: operatorData.name || 'Desconhecido',
                        operatorEmail: operatorData.email || null,
                        obraId: session.obraId || machineData.obraId || null,
                        obraName: session.obraName || machineData.obraName || null,

                        originalStartTime: session.startTime,
                        originalEndTime: admin.firestore.Timestamp.fromDate(endTime),
                        originalDurationHours: durationHours,

                        correctedStartTime: null,
                        correctedEndTime: null,
                        correctedDurationHours: null,

                        createdAt: admin.firestore.Timestamp.now(),
                        validatedAt: null,
                        validatedBy: null,

                        emailSentAt: null,
                        emailResendCount: 0,

                        operatorNotes: '',
                        auditLog: [{
                            action: 'CREATED',
                            timestamp: admin.firestore.Timestamp.now(),
                            details: `Auto-close: sessão aberta ${hoursOpen.toFixed(1)}h (limite: ${autoCloseThreshold}h)`,
                        }],
                    });

                    closedCount++;
                    alertsCreated++;

                    console.log(`🔒 Sessão ${sessionDoc.id} fechada automaticamente (${hoursOpen.toFixed(1)}h)`);
                }
            }

            console.log(`✅ Auto-close concluído: ${closedCount} sessões fechadas, ${alertsCreated} alertas criados`);
            return { closedCount, alertsCreated };
        } catch (error) {
            console.error('❌ Erro no auto-close:', error);
            throw error;
        }
    });

// Helper para gerar token
const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};

// ============================================
// CLOUD FUNCTION: CRIAR ALERTA DE TESTE E ENVIAR EMAIL
// ============================================

/**
 * HTTP Function: Criar um alerta de teste no Firestore e enviar email
 * POST /createTestAlertAndSendEmail
 * Body: { destinationEmail: string, smtpConfig?: { user: string, pass: string } }
 * 
 * Esta função usa o MESMO sistema que os alertas reais:
 * - Cria o alerta no Firestore com a mesma estrutura
 * - Usa a mesma função sendValidationEmail
 * - O link de validação funciona normalmente
 */
exports.createTestAlertAndSendEmail = onRequest(async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas POST permitido' });
    }

    const { destinationEmail, smtpConfig } = req.body;

    if (!destinationEmail) {
        return res.status(400).json({ error: 'destinationEmail é obrigatório' });
    }

    try {
        // Criar alerta de teste no Firestore (mesma estrutura dos alertas reais)
        const alertId = `alert_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const validationToken = generateToken();
        const now = admin.firestore.Timestamp.now();
        const startTime = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 60 * 60 * 1000)); // 7h atrás
        const endTime = now;

        const alertData = {
            id: alertId,
            validationToken,
            type: 'LONG_SESSION',
            status: 'PENDING',

            machineId: 'ESC-TEST-001',
            machineName: 'Escavadora Volvo EC220 [TESTE]',
            operatorId: 'OP-TEST-001',
            operatorName: 'Operador Teste',
            operatorEmail: destinationEmail,
            obraId: 'obra-test-001',
            obraName: 'Obra Demo - Porto [TESTE]',

            originalStartTime: startTime,
            originalEndTime: endTime,
            originalDurationHours: 7.0,

            correctedStartTime: null,
            correctedEndTime: null,
            correctedDurationHours: null,

            createdAt: now,
            validatedAt: null,
            validatedBy: null,

            emailSentAt: null,
            emailResendCount: 0,

            operatorNotes: '',
            isTestData: true, // Marcar como teste

            auditLog: [{
                action: 'CREATED',
                timestamp: now,
                details: 'Alerta de teste criado via createTestAlertAndSendEmail',
            }],
        };

        // Salvar no Firestore
        await db.doc(`${ALERTS_PATH}/${alertId}`).set(alertData);
        console.log(`✅ Alerta de teste criado: ${alertId}`);

        // Obter URL base
        const baseUrl = req.body.baseUrl || process.env.APP_URL || 'http://localhost:5173';

        // Verificar se temos configuração de email
        if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
            const validationUrl = `${baseUrl}/validar/${validationToken}`;
            return res.json({
                success: true,
                alertId,
                validationToken,
                validationUrl,
                message: 'Alerta criado, mas email não configurado. Forneça smtpConfig para enviar email.',
            });
        }

        // Enviar email usando a função centralizada
        const result = await sendValidationEmail(alertData, smtpConfig, baseUrl);

        if (result.success) {
            // Atualizar alerta com timestamp de envio
            await db.doc(`${ALERTS_PATH}/${alertId}`).update({
                emailSentAt: admin.firestore.Timestamp.now(),
                emailStatus: 'SENT',
                testEmailSentTo: destinationEmail,
                auditLog: admin.firestore.FieldValue.arrayUnion({
                    action: 'TEST_EMAIL_SENT',
                    timestamp: admin.firestore.Timestamp.now(),
                    details: `Email de teste enviado para ${destinationEmail}`,
                }),
            });

            return res.json({
                success: true,
                alertId,
                validationToken,
                validationUrl: result.validationUrl,
                message: 'Alerta de teste criado e email enviado com sucesso!',
            });
        } else {
            // Alerta criado mas email falhou
            await db.doc(`${ALERTS_PATH}/${alertId}`).update({
                emailStatus: 'FAILED',
                emailError: result.error,
            });

            return res.status(500).json({
                success: false,
                alertId,
                validationToken,
                error: result.error,
                message: 'Alerta criado mas falha ao enviar email',
            });
        }

    } catch (error) {
        console.error('❌ Erro ao criar alerta de teste:', error);
        return res.status(500).json({
            error: error.message,
        });
    }
});

// ============================================
// CLOUD FUNCTION: ENVIAR EMAIL DE TESTE (DEV)
// ============================================

/**
 * HTTP Function: Enviar email de teste para demonstração
 * POST /sendTestEmail
 * Body: { alertId: string, destinationEmail: string }
 */
exports.sendTestEmail = onRequest(async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas POST permitido' });
    }

    const { alertId, destinationEmail, smtpConfig } = req.body;

    if (!alertId || !destinationEmail) {
        return res.status(400).json({ error: 'alertId e destinationEmail são obrigatórios' });
    }

    try {
        // Buscar alerta
        const alertRef = db.doc(`${ALERTS_PATH}/${alertId}`);
        const alertSnap = await alertRef.get();

        if (!alertSnap.exists) {
            return res.status(404).json({ error: 'Alerta não encontrado' });
        }

        const alert = alertSnap.data();

        // Verificar se temos configuração de email
        if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
            return res.status(400).json({
                error: 'Email não configurado. Forneça smtpConfig com user e pass.'
            });
        }

        // Construir URL base
        const baseUrl = req.body.baseUrl || process.env.APP_URL || 'http://localhost:5173';
        const validationUrl = `${baseUrl}/validar/${alert.validationToken}`;

        // Criar transporter com configuração fornecida
        const transporter = getEmailTransporter(smtpConfig);

        // Enviar email
        const mailOptions = {
            from: `"CASAIS Fleet" <${smtpConfig.user}>`,
            to: destinationEmail,
            subject: `[TESTE] Validação de Sessão - ${alert.machineName || alert.machineId}`,
            html: generateValidationEmailHtml(alert, validationUrl),
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(`✅ Email de teste enviado para ${destinationEmail}`);

        // Atualizar alerta
        await alertRef.update({
            emailSentAt: admin.firestore.Timestamp.now(),
            emailStatus: 'SENT',
            testEmailSentTo: destinationEmail,
            auditLog: admin.firestore.FieldValue.arrayUnion({
                action: 'TEST_EMAIL_SENT',
                timestamp: admin.firestore.Timestamp.now(),
                details: `Email de teste enviado para ${destinationEmail}`,
            }),
        });

        return res.json({
            success: true,
            messageId: info.messageId,
            validationUrl,
        });
    } catch (error) {
        console.error('❌ Erro ao enviar email de teste:', error);
        return res.status(500).json({
            error: error.message,
            hint: error.message.includes('Invalid login')
                ? 'Credenciais inválidas. Para Gmail, use uma App Password.'
                : null
        });
    }
});

// ============================================
// CLOUD FUNCTION: VERIFICAR SESSÕES LONGAS
// ============================================

/**
 * Scheduled Function: Executar a cada 10 minutos
 * Cria alertas de SESSÃO LONGA para sessões que excedem o threshold
 */
exports.checkLongSessions = onSchedule(
    {
        schedule: 'every 10 minutes',
        timeZone: 'Europe/Lisbon',
        region: 'us-central1',
    },
    async (event) => {
        console.log('🔄 Verificando sessões longas...');

        try {
            // Obter configuração
            const configSnap = await db.doc(`${SETTINGS_PATH}/alertConfig`).get();
            const config = configSnap.exists ? configSnap.data() : {};
            const globalLongSessionHours = config.globalConfig?.longSessionHours || config.globalConfig?.fatigueHours || 5;

            // Buscar sessões abertas (cap de segurança: 500 sessões)
            const openSessionsQuery = await db.collection(SESSIONS_PATH)
                .where('status', '==', 'OPEN')
                .limit(500)
                .get();

            if (openSessionsQuery.empty) {
                console.log('✅ Nenhuma sessão aberta');
                return null;
            }

            const now = new Date();
            let alertsCreated = 0;

            for (const sessionDoc of openSessionsQuery.docs) {
                const session = sessionDoc.data();

                // Verificar se já tem alerta de sessão longa
                if (session.longSessionAlertCreated) continue;

                const startTime = session.startTime?.toDate ? session.startTime.toDate() : new Date(session.startTime);
                const hoursOpen = (now - startTime) / (1000 * 60 * 60);

                // Obter threshold específico
                let longSessionThreshold = globalLongSessionHours;

                if (config.machineConfigs && config.machineConfigs[session.machineId]) {
                    longSessionThreshold = config.machineConfigs[session.machineId].longSessionHours || config.machineConfigs[session.machineId].fatigueHours || longSessionThreshold;
                } else if (session.categoryId && config.categoryConfigs && config.categoryConfigs[session.categoryId]) {
                    longSessionThreshold = config.categoryConfigs[session.categoryId].longSessionHours || config.categoryConfigs[session.categoryId].fatigueHours || longSessionThreshold;
                }

                // Se excedeu threshold de sessão longa (mas não de auto-close)
                if (hoursOpen >= longSessionThreshold) {
                    // Obter dados
                    let operatorData = {};
                    if (session.cardId) {
                        const operatorSnap = await db.doc(`${OPERATORS_PATH}/${session.cardId}`).get();
                        if (operatorSnap.exists) operatorData = operatorSnap.data();
                    }

                    let machineData = {};
                    const machineSnap = await db.doc(`${MACHINES_PATH}/${session.machineId}`).get();
                    if (machineSnap.exists) machineData = machineSnap.data();

                    // Criar alerta LONG_SESSION
                    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const validationToken = generateToken();

                    await db.doc(`${ALERTS_PATH}/${alertId}`).set({
                        id: alertId,
                        validationToken,
                        type: 'LONG_SESSION',
                        status: 'PENDING',

                        sessionId: sessionDoc.id,
                        machineId: session.machineId,
                        machineName: machineData.name || session.machineId,
                        operatorId: session.cardId,
                        operatorName: operatorData.name || 'Desconhecido',
                        operatorEmail: operatorData.email || null,
                        obraId: session.obraId || machineData.obraId || null,
                        obraName: session.obraName || machineData.obraName || null,

                        originalStartTime: session.startTime,
                        originalEndTime: null,
                        originalDurationHours: hoursOpen,

                        createdAt: admin.firestore.Timestamp.now(),

                        auditLog: [{
                            action: 'CREATED',
                            timestamp: admin.firestore.Timestamp.now(),
                            details: `Sessão longa: ${hoursOpen.toFixed(1)}h (limite: ${longSessionThreshold}h)`,
                        }],
                    });

                    // Marcar sessão como tendo alerta de sessão longa
                    await sessionDoc.ref.update({
                        longSessionAlertCreated: true,
                        longSessionAlertId: alertId,
                    });

                    alertsCreated++;
                    console.log(`⚠️ Alerta de sessão longa criado para sessão ${sessionDoc.id}`);
                }
            }

            console.log(`✅ Verificação de sessões longas concluída: ${alertsCreated} alertas criados`);
            return { alertsCreated };
        } catch (error) {
            console.error('❌ Erro na verificação de sessões longas:', error);
            throw error;
        }
    });

// ============================================
// PROCORE INTEGRATION (Fase 1 — Chunk 1A)
// ============================================
// OAuth2 bridge para a API REST do Procore. Endpoints expostos via hosting
// rewrite em `/api/procore/**`. Ver `procore/procoreBridge.js`.

exports.procoreBridge = procoreBridge;

// ============================================
// PROCORE SCHEDULER (Fase 1 — Chunk 1C)
// ============================================
// Cron job (1h) que invoca runFullSync() para manter o catálogo Procore
// (projects/equipment/directory) sincronizado em Firestore. Idempotente.

const { procoreScheduledSync, procoreDailyWriteback } = require('./procore/procoreScheduler');
exports.procoreScheduledSync = procoreScheduledSync;

// ============================================
// PROCORE DAILY WRITEBACK (Fase 3 — Daily Logs + Costs)
// ============================================
// Cron diário (23:30 Lisbon) que agrega sessões RFID do dia e envia
// Daily Logs (resumo por obra) e Cost Entries (combustível) ao Procore.
// Os Timecards individuais já são enviados em real-time pelo procoreSessionExporter.

exports.procoreDailyWriteback = procoreDailyWriteback;

// ============================================
// PROCORE EXPORT RETRY (Fase 3 — Automação IoT)
// ============================================
// Cron job (a cada 30 min) que tenta re-exportar sessões cujo envio
// inicial para o Procore falhou (token expirado, sem projeto mapeado, etc.).
// Usa backoff exponencial: 5 min → 20 min → 60 min → give up.
// As sessões elegíveis têm procoreExport.exported=false e
// procoreExport.nextRetryAfter <= now.

exports.procoreExportRetry = onSchedule(
    {
        schedule: 'every 30 minutes',
        timeZone: 'Europe/Lisbon',
        secrets: [_PCI, _PCS, _PCID],
        region: 'us-central1',
    },
    async () => {
        try {
            const { retryFailedExports } = require('./procore/procoreSessionExporter');
            return await retryFailedExports();
        } catch (err) {
            console.error('[procoreExportRetry] critical:', err.message);
            throw err;
        }
    }
);

// ====================================================
// PROCORE — Re-export Timecard após correção de anomalia
// ====================================================
// Quando uma sessão é corrigida pelo operador (validationStatus muda para RESOLVED
// e correctedByOperator=true), os horários do Procore ficam desatualizados.
// Este trigger re-exporta o Timecard com os valores corrigidos.

exports.onSessionCorrected = onDocumentUpdated(
    {
        document: `${SESSIONS_PATH}/{sessionId}`,
        secrets: [_PCI, _PCS, _PCID],
        region: 'us-central1',
    },
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();

        // Só dispara quando validationStatus muda para RESOLVED com correção
        const becameResolved = before.validationStatus !== 'RESOLVED' && after.validationStatus === 'RESOLVED';
        const wasCorrected = after.correctedByOperator === true || after.correctedByAdmin === true;

        if (!becameResolved || !wasCorrected) return null;

        // Só re-exportar se já houve export anterior (não criar timecard novo do nada)
        if (!after.procoreExport?.exported) {
            console.log(`[onSessionCorrected] session ${event.params.sessionId} — no prior Procore export, skipping`);
            return null;
        }

        console.log(`[onSessionCorrected] session ${event.params.sessionId} — re-exporting corrected times to Procore`);

        try {
            // Invalidar export anterior para forçar re-criação
            await event.data.after.ref.update({
                'procoreExport.exported': false,
                'procoreExport.reason': 'corrected_re_export',
                'procoreExport.previousTimecardId': after.procoreExport.timecardId || null,
            });

            // Re-exportar com os novos horários (que já estão no doc)
            const result = await procoreSessionExporter.exportSessionToProcore(
                event.params.sessionId,
                'end'
            );

            console.log(`[onSessionCorrected] re-export result:`, result.exported ? 'success' : result.reason);
            return result;
        } catch (err) {
            console.error(`[onSessionCorrected] re-export failed for ${event.params.sessionId}:`, err.message);
            return null;
        }
    }
);

/**
 * Trigger: quando obraId de uma machine muda na PWA, sincroniza com Procore (best-effort).
 * Anti-loop: ignora alterações com lastSyncSource === 'procore'.
 */
exports.onMachineObraChanged = onDocumentUpdated(
    {
        document: `${MACHINES_PATH}/{machineId}`,
        secrets: [_PCI, _PCS, _PCID],
        region: 'us-central1',
    },
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();

        // Ignorar se obraId não mudou
        if (before.obraId === after.obraId) return null;
        // Ignorar se a mudança veio do Procore (evitar loop)
        if (after.lastSyncSource === 'procore') return null;

        const machineId = event.params.machineId;
        const procoreEquipmentId = after.procoreEquipmentId;

        // Marcar como pendente de sync
        await event.data.after.ref.update({
            lastSyncedObraId: after.obraId,
            lastSyncSource: 'pwa',
            lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Se não há ID Procore, não há nada a sincronizar
        if (!procoreEquipmentId) return null;

        console.log(`[onMachineObraChanged] ${machineId}: ${before.obraId} → ${after.obraId}`);

        // Resolver procoreProjectId da obra anterior
        const oldObraId = before.obraId;
        const newObraId = after.obraId;

        try {
            // Remover da obra anterior no Procore (se não era Estaleiro)
            const obrasBase = `artifacts/${APP_ID}/public/data/obras`;
            if (oldObraId && oldObraId !== 'estaleiro') {
                const oldObraSnap = await db.doc(`${obrasBase}/${oldObraId}`).get();
                const oldProcoreProjectId = oldObraSnap.data()?.procoreProjectId;
                if (oldProcoreProjectId) {
                    await removeEquipmentFromProject(procoreEquipmentId, oldProcoreProjectId);
                }
            }

            // Associar à nova obra no Procore (se não é Estaleiro)
            if (newObraId && newObraId !== 'estaleiro') {
                const newObraSnap = await db.doc(`${obrasBase}/${newObraId}`).get();
                const newProcoreProjectId = newObraSnap.data()?.procoreProjectId;
                if (newProcoreProjectId) {
                    await associateEquipmentToProject(procoreEquipmentId, newProcoreProjectId);
                }
            }
        } catch (err) {
            console.error(`[onMachineObraChanged] Procore sync failed (non-critical):`, err.message);
        }

        return null;
    }
);

// ============================================
// DETECT DISPATCH TIMEOUT
// Corre de 2 em 2 horas. Máquinas com despachoPendente há mais de 48h
// sem confirmação RFID recebem alerta + flag timeoutTriggered.
// ============================================
exports.detectDispatchTimeout = onSchedule(
    {
        schedule: 'every 2 hours',
        timeZone: 'Europe/Lisbon',
        region: 'us-central1',
    },
    async (_context) => {
        const now = admin.firestore.Timestamp.now();
        const cutoffMs = 48 * 60 * 60 * 1000; // 48 horas em ms

        const machinesSnap = await db.collection(MACHINES_PATH)
            .where('estadoOperacional', '==', 'em_transito')
            .get();

        let timedOut = 0;

        for (const machineDoc of machinesSnap.docs) {
            const data = machineDoc.data();
            const despacho = data.despachoPendente;
            if (!despacho || despacho.timeoutTriggered) continue;

            const dispatchedAt = despacho.dispatchedAt?.toMillis?.() || 0;
            const elapsed = now.toMillis() - dispatchedAt;
            if (elapsed < cutoffMs) continue;

            // Marcar timeout
            await machineDoc.ref.update({
                'despachoPendente.timeoutTriggered': true,
            });

            // Criar alerta
            await db.collection(ALERTS_PATH).add({
                type: 'DISPATCH_TIMEOUT',
                machineId: machineDoc.id,
                machineLabel: data.name || machineDoc.id,
                message: `Máquina "${data.name || machineDoc.id}" em trânsito para ${despacho.obraName} há mais de 48h sem confirmação RFID.`,
                despachoPendente: despacho,
                createdAt: now,
                status: 'PENDING',
                severity: 'warning',
            });

            console.log(`[dispatchTimeout] Timeout: ${machineDoc.id} → ${despacho.obraName}`);
            timedOut++;
        }

        console.log(`[dispatchTimeout] Verificadas ${machinesSnap.size} máquinas em trânsito. Timeouts: ${timedOut}`);
        return null;
    }
);

// ============================================
// SPRINT 3 — PROCORE DEEP INTEGRATION
// ============================================
const {
    equipmentLogsDailyAgg,
    procoreWebhookReceiver,
    onAvariaCreatedToProcore,
    onWorkOrderToProcore,
    procoreSyncQueueRun,
    procoreTokenRefresh,
    pullProcoreCache,
} = require('./procore/procoreDeepIntegration');

exports.equipmentLogsDailyAgg    = equipmentLogsDailyAgg;
exports.procoreWebhookReceiver   = procoreWebhookReceiver;
exports.onAvariaCreatedToProcore = onAvariaCreatedToProcore;
exports.onWorkOrderToProcore     = onWorkOrderToProcore;
exports.procoreSyncQueueRun      = procoreSyncQueueRun;
exports.procoreTokenRefresh      = procoreTokenRefresh;
exports.pullProcoreCache         = pullProcoreCache;
