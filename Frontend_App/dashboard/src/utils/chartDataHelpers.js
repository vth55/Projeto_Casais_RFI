/**
 * chartDataHelpers.js — CASAIS Fleet Intelligence
 *
 * Funções primárias (tool_sessions / modelo NFC):
 *   aggregateToolSessionsByDay, aggregateToolSessionsByTool, aggregateToolSessionsByOperator
 *
 * Funções legacy (heavy machines / RFID sessions):
 *   aggregateSessionsByDay, aggregateSessionsByMachine, aggregateSessionsByOperator
 *   @deprecated LEGACY — heavy machines. Usar variantes aggregateTool* em código novo.
 */

export function getDateRangeFromPreset(preset, customRange = null) {
  const now = new Date();
  switch (preset) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start, end: now };
    }
    case 'week':
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'quarter':
      return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now };
    case 'custom':
      if (customRange?.start && customRange?.end) {
        const start = new Date(customRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customRange.end);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
}

export function getPreviousPeriodRange(start, end) {
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: new Date(start.getTime() - 1),
  };
}

/**
 * @deprecated LEGACY — heavy machines. Usar aggregateToolSessionsByDay para tool_sessions.
 */
export function aggregateSessionsByDay(sessions) {
  const map = {};
  sessions.forEach(s => {
    if (!s.startTime || s.status !== 'CLOSED') return;
    const d = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map[key]) map[key] = { date: key, hours: 0, cost: 0, co2: 0 };
    map[key].hours += s.durationHours || 0;
    map[key].cost += s.costs?.total || 0;
  });
  return Object.values(map)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, hours: Math.round(d.hours * 10) / 10 }));
}

/**
 * @deprecated LEGACY — heavy machines. Usar aggregateToolSessionsByTool para tool_sessions.
 */
export function aggregateSessionsByMachine(sessions, machines = []) {
  const map = {};
  sessions.forEach(s => {
    if (!s.machineId || s.status !== 'CLOSED') return;
    if (!map[s.machineId]) {
      const m = machines.find(mc => mc.id === s.machineId);
      map[s.machineId] = { machineId: s.machineId, machineName: m?.name || s.machineId, hours: 0, cost: 0 };
    }
    map[s.machineId].hours += s.durationHours || 0;
    map[s.machineId].cost += s.costs?.total || 0;
  });
  return Object.values(map)
    .sort((a, b) => b.hours - a.hours)
    .map(d => ({ ...d, hours: Math.round(d.hours * 10) / 10 }));
}

/**
 * @deprecated LEGACY — heavy machines. Usar aggregateToolSessionsByOperator para tool_sessions.
 */
export function aggregateSessionsByOperator(sessions, operators = []) {
  const map = {};
  sessions.forEach(s => {
    if (!s.operatorId || s.status !== 'CLOSED') return;
    if (!map[s.operatorId]) {
      const op = operators.find(o => o.cardId === s.operatorId || o.id === s.operatorId);
      map[s.operatorId] = { operatorId: s.operatorId, operatorName: op?.name || s.operatorId, hours: 0, machines: new Set(), sessions: 0 };
    }
    map[s.operatorId].hours += s.durationHours || 0;
    map[s.operatorId].machines.add(s.machineId);
    map[s.operatorId].sessions += 1;
  });
  return Object.values(map)
    .sort((a, b) => b.hours - a.hours)
    .map(d => ({ ...d, hours: Math.round(d.hours * 10) / 10, machines: d.machines.size }));
}

// invert=false: higher is better (e.g. utilization)
// invert=true: lower is better (e.g. downtime)
export function calculateRAGStatus(value, thresholds, invert = false) {
  if (!thresholds) return null;
  const { green, amber } = thresholds;
  if (!invert) {
    if (value >= green) return 'green';
    if (value >= amber) return 'amber';
    return 'red';
  }
  if (value <= green) return 'green';
  if (value <= amber) return 'amber';
  return 'red';
}

export function formatHours(h) {
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k`;
  return String(Math.round(h * 10) / 10);
}

// ============================================================================
// FUNÇÕES PRIMÁRIAS — tool_sessions (modelo NFC activo)
// ============================================================================

/**
 * Agrega tool_sessions por dia (CLOSED ou AUTO_CLOSED).
 * Retorna array { date: 'YYYY-MM-DD', sessions: number, durationHours: number }
 * ordenado cronologicamente.
 *
 * @param {Object[]} toolSessions - documentos tool_session
 * @returns {{ date: string, sessions: number, durationHours: number }[]}
 */
export function aggregateToolSessionsByDay(toolSessions) {
  const map = {};
  toolSessions.forEach(s => {
    if (!s.startTime) return;
    if (s.status !== 'CLOSED' && s.status !== 'AUTO_CLOSED') return;
    const d = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map[key]) map[key] = { date: key, sessions: 0, durationHours: 0 };
    map[key].sessions += 1;
    map[key].durationHours += s.durationHours || 0;
  });
  return Object.values(map)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, durationHours: Math.round(d.durationHours * 10) / 10 }));
}

/**
 * Agrega tool_sessions por ferramenta.
 * Retorna array { toolId, toolName, sessions, durationHours } ordenado por sessões desc.
 *
 * @param {Object[]} toolSessions - documentos tool_session
 * @returns {{ toolId: string, toolName: string, sessions: number, durationHours: number }[]}
 */
export function aggregateToolSessionsByTool(toolSessions) {
  const map = {};
  toolSessions.forEach(s => {
    if (!s.toolId) return;
    if (!map[s.toolId]) {
      map[s.toolId] = { toolId: s.toolId, toolName: s.toolName || s.toolId, sessions: 0, durationHours: 0 };
    }
    map[s.toolId].sessions += 1;
    if (s.status === 'CLOSED' || s.status === 'AUTO_CLOSED') {
      map[s.toolId].durationHours += s.durationHours || 0;
    }
  });
  return Object.values(map)
    .sort((a, b) => b.sessions - a.sessions)
    .map(d => ({ ...d, durationHours: Math.round(d.durationHours * 10) / 10 }));
}

/**
 * Agrega tool_sessions por operador.
 * Retorna array { operatorId, operatorName, sessions, durationHours, tools } ordenado por sessões desc.
 *
 * @param {Object[]} toolSessions - documentos tool_session
 * @returns {{ operatorId: string, operatorName: string, sessions: number, durationHours: number, tools: number }[]}
 */
export function aggregateToolSessionsByOperator(toolSessions) {
  const map = {};
  toolSessions.forEach(s => {
    if (!s.operatorId) return;
    if (!map[s.operatorId]) {
      map[s.operatorId] = {
        operatorId: s.operatorId,
        operatorName: s.operatorName || s.operatorId,
        sessions: 0,
        durationHours: 0,
        toolSet: new Set(),
      };
    }
    map[s.operatorId].sessions += 1;
    if (s.status === 'CLOSED' || s.status === 'AUTO_CLOSED') {
      map[s.operatorId].durationHours += s.durationHours || 0;
    }
    if (s.toolId) map[s.operatorId].toolSet.add(s.toolId);
  });
  return Object.values(map)
    .sort((a, b) => b.sessions - a.sessions)
    .map(({ toolSet, ...d }) => ({ ...d, tools: toolSet.size, durationHours: Math.round(d.durationHours * 10) / 10 }));
}
