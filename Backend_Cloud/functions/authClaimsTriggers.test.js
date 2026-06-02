'use strict';

let mockCustomClaims = { existing: true };
const mockSetCustomUserClaims = jest.fn(async (_uid, claims) => {
  mockCustomClaims = claims;
});

jest.mock('firebase-admin', () => ({
  auth: () => ({
    getUser: async () => ({ customClaims: mockCustomClaims }),
    setCustomUserClaims: mockSetCustomUserClaims,
  }),
}));
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentWritten: (_path, handler) => handler,
}));

const { __test } = require('./authClaimsTriggers');
const { buildAuthClaims, claimsAreUpToDate } = require('./authClaimsPolicy');

beforeEach(() => {
  mockCustomClaims = { existing: true };
  mockSetCustomUserClaims.mockClear();
});

// ---------------------------------------------------------------------------
// authClaimsPolicy — buildAuthClaims
// ---------------------------------------------------------------------------

describe('buildAuthClaims', () => {
  test('operador → restrictedToOwnObra: true', () => {
    const result = buildAuthClaims({ systemRole: 'operador' }, {});
    expect(result.restrictedToOwnObra).toBe(true);
  });

  test('encarregado_obra → restrictedToOwnObra: true', () => {
    const result = buildAuthClaims({ systemRole: 'encarregado_obra' }, {});
    expect(result.restrictedToOwnObra).toBe(true);
  });

  test('logistica → restrictedToOwnObra: false', () => {
    const result = buildAuthClaims({ systemRole: 'logistica' }, {});
    expect(result.restrictedToOwnObra).toBe(false);
  });

  test('tecnico_manutencao → restrictedToOwnObra: false', () => {
    const result = buildAuthClaims({ systemRole: 'tecnico_manutencao' }, {});
    expect(result.restrictedToOwnObra).toBe(false);
  });

  test('gestor_frota → restrictedToOwnObra: false', () => {
    const result = buildAuthClaims({ systemRole: 'gestor_frota' }, {});
    expect(result.restrictedToOwnObra).toBe(false);
  });

  test('assignedObraId null → field absent from claims', () => {
    const result = buildAuthClaims({ systemRole: 'operador', assignedObraId: null }, {});
    expect(result).not.toHaveProperty('assignedObraId');
  });

  test('assignedObraId set → field present in claims', () => {
    const result = buildAuthClaims({ systemRole: 'operador', assignedObraId: 'obra-123' }, {});
    expect(result.assignedObraId).toBe('obra-123');
  });

  test('preserves unrelated existing claims', () => {
    const result = buildAuthClaims({ systemRole: 'admin' }, { unrelated: 'keep-me' });
    expect(result.unrelated).toBe('keep-me');
    expect(result.systemRole).toBe('admin');
  });

  test('unknown role normalizes to operador', () => {
    const result = buildAuthClaims({ systemRole: 'totally-unknown' }, {});
    expect(result.systemRole).toBe('operador');
    expect(result.restrictedToOwnObra).toBe(true);
  });

  test('null profile removes all three managed claims', () => {
    const result = buildAuthClaims(null, { systemRole: 'admin', assignedObraId: 'obra-1', restrictedToOwnObra: false, other: 'stays' });
    expect(result).not.toHaveProperty('systemRole');
    expect(result).not.toHaveProperty('assignedObraId');
    expect(result).not.toHaveProperty('restrictedToOwnObra');
    expect(result.other).toBe('stays');
  });
});

// ---------------------------------------------------------------------------
// authClaimsPolicy — claimsAreUpToDate
// ---------------------------------------------------------------------------

describe('claimsAreUpToDate', () => {
  test('returns true when all three managed fields already match', () => {
    const profile = { systemRole: 'operador', assignedObraId: 'obra-1' };
    const current = { systemRole: 'operador', assignedObraId: 'obra-1', restrictedToOwnObra: true };
    expect(claimsAreUpToDate(profile, current)).toBe(true);
  });

  test('returns false when systemRole differs', () => {
    const profile = { systemRole: 'gestor_frota' };
    const current = { systemRole: 'operador', restrictedToOwnObra: true };
    expect(claimsAreUpToDate(profile, current)).toBe(false);
  });

  test('returns false when assignedObraId differs', () => {
    const profile = { systemRole: 'encarregado_obra', assignedObraId: 'obra-new' };
    const current = { systemRole: 'encarregado_obra', assignedObraId: 'obra-old', restrictedToOwnObra: true };
    expect(claimsAreUpToDate(profile, current)).toBe(false);
  });

  test('returns false when restrictedToOwnObra differs', () => {
    const profile = { systemRole: 'operador' };
    // current incorrectly has restricted=false
    const current = { systemRole: 'operador', restrictedToOwnObra: false };
    expect(claimsAreUpToDate(profile, current)).toBe(false);
  });

  test('returns false when claims have no managed fields yet (fresh user)', () => {
    const profile = { systemRole: 'gestor_frota' };
    const current = {};
    expect(claimsAreUpToDate(profile, current)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// authClaimsTriggers — syncAuthClaims integration
// ---------------------------------------------------------------------------

describe('syncAuthClaims', () => {
  test('writes all three managed claims when starting from empty claims', async () => {
    mockCustomClaims = {};
    await __test.syncAuthClaims('uid-1', { systemRole: 'encarregado_obra', assignedObraId: 'obra-42' });

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('uid-1', {
      systemRole: 'encarregado_obra',
      assignedObraId: 'obra-42',
      restrictedToOwnObra: true,
    });
  });

  test('preserves unrelated custom claims on update', async () => {
    mockCustomClaims = { existing: true };
    await __test.syncAuthClaims('uid-2', { systemRole: 'tecnico_manutencao' });

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('uid-2', {
      existing: true,
      systemRole: 'tecnico_manutencao',
      restrictedToOwnObra: false,
    });
  });

  test('skips Firebase Auth write when all three claims are already current', async () => {
    mockCustomClaims = {
      existing: true,
      systemRole: 'operador',
      restrictedToOwnObra: true,
    };
    await __test.syncAuthClaims('uid-3', { systemRole: 'operador', assignedObraId: null });

    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });

  test('writes when only assignedObraId changed', async () => {
    mockCustomClaims = {
      systemRole: 'encarregado_obra',
      assignedObraId: 'obra-old',
      restrictedToOwnObra: true,
    };
    await __test.syncAuthClaims('uid-4', { systemRole: 'encarregado_obra', assignedObraId: 'obra-new' });

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('uid-4', {
      systemRole: 'encarregado_obra',
      assignedObraId: 'obra-new',
      restrictedToOwnObra: true,
    });
  });

  test('removes managed claims when profile is deleted (null)', async () => {
    mockCustomClaims = {
      existing: true,
      systemRole: 'admin',
      restrictedToOwnObra: false,
    };
    await __test.syncAuthClaims('uid-5', null);

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('uid-5', {
      existing: true,
    });
  });
});
