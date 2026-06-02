'use strict';

/**
 * sapTransferBridge.js — SAP sync for tool_transfers (guias logísticas)
 *
 * Colecção alvo:  tool_transfers/{transferId}
 * Queue:          sap_transfer_queue/{transferId}_{eventType}
 * Alertas:        tool_alerts (SAP_SYNC_FAILURE após dead-letter)
 *
 * Eventos sincronizados: DISPATCHED e RECEIVED (nunca DRAFT, PARTIAL, CANCELLED).
 *
 * Estado por evento em tool_transfers:
 *   externalSync.sap.DISPATCHED.{ status, syncedAt, sapNotificationId, lastError, retryCount }
 *   externalSync.sap.RECEIVED.{  status, syncedAt, sapNotificationId, lastError, retryCount }
 *
 * Modo mock por defeito: sem SAP_API_KEY o payload é registado mas não enviado.
 */

const admin = require('firebase-admin');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');

// ─── Caminhos ────────────────────────────────────────────────────────────────
const APP_ID = 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;
const TOOL_TRANSFERS_PATH = `${BASE}/tool_transfers`;
const SAP_QUEUE_PATH = `${BASE}/sap_transfer_queue`;
const TOOL_ALERTS_PATH = `${BASE}/tool_alerts`;

// ─── Parâmetros de controlo ───────────────────────────────────────────────────
const LEASE_DURATION_MS = 5 * 60 * 1000;  // 5 min (> max execution time do worker)
const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 60 * 1000;         // 60s × 2^retryCount
const SYNC_TRANSITIONS = ['DISPATCHED', 'RECEIVED'];

// SAP sandbox (partilhado com sapBridge.js — contratos diferentes)
const SAP_SANDBOX = {
  baseUrl: 'https://sandbox.api.sap.com/s4hanacloud',
  endpoint: '/sap/opu/odata/sap/API_MAINTNOTIFICATION/MaintenanceNotification',
};

// ─── Helpers puros ────────────────────────────────────────────────────────────

function queueDocId(transferId, eventType) {
  return `${transferId}_${eventType}`;
}

/**
 * Calcula o próximo processAfter com backoff exponencial.
 * @param {number} retryCount  número de tentativas já feitas
 * @param {number} [nowMs]     override de Date.now() para testes
 */
function nextProcessAfter(retryCount, nowMs = Date.now()) {
  const delayMs = Math.pow(2, retryCount) * BACKOFF_BASE_MS;
  return admin.firestore.Timestamp.fromMillis(nowMs + delayMs);
}

function getSapApiKey() {
  return process.env.SAP_API_KEY || null;
}

// ─── Payload builder (contrato tool_transfers — distinto de tool_sessions) ────

/**
 * Constrói o payload SAP para uma guia logística.
 * NotificationType M2 distingue de tool_sessions (M1).
 * Nunca reutiliza campos de tool_sessions: contratos SAP diferentes.
 */
function buildSapTransferPayload(transferId, transfer, eventType) {
  const isDispatch = eventType === 'DISPATCHED';
  const action = isDispatch ? 'Despacho' : 'Recepção';
  const from = transfer.from || {};
  const to = transfer.to || {};
  const items = transfer.items || [];
  const toolNames = items.map(i => i.name || i.toolId).filter(Boolean).join(', ');

  const textParts = [
    `${action} de guia logística`,
    `De: ${from.name || from.obraId || 'Armazém'}`,
    `Para: ${to.name || to.obraId || 'Armazém'}`,
    `Ferramentas (${items.length}): ${toolNames || 'n/a'}`,
  ];
  if (isDispatch && transfer.dispatchedBy) {
    textParts.push(`Despachado por: ${transfer.dispatchedBy}`);
  }
  if (!isDispatch && transfer.receivedBy) {
    textParts.push(`Recebido por: ${transfer.receivedBy}`);
  }
  if (!isDispatch && (transfer.missingToolIds || []).length > 0) {
    textParts.push(`Em falta: ${transfer.missingToolIds.length}`);
  }

  return {
    NotificationType: 'M2',
    NotificationText: `${action}: guia ${String(transferId).slice(-8)}`,
    NotifLongText: textParts.join(' | '),
    Priority: '3',
    // Campos específicos de guias — ausentes em tool_sessions
    PwaTransferId: transferId,
    PwaEventType: eventType,
    PwaTransferType: transfer.type || 'UNKNOWN',
    PwaFromLocation: from.kind === 'OBRA' ? (from.obraId || '') : 'WAREHOUSE',
    PwaToLocation: to.kind === 'OBRA' ? (to.obraId || '') : 'WAREHOUSE',
    PwaToolCount: items.length,
    PwaPickedCount: (transfer.pickedToolIds || []).length,
    PwaReceivedCount: (transfer.receivedToolIds || []).length,
    NotificationCreationDate: new Date().toISOString().split('T')[0],
  };
}

