import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, projectId } from '../config/firebase';

const basePath = `artifacts/${projectId}/public/data`;

// Constantes para alertas de sessão
const SESSION_THRESHOLDS = {
  FATIGUE_HOURS: 5,    // Alerta de fadiga após 5h
  AUTO_CLOSE_HOURS: 14, // Auto-fechar após 14h
};

// Store principal da aplicação
const useStore = create((set, get) => ({
  // Estado
  sessions: [],
  machines: [],
  operators: [],
  obras: [],
  tariffs: [],
  maintenanceRecords: [],
  locationCards: [], // Cartões RFID de localização
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

    // Location Cards listener (cartões RFID de localização)
    unsubscribers.push(
      onSnapshot(collection(db, `${basePath}/location_cards`),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          set({ locationCards: data });
        },
        (error) => console.error('Erro location_cards:', error)
      )
    );

    return () => unsubscribers.forEach(unsub => unsub());
  },

  // ============================================
  // GESTÃO DE CARTÕES DE LOCALIZAÇÃO (RFID)
  // ============================================

  // Criar cartão de localização
  addLocationCard: async (cardData) => {
    if (!db) return { success: false, error: 'DB não inicializado' };

    try {
      const cardId = cardData.cardId || `LOC_${Date.now()}`;
      const normalizedId = cardId.toUpperCase().startsWith('LOC_')
        ? cardId.toUpperCase()
        : `LOC_${cardId.toUpperCase()}`;

      const card = {
        id: normalizedId,
        obraId: cardData.obraId,
        obraName: cardData.obraName,
        gps: cardData.gps || null,
        description: cardData.description || '',
        createdAt: Timestamp.now(),
        active: true,
      };

      await setDoc(doc(db, `${basePath}/location_cards`, normalizedId), card);
      return { success: true, id: normalizedId };
    } catch (error) {
      console.error('Erro ao criar cartão de localização:', error);
      return { success: false, error: error.message };
    }
  },

  // Atualizar cartão de localização
  updateLocationCard: async (cardId, updates) => {
    if (!db) return { success: false, error: 'DB não inicializado' };

    try {
      await updateDoc(doc(db, `${basePath}/location_cards`, cardId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
      return { success: false, error: error.message };
    }
  },

  // Eliminar cartão de localização
  deleteLocationCard: async (cardId) => {
    if (!db) return { success: false, error: 'DB não inicializado' };

    try {
      await deleteDoc(doc(db, `${basePath}/location_cards`, cardId));
      return { success: true };
    } catch (error) {
      console.error('Erro ao eliminar cartão:', error);
      return { success: false, error: error.message };
    }
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
}));

export default useStore;

// Exportar constantes para uso em outros componentes
export { SESSION_THRESHOLDS };
