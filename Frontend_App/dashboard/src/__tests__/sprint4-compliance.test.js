/**
 * T4.01, T4.03 — Sprint 4: Compliance + WorkOrder utils (lógica pura)
 */

import { describe, it, expect } from 'vitest';
import { deriveComplianceStatus, shouldResetPartialHours } from '../utils/rfidUtils';

// ============================================================
// T4.01 — deriveComplianceStatus
// ============================================================
describe('T4.01 deriveComplianceStatus', () => {
  const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

  it('null → expirado', () => {
    expect(deriveComplianceStatus(null)).toBe('expirado');
  });

  it('data no passado → expirado', () => {
    expect(deriveComplianceStatus(daysFromNow(-1))).toBe('expirado');
  });

  it('expira em 5 dias → expira_7d', () => {
    expect(deriveComplianceStatus(daysFromNow(5))).toBe('expira_7d');
  });

  it('expira em 7 dias exactos → expira_7d (boundary)', () => {
    expect(deriveComplianceStatus(daysFromNow(7))).toBe('expira_7d');
  });

  it('expira em 15 dias → expira_30d', () => {
    expect(deriveComplianceStatus(daysFromNow(15))).toBe('expira_30d');
  });

  it('expira em 30 dias exactos → expira_30d (boundary)', () => {
    expect(deriveComplianceStatus(daysFromNow(30))).toBe('expira_30d');
  });

  it('expira em 60 dias → valido', () => {
    expect(deriveComplianceStatus(daysFromNow(60))).toBe('valido');
  });
});

// ============================================================
// T4.03 — shouldResetPartialHours
// ============================================================
describe('T4.03 shouldResetPartialHours', () => {
  it('preventiva concluída → true', () => {
    expect(shouldResetPartialHours({ tipo: 'preventiva', estado: 'concluida' })).toBe(true);
  });

  it('correctiva concluída → true', () => {
    expect(shouldResetPartialHours({ tipo: 'correctiva', estado: 'concluida' })).toBe(true);
  });

  it('inspeccao concluída → false (não reseta horas)', () => {
    expect(shouldResetPartialHours({ tipo: 'inspeccao', estado: 'concluida' })).toBe(false);
  });

  it('preventiva em execucao (não concluída) → false', () => {
    expect(shouldResetPartialHours({ tipo: 'preventiva', estado: 'em_execucao' })).toBe(false);
  });

  it('preventiva aberta → false', () => {
    expect(shouldResetPartialHours({ tipo: 'preventiva', estado: 'aberta' })).toBe(false);
  });
});
