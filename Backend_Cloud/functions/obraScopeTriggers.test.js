'use strict';

// ─── Minimal Firebase Admin mock ──────────────────────────────────────────────

const mockUpdates = [];

const mockAdmin = {
  firestore: Object.assign(
    () => ({}),
    {
      FieldValue: {
        serverTimestamp: () => ({ __serverTs: true }),
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

const { buildObraScopeIds, scopeIsUpToDate, SCOPE_VERSION } = require('./obraScope');
const { onToolMovementWritten, onToolTransferScopeSync } = require('./obraScopeTriggers');

// ─── Event factory ────────────────────────────────────────────────────────────

function mkMovementEvent(data, params = {}) {
  const updates = [];
  return {
    params: { movementId: 'move_001', ...params },
    data: {
      after: {
        exists: data !== null,
        data: () => data,
        ref: {
          update: async (payload) => { updates.push(payload); },
        },
      },
    },
    _updates: updates,
  };
}

function mkTransferEvent(data, params = {}) {
  const updates = [];
  return {
    params: { transferId: 'xfer_001', ...params },
    data: {
      after: {
        exists: data !== null,
        data: () => data,
        ref: {
          update: async (payload) => { updates.push(payload); },
        },
      },
    },
    _updates: updates,
  };
}

beforeEach(() => {
  mockUpdates.length = 0;
});

// ─── buildObraScopeIds — helper puro ─────────────────────────────────────────

describe('buildObraScopeIds', () => {
  test('filters null', () => {
    expect(buildObraScopeIds({ fromObraId: null, toObraId: 'obra-1' })).toEqual(['obra-1']);
  });

  test('filters undefined', () => {
    expect(buildObraScopeIds({ fromObraId: undefined, toObraId: 'obra-1' })).toEqual(['obra-1']);
  });

  test('filters empty string', () => {
    expect(buildObraScopeIds({ fromObraId: '', toObraId: 'obra-1' })).toEqual(['obra-1']);
  });

  test('filters WAREHOUSE string', () => {
    expect(buildObraScopeIds({ fromObraId: 'WAREHOUSE', toObraId: 'obra-1' })).toEqual(['obra-1']);
  });

  test('deduplicates when both sides are same obra', () => {
    expect(buildObraScopeIds({ fromObraId: 'obra-1', toObraId: 'obra-1' })).toEqual(['obra-1']);
  });

  test('returns sorted array', () => {
    expect(buildObraScopeIds({ fromObraId: 'obra-z', toObraId: 'obra-a' })).toEqual(['obra-a', 'obra-z']);
  });

  test('movement: warehouse → obra', () => {
    expect(buildObraScopeIds({ fromObraId: 'WAREHOUSE', toObraId: 'obra-porto' }))
      .toEqual(['obra-porto']);
  });

  test('movement: obra → warehouse', () => {
    expect(buildObraScopeIds({ fromObraId: 'obra-porto', toObraId: 'WAREHOUSE' }))
      .toEqual(['obra-porto']);
  });

  test('movement: obra → obra', () => {
    expect(buildObraScopeIds({ fromObraId: 'obra-porto', toObraId: 'obra-lisboa' }))
      .toEqual(['obra-lisboa', 'obra-porto']);
  });

  test('transfer: warehouse → obra (from.obraId null)', () => {
    expect(buildObraScopeIds({ from: { kind: 'WAREHOUSE', obraId: null }, to: { kind: 'OBRA', obraId: 'obra-porto' } }))
      .toEqual(['obra-porto']);
  });

  test('transfer: obra → warehouse (to.obraId null)', () => {
    expect(buildObraScopeIds({ from: { kind: 'OBRA', obraId: 'obra-porto' }, to: { kind: 'WAREHOUSE', obraId: null } }))
      .toEqual(['obra-porto']);
  });

  test('transfer: obra → obra', () => {
    expect(buildObraScopeIds({ from: { kind: 'OBRA', obraId: 'obra-a' }, to: { kind: 'OBRA', obraId: 'obra-b' } }))
      .toEqual(['obra-a', 'obra-b']);
  });

  test('null docData returns empty array', () => {
    expect(buildObraScopeIds(null)).toEqual([]);
  });

  test('warehouse → warehouse returns empty array', () => {
    expect(buildObraScopeIds({ fromObraId: 'WAREHOUSE', toObraId: 'WAREHOUSE' })).toEqual([]);
  });
});

// ─── scopeIsUpToDate ──────────────────────────────────────────────────────────

describe('scopeIsUpToDate', () => {
  test('true when obraScopeIds and scopeVersion match', () => {
    const data = { obraScopeIds: ['obra-a', 'obra-b'], scopeVersion: SCOPE_VERSION };
    expect(scopeIsUpToDate(data, ['obra-a', 'obra-b'])).toBe(true);
  });

  test('false when obraScopeIds differ', () => {
    const data = { obraScopeIds: ['obra-a'], scopeVersion: SCOPE_VERSION };
    expect(scopeIsUpToDate(data, ['obra-a', 'obra-b'])).toBe(false);
  });

  test('false when scopeVersion is missing', () => {
    const data = { obraScopeIds: ['obra-a'] };
    expect(scopeIsUpToDate(data, ['obra-a'])).toBe(false);
  });

  test('false when obraScopeIds absent', () => {
    const data = { scopeVersion: SCOPE_VERSION };
    expect(scopeIsUpToDate(data, ['obra-a'])).toBe(false);
  });

  test('false when null docData', () => {
    expect(scopeIsUpToDate(null, ['obra-a'])).toBe(false);
  });
});

// ─── onToolMovementWritten ────────────────────────────────────────────────────

describe('onToolMovementWritten', () => {
  test('writes obraScopeIds when field is missing', async () => {
    const event = mkMovementEvent({ fromObraId: 'obra-porto', toObraId: 'WAREHOUSE' });
    await onToolMovementWritten(event);

    expect(event._updates).toHaveLength(1);
    expect(event._updates[0].obraScopeIds).toEqual(['obra-porto']);
    expect(event._updates[0].scopeVersion).toBe(SCOPE_VERSION);
    expect(event._updates[0].scopeUpdatedAt).toEqual({ __serverTs: true });
  });

  test('no-op when scope is already correct', async () => {
    const event = mkMovementEvent({
      fromObraId: 'obra-porto',
      toObraId: 'WAREHOUSE',
      obraScopeIds: ['obra-porto'],
      scopeVersion: SCOPE_VERSION,
    });
    await onToolMovementWritten(event);

    expect(event._updates).toHaveLength(0);
  });

  test('corrects wrong obraScopeIds', async () => {
    const event = mkMovementEvent({
      fromObraId: 'obra-porto',
      toObraId: 'obra-lisboa',
      obraScopeIds: ['obra-porto'],   // missing obra-lisboa
      scopeVersion: SCOPE_VERSION,
    });
    await onToolMovementWritten(event);

    expect(event._updates).toHaveLength(1);
    expect(event._updates[0].obraScopeIds).toEqual(['obra-lisboa', 'obra-porto']);
  });

  test('skips on delete (afterSnap.exists false)', async () => {
    const event = mkMovementEvent(null);
    event.data.after.exists = false;
    await onToolMovementWritten(event);

    expect(event._updates).toHaveLength(0);
  });

  test('writes empty array for warehouse → warehouse', async () => {
    const event = mkMovementEvent({ fromObraId: 'WAREHOUSE', toObraId: 'WAREHOUSE' });
    await onToolMovementWritten(event);

    expect(event._updates[0].obraScopeIds).toEqual([]);
  });
});

// ─── onToolTransferScopeSync ──────────────────────────────────────────────────

describe('onToolTransferScopeSync', () => {
  test('writes obraScopeIds for warehouse → obra transfer', async () => {
    const event = mkTransferEvent({
      from: { kind: 'WAREHOUSE', obraId: null },
      to: { kind: 'OBRA', obraId: 'obra-porto' },
    });
    await onToolTransferScopeSync(event);

    expect(event._updates).toHaveLength(1);
    expect(event._updates[0].obraScopeIds).toEqual(['obra-porto']);
  });

  test('no-op when scope already correct', async () => {
    const event = mkTransferEvent({
      from: { kind: 'WAREHOUSE', obraId: null },
      to: { kind: 'OBRA', obraId: 'obra-porto' },
      obraScopeIds: ['obra-porto'],
      scopeVersion: SCOPE_VERSION,
    });
    await onToolTransferScopeSync(event);

    expect(event._updates).toHaveLength(0);
  });

  test('corrects wrong scope on transfer update', async () => {
    const event = mkTransferEvent({
      from: { kind: 'OBRA', obraId: 'obra-a' },
      to: { kind: 'OBRA', obraId: 'obra-b' },
      obraScopeIds: ['obra-x'],   // stale
      scopeVersion: SCOPE_VERSION,
    });
    await onToolTransferScopeSync(event);

    expect(event._updates[0].obraScopeIds).toEqual(['obra-a', 'obra-b']);
  });

  test('skips on delete', async () => {
    const event = mkTransferEvent(null);
    event.data.after.exists = false;
    await onToolTransferScopeSync(event);

    expect(event._updates).toHaveLength(0);
  });
});

// ─── SAP trigger isolation ────────────────────────────────────────────────────

describe('SAP trigger isolation', () => {
  test('obraScopeTriggers does not require sapTransferBridge or enqueueTransfer', () => {
    // Confirm the module graph stays separate — scope triggers must not depend on SAP logic
    const src = require('fs').readFileSync(
      require('path').join(__dirname, 'obraScopeTriggers.js'),
      'utf8'
    );
    expect(src).not.toMatch(/require\s*\(\s*['"].*sapTransferBridge/);
    expect(src).not.toMatch(/require\s*\(\s*['"].*enqueueTransfer/);
  });
});
