/**
 * SAP Bridge — integração entre tool_sessions (Firestore) e SAP PM
 *
 * Fluxo: ferramenta retirada/devolvida via NFC → tool_session no Firestore →
 * trigger dispara → formata payload SAP Maintenance Notification → POST sandbox SAP.
 *
 * Os três campos críticos pedidos pelo cliente:
 *   - Remetente (origem): de onde saiu a ferramenta → ReporterFullName/StorageLocation
 *   - Destino: para onde foi → MaintenanceObjectLocation (obra)
 *   - Funcionário: quem fez o movimento → ReportedByUser (Personnel ID)
 *
 * Modo demo: se SAP_DEMO_MODE=true ou sem credenciais, regista o payload
 * em Firestore (procoreSyncQueue style) sem chamar SAP — útil para apresentação.
 */

const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');

// SAP API key opcional — se não configurado, módulo corre em modo mock.
// Para activar modo live: firebase functions:secrets:set SAP_API_KEY
// e adicionar `secrets: [SAP_API_KEY]` aos exports + descomentar defineSecret.
function getSapApiKey() {
  return process.env.SAP_API_KEY || null;
}

const APP_ID = 'casais-rfid';
const TOOL_SESSIONS_PATH = `artifacts/${APP_ID}/public/data/tool_sessions`;
const SAP_LOG_PATH = `artifacts/${APP_ID}/public/data/sap_sync_log`;

// SAP Business Accelerator Hub — sandbox público
const SAP_SANDBOX = {
  baseUrl: 'https://sandbox.api.sap.com/s4hanacloud',
  notificationEndpoint: '/sap/opu/odata/sap/API_MAINTNOTIFICATION/MaintenanceNotification',
};

/**
 * Constrói o payload SAP a partir de uma tool_session.
 * Mapeia os campos críticos:
 *   remetente   → ReportedByUserName + NotifLongText
 *   destino     → MaintenanceObjectLocation
 *   funcionário → ReportedByUser
 */
function buildSapNotificationPayload(session, eventType) {
  const isCheckout = eventType === 'checkout';
  const action = isCheckout ? 'Saída' : 'Devolução';

  const longText = [
    `${action} de equipamento via NFC`,
    `Equipamento: ${session.toolName || session.toolId}`,
    `Origem: ${session.sapOrigin || 'Armazém'}`,
    session.sapDestination ? `Destino: ${session.sapDestination}` : null,
    `Funcionário: ${session.operatorName || session.operatorId}`,
    session.durationHours != null ? `Duração: ${session.durationHours}h` : null,
  ].filter(Boolean).join(' | ');

  return {
    NotificationType: 'M1',                              // Manutenção genérica
    NotificationText: `${action}: ${session.toolName || session.toolId}`,
    NotifLongText: longText,
    Priority: isCheckout ? '3' : '4',                    // 3=medium, 4=low
    Equipment: session.toolId || '',
    MaintenanceObjectLocation: session.sapDestination || session.obraName || 'ARMAZEM',
    ReportedByUser: session.sapWorker || session.operatorId,
    NotificationCreationDate: new Date().toISOString().split('T')[0],
    // Custom fields (PWA → SAP context)
    PwaSessionId: session.id || null,
    PwaEventType: eventType,
  };
}

/**
 * Envia o payload ao sandbox SAP. Retorna { ok, response, error }.
 * Se sem API key → modo mock (regista mas não envia).
 */
