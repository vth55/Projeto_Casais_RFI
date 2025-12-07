const functions = require('firebase-functions');
const admin = require('firebase-admin');

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

exports.handleSessionTrigger = functions.https.onRequest(async (req, res) => {
    
    if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Apenas POST permitido.' });
    }

    const { cardId, machineId } = req.body;
    if (!cardId || !machineId) {
        return res.status(400).send({ error: 'Faltam dados (cardId ou machineId).' });
    }

    const normalizedCard = cardId.toUpperCase().trim();
    const normalizedMachine = machineId.trim();
    const timestamp = admin.firestore.Timestamp.now();

    try {
        await db.doc(`${SCAN_BUFFER_PATH}/latest`).set({
            cardId: normalizedCard,
            machineId: normalizedMachine,
            timestamp: timestamp
        }, { merge: true });

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
                return res.status(403).send({ 
                    status: 'DENIED', 
                    message: 'Acesso negado. Cartão não registado.' 
                });
            }
        }
        
        const machineRef = db.doc(`${MACHINES_PATH}/${normalizedMachine}`);

        if (!activeSessionQuery.empty) {
            const sessionDoc = activeSessionQuery.docs[0];
            const startTime = sessionDoc.data().startTime.toDate();
            const endTime = new Date();
            
            if (sessionDoc.data().cardId !== normalizedCard) {
                 return res.status(403).send({ 
                    status: 'DENIED', 
                    message: 'Sessão iniciada por outro cartão. Sessão não encerrada.' 
                });
            }

            const durationHours = (endTime - startTime) / (1000 * 60 * 60);

            await sessionDoc.ref.update({
                endTime: admin.firestore.Timestamp.fromDate(endTime),
                durationHours: durationHours,
                status: 'CLOSED'
            });

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

            await db.collection(SESSIONS_PATH).add(newSession);
            
            await machineRef.set({ 
                status: 'ACTIVE', 
                lastOperator: normalizedCard 
            }, { merge: true });

            console.log(`Sessão iniciada: ${normalizedCard} em ${normalizedMachine}`);
            return res.json({ status: 'START' });
        }

    } catch (error) {
        console.error("Erro no servidor:", error);
        return res.status(500).send({ error: error.message });
    }
});

// ============================================
// GEMINI API - Monitoramento e Controle de Uso
// ============================================

const RateLimiter = require('./utils/rateLimiter');
const CostCalculator = require('./utils/costCalculator');

/**
 * Endpoint para verificar estatísticas de uso da API Gemini
 * GET /api/gemini/usage
 */
exports.getGeminiUsage = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send({ error: 'Apenas GET permitido.' });
    }

    try {
        const rateLimiter = new RateLimiter();
        const costCalculator = new CostCalculator();
        
        const stats = await rateLimiter.getUsageStats();
        const warnings = await rateLimiter.checkWarnings();
        
        // Calcular custos
        const dailyCost = costCalculator.calculateDailyCost(stats.tokensToday);
        const monthlyProjection = costCalculator.projectMonthlyCost(stats.tokensToday);
        const pricingInfo = costCalculator.getPricingInfo();

        res.json({
            usage: stats,
            warnings: warnings.alerts,
            hasWarnings: warnings.warning,
            costs: {
                today: dailyCost,
                monthlyProjection,
                pricing: pricingInfo
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).send({ error: error.message });
    }
});

/**
 * Endpoint para verificar alertas de uso
 * GET /api/gemini/warnings
 */
exports.getGeminiWarnings = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send({ error: 'Apenas GET permitido.' });
    }

    try {
        const rateLimiter = new RateLimiter();
        const warnings = await rateLimiter.checkWarnings();
        
        res.json({
            hasWarnings: warnings.warning,
            alerts: warnings.alerts,
            stats: warnings.stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao verificar alertas:', error);
        res.status(500).send({ error: error.message });
    }
});