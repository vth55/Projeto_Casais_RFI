'use strict';

/**
 * sapTransferBridge.test.js
 *
 * Testes obrigatórios:
 *  1.  Idempotência concorrente — dois enqueueTransfer simultâneos → exactamente 1 doc
 *  2.  Transições — DRAFT→DISPATCHED enfileira DISPATCHED
 *  3.  Transições — DRAFT→RECEIVED enfileira RECEIVED
 *  4.  Transições — transição sem DISPATCHED/RECEIVED não enfileira
 *  5.  Lease — claimQueueItem cria status=processing + leaseExpiry
 *  6.  Lease — dois claims concorrentes: só um reclama
 *  7.  Lease expirado — item processing com lease expirado é re-reclamável
 *  8.  Backoff — após falha (retryCount < MAX), processAfter avança exponencialmente
 *  9.  Dead-letter — após MAX_RETRIES falhas: dead_letter + tool_alert criado
 * 10.  Payload DISPATCHED — campos específicos da guia presentes e correctos
 * 11.  Payload RECEIVED — campos específicos (receivedBy, missingToolIds) correctos
 * 12.  Eventos independentes — DISPATCHED e RECEIVED trackados separadamente
 */

// ─── Mock in-memory store ─────────────────────────────────────────────────────

const store = {};          // key: 'collection/docId' → data
const addedDocs = [];      // .add() captures

function storeKey(collPath, id) {
  return `${collPath}/${id}`;
}

const mockTs = (ms = Date.now()) => ({
  toMillis: () => ms,
  toDate: () => new Date(ms),
});

function resolveFieldValue(current, value) {
  if (value && value.__serverTs) return mockTs();
  if (value && typeof value.__incr === 'number') return (current || 0) + value.__incr;
  return value;
}

// Apply dot-notation or flat updates to an existing object
function applyUpdate(target, updates) {
  for (const [field, rawValue] of Object.entries(updates)) {
    const value = resolveFieldValue(target[field], rawValue);
    const parts = field.split('.');
    let obj = target;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    const leaf = parts[parts.length - 1];
    obj[leaf] = resolveFieldValue(obj[leaf], value);
  }
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data, (_k, v) => {
    if (v && typeof v.toMillis === 'function') return { __mockTs: v.toMillis() };
    return v;
  }));
}

function restoreData(data) {
  if (!data || typeof data !== 'object') return data;
  if (data.__mockTs !== undefined) return mockTs(data.__mockTs);
  const result = Array.isArray(data) ? [] : {};
  for (const [k, v] of Object.entries(data)) result[k] = restoreData(v);
  return result;
}

function mkRef(collPath, docId) {
  const key = storeKey(collPath, docId);
  return {
    id: docId,
    get: async () => {
      const raw = store[key];
      return {
        exists: key in store,
        data: () => (raw ? restoreData(cloneData(raw)) : undefined),
      };
    },
    set: async (data, opts = {}) => {
      if (opts.merge && store[key]) {
        // Shallow-merge top-level; nested objects are overwritten (Firestore semantics)
        store[key] = { ...store[key], ...data };
      } else {
        store[key] = { ...data };
      }
      // Resolve server timestamps in place
      applyUpdate(store[key], {});
    },
    update: async (data) => {
      if (!(key in store)) store[key] = {};
      applyUpdate(store[key], data);
    },
  };
}

// Serialise transactions to prevent interleaving in async test contexts
let txQueue = Promise.resolve();

const mockAdmin = {
  firestore: Object.assign(
    () => ({
      collection: (collPath) => ({
        doc: (id) => mkRef(collPath, id),
        add: async (data) => {
          const id = `auto_${Math.random().toString(36).slice(2)}`;
          store[storeKey(collPath, id)] = { ...data };
          addedDocs.push({ collPath, id, data: { ...data } });
          return { id };
        },
        // Simplified where chain for scheduled worker tests (returns empty by default)
        where: () => ({
          where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
          limit: () => ({ get: async () => ({ docs: [] }) }),
          get: async () => ({ docs: [] }),
        }),
      }),
      runTransaction: (cb) => {
        const run = txQueue.then(() =>
          cb({
            get: (ref) => ref.get(),
            set: (ref, data, opts) => ref.set(data, opts),
            update: (ref, data) => ref.update(data),
          }),
        );
        txQueue = run.catch(() => {});
        return run;
      },
    }),
    {
      FieldValue: {
        serverTimestamp: () => ({ __serverTs: true }),
        increment: (n) => ({ __incr: n }),
      },
      Timestamp: {
        now: () => mockTs(),
        fromMillis: (ms) => mockTs(ms),
      },
    },
  ),
  apps: [{}],
  initializeApp: () => {},
};

