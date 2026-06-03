'use strict';
/**
 * Tests for linkUserToOperator / unlinkUserFromOperator store actions.
 *
 * Strategy: mock firebase/firestore + config/firebase so the store imports cleanly,
 * seed operators + userProfiles via set(), then call the actions directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock firebase/firestore ───────────────────────────────────────────────
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockWriteBatch = vi.fn(() => ({
  update: mockBatchUpdate,
  commit: mockBatchCommit,
}));
const mockDoc = vi.fn((_, path, id) => ({ _path: `${path}/${id}` }));

vi.mock('firebase/firestore', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    writeBatch: mockWriteBatch,
    doc: mockDoc,
    collection: vi.fn(),
    onSnapshot: vi.fn(() => vi.fn()),
    query: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    updateDoc: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    Timestamp: { now: () => ({ seconds: 0, nanoseconds: 0 }) },
    increment: vi.fn(),
    arrayUnion: vi.fn(),
  };
});

vi.mock('../config/firebase', () => ({
  db: {},
  storage: {},
  projectId: 'casais-rfid',
  auth: {},
}));

// Mock listeners utilities (not under test here)
vi.mock('../utils/firestoreListeners', () => ({
  createCollectionListener: () => () => () => {},
  createDocumentListener: () => () => () => {},
}));

vi.mock('../utils/firestoreCrud', () => ({
  createCrudActions: () => ({
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('../store/legacy/machinesStore', () => ({
  default: { getState: () => ({}) },
}));

// ─── Import store AFTER mocks ──────────────────────────────────────────────
const { default: useStore } = await import('../store/useStore');

// ─── Seed helpers ──────────────────────────────────────────────────────────

function seed({ operators = [], userProfiles = [] } = {}) {
  useStore.setState({ operators, userProfiles });
  mockBatchUpdate.mockClear();
  mockBatchCommit.mockClear();
  mockWriteBatch.mockClear();
}

// ─── linkUserToOperator ────────────────────────────────────────────────────

describe('linkUserToOperator', () => {
  beforeEach(() => {
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('writes both sides in a batch when no conflicts', async () => {
    seed({
      operators: [{ id: 'op-1', name: 'Alice', email: 'alice@casais.pt' }],
      userProfiles: [{ id: 'uid-1', name: 'Alice Auth', email: 'alice@casais.pt' }],
    });

    const result = await useStore.getState().linkUserToOperator('uid-1', 'op-1');

    expect(result.success).toBe(true);
    expect(mockWriteBatch).toHaveBeenCalledOnce();
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledOnce();
  });

  it('is idempotent when both sides already match', async () => {
    seed({
      operators: [{ id: 'op-1', userId: 'uid-1' }],
      userProfiles: [{ id: 'uid-1', operatorId: 'op-1' }],
    });

    const result = await useStore.getState().linkUserToOperator('uid-1', 'op-1');

    expect(result.success).toBe(true);
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it('blocks when operator is already linked to a DIFFERENT user', async () => {
    seed({
      operators: [{ id: 'op-1', userId: 'uid-OTHER' }],
      userProfiles: [{ id: 'uid-1' }],
    });

    const result = await useStore.getState().linkUserToOperator('uid-1', 'op-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/uid-OTHER/);
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it('blocks when user is already linked to a DIFFERENT operator', async () => {
    seed({
      operators: [{ id: 'op-1' }],
      userProfiles: [{ id: 'uid-1', operatorId: 'op-OTHER' }],
    });

    const result = await useStore.getState().linkUserToOperator('uid-1', 'op-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/op-OTHER/);
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it('returns error if operator not found', async () => {
    seed({ operators: [], userProfiles: [{ id: 'uid-1' }] });
    const result = await useStore.getState().linkUserToOperator('uid-1', 'op-missing');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Operador/);
  });

  it('returns error if user not found', async () => {
    seed({ operators: [{ id: 'op-1' }], userProfiles: [] });
    const result = await useStore.getState().linkUserToOperator('uid-missing', 'op-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Utilizador/);
  });

  it('returns error if either arg is falsy', async () => {
    seed({ operators: [], userProfiles: [] });
    const r1 = await useStore.getState().linkUserToOperator(null, 'op-1');
    const r2 = await useStore.getState().linkUserToOperator('uid-1', null);
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  it('propagates Firestore error as { success: false }', async () => {
    seed({
      operators: [{ id: 'op-1' }],
      userProfiles: [{ id: 'uid-1' }],
    });
    mockBatchCommit.mockRejectedValueOnce(new Error('permission-denied'));
    const result = await useStore.getState().linkUserToOperator('uid-1', 'op-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('permission-denied');
  });
});

// ─── unlinkUserFromOperator ────────────────────────────────────────────────

describe('unlinkUserFromOperator', () => {
  beforeEach(() => {
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('clears both sides with null in a batch', async () => {
    seed({
      operators: [{ id: 'op-1', userId: 'uid-1' }],
      userProfiles: [{ id: 'uid-1', operatorId: 'op-1' }],
    });

    const result = await useStore.getState().unlinkUserFromOperator('uid-1', 'op-1');

    expect(result.success).toBe(true);
    expect(mockWriteBatch).toHaveBeenCalledOnce();
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    const calls = mockBatchUpdate.mock.calls;
    expect(calls.some(([, patch]) => patch.operatorId === null)).toBe(true);
    expect(calls.some(([, patch]) => patch.userId === null)).toBe(true);
    expect(mockBatchCommit).toHaveBeenCalledOnce();
  });

  it('returns error if either arg is falsy', async () => {
    seed({ operators: [], userProfiles: [] });
    const r1 = await useStore.getState().unlinkUserFromOperator(null, 'op-1');
    const r2 = await useStore.getState().unlinkUserFromOperator('uid-1', '');
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  it('blocks stale unlink when both sides no longer match', async () => {
    seed({
      operators: [{ id: 'op-1', userId: 'uid-OTHER' }],
      userProfiles: [{ id: 'uid-1', operatorId: 'op-1' }],
    });

    const result = await useStore.getState().unlinkUserFromOperator('uid-1', 'op-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/inconsistente/);
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it('propagates Firestore error as { success: false }', async () => {
    seed({
      operators: [{ id: 'op-1', userId: 'uid-1' }],
      userProfiles: [{ id: 'uid-1', operatorId: 'op-1' }],
    });
    mockBatchCommit.mockRejectedValueOnce(new Error('quota-exceeded'));
    const result = await useStore.getState().unlinkUserFromOperator('uid-1', 'op-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('quota-exceeded');
  });
});
