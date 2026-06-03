'use strict';

const {
  buildUserOperatorLinkPatch,
  isUserOperatorLinkCurrent,
  computeLinkProposals,
  normaliseEmail,
} = require('./userOperatorLink');

// ─── normaliseEmail ───────────────────────────────────────────────────────────

describe('normaliseEmail', () => {
  test('lowercases', () => expect(normaliseEmail('User@DOMAIN.com')).toBe('user@domain.com'));
  test('trims whitespace', () => expect(normaliseEmail('  user@domain.com  ')).toBe('user@domain.com'));
  test('returns null for non-string', () => expect(normaliseEmail(null)).toBeNull());
  test('returns null for undefined', () => expect(normaliseEmail(undefined)).toBeNull());
  test('returns null for empty string after trim', () => expect(normaliseEmail('   ')).toBeNull());
});

// ─── buildUserOperatorLinkPatch ───────────────────────────────────────────────

describe('buildUserOperatorLinkPatch', () => {
  test('returns correct patches for both sides', () => {
    const result = buildUserOperatorLinkPatch({ id: 'uid-abc' }, { id: 'op-123' });
    expect(result.userPatch).toEqual({ operatorId: 'op-123' });
    expect(result.operatorPatch).toEqual({ userId: 'uid-abc' });
  });
});

// ─── isUserOperatorLinkCurrent ────────────────────────────────────────────────

describe('isUserOperatorLinkCurrent', () => {
  test('true when both sides point to each other', () => {
    expect(isUserOperatorLinkCurrent(
      { id: 'uid-abc', operatorId: 'op-123' },
      { id: 'op-123', userId: 'uid-abc' },
    )).toBe(true);
  });

  test('false when user.operatorId is missing', () => {
    expect(isUserOperatorLinkCurrent(
      { id: 'uid-abc' },
      { id: 'op-123', userId: 'uid-abc' },
    )).toBe(false);
  });

  test('false when operator.userId is missing', () => {
    expect(isUserOperatorLinkCurrent(
      { id: 'uid-abc', operatorId: 'op-123' },
      { id: 'op-123' },
    )).toBe(false);
  });

  test('false when user.operatorId points to different operator', () => {
    expect(isUserOperatorLinkCurrent(
      { id: 'uid-abc', operatorId: 'op-OTHER' },
      { id: 'op-123', userId: 'uid-abc' },
    )).toBe(false);
  });
});

// ─── computeLinkProposals ─────────────────────────────────────────────────────

describe('computeLinkProposals — match único por email', () => {
  test('proposes link when email matches exactly once on each side', () => {
    const operators = [{ id: 'op-1', email: 'alice@casais.pt' }];
    const users = [{ id: 'uid-1', email: 'alice@casais.pt' }];
    const { proposed, ambiguous, alreadyLinked, conflicts } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(1);
    expect(proposed[0]).toEqual({ uid: 'uid-1', operatorId: 'op-1', email: 'alice@casais.pt' });
    expect(ambiguous).toHaveLength(0);
    expect(alreadyLinked).toBe(0);
    expect(conflicts).toHaveLength(0);
  });

  test('email match is case-insensitive', () => {
    const operators = [{ id: 'op-1', email: 'Alice@CASAIS.pt' }];
    const users = [{ id: 'uid-1', email: 'alice@casais.pt' }];
    const { proposed } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(1);
  });
});

describe('computeLinkProposals — sem match', () => {
  test('no proposals when emails do not match', () => {
    const operators = [{ id: 'op-1', email: 'alice@casais.pt' }];
    const users = [{ id: 'uid-1', email: 'bob@casais.pt' }];
    const { proposed } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(0);
  });

  test('no proposals when operator has no email', () => {
    const operators = [{ id: 'op-1' }];
    const users = [{ id: 'uid-1', email: 'alice@casais.pt' }];
    const { proposed } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(0);
  });

  test('no proposals when user has no email', () => {
    const operators = [{ id: 'op-1', email: 'alice@casais.pt' }];
    const users = [{ id: 'uid-1' }];
    const { proposed } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(0);
  });
});

describe('computeLinkProposals — ambíguo', () => {
  test('marks as ambiguous when multiple users share the same email', () => {
    const operators = [{ id: 'op-1', email: 'alice@casais.pt' }];
    const users = [
      { id: 'uid-1', email: 'alice@casais.pt' },
      { id: 'uid-2', email: 'alice@casais.pt' },
    ];
    const { proposed, ambiguous } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(0);
    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0].email).toBe('alice@casais.pt');
    expect(ambiguous[0].candidateUids).toContain('uid-1');
    expect(ambiguous[0].candidateUids).toContain('uid-2');
  });
});

describe('computeLinkProposals — já ligado', () => {
  test('counts as alreadyLinked when both sides already point to each other', () => {
    const operators = [{ id: 'op-1', email: 'alice@casais.pt', userId: 'uid-1' }];
    const users = [{ id: 'uid-1', email: 'alice@casais.pt', operatorId: 'op-1' }];
    const { proposed, alreadyLinked } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(0);
    expect(alreadyLinked).toBe(1);
  });
});

describe('computeLinkProposals — conflito', () => {
  test('does not propose when operator.userId already points to a different user', () => {
    const operators = [{ id: 'op-1', email: 'alice@casais.pt', userId: 'uid-OTHER' }];
    const users = [{ id: 'uid-1', email: 'alice@casais.pt' }];
    const { proposed, conflicts } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(0);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].operatorId).toBe('op-1');
    expect(conflicts[0].uid).toBe('uid-1');
  });

  test('does not propose when user.operatorId already points to a different operator', () => {
    const operators = [{ id: 'op-1', email: 'alice@casais.pt' }];
    const users = [{ id: 'uid-1', email: 'alice@casais.pt', operatorId: 'op-OTHER' }];
    const { proposed, conflicts } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(0);
    expect(conflicts).toHaveLength(1);
  });
});

describe('computeLinkProposals — múltiplos operadores', () => {
  test('processes multiple independent pairs correctly', () => {
    const operators = [
      { id: 'op-1', email: 'alice@casais.pt' },
      { id: 'op-2', email: 'bob@casais.pt' },
      { id: 'op-3', email: 'charlie@casais.pt' },
    ];
    const users = [
      { id: 'uid-1', email: 'alice@casais.pt' },
      { id: 'uid-2', email: 'bob@casais.pt' },
      // charlie has no user account
    ];
    const { proposed } = computeLinkProposals(operators, users);
    expect(proposed).toHaveLength(2);
    const emails = proposed.map(p => p.email);
    expect(emails).toContain('alice@casais.pt');
    expect(emails).toContain('bob@casais.pt');
  });
});

// ─── buildUserOperatorLinkPatch — batch write coverage ───────────────────────

describe('buildUserOperatorLinkPatch — batch write', () => {
  test('patch objects are independent and do not share references', () => {
    const p1 = buildUserOperatorLinkPatch({ id: 'uid-a' }, { id: 'op-a' });
    const p2 = buildUserOperatorLinkPatch({ id: 'uid-b' }, { id: 'op-b' });
    expect(p1.userPatch.operatorId).toBe('op-a');
    expect(p2.userPatch.operatorId).toBe('op-b');
    // mutating one should not affect the other
    p1.userPatch.extra = true;
    expect(p2.userPatch.extra).toBeUndefined();
  });
});
