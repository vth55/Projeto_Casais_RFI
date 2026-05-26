import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc, getDoc, addDoc, Timestamp, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, projectId } from '../config/firebase';
import { createCollectionListener, createDocumentListener } from '../utils/firestoreListeners';
import { createCrudActions } from '../utils/firestoreCrud';
import useAvariasStore from './useAvariasStore';

const basePath = `artifacts/${projectId}/public/data`;

// CRUD actions instanciadas uma vez por coleção (não por chamada)
const machineActions      = createCrudActions(db, `${basePath}/machines`);
const operatorActions     = createCrudActions(db, `${basePath}/operators`);
const scheduleActions     = createCrudActions(db, `${basePath}/maintenance_schedules`);
const cardActions         = createCrudActions(db, `${basePath}/location_cards`);
const obraActions         = createCrudActions(db, `${basePath}/obras`);

// Constantes para alertas de sessão
const SESSION_THRESHOLDS = {
  FATIGUE_HOURS: 5,    // Alerta de fadiga após 5h
  AUTO_CLOSE_HOURS: 14, // Auto-fechar após 14h
};

// Store principal da aplicação
const UI_FIELDS = [
  'id', 'totalHours', 'sessionCount', 'isActive',
  'assignedObraName', 'systemRoleName', 'systemRoleLevel',
  'syncStatus', 'lastScannedCard', 'totalWorkHours'
];

const sanitizeData = (data) => {
  const clean = { ...data };
  UI_FIELDS.forEach(field => delete clean[field]);
  // Remover qualquer outro campo que seja undefined
  return Object.fromEntries(
    Object.entries(clean).filter(([_, v]) => v !== undefined)
  );
};

