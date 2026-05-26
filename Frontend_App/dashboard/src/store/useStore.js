import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc, getDoc, addDoc, Timestamp, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, projectId } from '../config/firebase';
import { createCollectionListener, createDocumentListener } from '../utils/firestoreListeners';
import { createCrudActions } from '../utils/firestoreCrud';

// NOTE: useAvariasStore removido do import principal — getKPIs (legacy) moveu para machinesStore.
// Se alguém precisar do mtbf em contexto legacy, usar useLegacyMachinesStore diretamente.

const basePath = `artifacts/${projectId}/public/data`;

// CRUD actions instanciadas uma vez por coleção (não por chamada)
// machineActions movida para store/legacy/machinesStore.js — LEGACY
const operatorActions     = createCrudActions(db, `${basePath}/operators`);
const scheduleActions     = createCrudActions(db, `${basePath}/maintenance_schedules`);
const cardActions         = createCrudActions(db, `${basePath}/location_cards`);
const obraActions         = createCrudActions(db, `${basePath}/obras`);

// LEGACY — constantes de alertas de sessão heavy-machine (usadas só no machinesStore)
// Mantidas aqui para export de retrocompat (SESSION_THRESHOLDS) — não usar em código novo.
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
  // NOTE: sessions e machines foram movidos para store/legacy/machinesStore.js (C1 pivot 2026-05)
  // Consumir via useLegacyMachinesStore() em DashboardView/ProcoreReconciliationPanel.
  tools: [],            // novo — small tools NFC (modelo activo pós-pivot 2026-05)
  toolSessions: [],     // novo — checkout/checkin NFC das ferramentas
  toolAlerts: [],       // novo — anomalias detectadas (TOOL_OVERDUE, NO_LOCATION, etc.) ver types.js
  toolMaintenance: [],  // novo — inspeção/dano/reparação/calibração/perda (ver types.js)
  toolMovements: [],    // novo — auditoria de transferências obra↔armazém
  operators: [],
  obras: [],
  // NOTE: maintenanceRecords (legacy heavy machines) movido para machinesStore.js (C1)
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

    // NOTE: sessions e machines listeners movidos para store/legacy/machinesStore.js
    // São inicializados por useLegacyMachinesStore.getState().initializeLegacyListeners()
    // em App.jsx — ver C1 pivot 2026-05.

    // ============================================
    // TOOLS + TOOL_SESSIONS — pivot 2026-05 (small tools NFC)
    // ============================================
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

    // NOTE: maintenance (legacy heavy machines) listener movido para machinesStore.js (C1)
    // Não duplicar listener aqui.

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

  // LEGACY — heavy machines helpers (usados por getKPIs/getSmartMaintenancePrediction em machinesStore)
  // Mantidos aqui por compat com DashboardView/MachineQrView (não remover sem migrar esses consumidores)
  getMaintenanceInterval: (machine) => {
    const { systemSettings } = get();
    return machine?.maintenanceInterval || systemSettings.defaultMaintenanceInterval || 150;
  },

  // LEGACY — helper CO₂ para heavy machines
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

  // LEGACY — IA Preditiva para heavy machines (usa sessions legacy).
  // Consumido por DashboardView/WorkFocusPanel. Usa useLegacyMachinesStore.getState().sessions.
  getSmartMaintenancePrediction: (machine) => {
    // Import lazy para evitar dependência circular com machinesStore
    const legacySessions = (() => {
      try { return require('./legacy/machinesStore').default.getState().sessions; } catch { return []; }
    })();
    const { systemSettings } = get();
    const interval = machine?.maintenanceInterval || systemSettings.defaultMaintenanceInterval || 150;
    const partial = machine?.partialHours || 0;
    const remaining = interval - partial;

    if (remaining <= 0) {
      return { predictedDate: new Date(), daysLeft: 0, avgHoursPerDay: 0, remaining: 0, interval, confidence: 'overdue' };
    }

    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentSessions = legacySessions.filter(s => {
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

  // LEGACY — getFilteredSessions opera em heavy machines sessions.
  // Movida para store/legacy/machinesStore.js. Esta versão é alias para retrocompat.
  // NÃO usar em views novas — usar getToolSessionsByObraId ou filtrar toolSessions directamente.
  getFilteredSessions: () => {
    try {
      return require('./legacy/machinesStore').default.getState().getFilteredSessions?.() ?? [];
    } catch {
      return [];
    }
  },

  // LEGACY — horas úteis por máquina (heavy machines). Usado pelo getKPIs legacy em machinesStore.
  // Mantido no store principal para evitar dependência circular.
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

  // LEGACY — getKPIs opera em heavy machines. Movida para machinesStore.js.
  // Esta versão delega para o store legacy. NÃO usar em views novas — usar getToolKPIs.
  getKPIs: () => {
    try {
      return require('./legacy/machinesStore').default.getState().getKPIs?.() ?? {};
    } catch {
      return {};
    }
  },

  // LEGACY — CRUD de heavy machines movido para store/legacy/machinesStore.js (C1)
  // Aliases aqui para retrocompat com DevTools e ConfiguracoesView.
  addMachine: async (machineData) => {
    try { return require('./legacy/machinesStore').default.getState().addMachine?.(machineData) ?? { success: false }; } catch { return { success: false }; }
  },
  updateMachine: async (id, data) => {
    try { return require('./legacy/machinesStore').default.getState().updateMachine?.(id, data) ?? { success: false }; } catch { return { success: false }; }
  },
  deleteMachine: async (id) => {
    try { return require('./legacy/machinesStore').default.getState().deleteMachine?.(id) ?? { success: false }; } catch { return { success: false }; }
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

  // LEGACY — setMachineTariff movido para machinesStore.js (C1)
  setMachineTariff: async (machineId, tariffData) => {
    try { return require('./legacy/machinesStore').default.getState().setMachineTariff?.(machineId, tariffData) ?? { success: false }; } catch { return { success: false }; }
  },

  // LEGACY — addMaintenanceRecord / addPhotoToMaintenance / removePhotoFromMaintenance
  // operam na colecção `maintenance` (heavy machines). Não consumir em views novas.
  // Usar addToolMaintenance / updateToolMaintenance para o modelo tools.
  addMaintenanceRecord: async (record) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const id = `maint_${Date.now()}`;
      await setDoc(doc(db, `${basePath}/maintenance`, id), {
        ...record, id, photos: record.photos || [], createdAt: Timestamp.now(),
      });
      if (record.machineId) {
        await updateDoc(doc(db, `${basePath}/machines`, record.machineId), {
          partialHours: 0, lastMaintenance: Timestamp.now(),
        });
      }
      return { success: true, id };
    } catch (error) { return { success: false, error: error.message }; }
  },

  // LEGACY — foto em maintenance legacy (heavy machines)
  addPhotoToMaintenance: async (maintenanceId, photo) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const legacyRecords = ((() => { try { return require('./legacy/machinesStore').default; } catch { return null; } })())?.getState()?.maintenanceRecords || [];
      const record = legacyRecords.find(r => r.id === maintenanceId);
      const currentPhotos = record?.photos || [];
      await updateDoc(doc(db, `${basePath}/maintenance`, maintenanceId), {
        photos: [...currentPhotos, photo], updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  },

  // LEGACY — remover foto de maintenance legacy
  removePhotoFromMaintenance: async (maintenanceId, photoId, photoPath) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      if (photoPath) await get().deleteMaintenancePhoto(photoPath);
      const legacyRecords = ((() => { try { return require('./legacy/machinesStore').default; } catch { return null; } })())?.getState()?.maintenanceRecords || [];
      const record = legacyRecords.find(r => r.id === maintenanceId);
      const updatedPhotos = (record?.photos || []).filter(p => p.id !== photoId);
      await updateDoc(doc(db, `${basePath}/maintenance`, maintenanceId), {
        photos: updatedPhotos, updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
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

  // LEGACY — moveMachinesToObra / dispatchMachine movidos para machinesStore.js (C1)
  moveMachinesToObra: async (machineIds, obraId) => {
    try { return require('./legacy/machinesStore').default.getState().moveMachinesToObra?.(machineIds, obraId) ?? { success: false }; } catch { return { success: false }; }
  },
  dispatchMachine: async (machineId, obraId, dispatchedBy = 'system') => {
    try { return require('./legacy/machinesStore').default.getState().dispatchMachine?.(machineId, obraId, dispatchedBy) ?? { success: false }; } catch { return { success: false }; }
  },

  // ========================================
  // GESTÃO DE SESSIONS LEGACY — movido para machinesStore.js (C1 pivot 2026-05)
  // Aliases abaixo para retrocompat com DevTools e outros consumidores.
  // ========================================

  // LEGACY — closeSession, createSessionAlert, checkAndAutoCloseSessions, checkFatigueSessions,
  // getOpenSessionsWithDuration, updateSession — todos movidos para machinesStore.js
  closeSession: async (sessionId, endTime = null) => {
    try { return require('./legacy/machinesStore').default.getState().closeSession?.(sessionId, endTime) ?? { success: false }; } catch { return { success: false }; }
  },
  createSessionAlert: async (alertData) => {
    try { return require('./legacy/machinesStore').default.getState().createSessionAlert?.(alertData) ?? { success: false }; } catch { return { success: false }; }
  },
  checkAndAutoCloseSessions: async () => {
    try { return require('./legacy/machinesStore').default.getState().checkAndAutoCloseSessions?.() ?? { success: false }; } catch { return { success: false }; }
  },
  checkFatigueSessions: () => {
    try { return require('./legacy/machinesStore').default.getState().checkFatigueSessions?.() ?? []; } catch { return []; }
  },
  getOpenSessionsWithDuration: () => {
    try { return require('./legacy/machinesStore').default.getState().getOpenSessionsWithDuration?.() ?? []; } catch { return []; }
  },
  updateSession: async (sessionId, updates) => {
    try { return require('./legacy/machinesStore').default.getState().updateSession?.(sessionId, updates) ?? { success: false }; } catch { return { success: false }; }
  },

  // resolveSessionAnomaly — agora opera em tool_sessions (pivot 2026-05).
  // A colecção legacy sessions usa resolveSessionAnomaly no machinesStore.
  // Esta versão é para SessoesView (toolSessions) — mantida aqui no store principal.
  resolveSessionAnomaly: async (sessionId, { correctedStart, correctedEnd, correctedHours, notes, action }) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const { toolSessions } = get();
      const session = toolSessions.find(s => s.id === sessionId);
      if (!session) return { success: false, error: 'Sessão não encontrada' };

      const updates = {
        validationStatus: 'RESOLVED',
        validatedAt: Timestamp.now(),
        validationNotes: notes || '',
      };

      if (action === 'correct' && correctedHours != null) {
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
        updates.originalStartTime = session.startTime;
        updates.originalEndTime = session.endTime;
        updates.originalDurationHours = session.durationHours;
        updates.startTime = Timestamp.fromDate(start);
        updates.endTime = Timestamp.fromDate(end);
        updates.durationHours = durationHours;
        updates.correctedByAdmin = true;
        updates.correctedAt = Timestamp.now();
      }

      await updateDoc(doc(db, `${basePath}/tool_sessions`, sessionId), updates);
      return { success: true };
    } catch (error) {
      console.error('Erro ao resolver anomalia:', error);
      return { success: false, error: error.message };
    }
  },

  // ========================================
  // SELECTORS CONTEXTUAIS DE OBRA (LEGACY) — movido para machinesStore.js (C1)
  // Aliases abaixo para retrocompat.
  // NÃO usar em views novas — usar getToolsByObraId / getToolSessionsByObraId.
  // ========================================
  _getMachineObraId: (machine) =>
    machine.obraId || machine.localizacao?.obraId || machine.location?.workId || null,
  getSessionsByObraId: (obraId, dateRange) => {
    try { return require('./legacy/machinesStore').default.getState().getSessionsByObraId?.(obraId, dateRange) ?? []; } catch { return []; }
  },
  getObraKPIs: (obraId, dateRange) => {
    try { return require('./legacy/machinesStore').default.getState().getObraKPIs?.(obraId, dateRange) ?? {}; } catch { return {}; }
  },
  getMachinesByObraId: (obraId) => {
    try { return require('./legacy/machinesStore').default.getState().getMachinesByObraId?.(obraId) ?? []; } catch { return []; }
  },
  getWorkersByObraId: (obraId, dateRange) => {
    try { return require('./legacy/machinesStore').default.getState().getWorkersByObraId?.(obraId, dateRange) ?? []; } catch { return []; }
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
