/**
 * Tests for utils/listenerConfig.js — pure function, no Firebase mocks needed.
 *
 * Invariants under test:
 *   1. tools is never in the scoped filter (enforced by collection omission)
 *   2. null/undefined/non-restricted currentUser → mode: 'global'
 *   3. restricted + no assignedObraId → mode: 'empty' (safe, no global query)
 *   4. restricted + assignedObraId → mode: 'scoped' with correct obraId
 */

import { describe, it, expect } from 'vitest';
import { computeListenerScope } from '../utils/listenerConfig';

describe('computeListenerScope', () => {
  it('returns global for null currentUser', () => {
    expect(computeListenerScope(null)).toEqual({ mode: 'global' });
  });

  it('returns global for undefined currentUser', () => {
    expect(computeListenerScope(undefined)).toEqual({ mode: 'global' });
  });

  it('returns global when restrictedToOwnObra is false', () => {
    expect(computeListenerScope({ restrictedToOwnObra: false, assignedObraId: 'obra-1' }))
      .toEqual({ mode: 'global' });
  });

  it('returns global when restrictedToOwnObra is absent', () => {
    expect(computeListenerScope({ assignedObraId: 'obra-1' }))
      .toEqual({ mode: 'global' });
  });

  it('infers scoped for legacy cached encarregado_obra without restricted flag', () => {
    expect(computeListenerScope({ systemRole: 'encarregado_obra', assignedObraId: 'obra-1' }))
      .toEqual({ mode: 'scoped', assignedObraId: 'obra-1' });
  });

  it('infers empty for legacy cached operador without restricted flag and no obra', () => {
    expect(computeListenerScope({ systemRole: 'operador', assignedObraId: null }))
      .toEqual({ mode: 'empty' });
  });

  it('returns global for admin-level user without restrictedToOwnObra', () => {
    expect(computeListenerScope({ systemRole: 'admin', assignedObraId: null }))
      .toEqual({ mode: 'global' });
  });

  it('returns empty for restricted user with null assignedObraId', () => {
    expect(computeListenerScope({ restrictedToOwnObra: true, assignedObraId: null }))
      .toEqual({ mode: 'empty' });
  });

  it('returns empty for restricted user with undefined assignedObraId', () => {
    expect(computeListenerScope({ restrictedToOwnObra: true }))
      .toEqual({ mode: 'empty' });
  });

  it('returns empty for restricted user with empty string assignedObraId', () => {
    expect(computeListenerScope({ restrictedToOwnObra: true, assignedObraId: '' }))
      .toEqual({ mode: 'empty' });
  });

  it('returns scoped for restricted user with valid assignedObraId', () => {
    expect(computeListenerScope({ restrictedToOwnObra: true, assignedObraId: 'obra-porto' }))
      .toEqual({ mode: 'scoped', assignedObraId: 'obra-porto' });
  });

  it('scoped mode preserves the exact assignedObraId', () => {
    const scope = computeListenerScope({ restrictedToOwnObra: true, assignedObraId: 'obra-abc-123' });
    expect(scope.assignedObraId).toBe('obra-abc-123');
  });

  it('global mode has no assignedObraId field', () => {
    const scope = computeListenerScope({ restrictedToOwnObra: false, assignedObraId: 'obra-1' });
    expect(scope).not.toHaveProperty('assignedObraId');
  });

  it('encarregado_obra role with obra assigned → scoped', () => {
    const user = {
      systemRole: 'encarregado_obra',
      restrictedToOwnObra: true,
      assignedObraId: 'obra-lisbon',
    };
    expect(computeListenerScope(user)).toEqual({ mode: 'scoped', assignedObraId: 'obra-lisbon' });
  });

  it('operador role with no obra → empty (safe, no global query)', () => {
    const user = {
      systemRole: 'operador',
      restrictedToOwnObra: true,
      assignedObraId: null,
    };
    expect(computeListenerScope(user)).toEqual({ mode: 'empty' });
  });
});