const useStore = create((set, get) => ({
  // Estado
  sessions: [],         // legacy — heavy machines RFID sessions (a remover gradualmente)
  machines: [],         // legacy — heavy machines (a remover gradualmente)
  tools: [],            // novo — small tools NFC (modelo activo pós-pivot 2026-05)
  toolSessions: [],     // novo — checkout/checkin NFC das ferramentas
  toolAlerts: [],       // novo — anomalias detectadas (TOOL_OVERDUE, NO_LOCATION, etc.) ver types.js
  toolMaintenance: [],  // novo — inspeção/dano/reparação/calibração/perda (ver types.js)
  toolMovements: [],    // novo — auditoria de transferências obra↔armazém
  operators: [],
  obras: [],
  maintenanceRecords: [],
  locationCards: [], // Cartões RFID de localização
  // Procore — subcoleções sincronizadas via runFullSync (read-only mirror)
  // Path: artifacts/{projectId}/public/data/integrations/procore/{projects,directory,equipment}
  procoreProjects: [],
  procoreDirectory: [],
  procoreEquipment: [],
  // Parâmetros operacionais do sistema (settings/system)
  // Parâmetros operacionais do sistema (settings/system)
  systemSettings: {
    fuelPricePerLitre: 1.89,
    co2FactorPerLitre: 2.68,
    defaultMaintenanceInterval: 150,
    toolOverdueDays: 7,   // pivot — dias antes de disparar TOOL_OVERDUE
    toolLostDays: 30,     // pivot — dias antes de TOOL_PRESUMED_LOST
  },
  maintenanceSchedules: [],
  loading: true,
  error: null,
  activeView: 'dashboard',
  sidebarOpen: false,
  dateFilter: 'month', // 'today' | 'week' | 'month' | 'custom'
  customRange: null,   // { start: Date, end: Date } — usado quando dateFilter === 'custom'
  latestScanBuffer: null,

  // Setters simples
  setActiveView: (view) => set({ activeView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDateFilter: (filter) => set({ dateFilter: filter }),
  setCustomRange: (range) => set({ customRange: range, dateFilter: 'custom' }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Inicializar listeners Firestore
  initializeListeners: () => {
    if (!db) {
      set({ error: 'Firestore não inicializado', loading: false });
      return () => { };
    }

    const unsubscribers = [];

    // Sessions listener
    const createSessionsListener = createCollectionListener(db, `${basePath}/sessions`, {
      orderByField: 'startTime',
      orderByDirection: 'desc',
      onError: (msg, error) => console.error('Erro sessions:', error),
    });
    unsubscribers.push(
      createSessionsListener((data) => set({ sessions: data }))
    );

    // Machines listener — filtra máquinas marcadas como [REMOVIDO] no Procore
    const createMachinesListener = createCollectionListener(db, `${basePath}/machines`, {
      onError: (msg, error) => console.error('Erro machines:', error),
    });
    unsubscribers.push(
      createMachinesListener((data) => {
        const visible = (data || []).filter(m => !String(m.name || '').startsWith('[REMOVIDO]'));
        set({ machines: visible, loading: false });
      })
    );

    // ============================================
    // TOOLS + TOOL_SESSIONS — pivot 2026-05 (small tools NFC)
    // ============================================
    // Coexistem com sessions/machines durante a migração. Procore continua
    // a sincronizar sessions/machines em background. Views novas consomem
    // tools/toolSessions; fluxo NFC do ToolTagPage escreve em tool_sessions.
    const createToolsListener = createCollectionListener(db, `${basePath}/tools`, {
      onError: (msg, error) => console.debug('[tools] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      createToolsListener((data) => set({ tools: data || [] }))
    );

    const createToolSessionsListener = createCollectionListener(db, `${basePath}/tool_sessions`, {
      orderByField: 'startTime',
      orderByDirection: 'desc',
      onError: (msg, error) => console.debug('[tool_sessions] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      createToolSessionsListener((data) => set({ toolSessions: data || [] }))
    );

    // tool_alerts — anomalias TOOL_OVERDUE/NO_LOCATION/etc. (schema em src/types.js)
    const createToolAlertsListener = createCollectionListener(db, `${basePath}/tool_alerts`, {
      orderByField: 'createdAt',
      orderByDirection: 'desc',
      onError: (msg, error) => console.debug('[tool_alerts] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      createToolAlertsListener((data) => set({ toolAlerts: data || [] }))
    );

    // tool_maintenance — inspeção/dano/reparação/calibração/perda (schema em src/types.js)
    const createToolMaintenanceListener = createCollectionListener(db, `${basePath}/tool_maintenance`, {
      orderByField: 'reportedAt',
      orderByDirection: 'desc',
      onError: (msg, error) => console.debug('[tool_maintenance] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      createToolMaintenanceListener((data) => set({ toolMaintenance: data || [] }))
    );

    // tool_movements — histórico de transferências obra↔armazém
    const createToolMovementsListener = createCollectionListener(db, `${basePath}/tool_movements`, {
      orderByField: 'movedAt',
      orderByDirection: 'desc',
      onError: (msg, error) => console.debug('[tool_movements] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      createToolMovementsListener((data) => set({ toolMovements: data || [] }))
    );

    // Operators listener
    const createOperatorsListener = createCollectionListener(db, `${basePath}/operators`, {
      onError: (msg, error) => console.error('Erro operators:', error),
    });
    unsubscribers.push(
      createOperatorsListener((data) => set({ operators: data }))
    );

    // Maintenance records listener
    const createMaintenanceListener = createCollectionListener(db, `${basePath}/maintenance`, {
      onError: (msg, error) => console.error('Erro maintenance:', error),
    });
    unsubscribers.push(
      createMaintenanceListener((data) => set({ maintenanceRecords: data }))
    );

    // Obras listener
    const createObrasListener = createCollectionListener(db, `${basePath}/obras`, {
      onError: (msg, error) => console.error('Erro obras:', error),
    });
    unsubscribers.push(
      createObrasListener((data) => set({ obras: data }))
    );

    // Location Cards listener (cartões RFID de localização)
    const createLocationCardsListener = createCollectionListener(db, `${basePath}/location_cards`, {
      onError: (msg, error) => console.error('Erro location_cards:', error),
    });
    unsubscribers.push(
      createLocationCardsListener((data) => set({ locationCards: data }))
    );

    // ============================================
    // PROCORE — subcoleções espelho (read-only)
    // ============================================
    // Dados escritos pelo backend (runFullSync em procoreBridge.js). Aqui só lemos
    // para enriquecer as vistas locais com badges de sincronização. Qualquer erro
    // (permissões, integração ainda não conectada) é silenciado para não quebrar
    // a app quando o Procore ainda não foi autorizado.
    const procoreBase = `${basePath}/integrations/procore`;
    const procoreCollections = [
      { name: 'projects', stateKey: 'procoreProjects' },
      { name: 'directory', stateKey: 'procoreDirectory' },
      { name: 'equipment', stateKey: 'procoreEquipment' },
    ];
    procoreCollections.forEach(({ name, stateKey }) => {
      const createProcoreListener = createCollectionListener(
        db,
        `${procoreBase}/${name}`,
        {
          onError: (msg, error) => console.debug(`[procore:${name}] listener off:`, error?.code || error?.message),
        }
      );
      unsubscribers.push(
        createProcoreListener((data) => set({ [stateKey]: data }))
      );
    });

    // ============================================
    // SYSTEM SETTINGS — parâmetros operacionais
    // ============================================
    const createSettingsListener = createDocumentListener(
      db,
      `${basePath}/settings/system`,
      {
        onError: (msg, error) => console.debug('[settings:system] listener off:', error?.code || error?.message),
      }
    );
    unsubscribers.push(
      createSettingsListener((docData) => {
        if (docData) {
          set({
            systemSettings: {
              fuelPricePerLitre: docData.fuelPricePerLitre ?? 1.89,
              co2FactorPerLitre: docData.co2FactorPerLitre ?? 2.68,
              defaultMaintenanceInterval: docData.defaultMaintenanceInterval ?? 150,
              toolOverdueDays: docData.toolOverdueDays ?? 7,
              toolLostDays: docData.toolLostDays ?? 30,
            },
          });
        }
      })
    );

    // Maintenance Schedules listener
    const createSchedulesListener = createCollectionListener(
      db,
      `${basePath}/maintenance_schedules`,
      {
        onError: (msg, error) => console.debug('[maintenance_schedules] listener off:', error?.code || error?.message),
      }
    );
    unsubscribers.push(
      createSchedulesListener((data) => set({ maintenanceSchedules: data }))
    );

    return () => unsubscribers.forEach(unsub => unsub());
  },

  updateSystemSettings: async (newSettings) => {
    const ref = doc(db, `${basePath}/settings/system`);
    await setDoc(ref, {
      ...newSettings,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  },

  getMaintenanceInterval: (machine) => {
    const { systemSettings } = get();
    return machine?.maintenanceInterval || systemSettings.defaultMaintenanceInterval || 150;
  },

  getCo2Factor: (machine) => {
    const { systemSettings } = get();
    return machine?.co2Factor || systemSettings.co2FactorPerLitre || 2.68;
  },

  // ============================================
  // MAINTENANCE SCHEDULES — agendamentos manuais
  // ============================================

  addMaintenanceSchedule: async (scheduleData) => {
    return scheduleActions.create(undefined, {
      ...scheduleData,
      status: 'scheduled',
    }, { idPrefix: 'sched' });
  },

  updateMaintenanceSchedule: async (id, data) => {
    return scheduleActions.update(id, data, { includeTimestamp: false });
  },

  deleteMaintenanceSchedule: async (id) => {
    return scheduleActions.delete(id);
  },

  // ============================================
  // IA PREDITIVA — projeção de manutenção
  // ============================================

  getSmartMaintenancePrediction: (machine) => {
    const { sessions, systemSettings } = get();
    const interval = machine?.maintenanceInterval || systemSettings.defaultMaintenanceInterval || 150;
    const partial = machine?.partialHours || 0;
    const remaining = interval - partial;

    if (remaining <= 0) {
      return { predictedDate: new Date(), daysLeft: 0, avgHoursPerDay: 0, remaining: 0, interval, confidence: 'overdue' };
    }

    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentSessions = sessions.filter(s => {
      if (s.machineId !== machine?.id || s.status !== 'CLOSED') return false;
      const end = s.endTime?.toDate?.() || new Date(s.endTime);
      return end >= twoWeeksAgo;
    });

    let totalHoursLast14Days = 0;
    recentSessions.forEach(s => {
      totalHoursLast14Days += s.durationHours || 0;
    });

    // Dias úteis nos últimos 14 dias
    let workDaysInWindow = 0;
    for (let d = new Date(twoWeeksAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) workDaysInWindow++;
    }

    const avgHoursPerDay = workDaysInWindow > 0 ? totalHoursLast14Days / workDaysInWindow : 8;
    const effectiveAvg = avgHoursPerDay > 0 ? avgHoursPerDay : 8;

    const workDaysNeeded = Math.ceil(remaining / effectiveAvg);
    const predictedDate = new Date();
    let added = 0;
    while (added < workDaysNeeded) {
      predictedDate.setDate(predictedDate.getDate() + 1);
      const dow = predictedDate.getDay();
      if (dow !== 0 && dow !== 6) added++;
    }

    const daysLeft = Math.round((predictedDate - now) / (1000 * 60 * 60 * 24));
    const confidence = recentSessions.length >= 5 ? 'high' : recentSessions.length >= 2 ? 'medium' : 'low';

    return { predictedDate, daysLeft, avgHoursPerDay: Math.round(effectiveAvg * 10) / 10, remaining: Math.round(remaining), interval, confidence };
  },

  // ============================================
  // PROCORE — Helpers de matching (Fase 2)
  // ============================================
  // Matching por nome normalizado entre entidades locais e o mirror Procore.
  // Não é merge: o registo local permanece fonte de verdade. Só devolve o
  // registo Procore correspondente para uso em badges e tooltips.

  // Encontra o projeto Procore correspondente a uma obra local (match por nome).
  // Retorna { matched: boolean, procoreProject: object|null }
  matchObraToProcore: (obra) => {
    if (!obra?.name) return { matched: false, procoreProject: null };
    const { procoreProjects } = get();
    if (!procoreProjects.length) return { matched: false, procoreProject: null };

    const normalize = (s) => String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    const target = normalize(obra.name);
    if (!target) return { matched: false, procoreProject: null };

    const hit = procoreProjects.find(p => {
      if (!p) return false;
      const pName = normalize(p.name || p.display_name || p.project_number);
      return pName && (pName === target || pName.includes(target) || target.includes(pName));
    });

    return { matched: !!hit, procoreProject: hit || null };
  },

  // Encontra o user Procore correspondente a um operador local.
  // Match por email (primário) ou nome normalizado (fallback).
  matchOperatorToProcore: (operator) => {
    if (!operator) return { matched: false, procoreUser: null };
    const { procoreDirectory } = get();
    if (!procoreDirectory.length) return { matched: false, procoreUser: null };

    // 1. Email é o identificador mais fiável
    if (operator.email) {
      const emailLower = operator.email.toLowerCase().trim();
      const byEmail = procoreDirectory.find(
        u => (u.email_address || u.email || '').toLowerCase().trim() === emailLower
      );
      if (byEmail) return { matched: true, procoreUser: byEmail };
    }

    // 2. Fallback por nome
    if (operator.name) {
      const normalize = (s) => String(s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      const target = normalize(operator.name);
      const byName = procoreDirectory.find(u => {
        const full = normalize(u.name || `${u.first_name || ''} ${u.last_name || ''}`);
        return full && full === target;
      });
      if (byName) return { matched: true, procoreUser: byName };
    }

    return { matched: false, procoreUser: null };
  },

  // ============================================
  // RFID PROVISIONING — scan_buffer listener
  // ============================================
  // On-demand Firestore listener for the scan_buffer/latest document.
  // Activated by the operator creation modal to capture card scans in real-time.
  // Returns an unsubscribe function — the caller controls the lifecycle.
  subscribeScanBuffer: () => {
    if (!db) return () => { };
    const scanRef = doc(db, `${basePath}/scan_buffer`, 'latest');
    const unsub = onSnapshot(scanRef,
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        set({
          latestScanBuffer: {
            cardId: d.cardId,
            machineId: d.machineId || null,
            timestamp: d.timestamp?.toMillis?.() || (d.timestamp?.seconds ? d.timestamp.seconds * 1000 : Date.now()),
          },
        });
      },
      () => { } // silent — scan_buffer may not exist yet
    );
    return () => {
      unsub();
      set({ latestScanBuffer: null });
    };
  },

  // ============================================
  // GESTÃO DE CARTÕES DE LOCALIZAÇÃO (RFID)
  // ============================================

  // Criar cartão de localização
  addLocationCard: async (cardData) => {
    const cardId = cardData.cardId || `LOC_${Date.now()}`;
    const normalizedId = cardId.toUpperCase().startsWith('LOC_')
      ? cardId.toUpperCase()
      : `LOC_${cardId.toUpperCase()}`;

    const card = sanitizeData({
      ...cardData,
      id: normalizedId,
      obraId: cardData.obraId,
      obraName: cardData.obraName,
      gps: cardData.gps || null,
      description: cardData.description || '',
      active: true,
    });

    return cardActions.create(normalizedId, card);
  },

  // Atualizar cartão de localização
  updateLocationCard: async (cardId, updates) => {
    const cleanUpdates = sanitizeData(updates);
    return cardActions.update(cardId, cleanUpdates);
  },

  // Eliminar cartão de localização
  deleteLocationCard: async (cardId) => {
    const result = await cardActions.delete(cardId);
    if (!result.success) {
      console.error('Erro ao eliminar cartão:', result.error);
    }
    return result;
  },

  // Obter cartões de uma obra específica
  getLocationCardsByObra: (obraId) => {
    const { locationCards } = get();
    return locationCards.filter(card => card.obraId === obraId);
  },

  // ============================================
  // GESTÃO DE FOTOS (Firebase Storage)
  // ============================================

  // Upload de foto para manutenção
  uploadMaintenancePhoto: async (file, maintenanceId) => {
    if (!storage) return { success: false, error: 'Storage não inicializado' };

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storagePath = `maintenance/${maintenanceId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload do arquivo
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        photo: {
          id: `photo_${timestamp}`,
          name: file.name,
          url: downloadURL,
          path: storagePath,
          size: file.size,
          type: file.type,
          uploadedAt: Timestamp.now(),
        },
      };
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      return { success: false, error: error.message };
    }
  },

  // Eliminar foto de manutenção
  deleteMaintenancePhoto: async (photoPath) => {
    if (!storage) return { success: false, error: 'Storage não inicializado' };

    try {
      const photoRef = ref(storage, photoPath);
      await deleteObject(photoRef);
      return { success: true };
    } catch (error) {
      console.error('Erro ao eliminar foto:', error);
      return { success: false, error: error.message };
    }
  },

  // Sessões filtradas por período
  getFilteredSessions: () => {
    const { sessions, dateFilter, customRange } = get();
    if (!sessions.length) return [];

    const now = new Date();
    let startDate;
    let endDate = now;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        if (!customRange?.start || !customRange?.end) return sessions;
        startDate = new Date(customRange.start);
        startDate.setHours(0, 0, 0, 0); // Início do primeiro dia
        endDate = new Date(customRange.end);
        endDate.setHours(23, 59, 59, 999); // Fim do último dia
        break;
      default:
        return sessions;
    }

    return sessions.filter(session => {
      if (!session.startTime) return false;
      const sessionDate = session.startTime.toDate
        ? session.startTime.toDate()
        : new Date(session.startTime);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  },

  // Horas úteis disponíveis por máquina no período ativo
  // Considera 8h/dia em dias úteis (seg-sex). Nunca retorna 0 para evitar divisão por zero.
  getPeriodCapacityHours: () => {
    const { dateFilter, customRange } = get();
    const now = new Date();
    let startDate;
    let endDay = now;

    switch (dateFilter) {
      case 'today':
        return 8;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        if (!customRange?.start || !customRange?.end) return 8;
        startDate = new Date(customRange.start);
        endDay = new Date(customRange.end);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let businessDays = 0;
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    const endCursor = new Date(endDay);
    endCursor.setHours(0, 0, 0, 0);
    while (cursor <= endCursor) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) businessDays += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return Math.max(8, businessDays * 8);
  },

  // KPIs calculados
  getKPIs: () => {
    const { machines } = get();
    const filteredSessions = get().getFilteredSessions();

    // Total de horas
    const totalHours = filteredSessions
      .filter(s => s.status === 'CLOSED' && s.durationHours)
      .reduce((sum, s) => sum + (s.durationHours || 0), 0);

    // Sessões ativas
    const activeSessions = filteredSessions.filter(s => s.status === 'OPEN').length;

    // Máquinas ativas vs total
    const activeMachines = machines.filter(m => m.status === 'ACTIVE').length;
    const totalMachines = machines.length;

    // activeNowRate — % de máquinas atualmente em estado ACTIVE (snapshot instantâneo)
    const activeNowRate = totalMachines > 0
      ? Math.round((activeMachines / totalMachines) * 100)
      : 0;

    // utilizationRate — padrão da indústria (Volvo/CAT/Komatsu):
    // horas realmente trabalhadas ÷ capacidade disponível no período
    const capacityPerMachine = get().getPeriodCapacityHours();
    const fleetCapacityHours = totalMachines * capacityPerMachine;
    const utilizationRate = fleetCapacityHours > 0
      ? Math.min(100, Math.round((totalHours / fleetCapacityHours) * 100))
      : 0;

    // Emissões CO₂ (fórmula: horas × consumo L/h × 2.68 kg/L)
    const totalCO2 = machines.reduce((sum, machine) => {
      const machineSessions = filteredSessions.filter(
        s => s.machineId === machine.id && s.status === 'CLOSED'
      );
      const machineHours = machineSessions.reduce((h, s) => h + (s.durationHours || 0), 0);
      const consumption = (machine.consumptionRate || 0) * machineHours;
      return sum + consumption * 2.68;
    }, 0);

    // Consumo total de combustível
    const totalFuel = machines.reduce((sum, machine) => {
      const machineSessions = filteredSessions.filter(
        s => s.machineId === machine.id && s.status === 'CLOSED'
      );
      const machineHours = machineSessions.reduce((h, s) => h + (s.durationHours || 0), 0);
      return sum + (machine.consumptionRate || 0) * machineHours;
    }, 0);

    // Alertas de manutenção (>80% de 150h = 120h)
    // Usando apenas partialHours (horas desde a última revisão)
    const maintenanceAlertsCount = machines.filter(m => {
      const hours = m.partialHours || 0;
      return hours >= 120;
    }).length;

    // MTBF Real — Mean Time Between Failures (standard industrial)
    // Numerador: horas operacionais no período (totalHours)
    // Denominador: nº de avarias RESOLVIDAS (operating time between failures)
    // Se não houver falhas registadas, devolve null (UI mostra "—")
    const { avarias } = useAvariasStore.getState();
    const resolvedFailures = avarias.filter(a => a.status === 'resolvida').length;
    const mtbf = resolvedFailures > 0
      ? Math.round(totalHours / resolvedFailures)
      : null;

    // Custo operacional estimado
    const costPerHour = 35; // €/hora média
    const totalCost = totalHours * costPerHour;

    // Downtime — coerente com utilizationRate (complementar à capacidade do período)
    const downtime = fleetCapacityHours > 0
      ? Math.round(((fleetCapacityHours - totalHours) / fleetCapacityHours) * 100)
      : 0;

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

  // Actions para máquinas
  addMachine: async (machineData) => {
    const cleanMachine = sanitizeData({
      ...machineData,
      totalHours: 0,
      partialHours: 0,
      status: 'IDLE',
    });
    return machineActions.create(
      machineData.id || undefined,
      cleanMachine,
      { idPrefix: 'machine' }
    );
  },

  updateMachine: async (id, data) => {
    const cleanData = sanitizeData(data);
    return machineActions.update(id, cleanData);
  },

  deleteMachine: async (id) => {
    return machineActions.delete(id);
  },

  // Actions para operadores
  addOperator: async (operatorData) => {
    const cleanOperator = sanitizeData(operatorData);
    return operatorActions.create(
      operatorData.cardId || undefined,
      cleanOperator,
      { idPrefix: 'op' }
    );
  },

  deleteOperator: async (id) => {
    return operatorActions.delete(id);
  },

  updateOperator: async (id, data) => {
    const cleanData = sanitizeData(data);
    return operatorActions.update(id, cleanData);
  },

  // Definir novo tarifário versionado numa máquina
  // Arquiva automaticamente o tarifário anterior e cria o novo como currentTariff
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

      // Arquivar tarifário anterior: fechar validUntil no dia de hoje
      const oldTariff = machine.currentTariff;
      let history = machine.tariffHistory ? [...machine.tariffHistory] : [];

      if (oldTariff) {
        const closedOld = { ...oldTariff, validUntil: now };
        const idx = history.findIndex(t => t.id === oldTariff.id);
        if (idx >= 0) history[idx] = closedOld;
        else history.push(closedOld);
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

  // Registar manutenção
  addMaintenanceRecord: async (record) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const id = `maint_${Date.now()}`;
      await setDoc(doc(db, `${basePath}/maintenance`, id), {
        ...record,
        id,
        photos: record.photos || [],
        createdAt: Timestamp.now(),
      });

      // Reset partial hours da máquina
      if (record.machineId) {
        await updateDoc(doc(db, `${basePath}/machines`, record.machineId), {
          partialHours: 0,
          lastMaintenance: Timestamp.now(),
        });
      }

      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Adicionar foto a um registo de manutenção existente
  addPhotoToMaintenance: async (maintenanceId, photo) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const { maintenanceRecords } = get();
      const record = maintenanceRecords.find(r => r.id === maintenanceId);
      const currentPhotos = record?.photos || [];

      await updateDoc(doc(db, `${basePath}/maintenance`, maintenanceId), {
        photos: [...currentPhotos, photo],
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Remover foto de um registo de manutenção
  removePhotoFromMaintenance: async (maintenanceId, photoId, photoPath) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      // Eliminar do Storage
      if (photoPath) {
        await get().deleteMaintenancePhoto(photoPath);
      }

      // Atualizar Firestore
      const { maintenanceRecords } = get();
      const record = maintenanceRecords.find(r => r.id === maintenanceId);
      const updatedPhotos = (record?.photos || []).filter(p => p.id !== photoId);

      await updateDoc(doc(db, `${basePath}/maintenance`, maintenanceId), {
        photos: updatedPhotos,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Actions para obras
  addObra: async (obraData) => {
    const id = obraData.code || undefined;
    return obraActions.create(id, obraData, { idPrefix: 'obra' });
  },

  updateObra: async (id, data) => {
    const cleanData = sanitizeData(data);
    return obraActions.update(id, cleanData);
  },

  deleteObra: async (id) => {
    return obraActions.delete(id);
  },

  // Mover máquinas para uma obra
  moveMachinesToObra: async (machineIds, obraId) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const { obras } = get();
      const isEstaleiro = obraId === 'estaleiro' || !obraId;
      const obra = isEstaleiro ? null : obras.find(o => o.id === obraId);

      const { machines } = get();
      for (const machineId of machineIds) {
        const machine = machines.find(m => m.id === machineId);
        const prevLocalizacao = machine?.localizacao || null;
        const prevLocation = machine?.location || null;
        const fromName = prevLocalizacao?.obraName || prevLocation?.workName || 'Sem localização';
        const fromObraId = prevLocalizacao?.obraId || prevLocation?.workId || null;
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

  // Despachar máquina para obra (cria despachoPendente, RFID confirma chegada)
  dispatchMachine: async (machineId, obraId, dispatchedBy = 'system') => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const { obras, machines } = get();
      const obra = obras.find(o => o.id === obraId);
      if (!obra) return { success: false, error: 'Obra não encontrada' };

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
  // GESTÃO DE SESSÕES COM ALERTAS
  // ========================================

  // Fechar sessão e verificar se precisa de alerta
  closeSession: async (sessionId, endTime = null) => {
    if (!db) return { success: false, error: 'DB não inicializado' };

    try {
      const { sessions, machines, operators, obras } = get();
      const session = sessions.find(s => s.id === sessionId);

      if (!session) return { success: false, error: 'Sessão não encontrada' };
      if (session.status !== 'OPEN') return { success: false, error: 'Sessão já fechada' };

      const now = endTime ? new Date(endTime) : new Date();
      const startDate = session.startTime?.toDate
        ? session.startTime.toDate()
        : new Date(session.startTime);
      const durationHours = (now - startDate) / (1000 * 60 * 60);

      // Verificar se precisa de alerta
      let alertType = null;
      let isAutoClose = false;

      if (durationHours >= SESSION_THRESHOLDS.AUTO_CLOSE_HOURS) {
        alertType = 'AUTO_CLOSE';
        isAutoClose = true;
      } else if (durationHours >= SESSION_THRESHOLDS.FATIGUE_HOURS) {
        alertType = 'FATIGUE';
      }

      // Fechar a sessão
      await updateDoc(doc(db, `${basePath}/sessions`, sessionId), {
        status: 'CLOSED',
        endTime: Timestamp.fromDate(now),
        durationHours: durationHours,
        closedBy: isAutoClose ? 'SYSTEM_AUTO_CLOSE' : 'MANUAL',
        closedAt: Timestamp.now(),
      });

      // Acumular horas na máquina e repor status IDLE
      if (session.machineId) {
        await updateDoc(doc(db, `${basePath}/machines`, session.machineId), {
          totalHours: increment(durationHours),
          partialHours: increment(durationHours),
          status: 'IDLE',
        });
      }

      // Criar alerta se necessário
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
          durationHours: durationHours,
        });
      }

      return { success: true, alertType, durationHours };
    } catch (error) {
      console.error('Erro ao fechar sessão:', error);
      return { success: false, error: error.message };
    }
  },

  // Criar alerta de sessão
  createSessionAlert: async (alertData) => {
    if (!db) return { success: false, error: 'DB não inicializado' };

    try {
      // Gerar token único para URL de validação
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let validationToken = '';
      for (let i = 0; i < 32; i++) {
        validationToken += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const alert = {
        id,
        validationToken,
        type: alertData.type,
        status: 'PENDING',

        // Dados da sessão
        sessionId: alertData.sessionId,
        machineId: alertData.machineId,
        machineName: alertData.machineName,
        operatorId: alertData.operatorId,
        operatorName: alertData.operatorName,
        operatorEmail: alertData.operatorEmail,
        obraId: alertData.obraId,
        obraName: alertData.obraName,

        // Horários originais
        originalStartTime: alertData.startTime,
        originalEndTime: alertData.endTime,
        originalDurationHours: alertData.durationHours,

        // Horários corrigidos (preenchidos após validação)
        correctedStartTime: null,
        correctedEndTime: null,
        correctedDurationHours: null,

        // Metadados
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        validatedAt: null,
        validatedBy: null,

        // Notas
        operatorNotes: '',

        // Auditoria
        auditLog: [
          {
            action: 'CREATED',
            timestamp: Timestamp.now(),
            details: `Alerta criado: ${alertData.type}`,
          },
        ],
      };

      await setDoc(doc(db, `${basePath}/alerts`, id), alert);

      // TODO: Enviar email para o operador (implementar com Cloud Function)
      console.log(`📧 Alerta criado: ${alertData.type} para ${alertData.operatorEmail}`);
      console.log(`   URL: ${window.location.origin}/validar/${validationToken}`);

      return { success: true, id, validationToken };
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar e processar sessões que precisam de auto-close
  checkAndAutoCloseSessions: async () => {
    const { sessions } = get();
    const now = new Date();
    const results = [];

    // Encontrar sessões abertas há mais de 14 horas
    const sessionsToClose = sessions.filter(session => {
      if (session.status !== 'OPEN') return false;

      const startDate = session.startTime?.toDate
        ? session.startTime.toDate()
        : new Date(session.startTime);
      const hoursOpen = (now - startDate) / (1000 * 60 * 60);

      return hoursOpen >= SESSION_THRESHOLDS.AUTO_CLOSE_HOURS;
    });

    // Fechar cada sessão automaticamente
    for (const session of sessionsToClose) {
      const result = await get().closeSession(session.id);
      results.push({ sessionId: session.id, ...result });
    }

    return {
      success: true,
      closed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  },

  // Verificar sessões abertas que precisam de alerta de fadiga (mas não auto-close)
  checkFatigueSessions: () => {
    const { sessions } = get();
    const now = new Date();

    return sessions.filter(session => {
      if (session.status !== 'OPEN') return false;

      const startDate = session.startTime?.toDate
        ? session.startTime.toDate()
        : new Date(session.startTime);
      const hoursOpen = (now - startDate) / (1000 * 60 * 60);

      return hoursOpen >= SESSION_THRESHOLDS.FATIGUE_HOURS &&
        hoursOpen < SESSION_THRESHOLDS.AUTO_CLOSE_HOURS;
    });
  },

  // Obter sessões abertas com estatísticas de duração
  getOpenSessionsWithDuration: () => {
    const { sessions, machines, operators } = get();
    const now = new Date();

    return sessions
      .filter(s => s.status === 'OPEN')
      .map(session => {
        const startDate = session.startTime?.toDate
          ? session.startTime.toDate()
          : new Date(session.startTime);
        const hoursOpen = (now - startDate) / (1000 * 60 * 60);

        const machine = machines.find(m => m.id === session.machineId);
        const operator = operators.find(o => o.cardId === session.operatorId);

        return {
          ...session,
          hoursOpen,
          machineName: machine?.name || session.machineId,
          operatorName: operator?.name || 'Desconhecido',
          isFatigue: hoursOpen >= SESSION_THRESHOLDS.FATIGUE_HOURS,
          isAutoCloseWarning: hoursOpen >= SESSION_THRESHOLDS.AUTO_CLOSE_HOURS - 1, // 1h antes
          needsAutoClose: hoursOpen >= SESSION_THRESHOLDS.AUTO_CLOSE_HOURS,
        };
      })
      .sort((a, b) => b.hoursOpen - a.hoursOpen); // Mais longas primeiro
  },

  // Atualizar sessão genérica (para uso administrativo)
  updateSession: async (sessionId, updates) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      await updateDoc(doc(db, `${basePath}/sessions`, sessionId), updates);
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      return { success: false, error: error.message };
    }
  },

  // Resolver anomalia de sessão (admin dashboard — preserva original vs corrigido)
  resolveSessionAnomaly: async (sessionId, { correctedStart, correctedEnd, correctedHours, notes, action }) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const { sessions } = get();
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return { success: false, error: 'Sessão não encontrada' };

      const updates = {
        validationStatus: 'RESOLVED',
        validatedAt: Timestamp.now(),
        validationNotes: notes || '',
      };

      if (action === 'correct' && correctedHours != null) {
        // Correcção por horas: manter startTime, recalcular endTime
        const startDate = session.startTime?.toDate ? session.startTime.toDate() : new Date(session.startTime);
        const durationHours = parseFloat(correctedHours);
        const endDate = new Date(startDate.getTime() + durationHours * 3600000);

        updates.originalStartTime = session.startTime;
        updates.originalEndTime = session.endTime;
        updates.originalDurationHours = session.durationHours;
        updates.startTime = Timestamp.fromDate(startDate);
        updates.endTime = Timestamp.fromDate(endDate);
        updates.durationHours = durationHours;
        updates.correctedByAdmin = true;
        updates.correctedAt = Timestamp.now();
      } else if (action === 'correct' && correctedStart && correctedEnd) {
        const start = correctedStart instanceof Date ? correctedStart : new Date(correctedStart);
        const end = correctedEnd instanceof Date ? correctedEnd : new Date(correctedEnd);
        const durationHours = (end - start) / (1000 * 60 * 60);

        // Preservar valores originais antes de sobrescrever
        updates.originalStartTime = session.startTime;
        updates.originalEndTime = session.endTime;
        updates.originalDurationHours = session.durationHours;
        // Aplicar correção
        updates.startTime = Timestamp.fromDate(start);
        updates.endTime = Timestamp.fromDate(end);
        updates.durationHours = durationHours;
        updates.correctedByAdmin = true;
        updates.correctedAt = Timestamp.now();
      }

      await updateDoc(doc(db, `${basePath}/sessions`, sessionId), updates);
      return { success: true };
    } catch (error) {
      console.error('Erro ao resolver anomalia:', error);
      return { success: false, error: error.message };
    }
  },

  // ========================================
  // SELECTORS CONTEXTUAIS DE OBRA
  // ========================================

  // Normaliza obraId de uma máquina (suporta os 3 campos legados)
  _getMachineObraId: (machine) =>
    machine.obraId || machine.localizacao?.obraId || machine.location?.workId || null,

  // Filtra sessões por obraId + intervalo de datas { start: Date, end: Date }
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

  // KPIs calculados para uma obra num período
  getObraKPIs: (obraId, dateRange) => {
    const { machines, systemSettings } = get();
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
      totalHours:      Math.round(totalHours * 10) / 10,
      totalCost:       Math.round(totalCost),
      totalCO2:        Math.round(totalCO2),
      totalFuel:       Math.round(totalFuel),
      activeSessions,
      uniqueOperators,
      uniqueMachines,
      totalMachines:   obraMachines.length,
    };
  },

  // Máquinas actualmente na obra
  getMachinesByObraId: (obraId) => {
    const { machines } = get();
    const getObraId = (m) => m.obraId || m.localizacao?.obraId || m.location?.workId;
    return machines.filter(m => getObraId(m) === obraId);
  },

  // Operadores com sessões numa obra num período
  getWorkersByObraId: (obraId, dateRange) => {
    const { operators } = get();
    const sessions = get().getSessionsByObraId(obraId, dateRange);
    const opIds = [...new Set(sessions.map(s => s.operatorId).filter(Boolean))];
    return opIds.map(opId => {
      const op = operators.find(o => o.cardId === opId || o.id === opId);
      const opSessions = sessions.filter(s => s.operatorId === opId);
      const totalHours = opSessions.filter(s => s.status === 'CLOSED').reduce((sum, s) => sum + (s.durationHours || 0), 0);
      return {
        id:         opId,
        name:       op?.name || opId,
        sessions:   opSessions.length,
        totalHours: Math.round(totalHours * 10) / 10,
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  },

  // ========================================
  // TOOL MAINTENANCE — CRUD nativo (substitui maintenanceRecords + avarias para tools)
  // Ver schema em src/types.js (ToolMaintenance)
  // ========================================

  addToolMaintenance: async (record) => {
    const data = {
      ...record,
      reportedAt: record.reportedAt || Timestamp.now(),
      status: record.status || 'OPEN',
      photos: record.photos || [],
    };
    const ref = await addDoc(collection(db, `${basePath}/tool_maintenance`), data);
    return ref.id;
  },

  updateToolMaintenance: async (recordId, updates) => {
    const ref = doc(db, `${basePath}/tool_maintenance`, recordId);
    await updateDoc(ref, updates);
  },

  resolveToolMaintenance: async (recordId, { resolvedBy, notes, cost }) => {
    const ref = doc(db, `${basePath}/tool_maintenance`, recordId);
    await updateDoc(ref, {
      status: 'DONE',
      resolvedBy,
      resolvedAt: Timestamp.now(),
      ...(notes ? { notes } : {}),
      ...(cost != null ? { cost } : {}),
    });
  },

  // Maintenance/avarias activas para uma ferramenta (independente do status do tool_session)
  getToolMaintenanceByToolId: (toolId) => {
    const { toolMaintenance } = get();
    if (!toolId) return [];
    return toolMaintenance.filter(r => r.toolId === toolId);
  },

  // Maintenance activas numa obra — agrupado por ferramenta
  getToolMaintenanceByObraId: (obraId) => {
    const { toolMaintenance } = get();
    if (!obraId) return [];
    return toolMaintenance.filter(r => r.obraId === obraId);
  },

  // Contagem rápida de issues abertas (para badges)
  getOpenToolIssues: () => {
    const { toolMaintenance } = get();
    return toolMaintenance.filter(r => r.status !== 'DONE').length;
  },

  // ========================================
  // SELECTORS PIVOT — TOOLS / TOOL_SESSIONS
  // ========================================
  // Helpers internos
  _resolveToolSessionStart: (s) => {
    if (!s?.startTime) return null;
    return s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime);
  },

  // Ferramentas atribuídas a uma obra (currentObraId)
  getToolsByObraId: (obraId) => {
    const { tools } = get();
    if (!obraId) return [];
    return tools.filter(t => t.currentObraId === obraId);
  },

  // Tool sessions filtradas por obraId + período opcional
  getToolSessionsByObraId: (obraId, dateRange) => {
    const { toolSessions } = get();
    if (!obraId) return [];
    const filtered = toolSessions.filter(s => s.obraId === obraId);
    if (!dateRange) return filtered;
    const { start, end } = dateRange;
    return filtered.filter(s => {
      const d = get()._resolveToolSessionStart(s);
      return d && d >= start && d <= end;
    });
  },

  // KPI 1 (must-have) — ferramentas em uso AGORA (sessões OPEN)
  // Devolve array de tool_sessions OPEN enriquecidas com tool info se disponível.
  getToolsInUse: () => {
    const { toolSessions, tools } = get();
    const toolsById = new Map(tools.map(t => [t.id, t]));
    return toolSessions
      .filter(s => s.status === 'OPEN')
      .map(s => ({ ...s, tool: toolsById.get(s.toolId) || null }));
  },

  // KPI 4 (must-have) — devoluções atrasadas (overdue)
  // threshold em dias; default 7. Aceita override de systemSettings.toolOverdueDays.
  getOverdueTools: (thresholdDays) => {
    const { toolSessions, systemSettings } = get();
    const threshold = thresholdDays
      ?? systemSettings?.toolOverdueDays
      ?? 7;
    const cutoff = Date.now() - threshold * 86400000;
    return toolSessions
      .filter(s => s.status === 'OPEN')
      .filter(s => {
        const start = get()._resolveToolSessionStart(s);
        return start && start.getTime() <= cutoff;
      });
  },

  // KPI 2 (must-have) — taxa de utilização da frota num período
  // % de ferramentas com pelo menos 1 sessão CLOSED no período / total de ferramentas
  getToolUtilizationRate: (dateRange) => {
    const { tools, toolSessions } = get();
    if (!tools.length) return 0;
    let pool = toolSessions.filter(s => s.status === 'CLOSED');
    if (dateRange) {
      const { start, end } = dateRange;
      pool = pool.filter(s => {
        const d = get()._resolveToolSessionStart(s);
        return d && d >= start && d <= end;
      });
    }
    const usedToolIds = new Set(pool.map(s => s.toolId));
    return Math.round((usedToolIds.size / tools.length) * 100);
  },

  // KPI 5 (must-have) — top N ferramentas por número de checkouts num período
  getTopToolsByUsage: (dateRange, limit = 10) => {
    const { tools, toolSessions } = get();
    const toolsById = new Map(tools.map(t => [t.id, t]));
    let pool = toolSessions;
    if (dateRange) {
      const { start, end } = dateRange;
      pool = pool.filter(s => {
        const d = get()._resolveToolSessionStart(s);
        return d && d >= start && d <= end;
      });
    }
    const counts = new Map();
    pool.forEach(s => counts.set(s.toolId, (counts.get(s.toolId) || 0) + 1));
    return [...counts.entries()]
      .map(([toolId, count]) => ({
        toolId,
        toolName: toolsById.get(toolId)?.name || toolId,
        toolType: toolsById.get(toolId)?.type || null,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  // KPI agregado — usado pelo DashboardView e ObraMenuLayout (Fase 3)
  // Equivalente a getObraKPIs mas para o modelo tools.
  // Se obraId for falsy, calcula globalmente.
  getToolKPIs: (obraId, dateRange) => {
    const { tools, toolSessions } = get();
    const scopedTools = obraId
      ? tools.filter(t => t.currentObraId === obraId)
      : tools;
    let scopedSessions = obraId
      ? toolSessions.filter(s => s.obraId === obraId)
      : toolSessions;
    if (dateRange) {
      const { start, end } = dateRange;
      scopedSessions = scopedSessions.filter(s => {
        const d = get()._resolveToolSessionStart(s);
        return d && d >= start && d <= end;
      });
    }
    const closed = scopedSessions.filter(s => s.status === 'CLOSED');
    const open = scopedSessions.filter(s => s.status === 'OPEN');

    const totalCheckouts = scopedSessions.length;
    const activeNow = open.length;
    const overdueCount = get().getOverdueTools().filter(s => !obraId || s.obraId === obraId).length;
    const uniqueOperators = new Set(scopedSessions.map(s => s.operatorId).filter(Boolean)).size;
    const totalDurationHours = closed.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const avgDurationHours = closed.length ? totalDurationHours / closed.length : 0;
    const usedToolIds = new Set(closed.map(s => s.toolId));
    const utilizationPct = scopedTools.length
      ? Math.round((usedToolIds.size / scopedTools.length) * 100)
      : 0;

    return {
      totalTools:        scopedTools.length,
      activeNow,
      overdueCount,
      totalCheckouts,
      uniqueOperators,
      totalDurationHours: Math.round(totalDurationHours * 10) / 10,
      avgDurationHours:   Math.round(avgDurationHours * 10) / 10,
      utilizationPct,
    };
  },
}));

export default useStore;

// Exportar constantes para uso em outros componentes
export { SESSION_THRESHOLDS };
