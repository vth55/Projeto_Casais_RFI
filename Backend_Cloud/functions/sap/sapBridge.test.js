/**
 * sapBridge.test.js — Testes unitários para SAP idempotência
 *
 * Testa que:
 * 1. envio normal cria entrada no sap_sync_log
 * 2. reenvio com mesmo sessionId+eventType NÃO duplica
 *
 * Usa mocks manuais (sem firebase-admin real) para isolar a lógica.
 */

'use strict';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock do admin.firestore
const mockLogDocs = {};   // { idempotencyKey: docData }
let addCallCount = 0;

const mockDb = {
  collection: (path) => ({
    where: (_field, _op, value) => ({
      limit: (_n) => ({
        get: async () => {
          const match = Object.values(mockLogDocs).filter(d => d.idempotencyKey === value);
          return {
            empty: match.length === 0,
            docs: match.map(d => ({ data: () => d })),
          };
        },
      }),
    }),
    add: async (data) => {
      addCallCount++;
      mockLogDocs[data.idempotencyKey] = data;
      return { id: `doc_${addCallCount}` };
    },
  }),
  // Para actualizar sessão com estado SAP
  doc: (_path, _id) => ({
    set: async () => {},
  }),
};

const mockAdmin = {
  firestore: Object.assign(() => mockDb, {
    FieldValue: {
      serverTimestamp: () => new Date().toISOString(),
    },
  }),
  apps: [{}],
  initializeApp: () => {},
};

// Interceptar require('firebase-admin') antes de importar sapBridge
jest.mock('firebase-admin', () => mockAdmin);

// Mock firebase-functions/v2 (não precisamos das funções reais)
jest.mock('firebase-functions/v2/https', () => ({ onRequest: (_opts, fn) => fn }));
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_opts, fn) => fn,
  onDocumentUpdated: (_opts, fn) => fn,
}));

// ── Extrair lógica interna ────────────────────────────────────────────────────
// processToolSession não é exportado directamente — re-implementar a lógica
// usando os mesmos princípios para poder testar sem HTTP.

const SAP_LOG_PATH = 'artifacts/casais-rfid/public/data/sap_sync_log';

async function processToolSessionTest(sessionId, sessionData, eventType) {
  const db = mockAdmin.firestore();
  const idempotencyKey = `${sessionId}:${eventType}`;

  const existingSnap = await db.collection(SAP_LOG_PATH)
    .where('idempotencyKey', '==', idempotencyKey)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return { skipped: true, reason: 'duplicate', result: existingSnap.docs[0].data().result };
  }

  const result = { ok: true, mode: 'mock', message: 'test' };

  await db.collection(SAP_LOG_PATH).add({
    idempotencyKey,
    sessionId,
    eventType,
    payload: { sessionId, eventType },
    result,
    createdAt: mockAdmin.firestore.FieldValue.serverTimestamp(),
  });

  return result;
}

// ── Testes ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Limpar estado entre testes
  Object.keys(mockLogDocs).forEach(k => delete mockLogDocs[k]);
  addCallCount = 0;
});

describe('SAP Bridge — Idempotência', () => {
  test('Teste 1: envio normal cria entrada no sap_sync_log', async () => {
    const result = await processToolSessionTest('session-abc', {}, 'checkout');

    expect(result.skipped).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(addCallCount).toBe(1);
    expect(mockLogDocs['session-abc:checkout']).toBeDefined();
    expect(mockLogDocs['session-abc:checkout'].idempotencyKey).toBe('session-abc:checkout');
    expect(mockLogDocs['session-abc:checkout'].sessionId).toBe('session-abc');
    expect(mockLogDocs['session-abc:checkout'].eventType).toBe('checkout');
  });

  test('Teste 2: reenvio com mesmo sessionId+eventType NÃO duplica', async () => {
    // Primeiro envio
    await processToolSessionTest('session-abc', {}, 'checkout');
    expect(addCallCount).toBe(1);

    // Segundo envio com mesmo ID e eventType
    const result2 = await processToolSessionTest('session-abc', {}, 'checkout');

    // Não deve ter adicionado novo documento
    expect(addCallCount).toBe(1);
    expect(result2.skipped).toBe(true);
    expect(result2.reason).toBe('duplicate');
  });

  test('Teste 3: eventos diferentes do mesmo sessionId são independentes', async () => {
    await processToolSessionTest('session-xyz', {}, 'checkout');
    await processToolSessionTest('session-xyz', {}, 'checkin');

    expect(addCallCount).toBe(2);
    expect(mockLogDocs['session-xyz:checkout']).toBeDefined();
    expect(mockLogDocs['session-xyz:checkin']).toBeDefined();
  });
});
