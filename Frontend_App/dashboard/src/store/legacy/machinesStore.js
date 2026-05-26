/**
 * LEGACY — Heavy machines model (pré-pivot 2026-05).
 *
 * Este módulo existe APENAS para:
 * 1. Manter a sincronização Procore actual (exportação de sessions/machines)
 *    a funcionar enquanto o pivot small-tools não tem substituto no backend.
 * 2. Painel de Reconciliação Procore no Dashboard (read-only, mostra estado
 *    de exportação dos documentos sessions legacy).
 *
 * REGRAS:
 * - NÃO consumir este store em fluxo activo do utilizador (Sidebar, BottomNav,
 *   LiveSessionsBar, MapaObrasView, ObraMenuLayout, ToolTagPage, etc.).
 * - QUALQUER nova feature consome `useStore` principal (`tools`, `toolSessions`,
 *   `tool_alerts`, `tool_maintenance`).
 * - Quando o backend Procore for migrado para `tool_sessions`, este módulo
 *   inteiro é apagado.
 *
 * Componentes que ainda podem importar daqui (são as únicas excepções permitidas):
 * - `views/DashboardView.jsx` → `useProcoreRecon` hook (linha ~212)
 * - `views/DashboardView.jsx` → `WorkFocusPanel` (usa machines para IA preditiva)
 * - `views/dashboards/DashboardManutencao.jsx` → lê machines/sessions/maintenanceRecords
 * - `components/ui/MachineStoryRings.jsx` (até ser removido / renomeado)
 *
 * Tudo o resto que estiver a importar machines ou sessions é dívida técnica do pivot.
 */

import { create } from 'zustand';
import { collection, addDoc, doc, setDoc, deleteDoc, updateDoc, Timestamp, increment } from 'firebase/firestore';
import { db, projectId } from '../../config/firebase';
import { createCollectionListener } from '../../utils/firestoreListeners';
import { createCrudActions } from '../../utils/firestoreCrud';
import useAvariasStore from '../useAvariasStore';

const basePath = `artifacts/${projectId}/public/data`;

// LEGACY CRUD — heavy machines
const machineActions = createCrudActions(db, `${basePath}/machines`);

const UI_FIELDS = [
  'id', 'totalHours', 'sessionCount', 'isActive',
  'assignedObraName', 'systemRoleName', 'systemRoleLevel',
  'syncStatus', 'lastScannedCard', 'totalWorkHours',
];
const sanitizeData = (data) => {
  const clean = { ...data };
  UI_FIELDS.forEach(field => delete clean[field]);
  return Object.fromEntries(Object.entries(clean).filter(([_, v]) => v !== undefined));
};

// LEGACY — constantes de alertas de sessão heavy-machine
const SESSION_THRESHOLDS = {
  FATIGUE_HOURS: 5,
  AUTO_CLOSE_HOURS: 14,
};

