import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';

const basePath = `artifacts/${projectId}/public/data`;

// Store principal da aplicação
const useStore = create((set, get) => ({
  // Estado
  sessions: [],
  machines: [],
  operators: [],
  obras: [],
  tariffs: [],
  maintenanceRecords: [],
  loading: true,
  error: null,
  activeView: 'dashboard',
  sidebarOpen: false,
  dateFilter: 'month',

  // Setters simples
  setActiveView: (view) => set({ activeView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDateFilter: (filter) => set({ dateFilter: filter }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Inicializar listeners Firestore
  initializeListeners: () => {
    if (!db) {
      set({ error: 'Firestore não inicializado', loading: false });
      return () => {};
    }

    const unsubscribers = [];

    // Sessions listener
    const sessionsQuery = query(
      collection(db, `${basePath}/sessions`),
      orderBy('startTime', 'desc')
    );
    unsubscribers.push(
      onSnapshot(sessionsQuery,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          set({ sessions: data });
        },
        (error) => console.error('Erro sessions:', error)
      )
    );

    // Machines listener
    unsubscribers.push(
      onSnapshot(collection(db, `${basePath}/machines`),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          set({ machines: data, loading: false });
        },
        (error) => console.error('Erro machines:', error)
      )
    );

    // Operators listener
    unsubscribers.push(
      onSnapshot(collection(db, `${basePath}/operators`),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          set({ operators: data });
        },
        (error) => console.error('Erro operators:', error)
      )
    );

    // Tariffs listener
    unsubscribers.push(
      onSnapshot(collection(db, `${basePath}/tariffs`),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          set({ tariffs: data });
        },
        (error) => console.error('Erro tariffs:', error)
      )
    );

    // Maintenance records listener
    unsubscribers.push(
      onSnapshot(collection(db, `${basePath}/maintenance`),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          set({ maintenanceRecords: data });
        },
        (error) => console.error('Erro maintenance:', error)
      )
    );

    // Obras listener
    unsubscribers.push(
      onSnapshot(collection(db, `${basePath}/obras`),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          set({ obras: data });
        },
        (error) => console.error('Erro obras:', error)
      )
    );

    return () => unsubscribers.forEach(unsub => unsub());
  },

  // Sessões filtradas por período
  getFilteredSessions: () => {
    const { sessions, dateFilter } = get();
    if (!sessions.length) return [];

    const now = new Date();
    let startDate;

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
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return sessions;
    }

    return sessions.filter(session => {
      if (!session.startTime) return false;
      const sessionDate = session.startTime.toDate
        ? session.startTime.toDate()
        : new Date(session.startTime);
      return sessionDate >= startDate;
    });
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
    const utilizationRate = totalMachines > 0
      ? Math.round((activeMachines / totalMachines) * 100)
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
    const maintenanceAlerts = machines.filter(m => {
      const hours = m.partialHours || m.totalHours || 0;
      return hours >= 120;
    }).length;

    // MTBF simulado (será calculado com dados reais depois)
    const mtbf = 45.5; // horas médias entre falhas

    // Custo operacional estimado
    const costPerHour = 35; // €/hora média
    const totalCost = totalHours * costPerHour;

    // Downtime (máquinas paradas vs total de horas possíveis)
    const possibleHours = totalMachines * 8 * 5; // 8h/dia, 5 dias
    const downtime = possibleHours > 0
      ? Math.round(((possibleHours - totalHours) / possibleHours) * 100)
      : 0;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      activeSessions,
      activeMachines,
      totalMachines,
      utilizationRate,
      totalCO2: Math.round(totalCO2),
      totalFuel: Math.round(totalFuel),
      maintenanceAlerts,
      mtbf,
      totalCost: Math.round(totalCost),
      downtime: Math.max(0, Math.min(100, downtime)),
    };
  },

  // Actions para máquinas
  addMachine: async (machineData) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const id = machineData.id || `machine_${Date.now()}`;
      await setDoc(doc(db, `${basePath}/machines`, id), {
        ...machineData,
        id,
        createdAt: Timestamp.now(),
        totalHours: 0,
        partialHours: 0,
        status: 'IDLE',
      });
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateMachine: async (id, data) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      await updateDoc(doc(db, `${basePath}/machines`, id), data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteMachine: async (id) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      await deleteDoc(doc(db, `${basePath}/machines`, id));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Actions para operadores
  addOperator: async (operatorData) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const id = operatorData.cardId || `op_${Date.now()}`;
      await setDoc(doc(db, `${basePath}/operators`, id), {
        ...operatorData,
        registeredAt: Timestamp.now(),
      });
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteOperator: async (id) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      await deleteDoc(doc(db, `${basePath}/operators`, id));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateOperator: async (id, data) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      await updateDoc(doc(db, `${basePath}/operators`, id), {
        ...data,
        updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Actions para tarifários
  addTariff: async (tariffData) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const id = `tariff_${Date.now()}`;
      await setDoc(doc(db, `${basePath}/tariffs`, id), {
        ...tariffData,
        id,
        createdAt: Timestamp.now(),
        active: true,
      });
      return { success: true, id };
    } catch (error) {
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

  // Actions para obras
  addObra: async (obraData) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const id = obraData.code || `obra_${Date.now()}`;
      await setDoc(doc(db, `${basePath}/obras`, id), {
        ...obraData,
        id,
        createdAt: Timestamp.now(),
      });
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateObra: async (id, data) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      await updateDoc(doc(db, `${basePath}/obras`, id), {
        ...data,
        updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteObra: async (id) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      await deleteDoc(doc(db, `${basePath}/obras`, id));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Mover máquinas para uma obra
  moveMachinesToObra: async (machineIds, obraId) => {
    if (!db) return { success: false, error: 'DB não inicializado' };
    try {
      const { obras } = get();
      const obra = obras.find(o => o.id === obraId);

      for (const machineId of machineIds) {
        await updateDoc(doc(db, `${basePath}/machines`, machineId), {
          location: obra ? {
            workId: obra.id,
            workName: obra.name,
            gps: obra.gps || null,
            lastUpdated: Timestamp.now(),
          } : null,
        });
      }
      return { success: true, count: machineIds.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));

export default useStore;