jest.mock('firebase-admin', () => mockAdmin);
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentWritten: (_opts, fn) => fn,
}));
jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_opts, fn) => fn,
}));

const {
  __test: {
    enqueueTransfer,
    claimQueueItem,
    completeQueueItem,
    buildSapTransferPayload,
    nextProcessAfter,
    queueDocId,
    idempotencyKey,
    sendToSap,
    MAX_RETRIES,
    LEASE_DURATION_MS,
    BACKOFF_BASE_MS,
  },
  onToolTransferWritten,
} = require('./sapTransferBridge');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PATH = 'artifacts/casais-rfid/public/data';
const QUEUE_PATH = `${BASE_PATH}/sap_transfer_queue`;
const TRANSFER_PATH = `${BASE_PATH}/tool_transfers`;
const ALERTS_PATH = `${BASE_PATH}/tool_alerts`;

const mkTransfer = (overrides = {}) => ({
  type: 'WAREHOUSE_TO_OBRA',
  status: 'DISPATCHED',
  from: { kind: 'WAREHOUSE', obraId: null, name: 'Armazém Central' },
  to: { kind: 'OBRA', obraId: 'obra_porto', name: 'Porto Norte' },
  items: [
    { toolId: 'tool_a', name: 'Martelo Bosch' },
    { toolId: 'tool_b', name: 'Rebarbadora Hilti' },
  ],
  pickedToolIds: ['tool_a', 'tool_b'],
  receivedToolIds: [],
  missingToolIds: [],
  dispatchedBy: 'operador_001',
  receivedBy: null,
  createdAt: mockTs(),
  ...overrides,
});

function mkQueueDoc(overrides = {}) {
  return {
    transferId: 'transfer_abc',
    eventType: 'DISPATCHED',
    status: 'pending',
    retryCount: 0,
    createdAt: mockTs(),
    processAfter: mockTs(Date.now() - 1000),  // already due
    leaseExpiry: null,
    lastError: null,
    payload: {},
    ...overrides,
  };
}

// Helper: seed a doc directly in the mock store
function seedDoc(collPath, docId, data) {
  store[storeKey(collPath, docId)] = { ...data };
}

function getDoc(collPath, docId) {
  return store[storeKey(collPath, docId)];
}

// ─── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  addedDocs.length = 0;
  txQueue = Promise.resolve();
  jest.restoreAllMocks();
});

// ─── 1. Idempotência concorrente ──────────────────────────────────────────────

describe('enqueueTransfer — idempotência', () => {
  test('dois enqueueTransfer concorrentes criam exactamente um documento', async () => {
    const transfer = mkTransfer();
    const results = await Promise.all([
      enqueueTransfer('transfer_abc', 'DISPATCHED', transfer),
      enqueueTransfer('transfer_abc', 'DISPATCHED', transfer),
    ]);

    const queueDoc = getDoc(QUEUE_PATH, queueDocId('transfer_abc', 'DISPATCHED'));
    expect(queueDoc).toBeDefined();
    expect(queueDoc.status).toBe('pending');
    expect(queueDoc.idempotencyKey).toBe('transfer_abc:DISPATCHED');
    expect(queueDoc.payload.PwaIdempotencyKey).toBe('transfer_abc:DISPATCHED');

    const transferDoc = getDoc(TRANSFER_PATH, 'transfer_abc');
    expect(transferDoc.externalSync.sap.DISPATCHED.status).toBe('pending');

    // Exactamente um enfileirou, o outro viu o doc existente
    const enqueuedCount = results.filter(Boolean).length;
    expect(enqueuedCount).toBe(1);
  });

  test('segundo enqueueTransfer em doc já existente retorna false', async () => {
    const transfer = mkTransfer();
    await enqueueTransfer('transfer_abc', 'DISPATCHED', transfer);
    const second = await enqueueTransfer('transfer_abc', 'DISPATCHED', transfer);
    expect(second).toBe(false);
  });

  test('eventos diferentes criam documentos independentes', async () => {
    const transfer = mkTransfer({ status: 'RECEIVED' });
    await enqueueTransfer('transfer_abc', 'DISPATCHED', transfer);
    await enqueueTransfer('transfer_abc', 'RECEIVED', transfer);

    expect(getDoc(QUEUE_PATH, queueDocId('transfer_abc', 'DISPATCHED'))).toBeDefined();
    expect(getDoc(QUEUE_PATH, queueDocId('transfer_abc', 'RECEIVED'))).toBeDefined();
  });
});

