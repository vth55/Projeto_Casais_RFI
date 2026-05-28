/**
 * mockData.js — CASAIS Fleet Intelligence
 *
 * Dataset PRIMÁRIO: createAllMockData → tools + tool_sessions + operadores + obras + alertas
 *
 * Não existe createMockMachines / createMockSessions neste ficheiro.
 * Dados legacy de machines/sessions são criados apenas pelo Procore exporter
 * (test-export-session.js e test-cenario-e.js em Backend_Cloud/functions/scripts/).
 */

import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, projectId } from '../config/firebase';

const BASE_PATH = `artifacts/${projectId}/public/data`;

const obras = [
  { id: 'procore_328122', name: 'Torre Boavista', lat: 41.1579, lng: -8.6291 },
  { id: 'obra_lisboa_centro', name: 'Lisboa Centro', lat: 38.7223, lng: -9.1393 },
  { id: 'obra_braga_norte', name: 'Braga Norte', lat: 41.5518, lng: -8.4229 },
  { id: 'obra_gaia_sul', name: 'Gaia Sul', lat: 41.1239, lng: -8.6118 },
];

const storageLocations = [
  'Armazem Central',
  'Armazem Norte',
  'Oficina Equipamentos',
];

const toolFixtures = [
  ['tool_martelo_001', 'Martelo Pneumatico #1', 'Martelo Pneumatico', 'MARTELO_001', 18, 1000],
  ['tool_martelo_002', 'Martelo Pneumatico #2', 'Martelo Pneumatico', 'MARTELO_002', 18, 1000],
  ['tool_rebarbadora_230', 'Rebarbadora 230mm', 'Rebarbadora', 'REBARB_230', 8, 220],
  ['tool_perfurador_sds', 'Perfurador SDS Max', 'Perfurador', 'SDS_MAX_001', 12, 380],
  ['tool_parafusadora_ind', 'Parafusadora Industrial', 'Parafusadora', 'PARAF_IND_001', 6, 320],
  ['tool_serra_circular', 'Serra Circular', 'Serra', 'SERRA_CIRC_001', 7, 280],
  ['tool_lixadora', 'Lixadora Orbital', 'Lixadora', 'LIXADORA_001', 5, 180],
  ['tool_pistola_pregos', 'Pistola de Pregos', 'Pistola de Pregos', 'PIST_PREGOS_001', 9, 250],
  ['tool_betoneira_peq', 'Betoneira Pequena', 'Betoneira', 'BETONEIRA_PEQ_001', 14, 650],
  ['tool_vibrador_betao', 'Vibrador de Betao', 'Vibrador de Betao', 'VIB_BETAO_001', 11, 750],
  ['tool_gerador_portatil', 'Gerador Portatil 5kVA', 'Gerador', 'GERADOR_5KVA_001', 16, 1300],
  ['tool_compactador', 'Compactador Placa', 'Compactador', 'COMPACT_PLACA_001', 20, 1100],
  ['tool_laser_nivel', 'Laser Nivelador', 'Laser Nivelador', 'LASER_NIVEL_001', 10, 450],
  ['tool_cortadora_azulejo', 'Cortadora de Azulejo', 'Cortadora', 'CORT_AZULEJO_001', 6, 380],
  ['tool_bomba_submersivel', 'Bomba Submersivel', 'Bomba', 'BOMBA_SUB_001', 13, 280],
];

export const createMockObras = async () => {
  const now = Timestamp.now();
  const results = [];

  for (const obra of obras) {
    const payload = {
      id: obra.id,
      name: obra.name,
      address: {
        procore_328122: 'Avenida da Boavista, Porto',
        obra_lisboa_centro: 'Avenida da Liberdade, Lisboa',
        obra_braga_norte: 'Rua de Sao Vicente, Braga',
        obra_gaia_sul: 'Avenida da Republica, Vila Nova de Gaia',
      }[obra.id],
      gps: {
        latitude: obra.lat,
        longitude: obra.lng,
      },
      status: 'active',
      source: 'mock',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, `${BASE_PATH}/obras`, obra.id), payload);
      results.push({ id: obra.id, success: true });
    } catch (error) {
      console.error(`Erro ao criar obra ${obra.id}:`, error);
      results.push({ id: obra.id, success: false, error: error.message });
    }
  }

  return results;
};

