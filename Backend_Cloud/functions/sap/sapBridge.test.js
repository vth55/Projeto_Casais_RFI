/**
 * sapBridge.test.js - testes da implementação real de idempotência SAP.
 */

'use strict';

const mockLogDocs = {};
const mockSessionUpdates = [];
let logWriteCount = 0;
let transactionQueue = Promise.resolve();

const timestamp = (value = Date.now()) => ({
  toMillis: () => value,
});

function resolveFieldValue(current, value) {
  if (value?.__increment) return (current || 0) + value.__increment;
  return value;
}

function snapshot(data) {
  return {
    exists: !!data,
    data: () => data,
  };
}

function logRef(id) {
  return {
    id,
    get: async () => snapshot(mockLogDocs[id]),
    set: async (data, options = {}) => {
      logWriteCount++;
      const previous = options.merge ? (mockLogDocs[id] || {}) : {};
      mockLogDocs[id] = Object.fromEntries(
        Object.entries({ ...previous, ...data })
          .map(([key, value]) => [key, resolveFieldValue(previous[key], value)]),
      );
    },
  };
}

const mockDb = {
  collection: (path) => ({
    doc: (id) => path.endsWith('/sap_sync_log')
      ? logRef(id)
      : {
          get: async () => snapshot(null),
          set: async (data) => mockSessionUpdates.push({ path, id, data }),
        },
  }),
  runTransaction: (callback) => {
    const run = transactionQueue.then(() => callback({
      get: (ref) => ref.get(),
      set: (ref, data, options) => ref.set(data, options),
    }));
    transactionQueue = run.catch(() => {});
    return run;
  },
};

const mockAdmin = {
  firestore: Object.assign(() => mockDb, {
    FieldValue: {
      increment: (value) => ({ __increment: value }),
      serverTimestamp: () => timestamp(),
    },
  }),
  auth: () => ({ verifyIdToken: jest.fn() }),
  apps: [{}],
  initializeApp: () => {},
};

jest.mock('firebase-admin', () => mockAdmin);
jest.mock('firebase-functions/v2/https', () => ({ onRequest: (_opts, fn) => fn }));
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_opts, fn) => fn,
  onDocumentUpdated: (_opts, fn) => fn,
}));
jest.mock('../sapBtp/sapBtpBridge', () => ({
  syncToolLocationToSapBtp: jest.fn().mockResolvedValue({ skipped: true, reason: 'SAP_BTP_DISABLED' }),
}));

const { __test } = require('./sapBridge');
const { syncToolLocationToSapBtp } = require('../sapBtp/sapBtpBridge');

beforeEach(() => {
  Object.keys(mockLogDocs).forEach(key => delete mockLogDocs[key]);
  mockSessionUpdates.length = 0;
  logWriteCount = 0;
  transactionQueue = Promise.resolve();
});