// ─── 2-4. Transições (trigger) ────────────────────────────────────────────────

describe('onToolTransferWritten — transições', () => {
  function mkEvent(beforeStatus, afterStatus) {
    return {
      params: { transferId: 'transfer_trg' },
      data: {
        before: {
          exists: beforeStatus !== null,
          data: () => (beforeStatus !== null ? { status: beforeStatus } : null),
        },
        after: {
          exists: true,
          data: () => mkTransfer({ status: afterStatus }),
        },
      },
    };
  }

  test('DRAFT → DISPATCHED enfileira DISPATCHED', async () => {
    await onToolTransferWritten(mkEvent('DRAFT', 'DISPATCHED'));
    expect(getDoc(QUEUE_PATH, queueDocId('transfer_trg', 'DISPATCHED'))).toBeDefined();
    expect(getDoc(QUEUE_PATH, queueDocId('transfer_trg', 'RECEIVED'))).toBeUndefined();
  });

  test('criação directa como DISPATCHED também enfileira DISPATCHED', async () => {
    await onToolTransferWritten(mkEvent(null, 'DISPATCHED'));
    expect(getDoc(QUEUE_PATH, queueDocId('transfer_trg', 'DISPATCHED'))).toBeDefined();
  });

  test('DISPATCHED → RECEIVED enfileira RECEIVED (não re-enfileira DISPATCHED)', async () => {
    await onToolTransferWritten(mkEvent('DISPATCHED', 'RECEIVED'));
    expect(getDoc(QUEUE_PATH, queueDocId('transfer_trg', 'RECEIVED'))).toBeDefined();
    expect(getDoc(QUEUE_PATH, queueDocId('transfer_trg', 'DISPATCHED'))).toBeUndefined();
  });

  test('DRAFT → PARTIAL não enfileira nenhum evento', async () => {
    await onToolTransferWritten(mkEvent('DRAFT', 'PARTIAL'));
    expect(getDoc(QUEUE_PATH, queueDocId('transfer_trg', 'DISPATCHED'))).toBeUndefined();
    expect(getDoc(QUEUE_PATH, queueDocId('transfer_trg', 'RECEIVED'))).toBeUndefined();
  });

  test('update sem mudança de status não enfileira', async () => {
    await onToolTransferWritten(mkEvent('DISPATCHED', 'DISPATCHED'));
    expect(getDoc(QUEUE_PATH, queueDocId('transfer_trg', 'DISPATCHED'))).toBeUndefined();
  });
});

// ─── 5-7. Lease ───────────────────────────────────────────────────────────────

describe('claimQueueItem — lease', () => {
  test('claim bem-sucedido define status=processing e leaseExpiry', async () => {
    const docId = queueDocId('transfer_lease', 'DISPATCHED');
    seedDoc(QUEUE_PATH, docId, mkQueueDoc({ transferId: 'transfer_lease' }));
    const ref = mkRef(QUEUE_PATH, docId);

    const claimed = await claimQueueItem(ref);
    expect(claimed).not.toBeNull();
    expect(claimed.data.status).toBe('pending');  // dados do momento anterior ao claim

    const updated = getDoc(QUEUE_PATH, docId);
    expect(updated.status).toBe('processing');
    expect(updated.leaseExpiry).toBeDefined();
    expect(updated.leaseExpiry.toMillis()).toBeGreaterThan(Date.now());
  });

  test('dois claims concorrentes — apenas um reclama', async () => {
    const docId = queueDocId('transfer_race', 'DISPATCHED');
    seedDoc(QUEUE_PATH, docId, mkQueueDoc({ transferId: 'transfer_race' }));
    const ref = mkRef(QUEUE_PATH, docId);

    const results = await Promise.all([
      claimQueueItem(ref),
      claimQueueItem(ref),
    ]);

    const claimed = results.filter(r => r !== null);
    expect(claimed).toHaveLength(1);
    expect(getDoc(QUEUE_PATH, docId).status).toBe('processing');
  });

  test('item processing com lease expirado é re-reclamável', async () => {
    const expiredMs = Date.now() - 1000;  // expirou há 1 segundo
    const docId = queueDocId('transfer_expired', 'DISPATCHED');
    seedDoc(QUEUE_PATH, docId, mkQueueDoc({
      transferId: 'transfer_expired',
      status: 'processing',
      leaseExpiry: mockTs(expiredMs),
    }));
    const ref = mkRef(QUEUE_PATH, docId);

    const claimed = await claimQueueItem(ref, Date.now());
    expect(claimed).not.toBeNull();
    expect(getDoc(QUEUE_PATH, docId).status).toBe('processing');
  });

  test('item processing com lease activo não é reclamável', async () => {
    const futureMs = Date.now() + LEASE_DURATION_MS;
    const docId = queueDocId('transfer_active', 'DISPATCHED');
    seedDoc(QUEUE_PATH, docId, mkQueueDoc({
      transferId: 'transfer_active',
      status: 'processing',
      leaseExpiry: mockTs(futureMs),
    }));
    const ref = mkRef(QUEUE_PATH, docId);

    const claimed = await claimQueueItem(ref, Date.now());
    expect(claimed).toBeNull();
  });

  test('item dentro da janela de backoff não é reclamável', async () => {
    const futureMs = Date.now() + 60_000;
    const docId = queueDocId('transfer_backoff', 'DISPATCHED');
    seedDoc(QUEUE_PATH, docId, mkQueueDoc({
      transferId: 'transfer_backoff',
      processAfter: mockTs(futureMs),
    }));
    const ref = mkRef(QUEUE_PATH, docId);

    const claimed = await claimQueueItem(ref, Date.now());
    expect(claimed).toBeNull();
  });
});

