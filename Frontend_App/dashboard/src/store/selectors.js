/**
 * selectors.js — CASAIS Fleet Intelligence
 *
 * Selectors otimizados para o store Zustand.
 * Usar selectors evita re-renders desnecessários porque
 * o componente só re-renderiza quando o valor selecionado muda.
 *
 * Uso (modelo primário tools):
 *   const tools = useStore(selectTools);
 *   const openSessions = useStore(selectOpenToolSessions);
 *
 * Uso (modelo legacy machines — Procore exporter):
 *   const machines = useStore(selectMachines); // @deprecated LEGACY
 */

import { useCallback } from 'react';
import { shallow } from 'zustand/shallow';

// ============================================
// SELECTORS PRIMÁRIOS — tools / tool_sessions
// ============================================

/** Todas as ferramentas NFC. */
export const selectTools = (state) => state.tools;

/** Sessões de equipamentos abertas (status === 'OPEN'). */
export const selectOpenToolSessions = (state) =>
  (state.toolSessions || []).filter(s => s.status === 'OPEN');

/** Sessões de equipamentos fechadas (CLOSED ou AUTO_CLOSED). */
export const selectClosedToolSessions = (state) =>
  (state.toolSessions || []).filter(s => s.status === 'CLOSED' || s.status === 'AUTO_CLOSED');

/**
 * Operadores que têm pelo menos uma tool_session OPEN.
 * Usa operatorId (não cardId legacy).
 */
export const selectActiveOperatorsFromTools = (state) => {
  const openOperatorIds = new Set(
    (state.toolSessions || [])
      .filter(s => s.status === 'OPEN')
      .map(s => s.operatorId)
      .filter(Boolean)
  );
  return (state.operators || []).filter(op => openOperatorIds.has(op.id));
};

// ============================================
// SELECTORS SECUNDÁRIOS (partilhados)
// ============================================

export const selectOperators = (state) => state.operators;
export const selectObras = (state) => state.obras;
export const selectLoading = (state) => state.loading;
export const selectError = (state) => state.error;
export const selectActiveView = (state) => state.activeView;
export const selectSidebarOpen = (state) => state.sidebarOpen;
export const selectDateFilter = (state) => state.dateFilter;

// ============================================
// SELECTORS DE AÇÕES (funções)
// ============================================

export const selectSetActiveView = (state) => state.setActiveView;
export const selectSetSidebarOpen = (state) => state.setSidebarOpen;
export const selectSetDateFilter = (state) => state.setDateFilter;

// ============================================
// SELECTORS DERIVADOS — Obras activas
// ============================================

export const selectActiveObras = (state) =>
  (state.obras || []).filter(o => o.status === 'ACTIVE' || o.status === 'active');

// ============================================
// SELECTORS LEGACY — heavy machines
// @deprecated LEGACY — heavy machines. Usar selectTools / selectOpenToolSessions em código novo.
// ============================================

/**
 * @deprecated LEGACY — heavy machines. Usar selectTools para ferramentas NFC.
 */
export const selectMachines = (state) => state.machines;

/**
 * @deprecated LEGACY — heavy machines.
 */
export const selectSessions = (state) => state.sessions;

/**
 * @deprecated LEGACY — heavy machines.
 */
export const selectTariffs = (state) => state.tariffs;

/**
 * @deprecated LEGACY — heavy machines.
 */
export const selectMaintenanceRecords = (state) => state.maintenanceRecords;

/**
 * @deprecated LEGACY — heavy machines. Usar selectActiveOperatorsFromTools para NFC.
 */
export const selectActiveMachines = (state) =>
  (state.machines || []).filter(m => m.status === 'ACTIVE');

/**
 * @deprecated LEGACY — heavy machines.
 */
export const selectIdleMachines = (state) =>
  (state.machines || []).filter(m => m.status === 'IDLE' || !m.status);

/**
 * @deprecated LEGACY — heavy machines. Usar selectOpenToolSessions.
 */
export const selectOpenSessions = (state) =>
  (state.sessions || []).filter(s => s.status === 'OPEN' || !s.endTime);

