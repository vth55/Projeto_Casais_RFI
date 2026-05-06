import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';

const BASE_PATH = `artifacts/${projectId}/public/data`;

export const createMockMachines = async () => {
  const machines = [
    {
      id: 'M_ESC_01',
      name: 'Escavadora 01 - Obra Porto',
      category: {
        id: 'escavadoras',
        name: 'Escavadoras',
        code: 'ESC',
      },
      location: {
        workId: 'obra_porto_2025',
        workName: 'Obra Porto 2025',
        gps: {
          latitude: 41.1579,
          longitude: -8.6291,
        },
        lastUpdated: Timestamp.now(),
      },
      status: 'ACTIVE',
      totalHours: 1250.5,
      partialHours: 135.2, // Horas desde última manutenção
      consumptionRate: 12.5, // L/h
      currentTariff: {
        id: 'tariff_2025_12_01',
        type: 'MACHINE_AND_OPERATOR',
        machineCostPerHour: 25.0,
        operatorCostPerHour: 15.0,
        totalCostPerHour: 40.0,
        validFrom: Timestamp.now(),
      },
      co2Factor: 2.68,
      createdAt: Timestamp.now(),
    },
    {
      id: 'M_GRU_02',
      name: 'Grua 02 - Obra Lisboa',
      category: {
        id: 'gruas',
        name: 'Gruas',
        code: 'GRU',
      },
      location: {
        workId: 'obra_lisboa_2025',
        workName: 'Obra Lisboa 2025',
        gps: {
          latitude: 38.7223,
          longitude: -9.1393,
        },
        lastUpdated: Timestamp.now(),
      },
      status: 'ACTIVE',
      totalHours: 980.3,
      partialHours: 95.8,
      consumptionRate: 15.2,
      currentTariff: {
        id: 'tariff_2025_12_01',
        type: 'MACHINE_AND_OPERATOR',
        machineCostPerHour: 35.0,
        operatorCostPerHour: 15.0,
        totalCostPerHour: 50.0,
        validFrom: Timestamp.now(),
      },
      co2Factor: 2.68,
      createdAt: Timestamp.now(),
    },
    {
      id: 'M_BET_03',
      name: 'Betoneira 03 - Obra Porto',
      category: {
        id: 'betoneiras',
        name: 'Betoneiras',
        code: 'BET',
      },
      location: {
        workId: 'obra_porto_2025',
        workName: 'Obra Porto 2025',
        gps: {
          latitude: 41.1579,
          longitude: -8.6291,
        },
        lastUpdated: Timestamp.now(),
      },
      status: 'ACTIVE',
      totalHours: 650.7,
      partialHours: 45.3,
      consumptionRate: 8.5,
      currentTariff: {
        id: 'tariff_2025_12_01',
        type: 'MACHINE_ONLY',
        machineCostPerHour: 18.0,
        operatorCostPerHour: 0,
        totalCostPerHour: 18.0,
        validFrom: Timestamp.now(),
      },
      co2Factor: 2.68,
      createdAt: Timestamp.now(),
    },
    {
      id: 'M_ESC_04',
      name: 'Escavadora 04 - Obra Braga',
      category: {
        id: 'escavadoras',
        name: 'Escavadoras',
        code: 'ESC',
      },
      location: {
        workId: 'obra_braga_2025',
        workName: 'Obra Braga 2025',
        gps: {
          latitude: 41.5518,
          longitude: -8.4229,
        },
        lastUpdated: Timestamp.now(),
      },
      status: 'IDLE',
      totalHours: 890.2,
      partialHours: 120.5,
      consumptionRate: 12.5,
      currentTariff: {
        id: 'tariff_2025_12_01',
        type: 'MACHINE_AND_OPERATOR',
        machineCostPerHour: 25.0,
        operatorCostPerHour: 15.0,
        totalCostPerHour: 40.0,
        validFrom: Timestamp.now(),
      },
      co2Factor: 2.68,
      createdAt: Timestamp.now(),
    },
  ];

  const results = [];
  for (const machine of machines) {
    try {
      await setDoc(doc(db, `${BASE_PATH}/machines`, machine.id), machine);
      results.push({ id: machine.id, success: true });
    } catch (error) {
      console.error(`Erro ao criar máquina ${machine.id}:`, error);
      results.push({ id: machine.id, success: false, error: error.message });
    }
  }
  return results;
};