// ─── 8. Backoff ───────────────────────────────────────────────────────────────

describe('completeQueueItem — backoff exponencial', () => {
  test('após falha (retryCount 0 → 1) processAfter avança 2^1 * BACKOFF_BASE_MS', async () => {
    const docId = queueDocId('transfer_bk', 'DISPATCHED');
    seedDoc(QUEUE_PATH, docId, mkQueueDoc({ transferId: 'transfer_bk' }));
    seedDoc(TRANSFER_PATH, 'transfer_bk', mkTransfer());
    const ref = mkRef(QUEUE_PATH, docId);
    const nowMs = Date.now();

    await completeQueueItem(ref, { ok: false, error: 'timeout' }, mkQueueDoc({ transferId: 'transfer_bk', retryCount: 0 }));

    const updated = getDoc(QUEUE_PATH, docId);
    expect(updated.status).toBe('pending');
    expect(updated.retryCount).toBe(1);
    expect(updated.lastError).toBe('timeout');
    // processAfter deve ser >= nowMs + 2^1 * 60_000
    expect(updated.processAfter.toMillis()).toBeGreaterThanOrEqual(nowMs + 2 * BACKOFF_BASE_MS - 100);
  });

  test('após 3 falhas processAfter avança 2^4 * BACKOFF_BASE_MS', async () => {
    const nowMs = Date.now();
    const processAfter = nextProcessAfter(4, nowMs);
    expect(processAfter.toMillis()).toBeGreaterThanOrEqual(nowMs + 16 * BACKOFF_BASE_MS - 100);
  });
});

// ─── 9. Dead-letter ───────────────────────────────────────────────────────────

describe('completeQueueItem — dead-letter', () => {
  test(`após ${MAX_RETRIES} falhas: status=dead_letter + tool_alert criado`, async () => {
    const docId = queueDocId('transfer_dl', 'DISPATCHED');
    seedDoc(QUEUE_PATH, docId, mkQueueDoc({ transferId: 'transfer_dl', retryCount: MAX_RETRIES - 1 }));
    seedDoc(TRANSFER_PATH, 'transfer_dl', mkTransfer());
    const ref = mkRef(QUEUE_PATH, docId);

    await completeQueueItem(
      ref,
      { ok: false, error: 'connection refused' },
      mkQueueDoc({ transferId: 'transfer_dl', eventType: 'DISPATCHED', retryCount: MAX_RETRIES - 1 }),
    );

    const queueDoc = getDoc(QUEUE_PATH, docId);
    expect(queueDoc.status).toBe('dead_letter');
    expect(queueDoc.retryCount).toBe(MAX_RETRIES);

    // Alerta SAP_SYNC_FAILURE determinístico criado
    const alert = getDoc(ALERTS_PATH, `sap_transfer_${queueDocId('transfer_dl', 'DISPATCHED')}`);
    expect(alert).toBeDefined();
    expect(alert.anomalyType).toBe('SAP_SYNC_FAILURE');
    expect(alert.transferId).toBe('transfer_dl');
    expect(alert.eventType).toBe('DISPATCHED');
  });

  test('dead-letter não é re-reclamável', async () => {
    const docId = queueDocId('transfer_nodl', 'DISPATCHED');
    seedDoc(QUEUE_PATH, docId, mkQueueDoc({
      transferId: 'transfer_nodl',
      status: 'dead_letter',
    }));
    const ref = mkRef(QUEUE_PATH, docId);

    const claimed = await claimQueueItem(ref);
    expect(claimed).toBeNull();
  });
});

