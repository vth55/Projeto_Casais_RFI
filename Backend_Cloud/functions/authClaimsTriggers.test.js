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

beforeEach(() => {
  mockCustomClaims = { existing: true };
  mockSetCustomUserClaims.mockClear();
});

describe('Auth systemRole claims', () => {
  test('normalizes unknown roles to operator', () => {
    expect(__test.normalizeSystemRole('admin')).toBe('admin');
    expect(__test.normalizeSystemRole('typo-role')).toBe('operador');
  });

  test('sync preserves unrelated custom claims', async () => {
    await __test.setSystemRoleClaim('uid-1', 'tecnico_manutencao');

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('uid-1', {
      existing: true,
      systemRole: 'tecnico_manutencao',
    });
  });

  test('sync skips Firebase Auth write when claim is already current', async () => {
    mockCustomClaims = { existing: true, systemRole: 'admin' };

    await __test.setSystemRoleClaim('uid-1', 'admin');

    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });
});
