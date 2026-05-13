/**
 * T1.xx — Sprint 1: RFID Classification + Location State Machine
 */

import { describe, it, expect, vi } from 'vitest';
import {
  classifyRfidCard,
  RFID_CARD_TYPES,
  transitionLocationState,
  LOCATION_STATES,
  InvalidTransitionError,
  deriveEstadoOperacional,
  deriveComplianceStatus,
  shouldResetPartialHours,
} from '../utils/rfidUtils';

// ============================================================
// T1.01 — classifyRfidCard retorna tipo correcto
// ============================================================
describe('T1.01 classifyRfidCard — tipos', () => {
  it('cartão de operador → OPERATOR', () => {
    const result = classifyRfidCard('CARD-001', { name: 'João', id: 'CARD-001' }, null);
    expect(result.type).toBe(RFID_CARD_TYPES.OPERATOR);
    expect(result.data).toMatchObject({ name: 'João' });
  });

  it('cartão LOC_ → LOCATION', () => {
    const locCard = { obraId: 'obra1', obraName: 'Torre Boavista', active: true };
    const result = classifyRfidCard('LOC_OBRA1', null, locCard);
    expect(result.type).toBe(RFID_CARD_TYPES.LOCATION);
    expect(result.data.obraId).toBe('obra1');
  });

  it('cartão desconhecido → UNKNOWN', () => {
    const result = classifyRfidCard('MYSTERY-999', null, null);
    expect(result.type).toBe(RFID_CARD_TYPES.UNKNOWN);
    expect(result.reason).toBe('card_not_registered');
  });
});

// ============================================================
// T1.02 — cartão em ambas as colecções → CONFLICT
// ============================================================
describe('T1.02 classifyRfidCard — conflito', () => {
  it('retorna CONFLICT quando cartão existe em operadores E localização', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = classifyRfidCard(
      'DUAL-001',
      { name: 'Ana' },
      { obraId: 'obra2', obraName: 'Obra X', active: true }
    );
    expect(result.type).toBe(RFID_CARD_TYPES.CONFLICT);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DUAL-001'));
    consoleSpy.mockRestore();
  });
});

// ============================================================
// T1.03 — cartão revogado → REVOKED
// ============================================================
describe('T1.03 classifyRfidCard — revogado', () => {
  it('cartão de localização com active:false → REVOKED', () => {
    const locCard = { obraId: 'obra1', obraName: 'Obra A', active: false };
    const result = classifyRfidCard('LOC_REVOKED', null, locCard);
    expect(result.type).toBe(RFID_CARD_TYPES.REVOKED);
    expect(result.reason).toBe('card_revoked');
  });

  it('cartão de localização com active:true → LOCATION (não revogado)', () => {
    const locCard = { obraId: 'obra1', obraName: 'Obra A', active: true };
    const result = classifyRfidCard('LOC_ACTIVE', null, locCard);
    expect(result.type).toBe(RFID_CARD_TYPES.LOCATION);
  });
});

// ============================================================
// T1.04 — State machine: transições válidas
// ============================================================
describe('T1.04 state machine — transições válidas', () => {
  const valid = [
    [LOCATION_STATES.ESTALEIRO, LOCATION_STATES.TRANSITO],
    [LOCATION_STATES.ESTALEIRO, LOCATION_STATES.OBRA],
    [LOCATION_STATES.ESTALEIRO, LOCATION_STATES.OFICINA_EXTERNA],
    [LOCATION_STATES.TRANSITO, LOCATION_STATES.OBRA],
    [LOCATION_STATES.TRANSITO, LOCATION_STATES.ESTALEIRO],
    [LOCATION_STATES.OBRA, LOCATION_STATES.ESTALEIRO],
    [LOCATION_STATES.OBRA, LOCATION_STATES.TRANSITO],
    [LOCATION_STATES.OBRA, LOCATION_STATES.OBRA], // transferência directa entre obras
    [LOCATION_STATES.OFICINA_EXTERNA, LOCATION_STATES.ESTALEIRO],
  ];

  valid.forEach(([from, to]) => {
    it(`${from} → ${to} é permitido`, () => {
      expect(() => transitionLocationState(from, to)).not.toThrow();
      expect(transitionLocationState(from, to)).toBe(to);
    });
  });
});

// ============================================================
// T1.05 — State machine: transições inválidas lançam erro
// ============================================================
describe('T1.05 state machine — transições inválidas', () => {
  const invalid = [
    [LOCATION_STATES.ESTALEIRO, LOCATION_STATES.DESCONHECIDA],
    [LOCATION_STATES.OFICINA_EXTERNA, LOCATION_STATES.OBRA],
    [LOCATION_STATES.OFICINA_EXTERNA, LOCATION_STATES.TRANSITO],
  ];

  invalid.forEach(([from, to]) => {
    it(`${from} → ${to} lança InvalidTransitionError`, () => {
      expect(() => transitionLocationState(from, to)).toThrow(InvalidTransitionError);
    });
  });

  it('erro contém from e to', () => {
    try {
      transitionLocationState(LOCATION_STATES.ESTALEIRO, LOCATION_STATES.DESCONHECIDA);
    } catch (e) {
      expect(e.from).toBe(LOCATION_STATES.ESTALEIRO);
      expect(e.to).toBe(LOCATION_STATES.DESCONHECIDA);
    }
  });
});

// ============================================================
// T1.xx — deriveEstadoOperacional
// ============================================================
describe('deriveEstadoOperacional', () => {
  it('máquina com despachoPendente → em_transito', () => {
    const machine = { despachoPendente: { obraId: 'x', obraName: 'X' } };
    expect(deriveEstadoOperacional(machine)).toBe('em_transito');
  });

  it('máquina em estaleiro → disponivel', () => {
    const machine = { localizacao: { type: 'estaleiro', obraId: 'estaleiro' } };
    expect(deriveEstadoOperacional(machine)).toBe('disponivel');
  });

  it('máquina em obra → em_obra', () => {
    const machine = { localizacao: { type: 'obra', obraId: 'obra1' } };
    expect(deriveEstadoOperacional(machine)).toBe('em_obra');
  });

  it('máquina sem localização → disponivel (fallback seguro)', () => {
    expect(deriveEstadoOperacional({})).toBe('disponivel');
  });
});