/**
 * Criar operadores de exemplo
 */
export const createMockOperators = async () => {
  const operators = [
    {
      id: 'OP_001',
      name: 'João Silva',
      email: 'joao.silva@casais.com',
      registeredAt: Timestamp.fromDate(new Date('2024-01-15')),
    },
    {
      id: 'OP_002',
      name: 'Maria Santos',
      email: 'maria.santos@casais.com',
      registeredAt: Timestamp.fromDate(new Date('2024-02-20')),
    },
    {
      id: 'OP_003',
      name: 'Carlos Oliveira',
      email: 'carlos.oliveira@casais.com',
      registeredAt: Timestamp.fromDate(new Date('2024-03-10')),
    },
    {
      id: 'OP_004',
      name: 'Ana Costa',
      email: 'ana.costa@casais.com',
      registeredAt: Timestamp.fromDate(new Date('2024-04-05')),
    },
  ];

  const results = [];
  for (const operator of operators) {
    try {
      await setDoc(doc(db, `${BASE_PATH}/operators`, operator.id), operator);
      results.push({ id: operator.id, success: true });
    } catch (error) {
      console.error(`Erro ao criar operador ${operator.id}:`, error);
      results.push({ id: operator.id, success: false, error: error.message });
    }
  }
  return results;
};

/**
 * Criar sessões de exemplo (últimas 2 semanas)
 */
export const createMockSessions = async () => {
  const machines = ['M_ESC_01', 'M_GRU_02', 'M_BET_03', 'M_ESC_04'];
  const operators = ['OP_001', 'OP_002', 'OP_003', 'OP_004'];
  const sessions = [];

  // Criar sessões para os últimos 14 dias
  const today = new Date();
  for (let day = 0; day < 14; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);

    // 2-4 sessões por dia
    const sessionsPerDay = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < sessionsPerDay; i++) {
      const machineId = machines[Math.floor(Math.random() * machines.length)];
      const operatorId = operators[Math.floor(Math.random() * operators.length)];

      // Hora de início aleatória (entre 8h e 18h)
      const startHour = Math.floor(Math.random() * 10) + 8;
      const startMinute = Math.floor(Math.random() * 60);
      const startTime = new Date(date);
      startTime.setHours(startHour, startMinute, 0, 0);

      // Duração aleatória (entre 2h e 10h)
      const durationHours = Math.random() * 8 + 2;

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + Math.floor(durationHours));
      endTime.setMinutes(startTime.getMinutes() + Math.floor((durationHours % 1) * 60));

      sessions.push({
        cardId: operatorId,
        machineId: machineId,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        durationHours: Math.round(durationHours * 10) / 10,
        status: 'CLOSED',
        closeReason: 'MANUAL',
        createdAt: Timestamp.fromDate(startTime),
      });
    }
  }

  // Adicionar algumas sessões ativas
  const activeSessions = [
    {
      cardId: 'OP_001',
      machineId: 'M_ESC_01',
      startTime: Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 60 * 1000)), // 3h atrás
      endTime: null,
      durationHours: null,
      status: 'OPEN',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 60 * 1000)),
    },
    {
      cardId: 'OP_002',
      machineId: 'M_GRU_02',
      startTime: Timestamp.fromDate(new Date(Date.now() - 1.5 * 60 * 60 * 1000)), // 1.5h atrás
      endTime: null,
      durationHours: null,
      status: 'OPEN',
      createdAt: Timestamp.fromDate(new Date(Date.now() - 1.5 * 60 * 60 * 1000)),
    },
  ];

  const allSessions = [...sessions, ...activeSessions];
  const results = [];

  for (const session of allSessions) {
    try {
      const docRef = await addDoc(collection(db, `${BASE_PATH}/sessions`), session);
      results.push({ id: docRef.id, success: true });
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      results.push({ success: false, error: error.message });
    }
  }

  return results;
};

const generateValidationToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
};

export const createMockAlerts = async () => {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;

  const fixtures = [
    { type: 'LONG_SESSION', ageHours: 4, machineId: 'M_ESC_01', machineName: 'Escavadora 01 - Obra Porto', operatorId: 'OP_001', operatorName: 'João Silva', operatorEmail: 'joao.silva@casais.pt', obraId: 'obra_porto_2025', obraName: 'Obra Porto 2025', durationHours: 6.4 },
    { type: 'LONG_SESSION', ageHours: 30, machineId: 'M_GRU_02', machineName: 'Grua 02 - Obra Lisboa', operatorId: 'OP_002', operatorName: 'Maria Santos', operatorEmail: 'maria.santos@casais.pt', obraId: 'obra_lisboa_2025', obraName: 'Obra Lisboa 2025', durationHours: 7.8 },
    { type: 'AUTO_CLOSE', ageHours: 56, machineId: 'M_ESC_01', machineName: 'Escavadora 01 - Obra Porto', operatorId: 'OP_003', operatorName: 'Pedro Costa', operatorEmail: 'pedro.costa@casais.pt', obraId: 'obra_porto_2025', obraName: 'Obra Porto 2025', durationHours: 14.0 },
  ];

  const results = [];
  for (const f of fixtures) {
    const createdAt = new Date(now - f.ageHours * HOUR);
    const startTime = new Date(createdAt.getTime() - f.durationHours * HOUR);
    const id = `alert_${createdAt.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    const alert = {
      id,
      validationToken: generateValidationToken(),
      type: f.type,
      status: 'PENDING',
      sessionId: `mock_session_${id}`,
      machineId: f.machineId,
      machineName: f.machineName,
      operatorId: f.operatorId,
      operatorName: f.operatorName,
      operatorEmail: f.operatorEmail,
      obraId: f.obraId,
      obraName: f.obraName,
      originalStartTime: Timestamp.fromDate(startTime),
      originalEndTime: Timestamp.fromDate(createdAt),
      originalDurationHours: f.durationHours,
      correctedStartTime: null,
      correctedEndTime: null,
      correctedDurationHours: null,
      createdAt: Timestamp.fromDate(createdAt),
      validatedAt: null,
      validatedBy: null,
      emailSentAt: Timestamp.fromDate(createdAt),
      emailResendCount: 0,
      lastEmailResendAt: null,
      operatorNotes: '',
      auditLog: [
        { action: 'CREATED', timestamp: Timestamp.fromDate(createdAt), details: `Alerta criado: ${f.type}` },
      ],
    };
    try {
      await setDoc(doc(db, `${BASE_PATH}/alerts`, id), alert);
      results.push({ id, success: true });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  return results;
};

export const createAllMockData = async () => {
  console.log('A criar dados mock...');

  try {
    const machines = await createMockMachines();
    console.log(`${machines.filter((m) => m.success).length} máquinas criadas`);

    const operators = await createMockOperators();
    console.log(`${operators.filter((o) => o.success).length} operadores criados`);

    const sessions = await createMockSessions();
    console.log(`${sessions.filter((s) => s.success).length} sessões criadas`);

    const alerts = await createMockAlerts();
    console.log(`${alerts.filter((a) => a.success).length} alertas pendentes criados`);

    return {
      success: true,
      machines: machines.filter((m) => m.success).length,
      operators: operators.filter((o) => o.success).length,
      sessions: sessions.filter((s) => s.success).length,
      alerts: alerts.filter((a) => a.success).length,
    };
  } catch (error) {
    console.error('Erro ao criar dados mock:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