/**
 * Criar ferramentas pequenas de exemplo para o fluxo NFC.
 */
export const createMockTools = async () => {
  const now = Timestamp.now();
  const tools = toolFixtures.map(([id, name, type, nfcTagId, hourlyCost, replacementCost], index) => {
    const obra = obras[index % obras.length];
    return {
      id,
      name,
      type,
      nfcTagId,
      storageLocation: storageLocations[index % storageLocations.length],
      currentObraId: obra.id,
      currentObraName: obra.name,
      status: index % 5 === 0 ? 'MAINTENANCE' : 'AVAILABLE',
      hourlyCost,
      replacementCost,
      procoreSynced: false,
      sapSynced: false,
      createdAt: now,
      updatedAt: now,
    };
  });

  const results = [];
  for (const tool of tools) {
    try {
      await setDoc(doc(db, `${BASE_PATH}/tools`, tool.id), tool);
      results.push({ id: tool.id, success: true });
    } catch (error) {
      console.error(`Erro ao criar ferramenta ${tool.id}:`, error);
      results.push({ id: tool.id, success: false, error: error.message });
    }
  }
  return results;
};

/**
 * Criar operadores de exemplo.
 */
export const createMockOperators = async () => {
  const operators = [
    {
      id: 'OP_001',
      name: 'Joao Silva',
      email: 'joao.silva@casais.com',
      role: 'operador',
      registeredAt: Timestamp.fromDate(new Date('2024-01-15')),
    },
    {
      id: 'OP_002',
      name: 'Maria Santos',
      email: 'maria.santos@casais.com',
      role: 'encarregado',
      registeredAt: Timestamp.fromDate(new Date('2024-02-20')),
    },
    {
      id: 'OP_003',
      name: 'Carlos Oliveira',
      email: 'carlos.oliveira@casais.com',
      role: 'operador',
      registeredAt: Timestamp.fromDate(new Date('2024-03-10')),
    },
    {
      id: 'OP_004',
      name: 'Ana Costa',
      email: 'ana.costa@casais.com',
      role: 'gestor',
      registeredAt: Timestamp.fromDate(new Date('2024-04-05')),
    },
    {
      id: 'OP_005',
      name: 'Pedro Costa',
      email: 'pedro.costa@casais.com',
      role: 'operador',
      registeredAt: Timestamp.fromDate(new Date('2024-05-12')),
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
 * Criar sessoes de ferramentas dos ultimos 30 dias.
 */
export const createMockToolSessions = async () => {
  const operators = ['OP_001', 'OP_002', 'OP_003', 'OP_004', 'OP_005'];
  const operatorNames = {
    OP_001: 'Joao Silva',
    OP_002: 'Maria Santos',
    OP_003: 'Carlos Oliveira',
    OP_004: 'Ana Costa',
    OP_005: 'Pedro Costa',
  };

  const sessions = [];
  const now = new Date();

  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(now.getDate() - day);
    const sessionsPerDay = 2 + (day % 4);

    for (let i = 0; i < sessionsPerDay; i++) {
      const tool = toolFixtures[(day + i) % toolFixtures.length];
      const obra = obras[(day + i) % obras.length];
      const operatorId = operators[(day + i) % operators.length];
      const startTime = new Date(date);
      startTime.setHours(8 + ((day + i) % 9), (i * 15) % 60, 0, 0);
      const durationHours = 1.5 + ((day + i) % 7) * 0.75;
      const endTime = new Date(startTime.getTime() + durationHours * 3_600_000);
      const isOpen = day === 0 && i < 3;

      sessions.push({
        toolId: tool[0],
        toolName: tool[1],
        toolType: tool[2],
        nfcTagId: tool[3],
        operatorId,
        operatorName: operatorNames[operatorId],
        obraId: obra.id,
        obraName: obra.name,
        sapOrigin: storageLocations[(day + i) % storageLocations.length],
        sapDestination: obra.name,
        sapWorker: operatorId,
        status: isOpen ? 'OPEN' : 'CLOSED',
        startTime: Timestamp.fromDate(startTime),
        endTime: isOpen ? null : Timestamp.fromDate(endTime),
        durationHours: isOpen ? null : Math.round(durationHours * 100) / 100,
        procoreSynced: false,
        sapSynced: !isOpen,
        sapMode: 'mock',
        sapNotificationId: null,
        location: {
          lat: obra.lat + ((i % 3) - 1) * 0.002,
          lng: obra.lng + ((i % 2) - 0.5) * 0.002,
          accuracy: 18 + ((day + i) % 30),
          timestamp: Timestamp.fromDate(startTime),
        },
        createdAt: Timestamp.fromDate(startTime),
      });
    }
  }

  const results = [];
  for (const session of sessions) {
    try {
      const docRef = await addDoc(collection(db, `${BASE_PATH}/tool_sessions`), session);
      results.push({ id: docRef.id, success: true });
    } catch (error) {
      console.error('Erro ao criar sessao de ferramenta:', error);
      results.push({ success: false, error: error.message });
    }
  }
  return results;
};

const generateValidationToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'T_';
  for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
};

export const createMockAlerts = async () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const fixtures = [
    {
      anomalyType: 'TOOL_OVERDUE',
      ageDays: 8,
      sessionId: null,
      toolId: 'tool_martelo_001',
      toolName: 'Martelo Pneumatico #1',
      operatorId: 'OP_001',
      operatorName: 'Joao Silva',
      operatorEmail: 'joao.silva@casais.pt',
      obraId: 'procore_328122',
      obraName: 'Torre Boavista',
    },
    {
      anomalyType: 'NO_LOCATION',
      ageDays: 2,
      sessionId: null,
      toolId: 'tool_gerador_portatil',
      toolName: 'Gerador Portatil 5kVA',
      operatorId: 'OP_003',
      operatorName: 'Carlos Oliveira',
      operatorEmail: 'carlos.oliveira@casais.pt',
      obraId: 'obra_braga_norte',
      obraName: 'Braga Norte',
    },
    {
      anomalyType: 'NO_OPERATOR',
      ageDays: 1,
      sessionId: null,
      toolId: 'tool_compactador',
      toolName: 'Compactador Placa',
      operatorId: 'OP_005',
      operatorName: 'Pedro Costa',
      operatorEmail: 'pedro.costa@casais.pt',
      obraId: 'obra_gaia_sul',
      obraName: 'Gaia Sul',
    },
  ];

  const results = [];
  for (const f of fixtures) {
    const createdAt = new Date(now - f.ageDays * day);
    const id = `alert_${createdAt.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    const alert = {
      id,
      token: generateValidationToken(),
      anomalyType: f.anomalyType,
      type: f.anomalyType,
      status: 'OPEN',
      internal: true,
      toolSessionId: f.sessionId,
      toolId: f.toolId,
      toolName: f.toolName,
      operatorId: f.operatorId,
      operatorName: f.operatorName,
      operatorEmail: f.operatorEmail,
      obraId: f.obraId,
      obraName: f.obraName,
      createdAt: Timestamp.fromDate(createdAt),
      validatedAt: null,
      validatedBy: null,
      actionsTaken: [],
      linkedMaintenanceId: null,
      emailSent: false,
      emailSentAt: null,
      emailToken: null,
      operatorNotes: '',
      auditLog: [
        { action: 'CREATED', by: 'mockData', at: Timestamp.fromDate(createdAt), notes: `Alerta criado: ${f.anomalyType}` },
      ],
    };
    try {
      await setDoc(doc(db, `${BASE_PATH}/tool_alerts`, id), alert);
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
    const createdObras = await createMockObras();
    console.log(`${createdObras.filter((obra) => obra.success).length} obras criadas`);

    const tools = await createMockTools();
    console.log(`${tools.filter((tool) => tool.success).length} ferramentas criadas`);

    const operators = await createMockOperators();
    console.log(`${operators.filter((operator) => operator.success).length} operadores criados`);

    const toolSessions = await createMockToolSessions();
    console.log(`${toolSessions.filter((session) => session.success).length} sessoes de ferramentas criadas`);

    const alerts = await createMockAlerts();
    console.log(`${alerts.filter((alert) => alert.success).length} alertas pendentes criados`);

    return {
      success: true,
      obras: createdObras.filter((obra) => obra.success).length,
      tools: tools.filter((tool) => tool.success).length,
      operators: operators.filter((operator) => operator.success).length,
      toolSessions: toolSessions.filter((session) => session.success).length,
      alerts: alerts.filter((alert) => alert.success).length,
    };
  } catch (error) {
    console.error('Erro ao criar dados mock:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