// ─── Envio SAP ────────────────────────────────────────────────────────────────

async function sendToSap(payload, apiKey) {
  if (!apiKey) {
    // Modo mock por defeito — nunca assumir live sem credenciais explícitas
    return {
      ok: true,
      mode: 'mock',
      message: 'Sem SAP_API_KEY — payload registado mas não enviado',
      payload,
    };
  }

  const url = `${SAP_SANDBOX.baseUrl}${SAP_SANDBOX.endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        APIKey: apiKey,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch (_) { parsed = { raw: text }; }

    if (!res.ok) {
      // Não assumir que qualquer código significa "já existe" — registar o código
      // e deixar o worker decidir baseado na política de retry.
      return { ok: false, status: res.status, response: parsed, mode: 'live' };
    }

    const sapId = parsed?.d?.MaintenanceNotification || parsed?.MaintenanceNotification || null;
    return { ok: true, mode: 'live', sapNotificationId: sapId, response: parsed };
  } catch (err) {
    return { ok: false, mode: 'live', error: err.message };
  }
}

// ─── Queue write (transaccional) ──────────────────────────────────────────────

/**
 * Enfileira uma transferência para sync SAP.
 * Transaccional: garante exactamente um documento por (transferId, eventType).
 * Idempotente: se o documento já existe em qualquer estado, não cria duplicado.
 *
 * @param {string}  transferId
 * @param {string}  eventType    'DISPATCHED' | 'RECEIVED'
 * @param {Object}  transferData snapshot do documento tool_transfers
 * @returns {Promise<boolean>}   true se enfileirou, false se já existia
 */
async function enqueueTransfer(transferId, eventType, transferData) {
  const db = admin.firestore();
  const queueRef = db.collection(SAP_QUEUE_PATH).doc(queueDocId(transferId, eventType));
  const now = admin.firestore.Timestamp.now();
  let enqueued = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(queueRef);
    if (snap.exists) return;  // já existe em qualquer estado — idempotente

    tx.set(queueRef, {
      transferId,
      eventType,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      processAfter: now,
      leaseExpiry: null,
      lastError: null,
      payload: buildSapTransferPayload(transferId, transferData, eventType),
    });
    enqueued = true;
  });

  return enqueued;
}

// ─── Worker: lease transaccional ─────────────────────────────────────────────

/**
 * Tenta reclamar um item da queue com lease transaccional.
 * Recupera também itens com leaseExpiry expirado (crash recovery).
 *
 * @param {FirebaseFirestore.DocumentReference} itemRef
 * @param {number} [nowMs]  override de Date.now() para testes
 * @returns {Promise<{ref, data}|null>}  null se não foi possível reclamar
 */
async function claimQueueItem(itemRef, nowMs = Date.now()) {
  const db = admin.firestore();
  let claimed = false;
  let itemData = null;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(itemRef);
      if (!snap.exists) throw new Error('gone');

      const d = snap.data();

      // Terminais — não processar
      if (d.status === 'synced' || d.status === 'dead_letter') throw new Error('terminal');

      // Lease activo — outro worker está a processar
      if (d.status === 'processing' && d.leaseExpiry != null && d.leaseExpiry.toMillis() > nowMs) {
        throw new Error('leased');
      }

      // Ainda dentro da janela de backoff
      if (d.processAfter != null && d.processAfter.toMillis() > nowMs) {
        throw new Error('not_yet');
      }

      // Reclamar: escrever lease antes de qualquer I/O externo
      tx.update(itemRef, {
        status: 'processing',
        leaseExpiry: admin.firestore.Timestamp.fromMillis(nowMs + LEASE_DURATION_MS),
      });
      claimed = true;
      itemData = d;
    });
  } catch (_) {
    // Condição de skip — não é erro do sistema
  }

  return claimed ? { ref: itemRef, data: itemData } : null;
}

/**
 * Completa o processamento de um item da queue após tentativa SAP.
 * Usa dot-notation paths para actualizar externalSync.sap.{eventType} sem
 * afectar o estado do outro evento (DISPATCHED e RECEIVED são independentes).
 *
 * @param {FirebaseFirestore.DocumentReference} itemRef
 * @param {{ok,mode,sapNotificationId?,error?,status?}} result  resultado do SAP
 * @param {Object} previousData  dados do item no momento do claim
 */
async function completeQueueItem(itemRef, result, previousData) {
  const db = admin.firestore();
  const { transferId, eventType, retryCount: prevRetry = 0 } = previousData;
  const transferRef = db.collection(TOOL_TRANSFERS_PATH).doc(transferId);
  const prefix = `externalSync.sap.${eventType}`;

  if (result.ok) {
    await itemRef.update({ status: 'synced', leaseExpiry: null, lastError: null });
    await transferRef.update({
      [`${prefix}.status`]: 'synced',
      [`${prefix}.syncedAt`]: admin.firestore.FieldValue.serverTimestamp(),
      [`${prefix}.sapNotificationId`]: result.sapNotificationId || null,
      [`${prefix}.lastError`]: null,
      [`${prefix}.retryCount`]: prevRetry,
    });
    return;
  }

  const newRetry = prevRetry + 1;
  const errorMsg = result.error || (result.status ? `HTTP ${result.status}` : 'unknown error');

  if (newRetry >= MAX_RETRIES) {
    // Dead-letter: marcar e criar alerta operacional
    await itemRef.update({ status: 'dead_letter', leaseExpiry: null, lastError: errorMsg, retryCount: newRetry });
    await transferRef.update({
      [`${prefix}.status`]: 'dead_letter',
      [`${prefix}.lastError`]: errorMsg,
      [`${prefix}.retryCount`]: newRetry,
    });
    await db.collection(TOOL_ALERTS_PATH).add({
      anomalyType: 'SAP_SYNC_FAILURE',
      type: 'SAP_SYNC_FAILURE',
      status: 'OPEN',
      transferId,
      eventType,
      lastError: errorMsg,
      retryCount: newRetry,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resolvedAt: null,
      auditLog: [{
        action: 'CREATED',
        by: 'sap_transfer_bridge',
        at: admin.firestore.FieldValue.serverTimestamp(),
        notes: `Dead-letter após ${MAX_RETRIES} tentativas: ${errorMsg}`,
      }],
    });
  } else {
    // Retry com backoff exponencial
    const processAfter = nextProcessAfter(newRetry);
    await itemRef.update({
      status: 'pending',
      leaseExpiry: null,
      lastError: errorMsg,
      retryCount: newRetry,
      processAfter,
    });
    await transferRef.update({
      [`${prefix}.status`]: 'pending',
      [`${prefix}.lastError`]: errorMsg,
      [`${prefix}.retryCount`]: newRetry,
    });
  }
}

// ─── Cloud Functions ──────────────────────────────────────────────────────────

/**
 * Trigger: onDocumentWritten em tool_transfers.
 * Detecta transições → DISPATCHED e → RECEIVED e enfileira cada uma.
 * Nunca processa DRAFT, PARTIAL, CANCELLED.
 */
exports.onToolTransferWritten = onDocumentWritten(
  { document: `${TOOL_TRANSFERS_PATH}/{transferId}`, region: 'europe-west1' },
  async (event) => {
    const beforeData = event.data?.before?.exists ? event.data.before.data() : null;
    const afterData = event.data?.after?.exists ? event.data.after.data() : null;
    if (!afterData) return;  // delete — ignorar

    const beforeStatus = beforeData?.status ?? null;
    const afterStatus = afterData.status;
    const transferId = event.params.transferId;

    for (const eventType of SYNC_TRANSITIONS) {
      if (beforeStatus !== eventType && afterStatus === eventType) {
        const enqueued = await enqueueTransfer(transferId, eventType, afterData);
        if (enqueued) {
          console.log(`[sapTransfer] enqueued ${transferId}:${eventType}`);
        } else {
          console.log(`[sapTransfer] already queued ${transferId}:${eventType} — skip`);
        }
      }
    }
  },
);

/**
 * Worker: processa a queue a cada 5 minutos.
 * Recupera itens `pending` dentro da janela de backoff e itens `processing`
 * com lease expirado (crash recovery).
 */
exports.processSapTransferQueue = onSchedule(
  { schedule: 'every 5 minutes', region: 'europe-west1' },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const apiKey = getSapApiKey();

    const [pendingSnap, expiredSnap] = await Promise.all([
      db.collection(SAP_QUEUE_PATH)
        .where('status', '==', 'pending')
        .where('processAfter', '<=', now)
        .limit(50)
        .get(),
      db.collection(SAP_QUEUE_PATH)
        .where('status', '==', 'processing')
        .where('leaseExpiry', '<=', now)
        .limit(50)
        .get(),
    ]);

    const candidates = [...pendingSnap.docs, ...expiredSnap.docs];
    console.log(`[sapTransfer] worker: ${candidates.length} candidate(s) to process`);

    for (const doc of candidates) {
      const claimed = await claimQueueItem(doc.ref);
      if (!claimed) continue;

      const result = await sendToSap(claimed.data.payload, apiKey);
      await completeQueueItem(doc.ref, result, claimed.data);

      console.log(`[sapTransfer] ${claimed.data.transferId}:${claimed.data.eventType} → ${result.ok ? 'ok' : `fail(${result.error || result.status})`}`);
    }
  },
);

/**
 * Reconciliação diária: re-enfileira guias DISPATCHED/RECEIVED ainda não sincronizadas.
 * Nunca toca em DRAFT — só guias com transição confirmada.
 */
exports.reconcileSapTransfers = onSchedule(
  { schedule: '0 3 * * *', region: 'europe-west1' },
  async () => {
    const db = admin.firestore();

    const transfersSnap = await db.collection(TOOL_TRANSFERS_PATH)
      .where('status', 'in', ['DISPATCHED', 'RECEIVED'])
      .get();

    let requeued = 0;

    for (const transferDoc of transfersSnap.docs) {
      const data = transferDoc.data();
      const transferId = transferDoc.id;

      // Uma guia RECEIVED deve ter ambos os eventos sincronizados
      const expectedEvents = data.status === 'RECEIVED' ? ['DISPATCHED', 'RECEIVED'] : ['DISPATCHED'];

      for (const eventType of expectedEvents) {
        const syncState = data.externalSync?.sap?.[eventType];

        if (syncState?.status === 'synced') continue;       // já feito
        if (syncState?.status === 'dead_letter') continue;  // requer intervenção humana

        // Verificar se já há um item activo na queue
        const queueRef = db.collection(SAP_QUEUE_PATH).doc(queueDocId(transferId, eventType));
        const queueSnap = await queueRef.get();
        const queueStatus = queueSnap.exists ? queueSnap.data()?.status : null;

        if (queueStatus === 'pending' || queueStatus === 'processing') continue;

        // Re-enfileirar (novo ou reset de falha antiga)
        const nowTs = admin.firestore.Timestamp.now();
        await queueRef.set({
          transferId,
          eventType,
          status: 'pending',
          retryCount: 0,
          createdAt: queueSnap.exists ? queueSnap.data().createdAt : nowTs,
          processAfter: nowTs,
          leaseExpiry: null,
          lastError: null,
          payload: buildSapTransferPayload(transferId, data, eventType),
        });

        requeued++;
        console.log(`[sapTransfer] reconcile: re-enqueued ${transferId}:${eventType}`);
      }
    }

    console.log(`[sapTransfer] reconcile complete: ${requeued} item(s) re-enqueued`);
  },
);

// ─── Surface de testes ────────────────────────────────────────────────────────
exports.__test = {
  enqueueTransfer,
  claimQueueItem,
  completeQueueItem,
  buildSapTransferPayload,
  nextProcessAfter,
  queueDocId,
  SYNC_TRANSITIONS,
  MAX_RETRIES,
  LEASE_DURATION_MS,
  BACKOFF_BASE_MS,
};