async function sendToSap(payload, apiKey) {
  // Modo mock: sem API key, regista payload mas não chama SAP
  if (!apiKey) {
    return {
      ok: true,
      mode: 'mock',
      message: 'Sem SAP_API_KEY — payload registado mas não enviado',
      payload,
    };
  }

  const url = `${SAP_SANDBOX.baseUrl}${SAP_SANDBOX.notificationEndpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'APIKey': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch (_) { parsed = { raw: text }; }

    if (!res.ok) {
      return { ok: false, status: res.status, response: parsed, mode: 'live' };
    }

    // Extrai NotificationID se SAP devolveu sucesso
    const sapId = parsed?.d?.MaintenanceNotification || parsed?.MaintenanceNotification || null;
    return { ok: true, mode: 'live', sapNotificationId: sapId, response: parsed };
  } catch (err) {
    return { ok: false, mode: 'live', error: err.message };
  }
}

/**
 * Lógica partilhada: formata payload, envia, regista resultado, actualiza sessão.
 */
async function processToolSession(sessionId, sessionData, eventType, apiKey) {
  const db = admin.firestore();
  const payload = buildSapNotificationPayload({ ...sessionData, id: sessionId }, eventType);
  const result = await sendToSap(payload, apiKey);

  // Regista no log SAP (para demo / auditoria)
  await db.collection(SAP_LOG_PATH).add({
    sessionId,
    eventType,
    payload,
    result,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Actualiza a sessão com o estado de sync SAP
  await db.collection(TOOL_SESSIONS_PATH).doc(sessionId).set({
    sapSynced: result.ok,
    sapMode: result.mode,
    sapNotificationId: result.sapNotificationId || null,
    sapError: result.error || (result.ok ? null : `HTTP ${result.status}`),
    sapSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return result;
}

// ──────────────────────────────────────────────────────────
// Trigger 1: ferramenta retirada (tool_session criada)
// ──────────────────────────────────────────────────────────
exports.onToolSessionCreatedToSap = onDocumentCreated(
  {
    document: `${TOOL_SESSIONS_PATH}/{sessionId}`,
    region: 'europe-west1',
  },
  async (event) => {
    const session = event.data?.data();
    if (!session) return;
    if (session.status !== 'OPEN') return;  // só checkouts

    const apiKey = getSapApiKey();
    return processToolSession(event.params.sessionId, session, 'checkout', apiKey);
  }
);

// ──────────────────────────────────────────────────────────
// Trigger 2: ferramenta devolvida (status OPEN → CLOSED)
// ──────────────────────────────────────────────────────────
exports.onToolSessionClosedToSap = onDocumentUpdated(
  {
    document: `${TOOL_SESSIONS_PATH}/{sessionId}`,
    region: 'europe-west1',
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    // Só dispara se passou de OPEN → CLOSED
    if (before.status !== 'OPEN' || after.status !== 'CLOSED') return;

    const apiKey = getSapApiKey();
    return processToolSession(event.params.sessionId, after, 'checkin', apiKey);
  }
);

// ──────────────────────────────────────────────────────────
// Endpoint HTTP manual: útil para demo / re-sync / debug
// POST /api/sap/sync   { sessionId, eventType: "checkout"|"checkin" }
// GET  /api/sap/log    → últimos 20 envios SAP
// GET  /api/sap/status → estado da integração
// ──────────────────────────────────────────────────────────
exports.sapBridge = onRequest(
  { region: 'europe-west1', cors: true },
  async (req, res) => {
    const db = admin.firestore();
    const path = req.path || '';
    const apiKey = getSapApiKey();

    // GET /status
    if (path.endsWith('/status') || path === '/' || path === '') {
      return res.json({
        ok: true,
        connected: !!apiKey,
        mode: apiKey ? 'live' : 'mock',
        sandbox: SAP_SANDBOX.baseUrl,
        endpoint: SAP_SANDBOX.notificationEndpoint,
      });
    }

    // GET /log
    if (path.endsWith('/log')) {
      const snap = await db.collection(SAP_LOG_PATH)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      return res.json({
        logs: snap.docs.map(d => ({ id: d.id, ...d.data() })),
      });
    }

    // POST /sync
    if (req.method === 'POST' && path.endsWith('/sync')) {
      const { sessionId, eventType = 'checkout' } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ ok: false, error: 'sessionId required' });
      }
      const doc = await db.collection(TOOL_SESSIONS_PATH).doc(sessionId).get();
      if (!doc.exists) {
        return res.status(404).json({ ok: false, error: 'tool_session not found' });
      }
      const result = await processToolSession(sessionId, doc.data(), eventType, apiKey);
      return res.json(result);
    }

    return res.status(404).json({ ok: false, error: 'unknown path', path });
  }
);