// ─── 10-11. Payload ───────────────────────────────────────────────────────────

describe('buildSapTransferPayload', () => {
  const transfer = mkTransfer();

  test('DISPATCHED — campos obrigatórios presentes e correctos', () => {
    const payload = buildSapTransferPayload('xfer_001', transfer, 'DISPATCHED');

    expect(payload.NotificationType).toBe('M2');
    expect(payload.PwaEventType).toBe('DISPATCHED');
    expect(payload.PwaIdempotencyKey).toBe('xfer_001:DISPATCHED');
    expect(payload.PwaTransferId).toBe('xfer_001');
    expect(payload.PwaTransferType).toBe('WAREHOUSE_TO_OBRA');
    expect(payload.PwaFromLocation).toBe('WAREHOUSE');
    expect(payload.PwaToLocation).toBe('obra_porto');
    expect(payload.PwaToolCount).toBe(2);
    expect(payload.PwaPickedCount).toBe(2);
    expect(payload.PwaReceivedCount).toBe(0);
    expect(payload.NotifLongText).toContain('Despachado por: operador_001');
    // Não contém campos de tool_sessions
    expect(payload).not.toHaveProperty('PwaSessionId');
    expect(payload).not.toHaveProperty('Equipment');
  });

  test('RECEIVED — receivedBy e missingToolIds reflectidos no texto', () => {
    const received = mkTransfer({
      status: 'RECEIVED',
      receivedToolIds: ['tool_a'],
      missingToolIds: ['tool_b'],
      receivedBy: 'operador_002',
    });
    const payload = buildSapTransferPayload('xfer_002', received, 'RECEIVED');

    expect(payload.PwaEventType).toBe('RECEIVED');
    expect(payload.PwaReceivedCount).toBe(1);
    expect(payload.NotifLongText).toContain('Recebido por: operador_002');
    expect(payload.NotifLongText).toContain('Em falta: 1');
  });

  test('M2 distingue de M1 (tool_sessions)', () => {
    const payload = buildSapTransferPayload('xfer_003', transfer, 'DISPATCHED');
    expect(payload.NotificationType).toBe('M2');
  });
});

describe('sendToSap — idempotência externa rastreável', () => {
  test('envia Idempotency-Key no header e no payload', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ MaintenanceNotification: 'SAP-42' }),
    });
    const payload = buildSapTransferPayload('xfer_live', mkTransfer(), 'DISPATCHED');

    const result = await sendToSap(payload, 'api-key', idempotencyKey('xfer_live', 'DISPATCHED'));

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'xfer_live:DISPATCHED' }),
    }));
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.PwaIdempotencyKey).toBe('xfer_live:DISPATCHED');
  });
});

// ─── 12. Eventos independentes ────────────────────────────────────────────────

describe('completeQueueItem — DISPATCHED e RECEIVED independentes', () => {
  test('sincronizar RECEIVED não sobrescreve estado DISPATCHED no transfer', async () => {
    // Pré-popular estado DISPATCHED já sincronizado
    seedDoc(TRANSFER_PATH, 'transfer_ind', {
      ...mkTransfer({ status: 'RECEIVED' }),
      externalSync: {
        sap: {
          DISPATCHED: { status: 'synced', sapNotificationId: 'SAP-100', retryCount: 0 },
        },
      },
    });

    const docId = queueDocId('transfer_ind', 'RECEIVED');
    seedDoc(QUEUE_PATH, docId, mkQueueDoc({ transferId: 'transfer_ind', eventType: 'RECEIVED' }));
    const ref = mkRef(QUEUE_PATH, docId);

    await completeQueueItem(
      ref,
      { ok: true, mode: 'mock', sapNotificationId: 'SAP-200' },
      mkQueueDoc({ transferId: 'transfer_ind', eventType: 'RECEIVED', retryCount: 0 }),
    );

    const transferDoc = getDoc(TRANSFER_PATH, 'transfer_ind');
    // DISPATCHED intacto
    expect(transferDoc.externalSync.sap.DISPATCHED.status).toBe('synced');
    expect(transferDoc.externalSync.sap.DISPATCHED.sapNotificationId).toBe('SAP-100');
    // RECEIVED actualizado
    expect(transferDoc.externalSync.sap.RECEIVED.status).toBe('mocked');
    expect(transferDoc.externalSync.sap.RECEIVED.sapNotificationId).toBe('SAP-200');
  });
});