const useLegacyMachinesStore = create((set, get) => ({
  /** Heavy machines legacy — sincronizadas pelo Procore. NÃO consumir em UI nova. */
  machines: [],
  /** RFID sessions legacy (FATIGUE/AUTO_CLOSE/horas de motor). NÃO consumir em UI nova. */
  sessions: [],
  /** LEGACY — registos de manutenção de heavy machines. */
  maintenanceRecords: [],

  initializeLegacyListeners: () => {
    const unsubscribers = [];

    const machinesListener = createCollectionListener(db, `${basePath}/machines`, {
      onError: (msg, error) => console.debug('[legacy:machines] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      machinesListener((data) => {
        const visible = (data || []).filter(m => !String(m.name || '').startsWith('[REMOVIDO]'));
        set({ machines: visible });
      })
    );

    const sessionsListener = createCollectionListener(db, `${basePath}/sessions`, {
      orderByField: 'startTime',
      orderByDirection: 'desc',
      onError: (msg, error) => console.debug('[legacy:sessions] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      sessionsListener((data) => set({ sessions: data || [] }))
    );

    const maintenanceListener = createCollectionListener(db, `${basePath}/maintenance`, {
      onError: (msg, error) => console.debug('[legacy:maintenance] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      maintenanceListener((data) => set({ maintenanceRecords: data || [] }))
    );

    return () => unsubscribers.forEach(unsub => unsub());
  },

  // ========================================
  // LEGACY — CRUD MACHINES
  // ========================================

  addMachine: async (machineData) => {
    const cleanMachine = sanitizeData({
      ...machineData,
      totalHours: 0,
      partialHours: 0,
      status: 'IDLE',
    });
    return machineActions.create(machineData.id || undefined, cleanMachine, { idPrefix: 'machine' });
  },

  updateMachine: async (id, data) => {
    return machineActions.update(id, sanitizeData(data));
  },

  deleteMachine: async (id) => {
    return machineActions.delete(id);
  },

  // ========================================
  // LEGACY — TARIFÁRIO MACHINES
  // ========================================

  setMachineTariff: async (machineId, tariffData) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const { machines } = get();
      const machine = machines.find(m => m.id === machineId);
      if (!machine) return { success: false, error: 'Máquina não encontrada' };

      const now = Timestamp.now();
      const newTariffId = `tariff_${machineId}_${Date.now()}`;
      const opCost = tariffData.type === 'MACHINE_AND_OPERATOR' ? (parseFloat(tariffData.operatorCostPerHour) || 0) : 0;

      const newTariff = {
        id: newTariffId,
        type: tariffData.type,
        machineCostPerHour: parseFloat(tariffData.machineCostPerHour) || 0,
        operatorCostPerHour: opCost,
        totalCostPerHour: (parseFloat(tariffData.machineCostPerHour) || 0) + opCost,
        validFrom: now,
        validUntil: null,
        createdBy: tariffData.createdBy || 'admin',
        createdAt: now,
      };

      const oldTariff = machine.currentTariff;
      let history = machine.tariffHistory ? [...machine.tariffHistory] : [];
      if (oldTariff) {
        const closedOld = { ...oldTariff, validUntil: now };
        const idx = history.findIndex(t => t.id === oldTariff.id);
        if (idx >= 0) history[idx] = closedOld; else history.push(closedOld);
      }
      history.push(newTariff);

      await updateDoc(doc(db, `${basePath}/machines`, machineId), {
        currentTariff: newTariff,
        tariffHistory: history,
        updatedAt: now,
      });

      return { success: true, tariff: newTariff };
    } catch (error) {
      console.error('Erro ao definir tarifário:', error);
      return { success: false, error: error.message };
    }
  },

  // ========================================
  // LEGACY — MOVER / DESPACHAR MACHINES
  // ========================================

  moveMachinesToObra: async (machineIds, obraId) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      // Importar obras do store principal para evitar duplicação de listener
      let obras = [];
      try { obras = require('../useStore').default.getState().obras; } catch { obras = []; }

      const isEstaleiro = obraId === 'estaleiro' || !obraId;
      const obra = isEstaleiro ? null : obras.find(o => o.id === obraId);
      const { machines } = get();

      for (const machineId of machineIds) {
        const machine = machines.find(m => m.id === machineId);
        const fromName = machine?.localizacao?.obraName || machine?.location?.workName || 'Sem localização';
        const fromObraId = machine?.localizacao?.obraId || machine?.location?.workId || null;
        const toName = isEstaleiro ? 'Estaleiro' : (obra?.name || obraId);
        const toObraId = isEstaleiro ? 'estaleiro' : (obra?.id || obraId);
        const ts = Timestamp.now();

        await updateDoc(doc(db, `${basePath}/machines`, machineId), {
          obraId: toObraId,
          localizacao: {
            obraId: toObraId,
            obraName: toName,
            gps: isEstaleiro ? null : (obra?.gps || null),
            type: isEstaleiro ? 'estaleiro' : 'obra',
            updatedAt: ts,
            cardId: null,
          },
          estadoOperacional: isEstaleiro ? 'disponivel' : 'em_obra',
          ...(isEstaleiro
            ? { status: 'IDLE', location: null, movedToYardAt: ts }
            : { movedToYardAt: null, location: obra ? { workId: obra.id, workName: obra.name, gps: obra.gps || null, lastUpdated: ts } : null }
          ),
        });

        await addDoc(collection(db, `${basePath}/machineLocationEvents`), {
          machineId,
          machineLabel: machine?.name || machineId,
          type: 'manual_dispatch',
          from: fromName,
          fromObraId,
          to: toName,
          toObraId,
          timestamp: ts,
          cardId: null,
          confirmedDespacho: false,
          triggeredBy: 'manual',
        });
      }
      return { success: true, count: machineIds.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  dispatchMachine: async (machineId, obraId, dispatchedBy = 'system') => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      let obras = [];
      try { obras = require('../useStore').default.getState().obras; } catch { obras = []; }
      const obra = obras.find(o => o.id === obraId);
      if (!obra) return { success: false, error: 'Obra não encontrada' };

      const { machines } = get();
      const machine = machines.find(m => m.id === machineId);
      const ts = Timestamp.now();
      const expected = new Date(ts.toDate().getTime() + 48 * 60 * 60 * 1000);

      await updateDoc(doc(db, `${basePath}/machines`, machineId), {
        estadoOperacional: 'em_transito',
        despachoPendente: {
          obraId: obra.id,
          obraName: obra.name,
          dispatchedAt: ts,
          dispatchedBy,
          expectedArrivalAt: Timestamp.fromDate(expected),
          timeoutTriggered: false,
        },
      });

      await addDoc(collection(db, `${basePath}/machineLocationEvents`), {
        machineId,
        machineLabel: machine?.name || machineId,
        type: 'despacho_iniciado',
        from: machine?.localizacao?.obraName || 'Estaleiro',
        fromObraId: machine?.localizacao?.obraId || 'estaleiro',
        to: obra.name,
        toObraId: obra.id,
        timestamp: ts,
        cardId: null,
        confirmedDespacho: false,
        triggeredBy: dispatchedBy,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ========================================
  // LEGACY — SESSÕES COM ALERTAS
  // ========================================

  closeSession: async (sessionId, endTime = null) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const { sessions, machines } = get();
      let operators = [];
      let obras = [];
      try { const s = require('../useStore').default.getState(); operators = s.operators; obras = s.obras; } catch {}

      const session = sessions.find(s => s.id === sessionId);
      if (!session) return { success: false, error: 'Sessão não encontrada' };
      if (session.status !== 'OPEN') return { success: false, error: 'Sessão já fechada' };

      const now = endTime ? new Date(endTime) : new Date();
      const startDate = session.startTime?.toDate ? session.startTime.toDate() : new Date(session.startTime);
      const durationHours = (now - startDate) / (1000 * 60 * 60);

      let alertType = null;
      let isAutoClose = false;
      if (durationHours >= SESSION_THRESHOLDS.AUTO_CLOSE_HOURS) { alertType = 'AUTO_CLOSE'; isAutoClose = true; }
      else if (durationHours >= SESSION_THRESHOLDS.FATIGUE_HOURS) { alertType = 'FATIGUE'; }

      await updateDoc(doc(db, `${basePath}/sessions`, sessionId), {
        status: 'CLOSED',
        endTime: Timestamp.fromDate(now),
        durationHours,
        closedBy: isAutoClose ? 'SYSTEM_AUTO_CLOSE' : 'MANUAL',
        closedAt: Timestamp.now(),
      });

      if (session.machineId) {
        await updateDoc(doc(db, `${basePath}/machines`, session.machineId), {
          totalHours: increment(durationHours),
          partialHours: increment(durationHours),
          status: 'IDLE',
        });
      }

      if (alertType) {
        const machine = machines.find(m => m.id === session.machineId);
        const operator = operators.find(o => o.cardId === session.operatorId);
        const obra = obras.find(o => o.id === machine?.location?.workId);
        await get().createSessionAlert({
          type: alertType,
          sessionId: session.id,
          machineId: session.machineId,
          machineName: machine?.name || session.machineId,
          operatorId: session.operatorId,
          operatorName: operator?.name || 'Operador Desconhecido',
          operatorEmail: operator?.email || null,
          obraId: obra?.id || null,
          obraName: obra?.name || 'Sem obra',
          startTime: session.startTime,
          endTime: Timestamp.fromDate(now),
          durationHours,
        });
      }

      return { success: true, alertType, durationHours };
    } catch (error) {
      console.error('Erro ao fechar sessão legacy:', error);
      return { success: false, error: error.message };
    }
  },

  createSessionAlert: async (alertData) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let validationToken = '';
      for (let i = 0; i < 32; i++) validationToken += chars.charAt(Math.floor(Math.random() * chars.length));

      const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const alert = {
        id, validationToken,
        type: alertData.type,
        status: 'PENDING',
        sessionId: alertData.sessionId,
        machineId: alertData.machineId,
        machineName: alertData.machineName,
        operatorId: alertData.operatorId,
        operatorName: alertData.operatorName,
        operatorEmail: alertData.operatorEmail,
        obraId: alertData.obraId,
        obraName: alertData.obraName,
        originalStartTime: alertData.startTime,
        originalEndTime: alertData.endTime,
        originalDurationHours: alertData.durationHours,
        correctedStartTime: null,
        correctedEndTime: null,
        correctedDurationHours: null,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        validatedAt: null,
        validatedBy: null,
        operatorNotes: '',
        auditLog: [{ action: 'CREATED', timestamp: Timestamp.now(), details: `Alerta criado: ${alertData.type}` }],
      };
      await setDoc(doc(db, `${basePath}/alerts`, id), alert);
      return { success: true, id, validationToken };
    } catch (error) {
      console.error('Erro ao criar alerta legacy:', error);
      return { success: false, error: error.message };
    }
  },

  checkAndAutoCloseSessions: async () => {
    const { sessions } = get();
    const now = new Date();
    const sessionsToClose = sessions.filter(session => {
      if (session.status !== 'OPEN') return false;
      const startDate = session.startTime?.toDate ? session.startTime.toDate() : new Date(session.startTime);
      return (now - startDate) / (1000 * 60 * 60) >= SESSION_THRESHOLDS.AUTO_CLOSE_HOURS;
    });
    const results = [];
    for (const session of sessionsToClose) {
      results.push({ sessionId: session.id, ...await get().closeSession(session.id) });
    }
    return { success: true, closed: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results };
  },

  checkFatigueSessions: () => {
    const { sessions } = get();
    const now = new Date();
    return sessions.filter(session => {
      if (session.status !== 'OPEN') return false;
      const startDate = session.startTime?.toDate ? session.startTime.toDate() : new Date(session.startTime);
      const h = (now - startDate) / (1000 * 60 * 60);
      return h >= SESSION_THRESHOLDS.FATIGUE_HOURS && h < SESSION_THRESHOLDS.AUTO_CLOSE_HOURS;
    });
  },

  getOpenSessionsWithDuration: () => {
    const { sessions, machines } = get();
    let operators = [];
    try { operators = require('../useStore').default.getState().operators; } catch {}
    const now = new Date();
    return sessions
      .filter(s => s.status === 'OPEN')
      .map(session => {
        const startDate = session.startTime?.toDate ? session.startTime.toDate() : new Date(session.startTime);
        const hoursOpen = (now - startDate) / (1000 * 60 * 60);
        const machine = machines.find(m => m.id === session.machineId);
        const operator = operators.find(o => o.cardId === session.operatorId);
        return {
          ...session, hoursOpen,
          machineName: machine?.name || session.machineId,
          operatorName: operator?.name || 'Desconhecido',
          isFatigue: hoursOpen >= SESSION_THRESHOLDS.FATIGUE_HOURS,
          isAutoCloseWarning: hoursOpen >= SESSION_THRESHOLDS.AUTO_CLOSE_HOURS - 1,
          needsAutoClose: hoursOpen >= SESSION_THRESHOLDS.AUTO_CLOSE_HOURS,
        };
      })
      .sort((a, b) => b.hoursOpen - a.hoursOpen);
  },

  updateSession: async (sessionId, updates) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      await updateDoc(doc(db, `${basePath}/sessions`, sessionId), updates);
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar sessão legacy:', error);
      return { success: false, error: error.message };
    }
  },

  // ========================================
  // LEGACY — SELECTORS SESSIONS / MACHINES
  // ========================================

  getFilteredSessions: () => {
    // Necessita do dateFilter/customRange do store principal
    let dateFilter = 'month', customRange = null;
    try { const s = require('../useStore').default.getState(); dateFilter = s.dateFilter; customRange = s.customRange; } catch {}
    const { sessions } = get();
    if (!sessions.length) return [];
    const now = new Date();
    let startDate, endDate = now;
    switch (dateFilter) {
      case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'custom':
        if (!customRange?.start || !customRange?.end) return sessions;
        startDate = new Date(customRange.start); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customRange.end); endDate.setHours(23, 59, 59, 999); break;
      default: return sessions;
    }
    return sessions.filter(session => {
      if (!session.startTime) return false;
      const d = session.startTime.toDate ? session.startTime.toDate() : new Date(session.startTime);
      return d >= startDate && d <= endDate;
    });
  },

  getSessionsByObraId: (obraId, dateRange) => {
    const { sessions, machines } = get();
    const getObraId = (m) => m.obraId || m.localizacao?.obraId || m.location?.workId;
    const machineIds = new Set(machines.filter(m => getObraId(m) === obraId).map(m => m.id));
    const filtered = sessions.filter(s => machineIds.has(s.machineId));
    if (!dateRange) return filtered;
    const { start, end } = dateRange;
    return filtered.filter(s => {
      if (!s.startTime) return false;
      const d = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime);
      return d >= start && d <= end;
    });
  },

  getObraKPIs: (obraId, dateRange) => {
    const { machines } = get();
    let systemSettings = {};
    try { systemSettings = require('../useStore').default.getState().systemSettings || {}; } catch {}
    const getObraId = (m) => m.obraId || m.localizacao?.obraId || m.location?.workId;
    const obraMachines = machines.filter(m => getObraId(m) === obraId);
    const sessions = get().getSessionsByObraId(obraId, dateRange);
    const closed = sessions.filter(s => s.status === 'CLOSED' && s.durationHours);
    const totalHours = closed.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const activeSessions = sessions.filter(s => s.status === 'OPEN').length;
    const uniqueOperators = new Set(closed.map(s => s.operatorId).filter(Boolean)).size;
    const uniqueMachines = new Set(closed.map(s => s.machineId).filter(Boolean)).size;
    const co2Factor = systemSettings?.co2FactorPerLitre || 2.68;
    const totalCO2 = obraMachines.reduce((sum, m) => {
      const h = closed.filter(s => s.machineId === m.id).reduce((a, s) => a + (s.durationHours || 0), 0);
      return sum + (m.consumptionRate || 0) * h * co2Factor;
    }, 0);
    const totalFuel = obraMachines.reduce((sum, m) => {
      const h = closed.filter(s => s.machineId === m.id).reduce((a, s) => a + (s.durationHours || 0), 0);
      return sum + (m.consumptionRate || 0) * h;
    }, 0);
    const totalCost = closed.reduce((sum, s) => sum + (s.costs?.total || 0), 0);
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalCost: Math.round(totalCost),
      totalCO2: Math.round(totalCO2),
      totalFuel: Math.round(totalFuel),
      activeSessions,
      uniqueOperators,
      uniqueMachines,
      totalMachines: obraMachines.length,
    };
  },

  getMachinesByObraId: (obraId) => {
    const { machines } = get();
    const getObraId = (m) => m.obraId || m.localizacao?.obraId || m.location?.workId;
    return machines.filter(m => getObraId(m) === obraId);
  },

  getWorkersByObraId: (obraId, dateRange) => {
    let operators = [];
    try { operators = require('../useStore').default.getState().operators || []; } catch {}
    const sessions = get().getSessionsByObraId(obraId, dateRange);
    const opIds = [...new Set(sessions.map(s => s.operatorId).filter(Boolean))];
    return opIds.map(opId => {
      const op = operators.find(o => o.cardId === opId || o.id === opId);
      const opSessions = sessions.filter(s => s.operatorId === opId);
      const totalHours = opSessions.filter(s => s.status === 'CLOSED').reduce((sum, s) => sum + (s.durationHours || 0), 0);
      return { id: opId, name: op?.name || opId, sessions: opSessions.length, totalHours: Math.round(totalHours * 10) / 10 };
    }).sort((a, b) => b.totalHours - a.totalHours);
  },

  // ========================================
  // LEGACY — getKPIs (heavy machines)
  // ========================================

  getKPIs: () => {
    const { machines } = get();
    const filteredSessions = get().getFilteredSessions();

    const totalHours = filteredSessions.filter(s => s.status === 'CLOSED' && s.durationHours).reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const activeSessions = filteredSessions.filter(s => s.status === 'OPEN').length;
    const activeMachines = machines.filter(m => m.status === 'ACTIVE').length;
    const totalMachines = machines.length;
    const activeNowRate = totalMachines > 0 ? Math.round((activeMachines / totalMachines) * 100) : 0;

    // getPeriodCapacityHours reside no store principal (não cria dependência circular via require lazy)
    let capacityPerMachine = 8;
    try { capacityPerMachine = require('../useStore').default.getState().getPeriodCapacityHours?.() ?? 8; } catch {}
    const fleetCapacityHours = totalMachines * capacityPerMachine;
    const utilizationRate = fleetCapacityHours > 0 ? Math.min(100, Math.round((totalHours / fleetCapacityHours) * 100)) : 0;

    let systemSettings = {};
    try { systemSettings = require('../useStore').default.getState().systemSettings || {}; } catch {}

    const totalCO2 = machines.reduce((sum, machine) => {
      const machineSessions = filteredSessions.filter(s => s.machineId === machine.id && s.status === 'CLOSED');
      const machineHours = machineSessions.reduce((h, s) => h + (s.durationHours || 0), 0);
      return sum + (machine.consumptionRate || 0) * machineHours * 2.68;
    }, 0);

    const totalFuel = machines.reduce((sum, machine) => {
      const machineSessions = filteredSessions.filter(s => s.machineId === machine.id && s.status === 'CLOSED');
      const machineHours = machineSessions.reduce((h, s) => h + (s.durationHours || 0), 0);
      return sum + (machine.consumptionRate || 0) * machineHours;
    }, 0);

    const maintenanceAlertsCount = machines.filter(m => (m.partialHours || 0) >= 120).length;

    const { avarias } = useAvariasStore.getState();
    const resolvedFailures = avarias.filter(a => a.status === 'resolvida').length;
    const mtbf = resolvedFailures > 0 ? Math.round(totalHours / resolvedFailures) : null;

    const totalCost = totalHours * 35; // €/hora média legacy
    const downtime = fleetCapacityHours > 0 ? Math.round(((fleetCapacityHours - totalHours) / fleetCapacityHours) * 100) : 0;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      activeSessions,
      activeMachines,
      totalMachines,
      utilizationRate,
      activeNowRate,
      capacityPerMachine,
      totalCO2: Math.round(totalCO2),
      totalFuel: Math.round(totalFuel),
      maintenanceAlerts: maintenanceAlertsCount,
      mtbf,
      totalCost: Math.round(totalCost),
      downtime: Math.max(0, Math.min(100, downtime)),
    };
  },
}));

export default useLegacyMachinesStore;

/**
 * MIGRATION PATH:
 *
 * 1. (DONE C1) Estado `machines`/`sessions`/`maintenanceRecords` + actions
 *    movidos para este módulo. App.jsx inicializa `initializeLegacyListeners`.
 *
 * 2. (DONE C1) Componentes que referenciam `machines`/`sessions` recebem-nos via
 *    `useLegacyMachinesStore()` — torna a dependência legacy explícita via grep.
 *
 * 3. Quando o Procore exporter for migrado para `tool_sessions`, apagar este
 *    ficheiro e os imports residuais.
 */
