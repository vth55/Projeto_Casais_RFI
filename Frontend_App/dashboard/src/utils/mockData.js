/**
 * mockData.js — CASAIS Fleet Intelligence
 *
 * Dataset PRIMÁRIO: createAllMockData → equipment_models + tools + tool_sessions + operadores + obras + alertas
 *
 * Modelo 2-níveis (pivot 2026-05):
 *  - equipment_models/{modelId}  → catálogo (marca + modelo + foto + specs + defaults)
 *  - tools/{toolId}              → unidades físicas com NFC, FK modelId
 *
 * Não existe createMockMachines / createMockSessions neste ficheiro.
 * Dados legacy de machines/sessions são criados apenas pelo Procore exporter
 * (test-export-session.js e test-cenario-e.js em Backend_Cloud/functions/scripts/).
 */

import { collection, addDoc, doc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
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

// ============================================================================
// EQUIPMENT MODELS — catálogo (slug id determinístico)
// ============================================================================
const modelFixtures = [
  {
    id: 'bosch-gsh-16-30',
    brand: 'Bosch',
    modelCode: 'GSH 16-30',
    displayName: 'Martelo Pneumatico Bosch GSH 16-30',
    category: 'Martelo Pneumatico',
    photoUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400',
    specs: { power: '1500W', weight: '11.4kg', voltage: '230V', impactEnergy: '30J' },
    defaultReplacementCost: 1000,
    defaultMaintenanceIntervalDays: 90,
  },
  {
    id: 'bosch-gws-22-230',
    brand: 'Bosch',
    modelCode: 'GWS 22-230',
    displayName: 'Rebarbadora Bosch GWS 22-230',
    category: 'Rebarbadora',
    photoUrl: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400',
    specs: { power: '2200W', discDiameter: '230mm', voltage: '230V' },
    defaultReplacementCost: 220,
    defaultMaintenanceIntervalDays: 60,
  },
  {
    id: 'hilti-te-70-atc',
    brand: 'Hilti',
    modelCode: 'TE 70-ATC',
    displayName: 'Perfurador SDS Max Hilti TE 70-ATC',
    category: 'Perfurador',
    photoUrl: 'https://images.unsplash.com/photo-1426927308491-6380b6a9936f?w=400',
    specs: { power: '1800W', impactEnergy: '11.5J', chuck: 'SDS Max' },
    defaultReplacementCost: 380,
    defaultMaintenanceIntervalDays: 75,
  },
  {
    id: 'makita-df-001',
    brand: 'Makita',
    modelCode: 'DDF485',
    displayName: 'Parafusadora Industrial Makita DDF485',
    category: 'Parafusadora',
    photoUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400',
    specs: { voltage: '18V', torque: '50Nm', battery: 'LXT' },
    defaultReplacementCost: 320,
    defaultMaintenanceIntervalDays: 120,
  },
  {
    id: 'dewalt-dwe-575',
    brand: 'DeWalt',
    modelCode: 'DWE575',
    displayName: 'Serra Circular DeWalt DWE575',
    category: 'Serra',
    photoUrl: 'https://images.unsplash.com/photo-1503424886307-b090341d25d1?w=400',
    specs: { power: '1600W', discDiameter: '190mm', cutDepth: '67mm' },
    defaultReplacementCost: 280,
    defaultMaintenanceIntervalDays: 90,
  },
  {
    id: 'bosch-gex-125',
    brand: 'Bosch',
    modelCode: 'GEX 125-150 AVE',
    displayName: 'Lixadora Orbital Bosch GEX 125',
    category: 'Lixadora',
    photoUrl: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400',
    specs: { power: '400W', padDiameter: '125mm' },
    defaultReplacementCost: 180,
    defaultMaintenanceIntervalDays: 120,
  },
  {
    id: 'honda-eu22i',
    brand: 'Honda',
    modelCode: 'EU22i',
    displayName: 'Gerador Portatil Honda EU22i 5kVA',
    category: 'Gerador',
    photoUrl: 'https://images.unsplash.com/photo-1620207418302-439b387441b0?w=400',
    specs: { power: '5000W', fuel: 'Gasolina', tankCapacity: '13L' },
    defaultReplacementCost: 1300,
    defaultMaintenanceIntervalDays: 60,
  },
  {
    id: 'wacker-irfu-38',
    brand: 'Wacker Neuson',
    modelCode: 'IRFU 38',
    displayName: 'Vibrador de Betao Wacker IRFU 38',
    category: 'Vibrador de Betao',
    photoUrl: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=400',
    specs: { power: '1500W', diameter: '38mm', length: '5m' },
    defaultReplacementCost: 750,
    defaultMaintenanceIntervalDays: 90,
  },
  {
    id: 'imer-syntesi-140',
    brand: 'Imer',
    modelCode: 'Syntesi 140',
    displayName: 'Betoneira Pequena Imer Syntesi 140',
    category: 'Betoneira',
    photoUrl: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=400',
    specs: { capacity: '140L', power: '700W', drumMaterial: 'Aco' },
    defaultReplacementCost: 650,
    defaultMaintenanceIntervalDays: 90,
  },
  {
    id: 'bosch-grl-300',
    brand: 'Bosch',
    modelCode: 'GRL 300 HV',
    displayName: 'Laser Nivelador Bosch GRL 300 HV',
    category: 'Laser Nivelador',
    photoUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400',
    specs: { range: '300m', accuracy: '0.1mm/m' },
    defaultReplacementCost: 450,
    defaultMaintenanceIntervalDays: 180,
    defaultCalibrationIntervalDays: 180,
  },
  {
    id: 'bomag-bp-25',
    brand: 'Bomag',
    modelCode: 'BP 25/50',
    displayName: 'Compactador Placa Bomag BP 25/50',
    category: 'Compactador',
    photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400',
    specs: { weight: '90kg', force: '25kN', fuel: 'Gasolina' },
    defaultReplacementCost: 1100,
    defaultMaintenanceIntervalDays: 60,
  },
  {
    id: 'rubi-dc-250',
    brand: 'Rubi',
    modelCode: 'DC-250 1200',
    displayName: 'Cortadora de Azulejo Rubi DC-250',
    category: 'Cortadora',
    photoUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
    specs: { discDiameter: '250mm', cutLength: '1200mm', power: '1500W' },
    defaultReplacementCost: 380,
    defaultMaintenanceIntervalDays: 90,
  },
];

// ============================================================================
// UNITS (tools) — referenciam modelos via modelId
// 3 modelos com 4-5 unidades; restantes com 1-2.
// ============================================================================
const unitFixtures = [
  // Bosch GSH 16-30 (martelo) — 5 unidades
  { modelId: 'bosch-gsh-16-30', serialNumber: 'BG16-001', customNumber: 'MART-001', nfcTagId: 'MARTELO_001' },
  { modelId: 'bosch-gsh-16-30', serialNumber: 'BG16-002', customNumber: 'MART-002', nfcTagId: 'MARTELO_002' },
  { modelId: 'bosch-gsh-16-30', serialNumber: 'BG16-003', customNumber: 'MART-003', nfcTagId: 'MARTELO_003' },
  { modelId: 'bosch-gsh-16-30', serialNumber: 'BG16-004', customNumber: 'MART-004', nfcTagId: 'MARTELO_004' },
  { modelId: 'bosch-gsh-16-30', serialNumber: 'BG16-005', customNumber: 'MART-005', nfcTagId: 'MARTELO_005' },

  // Hilti TE 70-ATC (perfurador SDS) — 5 unidades
  { modelId: 'hilti-te-70-atc', serialNumber: 'HTE70-001', customNumber: 'PERF-001', nfcTagId: 'PERF_SDS_001' },
  { modelId: 'hilti-te-70-atc', serialNumber: 'HTE70-002', customNumber: 'PERF-002', nfcTagId: 'PERF_SDS_002' },
  { modelId: 'hilti-te-70-atc', serialNumber: 'HTE70-003', customNumber: 'PERF-003', nfcTagId: 'PERF_SDS_003' },
  { modelId: 'hilti-te-70-atc', serialNumber: 'HTE70-004', customNumber: 'PERF-004', nfcTagId: 'PERF_SDS_004' },
  { modelId: 'hilti-te-70-atc', serialNumber: 'HTE70-005', customNumber: 'PERF-005', nfcTagId: 'PERF_SDS_005' },

  // Makita DDF485 (parafusadora) — 4 unidades
  { modelId: 'makita-df-001', serialNumber: 'MK485-001', customNumber: 'PARAF-001', nfcTagId: 'PARAF_001' },
  { modelId: 'makita-df-001', serialNumber: 'MK485-002', customNumber: 'PARAF-002', nfcTagId: 'PARAF_002' },
  { modelId: 'makita-df-001', serialNumber: 'MK485-003', customNumber: 'PARAF-003', nfcTagId: 'PARAF_003' },
  { modelId: 'makita-df-001', serialNumber: 'MK485-004', customNumber: 'PARAF-004', nfcTagId: 'PARAF_004' },

  // Bosch GWS 22-230 (rebarbadora) — 2 unidades
  { modelId: 'bosch-gws-22-230', serialNumber: 'GWS22-001', customNumber: 'REBARB-001', nfcTagId: 'REBARB_001' },
  { modelId: 'bosch-gws-22-230', serialNumber: 'GWS22-002', customNumber: 'REBARB-002', nfcTagId: 'REBARB_002' },

  // DeWalt DWE575 (serra) — 2 unidades
  { modelId: 'dewalt-dwe-575', serialNumber: 'DWE575-001', customNumber: 'SERRA-001', nfcTagId: 'SERRA_001' },
  { modelId: 'dewalt-dwe-575', serialNumber: 'DWE575-002', customNumber: 'SERRA-002', nfcTagId: 'SERRA_002' },

  // Bosch GEX 125 (lixadora) — 2 unidades
  { modelId: 'bosch-gex-125', serialNumber: 'GEX125-001', customNumber: 'LIXA-001', nfcTagId: 'LIXA_001' },
  { modelId: 'bosch-gex-125', serialNumber: 'GEX125-002', customNumber: 'LIXA-002', nfcTagId: 'LIXA_002' },

  // Honda EU22i (gerador) — 2 unidades
  { modelId: 'honda-eu22i', serialNumber: 'HEU22-001', customNumber: 'GER-001', nfcTagId: 'GER_001' },
  { modelId: 'honda-eu22i', serialNumber: 'HEU22-002', customNumber: 'GER-002', nfcTagId: 'GER_002' },

  // Wacker IRFU 38 (vibrador) — 1 unidade
  { modelId: 'wacker-irfu-38', serialNumber: 'WIRFU-001', customNumber: 'VIB-001', nfcTagId: 'VIB_001' },

  // Imer Syntesi 140 (betoneira) — 1 unidade
  { modelId: 'imer-syntesi-140', serialNumber: 'IMER-001', customNumber: 'BETON-001', nfcTagId: 'BETON_001' },

  // Bosch GRL 300 (laser) — 2 unidades
  { modelId: 'bosch-grl-300', serialNumber: 'GRL300-001', customNumber: 'LASER-001', nfcTagId: 'LASER_001' },
  { modelId: 'bosch-grl-300', serialNumber: 'GRL300-002', customNumber: 'LASER-002', nfcTagId: 'LASER_002' },

  // Bomag BP 25 (compactador) — 1 unidade
  { modelId: 'bomag-bp-25', serialNumber: 'BMG25-001', customNumber: 'COMP-001', nfcTagId: 'COMP_001' },

  // Rubi DC-250 (cortadora) — 1 unidade
  { modelId: 'rubi-dc-250', serialNumber: 'RUBI250-001', customNumber: 'CORT-001', nfcTagId: 'CORT_001' },
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
 * Criar modelos de equipamento (catálogo). Idempotente — usa setDoc com id determinístico.
 */
export const createMockEquipmentModels = async () => {
  if (!db) return [];
  const results = [];

  for (const m of modelFixtures) {
    const payload = {
      ...m,
      unitCount: 0,         // será actualizado via trigger ou refresh — começa em 0
      activeUnitCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'mock',
    };
    try {
      await setDoc(doc(db, `${BASE_PATH}/equipment_models`, m.id), payload);
      results.push({ id: m.id, success: true });
    } catch (error) {
      console.error(`Erro ao criar modelo ${m.id}:`, error);
      results.push({ id: m.id, success: false, error: error.message });
    }
  }

  return results;
};

/**
 * Criar unidades físicas (tools) com FK modelId.
 * Atribuição aleatória: 60% obra (currentObraId), 40% armazém (null + storageLocation).
 */
export const createMockTools = async () => {
  const now = Timestamp.now();
  const modelById = new Map(modelFixtures.map(m => [m.id, m]));
  const results = [];

  unitFixtures.forEach((unit, index) => {
    const model = modelById.get(unit.modelId);
    if (!model) return;

    // 60% atribuídas a obra, 40% no armazém
    const inWarehouse = (index % 5) >= 3; // ~40%
    const obra = inWarehouse ? null : obras[index % obras.length];

    // 1 em cada 5 em manutenção
    const status = index % 7 === 0 ? 'IN_REPAIR' : 'AVAILABLE';

    const toolId = `tool_${unit.modelId}_${unit.customNumber.toLowerCase()}`;

    const tool = {
      id: toolId,
      modelId: unit.modelId,
      serialNumber: unit.serialNumber,
      customNumber: unit.customNumber,
      // Mantém name/type para retrocompat (UI nova deve usar getToolDisplay)
      name: `${model.displayName} (${unit.customNumber})`,
      type: model.category,
      nfcTagId: unit.nfcTagId,
      storageLocation: storageLocations[index % storageLocations.length],
      currentObraId: obra ? obra.id : null,
      currentObraName: obra ? obra.name : null,
      status,
      lifecycleStatus: 'ACTIVE',
      replacementCost: model.defaultReplacementCost,
      acquisitionCost: model.defaultReplacementCost,
      acquiredAt: Timestamp.fromDate(new Date(2023, (index % 12), 1 + (index % 27))),
      procoreSynced: false,
      sapSynced: false,
      createdAt: now,
      updatedAt: now,
    };

    results.push(tool);
  });

  const writeResults = [];
  for (const tool of results) {
    try {
      await setDoc(doc(db, `${BASE_PATH}/tools`, tool.id), tool);
      writeResults.push({ id: tool.id, success: true });
    } catch (error) {
      console.error(`Erro ao criar ferramenta ${tool.id}:`, error);
      writeResults.push({ id: tool.id, success: false, error: error.message });
    }
  }
  return writeResults;
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
 * Inclui snapshot de modelId + modelName em cada sessão (denormalizado).
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

  const modelById = new Map(modelFixtures.map(m => [m.id, m]));
  const sessions = [];
  const now = new Date();

  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(now.getDate() - day);
    const sessionsPerDay = 2 + (day % 4);

    for (let i = 0; i < sessionsPerDay; i++) {
      const unit = unitFixtures[(day + i) % unitFixtures.length];
      const model = modelById.get(unit.modelId);
      const toolId = `tool_${unit.modelId}_${unit.customNumber.toLowerCase()}`;
      const obra = obras[(day + i) % obras.length];
      const operatorId = operators[(day + i) % operators.length];
      const startTime = new Date(date);
      startTime.setHours(8 + ((day + i) % 9), (i * 15) % 60, 0, 0);
      const durationHours = 1.5 + ((day + i) % 7) * 0.75;
      const endTime = new Date(startTime.getTime() + durationHours * 3_600_000);
      const isOpen = day === 0 && i < 3;

      sessions.push({
        toolId,
        toolName: `${model.displayName} (${unit.customNumber})`,
        toolType: model.category,
        modelId: unit.modelId,                       // snapshot — NOVO
        modelName: model.displayName,                // snapshot — NOVO
        nfcTagId: unit.nfcTagId,
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

  // IDs actualizados para o novo schema tool_<modelId>_<customNumber>
  const fixtures = [
    {
      anomalyType: 'TOOL_OVERDUE',
      ageDays: 8,
      sessionId: null,
      toolId: 'tool_bosch-gsh-16-30_mart-001',
      toolName: 'Martelo Pneumatico Bosch GSH 16-30 (MART-001)',
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
      toolId: 'tool_honda-eu22i_ger-001',
      toolName: 'Gerador Portatil Honda EU22i 5kVA (GER-001)',
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
      toolId: 'tool_bomag-bp-25_comp-001',
      toolName: 'Compactador Placa Bomag BP 25/50 (COMP-001)',
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

    const models = await createMockEquipmentModels();
    console.log(`${models.filter((m) => m.success).length} modelos de equipamento criados`);

    const tools = await createMockTools();
    console.log(`${tools.filter((tool) => tool.success).length} unidades de ferramenta criadas`);

    const operators = await createMockOperators();
    console.log(`${operators.filter((operator) => operator.success).length} operadores criados`);

    const toolSessions = await createMockToolSessions();
    console.log(`${toolSessions.filter((session) => session.success).length} sessoes de ferramentas criadas`);

    const alerts = await createMockAlerts();
    console.log(`${alerts.filter((alert) => alert.success).length} alertas pendentes criados`);

    return {
      success: true,
      obras: createdObras.filter((obra) => obra.success).length,
      equipmentModels: models.filter((m) => m.success).length,
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
