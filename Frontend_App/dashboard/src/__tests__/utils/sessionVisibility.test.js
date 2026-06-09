import { describe, expect, it } from 'vitest';
import {
  getVisibleSessionsForUser,
  normalizeIdentity,
  sessionBelongsToUser,
} from '../../utils/sessionVisibility';

describe('sessionVisibility', () => {
  const sessions = [
    { id: 's1', operatorId: 'uid-operador', operatorName: 'Teste Operador' },
    { id: 's2', operatorId: 'op-joao', operatorName: 'Joao Silva' },
    { id: 's3', operatorId: 'CARD-123', operatorName: 'Maria Santos' },
  ];

  it('normaliza identidades para comparacao robusta', () => {
    expect(normalizeIdentity('  UID-Operador  ')).toBe('uid-operador');
    expect(normalizeIdentity(null)).toBeNull();
  });

  it('reconhece sessao propria por uid/id', () => {
    expect(sessionBelongsToUser(sessions[0], {
      id: 'uid-operador',
      systemRole: 'operador',
    })).toBe(true);
  });

  it('reconhece sessao propria por operatorId ou cardId quando existir no perfil', () => {
    expect(sessionBelongsToUser(sessions[2], {
      id: 'uid-maria',
      operatorId: 'op-maria',
      cardId: 'card-123',
      systemRole: 'operador',
    })).toBe(true);
  });

  it('usa nome como fallback para dados demo antigos', () => {
    expect(sessionBelongsToUser({ operatorName: 'Teste Operador' }, {
      id: 'uid-operador',
      name: 'teste operador',
      systemRole: 'operador',
    })).toBe(true);
  });

  it('operador ve apenas as suas sessoes', () => {
    const visible = getVisibleSessionsForUser(sessions, {
      id: 'uid-operador',
      name: 'Teste Operador',
      systemRole: 'operador',
    });

    expect(visible.map(session => session.id)).toEqual(['s1']);
  });

  it('roles de supervisao/gestao mantem a lista recebida', () => {
    expect(getVisibleSessionsForUser(sessions, { systemRole: 'encarregado_obra' })).toBe(sessions);
    expect(getVisibleSessionsForUser(sessions, { systemRole: 'admin' })).toBe(sessions);
  });
});