/**
 * @deprecated LEGACY — heavy machines. Usar selectClosedToolSessions.
 */
export const selectClosedSessions = (state) =>
  (state.sessions || []).filter(s => s.status === 'CLOSED' || s.endTime);

/**
 * @deprecated LEGACY — heavy machines.
 */
export const selectTotalHours = (state) =>
  (state.machines || []).reduce((acc, m) => acc + (m.totalHours || 0), 0);

/**
 * @deprecated LEGACY — heavy machines.
 */
export const selectMachineStatusCounts = (state) => ({
  active: (state.machines || []).filter(m => m.status === 'ACTIVE').length,
  idle: (state.machines || []).filter(m => m.status === 'IDLE' || !m.status).length,
  maintenance: (state.machines || []).filter(m => m.status === 'MAINTENANCE').length,
  total: (state.machines || []).length,
});

/**
 * @deprecated LEGACY — heavy machines. Usar selectActiveOperatorsFromTools.
 */
export const selectActiveOperators = (state) => {
  const openSessionCardIds = (state.sessions || [])
    .filter(s => s.status === 'OPEN' || !s.endTime)
    .map(s => s.cardId);
  return (state.operators || []).filter(op => openSessionCardIds.includes(op.id));
};

/**
 * @deprecated LEGACY — heavy machines.
 */
export const selectDashboardStats = (state) => ({
  totalMachines: (state.machines || []).length,
  activeMachines: (state.machines || []).filter(m => m.status === 'ACTIVE').length,
  totalOperators: (state.operators || []).length,
  openSessions: (state.sessions || []).filter(s => !s.endTime).length,
  totalHours: (state.machines || []).reduce((acc, m) => acc + (m.totalHours || 0), 0),
});

// Navigation state (usar com shallow compare) — mantido sem deprecação (não é legacy)
export const selectNavigation = (state) => ({
  activeView: state.activeView,
  sidebarOpen: state.sidebarOpen,
  setActiveView: state.setActiveView,
  setSidebarOpen: state.setSidebarOpen,
});

// ============================================
// HOOKS CUSTOMIZADOS PARA SELECTORS COMPLEXOS
// ============================================

/**
 * @deprecated LEGACY — heavy machines. Não existe equivalente tool por categoria (usar type no schema Tool).
 * Hook para obter máquinas filtradas por categoria
 * @param {string} categoryId - ID da categoria
 */
export const useMachinesByCategory = (categoryId) => {
  return useCallback(
    (state) => (state.machines || []).filter(m => {
      const catId = typeof m.category === 'object' ? m.category?.id : m.category;
      return catId === categoryId;
    }),
    [categoryId]
  );
};

/**
 * @deprecated LEGACY — heavy machines. Para tool_sessions usar filtro directo por startTime.
 * Hook para obter sessões filtradas por data
 * @param {Date} startDate - Data inicial
 * @param {Date} endDate - Data final
 */
export const useSessionsByDateRange = (startDate, endDate) => {
  return useCallback(
    (state) => (state.sessions || []).filter(s => {
      const sessionDate = s.startTime?.toDate ? s.startTime.toDate() : new Date(s.startTime);
      return sessionDate >= startDate && sessionDate <= endDate;
    }),
    [startDate, endDate]
  );
};

/**
 * @deprecated LEGACY — heavy machines.
 * Hook para obter estatísticas de uma máquina específica
 * @param {string} machineId - ID da máquina
 */
export const useMachineStats = (machineId) => {
  return useCallback(
    (state) => {
      const machine = (state.machines || []).find(m => m.id === machineId);
      const sessions = (state.sessions || []).filter(s => s.machineId === machineId);
      const totalHours = sessions.reduce((acc, s) => acc + (s.durationHours || 0), 0);

      return {
        machine,
        sessionCount: sessions.length,
        totalHours,
        lastSession: sessions[0] || null,
      };
    },
    [machineId]
  );
};

// Exportar shallow para uso com selectors combinados
export { shallow };