describe('SAP Bridge - idempotência real', () => {
  test('envio normal reserva e conclui um único registo', async () => {
    const result = await __test.processToolSession('session-abc', {}, 'checkout', null);
    const log = mockLogDocs['session-abc__checkout'];

    expect(result.ok).toBe(true);
    expect(log.idempotencyKey).toBe('session-abc:checkout');
    expect(log.status).toBe('SYNCED');
    expect(log.attemptCount).toBe(1);
    expect(mockSessionUpdates).toHaveLength(1);
  });

  test('reenvio concluído não duplica nem atualiza novamente a sessão', async () => {
    await __test.processToolSession('session-abc', {}, 'checkout', null);
    const writesAfterFirstSend = logWriteCount;

    const repeated = await __test.processToolSession('session-abc', {}, 'checkout', null);

    expect(repeated.ok).toBe(true);
    expect(logWriteCount).toBe(writesAfterFirstSend);
    expect(mockSessionUpdates).toHaveLength(1);
  });

  test('duas chamadas concorrentes reservam apenas um envio', async () => {
    const results = await Promise.all([
      __test.processToolSession('session-race', {}, 'checkout', null),
      __test.processToolSession('session-race', {}, 'checkout', null),
    ]);

    expect(mockLogDocs['session-race__checkout'].attemptCount).toBe(1);
    expect(mockSessionUpdates).toHaveLength(1);
    expect(results.filter(result => result.mode === 'mock')).toHaveLength(1);
    expect(results.filter(result => result.skipped)).toHaveLength(1);
  });

  test('checkout e checkin da mesma sessão são operações independentes', async () => {
    await __test.processToolSession('session-xyz', {}, 'checkout', null);
    await __test.processToolSession('session-xyz', {}, 'checkin', null);

    expect(mockLogDocs['session-xyz__checkout'].status).toBe('SYNCED');
    expect(mockLogDocs['session-xyz__checkin'].status).toBe('SYNCED');
    expect(mockSessionUpdates).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────
// SAP BTP integration — fire-and-forget em processToolSession
// ─────────────────────────────────────────────────

describe('SAP BTP integration em processToolSession', () => {
  beforeEach(() => {
    syncToolLocationToSapBtp.mockClear();
    syncToolLocationToSapBtp.mockResolvedValue({ skipped: true, reason: 'SAP_BTP_DISABLED' });
  });

  test('processToolSession chama syncToolLocationToSapBtp com dados da sessão', async () => {
    const sessionData = { toolCode: 'MART-002', operatorName: 'João Silva', obraName: 'Torre Boavista' };
    await __test.processToolSession('session-btp-1', sessionData, 'checkout', null);
    expect(syncToolLocationToSapBtp).toHaveBeenCalledTimes(1);
    expect(syncToolLocationToSapBtp).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: { code: 'MART-002' },
        operator: { name: 'João Silva' },
        eventType: 'checkout',
      })
    );
  });

  test('usa toolId como fallback quando toolCode ausente', async () => {
    await __test.processToolSession('session-btp-2', { toolId: 'tool-doc-id' }, 'checkin', null);
    expect(syncToolLocationToSapBtp).toHaveBeenCalledWith(
      expect.objectContaining({ tool: { code: 'tool-doc-id' } })
    );
  });

  test('sapDestination tem prioridade sobre obraName para location.name', async () => {
    const sessionData = { toolCode: 'MART-002', sapDestination: 'Piso 5', obraName: 'Torre Boavista' };
    await __test.processToolSession('session-btp-3', sessionData, 'checkout', null);
    expect(syncToolLocationToSapBtp).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({ name: 'Piso 5' }),
      })
    );
  });

  test('eventType checkout passa checkout para bridge', async () => {
    await __test.processToolSession('session-btp-4', { toolCode: 'MART-002' }, 'checkout', null);
    expect(syncToolLocationToSapBtp).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'checkout' })
    );
  });

  test('eventType checkin passa checkin para bridge', async () => {
    await __test.processToolSession('session-btp-5', { toolCode: 'MART-002' }, 'checkin', null);
    expect(syncToolLocationToSapBtp).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'checkin' })
    );
  });

  test('bridge throw não quebra processToolSession', async () => {
    syncToolLocationToSapBtp.mockRejectedValue(new Error('BTP timeout'));
    const result = await __test.processToolSession('session-btp-6', { toolCode: 'MART-002' }, 'checkout', null);
    expect(result.ok).toBe(true);
    // Flush .catch() microtask
    await new Promise(r => setTimeout(r, 10));
  });

  test('flag off (bridge retorna skipped) não quebra processToolSession', async () => {
    syncToolLocationToSapBtp.mockResolvedValue({ skipped: true, reason: 'SAP_BTP_DISABLED' });
    const result = await __test.processToolSession('session-btp-7', { toolCode: 'MART-002' }, 'checkout', null);
    expect(result.ok).toBe(true);
    expect(syncToolLocationToSapBtp).toHaveBeenCalledTimes(1);
  });
});
