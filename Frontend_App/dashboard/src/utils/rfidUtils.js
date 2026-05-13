/**
 * Utilitários RFID — lógica pura sem dependências Firebase.
 * Pode ser testada com Vitest sem mocks.
 */

export const RFID_CARD_TYPES = {
  OPERATOR: 'operator',
  LOCATION: 'location',
  UNKNOWN: 'unknown',
  REVOKED: 'revoked',
  CONFLICT: 'conflict',
};

/**
 * Classifica um cartão RFID dado os dados de operadores e cartões de localização.
 *
 * @param {string} uid — ID normalizado do cartão
 * @param {object|null} operatorData — doc do operador (null = não existe)
 * @param {object|null} locationCardData — doc do cartão de localização (null = não existe)
 * @returns {{ type: string, data: object|null, reason: string|null }}
 */
export function classifyRfidCard(uid, operatorData, locationCardData) {
  const isOperator = !!operatorData;
  const isLocation = !!locationCardData;

  if (isOperator && isLocation) {
    console.error(`[rfid] Conflict: card ${uid} exists in both operators and locationCards`);
    return { type: RFID_CARD_TYPES.CONFLICT, data: null, reason: 'card_in_both_collections' };
  }

  if (isLocation) {
    if (locationCardData.active === false) {
      return { type: RFID_CARD_TYPES.REVOKED, data: locationCardData, reason: 'card_revoked' };
    }
    return { type: RFID_CARD_TYPES.LOCATION, data: locationCardData, reason: null };
  }

  if (isOperator) {
    return { type: RFID_CARD_TYPES.OPERATOR, data: operatorData, reason: null };
  }

  return { type: RFID_CARD_TYPES.UNKNOWN, data: null, reason: 'card_not_registered' };
}

// ============================================================
// STATE MACHINE — localização de máquinas
// ============================================================

export const LOCATION_STATES = {
  ESTALEIRO: 'estaleiro',
  TRANSITO: 'transito',
  OBRA: 'obra',
  OFICINA_EXTERNA: 'oficina_externa',
  DESCONHECIDA: 'desconhecida',
};

// Transições válidas: de → [para...]
const VALID_TRANSITIONS = {
  [LOCATION_STATES.ESTALEIRO]: [LOCATION_STATES.TRANSITO, LOCATION_STATES.OBRA, LOCATION_STATES.OFICINA_EXTERNA],
  [LOCATION_STATES.TRANSITO]: [LOCATION_STATES.OBRA, LOCATION_STATES.ESTALEIRO, LOCATION_STATES.DESCONHECIDA],
  [LOCATION_STATES.OBRA]: [LOCATION_STATES.ESTALEIRO, LOCATION_STATES.TRANSITO, LOCATION_STATES.OBRA],
  [LOCATION_STATES.OFICINA_EXTERNA]: [LOCATION_STATES.ESTALEIRO],
  [LOCATION_STATES.DESCONHECIDA]: Object.values(LOCATION_STATES),
};

export class InvalidTransitionError extends Error {
  constructor(from, to) {
    super(`Transição inválida: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
  }
}

/**
 * Valida e executa transição de estado de localização.
 * @param {string} currentState
 * @param {string} nextState
 * @returns {string} nextState (se válido)
 * @throws {InvalidTransitionError} se transição não permitida
 */
export function transitionLocationState(currentState, nextState) {
  const allowed = VALID_TRANSITIONS[currentState] || [];
  if (!allowed.includes(nextState)) {
    throw new InvalidTransitionError(currentState, nextState);
  }
  return nextState;
}

/**
 * Calcula estadoOperacional a partir de dados da máquina.
 */
export function deriveEstadoOperacional(machine) {
  if (machine.despachoPendente) return 'em_transito';
  const loc = machine.localizacao?.type || machine.localizacao?.obraId;
  if (loc === 'estaleiro') return 'disponivel';
  if (loc === 'obra') return 'em_obra';
  return 'disponivel';
}

/**
 * Calcula status de compliance de um documento.
 * @param {Date|null} validoAte
 * @returns {'valido'|'expira_30d'|'expira_7d'|'expirado'}
 */
export function deriveComplianceStatus(validoAte) {
  if (!validoAte) return 'expirado';
  const now = new Date();
  const diff = validoAte.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 'expirado';
  if (days <= 7) return 'expira_7d';
  if (days <= 30) return 'expira_30d';
  return 'valido';
}

/**
 * Verifica se uma WorkOrder deve resetar partialHours.
 * Só true em preventiva/correctiva concluída.
 */
export function shouldResetPartialHours(workOrder) {
  return (
    workOrder.estado === 'concluida' &&
    ['preventiva', 'correctiva'].includes(workOrder.tipo)
  );
}
