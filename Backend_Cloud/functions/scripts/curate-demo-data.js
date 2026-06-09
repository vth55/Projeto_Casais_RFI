'use strict';

/**
 * curate-demo-data.js — Curação de dados de demo CASAIS Fleet Intelligence
 *
 * Uso:
 *   node scripts/curate-demo-data.js           # dry-run (padrão, sem writes)
 *   node scripts/curate-demo-data.js --write   # aplica alterações no Firestore
 *
 * O que faz (por ordem):
 *   1. Renomeia/oculta "Testeee 1" (ID: XL7IcDTM6bz8wj4Tmcbt)
 *   2. Marca "Sandbox Test Project" como hiddenFromDemo
 *   3. Fecha sessão duplicada de MART-001 (motivo: DEMO_CLEANUP_DUPLICATE)
 *   4. Fecha sessões OPEN com startTime > 48h (motivo: DEMO_CLEANUP_OLD)
 *   5. Cria ~15 sessões CLOSED recentes (últimos 3 dias) — demoGenerated: true
 *   6. Cria 2 sessões OPEN recentes para KPIs vivos — demoActive: true
 *   7. Cria 3 guias tool_transfers realistas — demoGenerated: true
 *   8. Cria 3 tool_alerts OPEN realistas — demoGenerated: true
 *
 * Idempotente: documentos com demoGenerated:true não são recriados.
 * Não apaga documentos. Usa update com demoCuratedAt / demoGenerated.
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

// ─── Init ─────────────────────────────────────────────────────────────────────

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'casais-rfid',
  });
}

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;
const FieldValue = admin.firestore.FieldValue;

const APP_ID  = 'casais-rfid';
const BASE    = `artifacts/${APP_ID}/public/data`;

const col = (name) => db.collection(`${BASE}/${name}`);

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const DRY_RUN = !args.includes('--write');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date();

const daysAgo  = (n) => new Date(NOW.getTime() - n * 86_400_000);
const hoursAgo = (n) => new Date(NOW.getTime() - n * 3_600_000);
const ts       = (date) => Timestamp.fromDate(date);

/** 32-char random hex token (para tool_alerts) */
const randomToken = () => crypto.randomBytes(16).toString('hex');

/** Formata duração em horas com 1 casa decimal */
const durH = (startDate, endDate) =>
  Math.round(((endDate - startDate) / 3_600_000) * 10) / 10;

// ─── Change log ───────────────────────────────────────────────────────────────

const changes = [];

function planUpdate(ref, data, description) {
  changes.push({ type: 'UPDATE', ref, data, description });
}

function planSet(ref, data, description) {
  changes.push({ type: 'SET', ref, data, description });
}

function printChanges() {
  if (changes.length === 0) {
    console.log('\n✅ Nenhuma alteração necessária — dados já curados.\n');
    return;
  }
  console.log(`\n📋 ${changes.length} alteração(ões) planeada(s):\n`);
  for (const c of changes) {
    const icon = c.type === 'SET' ? '➕' : '✏️ ';
    console.log(`  ${icon} [${c.type}] ${c.ref.path}`);
    console.log(`      ${c.description}`);
  }
  console.log('');
}

async function applyChanges() {
  if (changes.length === 0) {
    console.log('\n✅ Nada a aplicar.\n');
    return;
  }

  // Firestore batch limit = 500; em caso extremo fazer lotes
  const BATCH_SIZE = 400;
  let applied = 0;

  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const slice = changes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const c of slice) {
      if (c.type === 'SET')    batch.set(c.ref, c.data);
      if (c.type === 'UPDATE') batch.update(c.ref, c.data);
    }
    await batch.commit();
    applied += slice.length;
  }

  console.log(`\n✅ ${applied} alteração(ões) aplicada(s) com sucesso.\n`);
}

// ─── FASE 1 — Leitura do estado actual ────────────────────────────────────────

async function readState() {
  console.log('🔍 A ler estado actual do Firestore...');

  const [toolsSnap, sessionsSnap, transfersSnap, alertsSnap, obrasSnap, operatorsSnap, modelsSnap] =
    await Promise.all([
      col('tools').get(),
      col('tool_sessions').get(),
      col('tool_transfers').get(),
      col('tool_alerts').get(),
      col('obras').get(),
      col('operators').get(),
      col('equipment_models').get(),
    ]);

  // modelMap: modelId → { displayName, category }
  const modelMap = {};
  modelsSnap.docs.forEach(d => { modelMap[d.id] = d.data(); });

  // Enrich tools with display name from equipment_models
  const tools = toolsSnap.docs.map(d => {
    const data  = d.data();
    const model = data.modelId ? modelMap[data.modelId] : null;
    return {
      id: d.id,
      ...data,
      _displayName: model?.displayName || data.displayName || data.name || null,
      _category:    model?.category || data.category || null,
    };
  });

  const sessions  = sessionsSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
  const transfers = transfersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const alerts    = alertsSnap.docs.map(d  => ({ id: d.id, ...d.data() }));
  const obras     = obrasSnap.docs.map(d   => ({ id: d.id, ...d.data() }));
  const operators = operatorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`   tools: ${tools.length} | sessions: ${sessions.length} | transfers: ${transfers.length}`);
  console.log(`   alerts: ${alerts.length} | obras: ${obras.length} | operators: ${operators.length}`);
  console.log(`   equipment_models: ${modelsSnap.size}`);

  return { tools, sessions, transfers, alerts, obras, operators, modelMap };
}

// ─── FASE 2a — Corrigir "Testeee 1" ──────────────────────────────────────────

const TESTEE_TOOL_ID = 'XL7IcDTM6bz8wj4Tmcbt';

function planFixTesteee(tools, sessions) {
  const tool = tools.find(t => t.id === TESTEE_TOOL_ID);
  if (!tool) {
    console.log('   ⚠️  "Testeee 1" não encontrado (ID: XL7IcDTM6bz8wj4Tmcbt) — ignorar');
    return;
  }

  const ref = col('tools').doc(TESTEE_TOOL_ID);
  const cleanName = 'Ferramenta de Calibração NFC';
  if (!tool.hiddenFromDemo || tool.name === 'Testeee 1' || tool.displayName !== cleanName) {
    planUpdate(ref, {
      hiddenFromDemo: true,
      name: cleanName,
      displayName: cleanName,
      demoCuratedAt: FieldValue.serverTimestamp(),
    }, `Ocultar e renomear "Testeee 1" (${TESTEE_TOOL_ID}) → "${cleanName}"`);
  } else {
    console.log('   ✓  "Testeee 1" já curado — skip tool');
  }

  const dirtySessions = sessions.filter(s =>
    s.toolId === TESTEE_TOOL_ID ||
    /testeee|teste+\s*1/i.test(String(s.toolName || ''))
  );

  for (const s of dirtySessions) {
    if (s.hiddenFromDemo && s.toolName === cleanName) continue;
    planUpdate(col('tool_sessions').doc(s.id), {
      hiddenFromDemo: true,
      toolName: cleanName,
      demoCuratedAt: FieldValue.serverTimestamp(),
    }, `Ocultar/renomear sessão com "Testeee 1" (${s.id})`);
  }
}

// ─── FASE 2b — Ocultar Sandbox Test Project ───────────────────────────────────

function planFixStorageLocations(tools) {
  for (const tool of tools) {
    const storageLocation = String(tool.storageLocation || '');
    if (!/Armazem/i.test(storageLocation)) continue;

    planUpdate(col('tools').doc(tool.id), {
      storageLocation: storageLocation.replace(/Armazem/g, 'Armazém'),
      demoCuratedAt: FieldValue.serverTimestamp(),
    }, `Corrigir acento storageLocation "${storageLocation}" (${tool.id})`);
  }
}

function planHideSandbox(obras) {
  const sandbox = obras.find(o =>
    (o.name || '').toLowerCase().includes('sandbox') ||
    (o.procoreProjectId && (o.name || '').toLowerCase().includes('test'))
  );

  if (!sandbox) {
    console.log('   ⚠️  Sandbox Test Project não encontrado — ignorar');
    return;
  }
  if (sandbox.hiddenFromDemo) {
    console.log(`   ✓  "${sandbox.name}" já hiddenFromDemo — skip`);
    return;
  }

  const ref = col('obras').doc(sandbox.id);
  planUpdate(ref, {
    hiddenFromDemo: true,
    demoCuratedAt: FieldValue.serverTimestamp(),
  }, `Ocultar obra sandbox: "${sandbox.name}" (${sandbox.id})`);
}

// ─── FASE 2c — Fechar sessões duplicadas e antigas ────────────────────────────

function planCleanSessions(sessions) {
  const open = sessions.filter(s => s.status === 'OPEN');
  const now  = Date.now();

  // Agrupar por toolId para encontrar duplicados
  const byTool = {};
  for (const s of open) {
    if (!s.toolId) continue;
    if (!byTool[s.toolId]) byTool[s.toolId] = [];
    byTool[s.toolId].push(s);
  }

  // Fechar duplicados (manter mais recente, fechar mais antigo)
  for (const [toolId, toolSessions] of Object.entries(byTool)) {
    if (toolSessions.length < 2) continue;

    // Ordenar por startTime ascendente — fechar as mais antigas
    const sorted = [...toolSessions].sort((a, b) => {
      const ta = a.startTime?.toMillis?.() ?? 0;
      const tb = b.startTime?.toMillis?.() ?? 0;
      return ta - tb;
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const dup = sorted[i];
      const startMs   = dup.startTime?.toMillis?.() ?? (now - 3_600_000);
      const endDate   = new Date(startMs + 4 * 3_600_000); // fecha 4h após início
      const durHours  = durH(new Date(startMs), endDate);

      planUpdate(col('tool_sessions').doc(dup.id), {
        status:            'CLOSED',
        endTime:           ts(endDate),
        durationHours:     durHours,
        closedReason:      'DEMO_CLEANUP_DUPLICATE',
        demoCuratedAt:     FieldValue.serverTimestamp(),
      }, `Fechar sessão duplicada de toolId=${toolId} (${dup.id}), startTime=${dup.startTime?.toDate?.().toISOString()}`);
    }
  }

  // Fechar sessões antigas (> 48h) para a demo não parecer abandonada.
  const OLD_OPEN_SESSION_MS = 48 * 3_600_000;
  for (const s of open) {
    const startMs = s.startTime?.toMillis?.() ?? null;
    if (!startMs) continue;
    const ageMs = now - startMs;
    if (ageMs < OLD_OPEN_SESSION_MS) continue;
    // Já está a ser tratada como duplicado? Skip.
    const alreadyPlanned = changes.some(c => c.ref.path.endsWith(s.id));
    if (alreadyPlanned) continue;

    const endDate  = new Date(startMs + 6 * 3_600_000); // 6h de sessão
    const durHours = durH(new Date(startMs), endDate);
    const ageHours = Math.round(ageMs / 3_600_000);

    planUpdate(col('tool_sessions').doc(s.id), {
      status:        'CLOSED',
      endTime:       ts(endDate),
      durationHours: durHours,
      obraId:        s.obraId || 'procore_328122',
      obraName:      s.obraName || 'Torre Boavista — Porto',
      closedReason:  'DEMO_CLEANUP_OLD',
      demoCuratedAt: FieldValue.serverTimestamp(),
    }, `Fechar sessao antiga ${ageHours}h: tool="${s.toolName}" op="${s.operatorName}" (${s.id})`);
  }
}

// ─── FASE 2d — Criar sessões demo recentes ────────────────────────────────────

const DEMO_SESSIONS_TARGET = 15;

function planDemoSessions(tools, sessions, obras, operators) {
  // Verificar quantas sessões demo já existem
  const existingDemo = sessions.filter(s => s.demoGenerated === true);
  if (existingDemo.length >= DEMO_SESSIONS_TARGET) {
    console.log(`   ✓  ${existingDemo.length} sessões demo já existem — skip criação`);
    return;
  }

  const needed = DEMO_SESSIONS_TARGET - existingDemo.length;
  console.log(`   Criar ${needed} sessão(ões) demo (${existingDemo.length} existentes)`);

  // Obras reais (excluir sandbox e obras sem nome PT)
  const validObras = obras.filter(o =>
    !o.hiddenFromDemo &&
    !(o.name || '').toLowerCase().includes('sandbox') &&
    o.status !== 'COMPLETED'
  );
  if (validObras.length === 0) {
    console.log('   ⚠️  Sem obras válidas para sessões demo — skip');
    return;
  }

  // Operadores reais (primeiros 3)
  const validOps = operators.filter(o => o.name && !o.name.toLowerCase().includes('teste'));
  const demoOps  = [
    ...validOps.slice(0, 2),
    ...(operators.filter(o => o.name?.toLowerCase().includes('operador')).slice(0, 2)),
    ...(operators.filter(o => o.name?.toLowerCase().includes('encarregado')).slice(0, 1)),
  ].filter((o, i, arr) => arr.findIndex(x => x.id === o.id) === i) // dedup
   .slice(0, 3);

  if (demoOps.length === 0) {
    // Fallback: operadores genéricos
    demoOps.push(
      { id: 'op-demo-1', name: 'João Ferreira' },
      { id: 'op-demo-2', name: 'Ana Costa' },
    );
  }

  // Ferramentas elegíveis (excluir Testeee 1, preferir AVAILABLE/IN_USE, excluir RETIRED)
  const eligibleTools = tools.filter(t =>
    t.id !== TESTEE_TOOL_ID &&
    t.status !== 'IN_REPAIR' &&
    t.status !== 'RETIRED' &&
    t.status !== 'LOST'
  );

  if (eligibleTools.length === 0) {
    console.log('   ⚠️  Sem ferramentas elegíveis para sessões demo — skip');
    return;
  }

  // Template de sessões: (daysAgoStart, durationH, obraIndex, toolIndex, opIndex)
  // Distribuídas ao longo dos últimos 3 dias em padrões realistas de obra
  const SESSION_TEMPLATES = [
    // Ontem
    { dayStart: 1, hourStart: 7.5,  durH: 4.5 },
    { dayStart: 1, hourStart: 8.0,  durH: 3.0 },
    { dayStart: 1, hourStart: 9.0,  durH: 5.5 },
    { dayStart: 1, hourStart: 13.0, durH: 4.0 },
    { dayStart: 1, hourStart: 14.5, durH: 3.5 },
    { dayStart: 1, hourStart: 7.0,  durH: 7.5 },
    // Há 2 dias
    { dayStart: 2, hourStart: 7.5,  durH: 4.0 },
    { dayStart: 2, hourStart: 8.0,  durH: 6.0 },
    { dayStart: 2, hourStart: 13.0, durH: 4.5 },
    { dayStart: 2, hourStart: 14.0, durH: 3.0 },
    { dayStart: 2, hourStart: 7.0,  durH: 8.0 },
    // Há 3 dias
    { dayStart: 3, hourStart: 8.0,  durH: 5.0 },
    { dayStart: 3, hourStart: 9.0,  durH: 4.0 },
    { dayStart: 3, hourStart: 13.5, durH: 3.5 },
    { dayStart: 3, hourStart: 7.5,  durH: 7.0 },
  ];

  const created = [];
  for (let i = 0; i < needed && i < SESSION_TEMPLATES.length; i++) {
    const tpl     = SESSION_TEMPLATES[i];
    const tool    = eligibleTools[i % eligibleTools.length];
    const obra    = validObras[i % validObras.length];
    const op      = demoOps[i % demoOps.length];

    const startDate = daysAgo(tpl.dayStart);
    startDate.setHours(Math.floor(tpl.hourStart), (tpl.hourStart % 1) * 60, 0, 0);
    const endDate   = new Date(startDate.getTime() + tpl.durH * 3_600_000);

    const ref  = col('tool_sessions').doc();
    const nfcId      = tool.nfcTagId || null;
    const baseName   = tool._displayName || tool.id;
    const toolName   = nfcId ? `${baseName} (${nfcId})` : baseName;
    const data = {
      toolId:        tool.id,
      toolName,
      toolType:      tool._category || null,
      modelId:       tool.modelId || null,
      modelName:     tool._displayName || null,
      nfcTagId:      nfcId,
      operatorId:    op.id,
      operatorName:  op.name,
      obraId:        obra.id,
      obraName:      obra.name,
      sapOrigin:     obra.name,
      sapDestination: null,
      sapWorker:     op.id,
      status:        'CLOSED',
      startTime:     ts(startDate),
      endTime:       ts(endDate),
      durationHours: durH(startDate, endDate),
      location:      null,
      endLocation:   null,
      procoreSynced: false,
      sapSynced:     false,
      demoGenerated: true,
      demoCuratedAt: FieldValue.serverTimestamp(),
    };

    planSet(ref, data,
      `Sessão demo: "${tool._displayName || tool.id}" · ${op.name} · ${obra.name} ` +
      `· ${startDate.toLocaleDateString('pt-PT')} ${tpl.durH}h`
    );
    created.push({ ref, tool, obra, op });
  }

  return created;
}

// FASE 2d.1 - Criar sessoes ativas demo para KPIs vivos
const DEMO_ACTIVE_SESSIONS_TARGET = 2;
const DEMO_ACTIVE_SESSION_SPECS = [
  {
    id: 'demo_active_serra_001',
    toolId: 'tool_dewalt-dwe-575_serra-001',
    operatorId: 'OP_001',
    operatorName: 'João Silva',
    hoursAgo: 1.5,
  },
  {
    id: 'demo_active_ger_001',
    toolId: 'tool_honda-eu22i_ger-001',
    operatorId: 'OP_002',
    operatorName: 'Maria Santos',
    hoursAgo: 2.25,
  },
];

function planDemoActiveSessions(tools, sessions) {
  const existingOpenDemo = sessions.filter(s => s.demoActive === true && s.status === 'OPEN');
  if (existingOpenDemo.length >= DEMO_ACTIVE_SESSIONS_TARGET) {
    console.log(`   ✓  ${existingOpenDemo.length} sessões ativas demo já existem — skip criação`);
    return;
  }

  const activeToolIds = new Set(
    sessions.filter(s => s.status === 'OPEN').map(s => s.toolId).filter(Boolean)
  );

  for (const spec of DEMO_ACTIVE_SESSION_SPECS) {
    if (sessions.some(s => s.id === spec.id && s.status === 'OPEN')) continue;
    if (activeToolIds.has(spec.toolId)) continue;

    const tool = tools.find(t => t.id === spec.toolId);
    if (!tool || tool.hiddenFromDemo || tool.demoHidden) continue;

    const startDate = hoursAgo(spec.hoursAgo);
    const nfcId = tool.nfcTagId || null;
    const baseName = tool._displayName || tool.name || tool.id;
    const toolName = nfcId ? `${baseName} (${nfcId})` : baseName;

    planSet(col('tool_sessions').doc(spec.id), {
      toolId:       tool.id,
      toolName,
      toolType:     tool._category || null,
      modelId:      tool.modelId || null,
      modelName:    tool._displayName || null,
      nfcTagId:     nfcId,
      operatorId:   spec.operatorId,
      operatorName: spec.operatorName,
      obraId:       'procore_328122',
      obraName:     'Torre Boavista — Porto',
      sapOrigin:    'Torre Boavista — Porto',
      sapWorker:    spec.operatorId,
      status:       'OPEN',
      startTime:    ts(startDate),
      endTime:      null,
      durationHours: null,
      location:     null,
      procoreSynced: false,
      sapSynced:    false,
      demoGenerated: true,
      demoActive: true,
      demoCuratedAt: FieldValue.serverTimestamp(),
    }, `Sessão ativa demo: "${toolName}" · ${spec.operatorName} · Torre Boavista — Porto`);

    activeToolIds.add(spec.toolId);
  }
}

// ─── FASE 2e — Criar guias tool_transfers demo ────────────────────────────────

// FASE 2d.2 - Historico fechado do utilizador operador de teste
const DEMO_OPERATOR_UID = '7TwVpdJkLESxmBEQFSAu5kzNLOw1';
const DEMO_OPERATOR_NAME = 'Teste Operador';
const DEMO_OPERATOR_SESSIONS = [
  {
    id: 'demo_operator_closed_lixa_002',
    toolId: 'tool_bosch-gex-125_lixa-002',
    dayStart: 1,
    hourStart: 9,
    durH: 2.5,
  },
  {
    id: 'demo_operator_closed_laser_001',
    toolId: 'tool_bosch-grl-300_laser-001',
    dayStart: 2,
    hourStart: 13.5,
    durH: 3,
  },
  {
    id: 'demo_operator_closed_paraf_003',
    toolId: 'tool_makita-df-001_paraf-003',
    dayStart: 3,
    hourStart: 8,
    durH: 4,
  },
];

function planDemoOperatorSessions(tools, sessions) {
  for (const spec of DEMO_OPERATOR_SESSIONS) {
    if (sessions.some(s => s.id === spec.id)) continue;

    const tool = tools.find(t => t.id === spec.toolId);
    if (!tool || tool.hiddenFromDemo || tool.demoHidden) continue;

    const startDate = daysAgo(spec.dayStart);
    startDate.setHours(Math.floor(spec.hourStart), (spec.hourStart % 1) * 60, 0, 0);
    const endDate = new Date(startDate.getTime() + spec.durH * 3_600_000);
    const nfcId = tool.nfcTagId || null;
    const baseName = tool._displayName || tool.name || tool.id;
    const toolName = nfcId ? `${baseName} (${nfcId})` : baseName;

    planSet(col('tool_sessions').doc(spec.id), {
      toolId:       tool.id,
      toolName,
      toolType:     tool._category || null,
      modelId:      tool.modelId || null,
      modelName:    tool._displayName || null,
      nfcTagId:     nfcId,
      operatorId:   DEMO_OPERATOR_UID,
      operatorName: DEMO_OPERATOR_NAME,
      obraId:       'procore_328122',
      obraName:     'Torre Boavista — Porto',
      sapOrigin:    'Torre Boavista — Porto',
      sapWorker:    DEMO_OPERATOR_UID,
      status:       'CLOSED',
      startTime:    ts(startDate),
      endTime:      ts(endDate),
      durationHours: durH(startDate, endDate),
      location:     null,
      endLocation:  null,
      procoreSynced: false,
      sapSynced:    false,
      demoGenerated: true,
      demoOperator: true,
      demoCuratedAt: FieldValue.serverTimestamp(),
    }, `Sessão operador demo: "${toolName}" · ${DEMO_OPERATOR_NAME} · ${spec.durH}h`);
  }
}

function planDemoTransfers(tools, transfers, obras) {
  const existingDemo = transfers.filter(t => t.demoGenerated === true);
  if (existingDemo.length >= 3) {
    console.log(`   ✓  ${existingDemo.length} guias demo já existem — skip criação`);
    return;
  }

  const validObras = obras.filter(o =>
    !o.hiddenFromDemo &&
    !(o.name || '').toLowerCase().includes('sandbox')
  );

  const obraTorre     = validObras.find(o => o.name?.includes('Torre Boavista')) || validObras[0];
  const obraGaia      = validObras.find(o => o.name?.includes('Gaia')) || validObras[1] || validObras[0];
  const obraViaduto   = validObras.find(o => o.name?.includes('Viaduto') || o.name?.includes('IP2')) || validObras[2] || validObras[0];

  if (!obraTorre) {
    console.log('   ⚠️  Sem obras para criar guias demo — skip');
    return;
  }

  // Selecionar ferramentas AVAILABLE para as guias
  const available = tools.filter(t =>
    t.id !== TESTEE_TOOL_ID &&
    !t.currentObraId &&
    t.status !== 'IN_REPAIR' &&
    t.status !== 'RETIRED' && t.status !== 'LOST'
  ).slice(0, 12);

  const buildItems = (slice) => slice.map(t => ({
    toolId:   t.id,
    name:     t.displayName || t.name || t.id,
    type:     t.category || null,
    nfcTagId: t.nfcTagId || null,
  }));

  const group1 = available.slice(0, 4);
  const group2 = available.slice(4, 8);
  const usedInOutbound = new Set([...group1, ...group2].map(t => t.id));
  const returnCandidates = tools.filter(t =>
    t.id !== TESTEE_TOOL_ID &&
    !usedInOutbound.has(t.id) &&
    t.status !== 'IN_REPAIR' &&
    t.status !== 'RETIRED' &&
    t.status !== 'LOST' &&
    (t.currentObraId === obraViaduto.id || t.currentObraId)
  );
  const group3 = returnCandidates.slice(0, 3);

  const needed = 3 - existingDemo.length;

  const GUIAS = [
    // Guia 1: Expedida (em trânsito) — Armazém → Torre Boavista
    {
      type:   'WAREHOUSE_TO_OBRA',
      status: 'DISPATCHED',
      from:   { kind: 'WAREHOUSE', obraId: null, name: 'Armazém Central' },
      to:     { kind: 'OBRA', obraId: obraTorre.id, name: obraTorre.name },
      items:  buildItems(group1),
      toolIds: group1.map(t => t.id),
      createdAt:    ts(daysAgo(2)),
      dispatchedAt: ts(daysAgo(1)),
      notes: 'Expedição semanal — Torre Boavista',
      description: `DISPATCHED Armazém → ${obraTorre.name} (${group1.length} ferramentas)`,
    },
    // Guia 2: Recebida — Armazém → Urbanização Gaia Norte
    {
      type:   'WAREHOUSE_TO_OBRA',
      status: 'RECEIVED',
      from:   { kind: 'WAREHOUSE', obraId: null, name: 'Armazém Central' },
      to:     { kind: 'OBRA', obraId: obraGaia.id, name: obraGaia.name },
      items:  buildItems(group2),
      toolIds: group2.map(t => t.id),
      receivedToolIds: group2.map(t => t.id),
      missingToolIds:  [],
      createdAt:    ts(daysAgo(5)),
      dispatchedAt: ts(daysAgo(4)),
      receivedAt:   ts(daysAgo(3)),
      notes: 'Arranque de obra — equipamento inicial',
      description: `RECEIVED Armazém → ${obraGaia.name} (${group2.length} ferramentas)`,
    },
    // Guia 3: Rascunho — Obra Viaduto → Armazém (devolução)
    {
      type:   'OBRA_TO_WAREHOUSE',
      status: 'DRAFT',
      from:   { kind: 'OBRA', obraId: obraViaduto.id, name: obraViaduto.name },
      to:     { kind: 'WAREHOUSE', obraId: null, name: 'Armazém Central' },
      items:  buildItems(group3),
      toolIds: group3.map(t => t.id),
      createdAt: ts(daysAgo(0)),
      notes: 'Devolução — fase de obra concluída',
      description: `DRAFT ${obraViaduto.name} → Armazém (${group3.length} ferramentas)`,
    },
  ];

  for (let i = 0; i < needed && i < GUIAS.length; i++) {
    const g   = GUIAS[i];
    const ref = col('tool_transfers').doc();
    const { description, ...data } = g;

    planSet(ref, {
      ...data,
      createdBy:    'demo-curator',
      obraScopeIds: [g.to.obraId, g.from.obraId].filter(Boolean),
      scopeVersion: 1,
      externalSync: {
        sourceSystem: 'PWA',
        externalRefs: {},
        sapSynced:    false,
        procoreSynced: false,
        syncStatus:   'pending',
        retryCount:   0,
        lastError:    null,
        updatedAt:    null,
      },
      auditLog: [{
        action: 'DEMO_CREATED',
        by:     'demo-curator',
        at:     ts(daysAgo(0)),
        notes:  'Criado por curate-demo-data.js',
      }],
      demoGenerated: true,
      demoCuratedAt: FieldValue.serverTimestamp(),
    }, description);
  }
}

// ─── FASE 2f — Criar alertas demo ─────────────────────────────────────────────

function planDemoAlerts(tools, alerts, sessions) {
  const existingDemo = alerts.filter(a => a.demoGenerated === true);
  if (existingDemo.length >= 3) {
    console.log(`   ✓  ${existingDemo.length} alertas demo já existem — skip criação`);
    return;
  }

  const needed = 3 - existingDemo.length;

  // Ferramentas para alertas: preferir as que têm sessões OPEN ou estão em reparação
  const overdueSession = sessions.find(s =>
    s.status === 'OPEN' &&
    s.startTime?.toMillis?.() < daysAgo(2).getTime()
  );

  const inRepairTool = tools.find(t =>
    t.id !== TESTEE_TOOL_ID && t.status === 'IN_REPAIR'
  );

  const noLocationTool = tools.find(t =>
    t.id !== TESTEE_TOOL_ID &&
    t.status === 'AVAILABLE' &&
    !t.currentObraId
  );

  const ALERT_TEMPLATES = [
    // Alerta 1: Devolução atrasada
    overdueSession ? {
      toolId:        overdueSession.toolId,
      toolSessionId: overdueSession.id,
      anomalyType:   'TOOL_OVERDUE',
      status:        'OPEN',
      internal:      true,
      token:         randomToken(),
      createdAt:     ts(daysAgo(1)),
      notifiedTo:    'gestor@casais.pt',
      emailSent:     false,
      description:   `TOOL_OVERDUE: tool="${overdueSession.toolName}" sessão aberta há >2 dias`,
    } : null,

    // Alerta 2: Sem localização
    noLocationTool ? {
      toolId:        noLocationTool.id,
      toolSessionId: null,
      anomalyType:   'NO_LOCATION',
      status:        'OPEN',
      internal:      true,
      token:         randomToken(),
      createdAt:     ts(daysAgo(2)),
      notifiedTo:    'gestor@casais.pt',
      emailSent:     false,
      description:   `NO_LOCATION: tool="${noLocationTool._displayName || noLocationTool.id}" sem leitura NFC há >7 dias`,
    } : null,

    // Alerta 3: Avaria reportada
    inRepairTool ? {
      toolId:        inRepairTool.id,
      toolSessionId: null,
      anomalyType:   'DAMAGED',
      status:        'IN_REVIEW',
      internal:      true,
      token:         randomToken(),
      createdAt:     ts(daysAgo(3)),
      notifiedTo:    'manutencao@casais.pt',
      emailSent:     true,
      emailSentAt:   ts(daysAgo(3)),
      description:   `DAMAGED: tool="${inRepairTool._displayName || inRepairTool.id}" em reparação`,
    } : null,
  ];

  // Fallback: se não tiver as ferramentas ideais, criar alertas com as disponíveis
  const fallbackTool = tools.find(t => t.id !== TESTEE_TOOL_ID && t.status !== 'RETIRED');

  const validTemplates = ALERT_TEMPLATES.map((tpl, idx) => {
    if (tpl) return tpl;
    if (!fallbackTool) return null;
    const types = ['TOOL_OVERDUE', 'NO_LOCATION', 'DAMAGED'];
    return {
      toolId:        fallbackTool.id,
      toolSessionId: null,
      anomalyType:   types[idx],
      status:        idx === 2 ? 'IN_REVIEW' : 'OPEN',
      internal:      true,
      token:         randomToken(),
      createdAt:     ts(daysAgo(idx + 1)),
      notifiedTo:    'gestor@casais.pt',
      emailSent:     false,
      description:   `${types[idx]}: fallback tool="${fallbackTool._displayName || fallbackTool.id}"`,
    };
  }).filter(Boolean);

  for (let i = 0; i < needed && i < validTemplates.length; i++) {
    const tpl = validTemplates[i];
    const ref = col('tool_alerts').doc();
    const { description, ...data } = tpl;

    planSet(ref, {
      ...data,
      auditLog: [{
        action: 'CREATED',
        by:     'demo-curator',
        at:     data.createdAt,
        notes:  'Criado por curate-demo-data.js',
      }],
      actionsTaken: [],
      demoGenerated: true,
      demoCuratedAt: FieldValue.serverTimestamp(),
    }, description);
  }
}

// ─── FASE 3 — Atualizar valores de reposição das ferramentas ──────────────────

// Mapa aproximado: modelId → valor de reposição em EUR.
const REPLACEMENT_VALUES = {
  'bomag-bp-25':       4500,
  'bosch-gex-125':      600,
  'bosch-grl-300':     1800,
  'bosch-gsh-16-30':   3500,
  'bosch-gws-22-230':   900,
  'dewalt-dwe-575':    1200,
  'hilti-te-70-atc':   4500,
  'honda-eu22i':       5000,
  'imer-syntesi-140':  2200,
  'makita-df-001':      750,
  'rubi-dc-250':       2000,
  'wacker-irfu-38':    2500,
};

function planFixReplacementValues(tools) {
  let updated = 0;
  for (const t of tools) {
    if (t.id === TESTEE_TOOL_ID) continue;
    if (t.hiddenFromDemo || t.demoHidden) continue;
    const modelId   = t.modelId || '';
    const newValue  = REPLACEMENT_VALUES[modelId];
    if (!newValue) continue;
    const current   = Number(t.replacementCost) || 0;
    // Mantem idempotencia: so atualiza quando o valor alvo mudou.
    if (current === newValue) continue;

    planUpdate(col('tools').doc(t.id), {
      replacementCost: newValue,
      demoCuratedAt:  FieldValue.serverTimestamp(),
    }, `replacementCost: ${current} -> EUR ${newValue} para "${t.displayName || t.name || t.id}" (${modelId})`);
    updated++;
  }
  if (updated === 0) console.log('   ✓  Valores de reposição já configurados — skip');
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mode = DRY_RUN ? 'DRY-RUN (sem writes)' : '⚠️  WRITE MODE';
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  CASAIS Demo Curação — ${mode.padEnd(28)}║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);

  // Leitura
  const { tools, sessions, transfers, alerts, obras, operators } = await readState(); // modelMap is merged into tools._displayName

  // Planeamento
  console.log('\n── Fase 2a: Testeee 1 ────────────────────────────────');
  planFixTesteee(tools, sessions);
  planFixStorageLocations(tools);

  console.log('\n── Fase 2b: Sandbox Test Project ─────────────────────');
  planHideSandbox(obras);

  console.log('\n── Fase 2c: Sessões duplicadas/antigas ───────────────');
  planCleanSessions(sessions);

  console.log('\n── Fase 2d: Sessões demo recentes ────────────────────');
  planDemoSessions(tools, sessions, obras, operators);

  console.log('\n── Fase 2d.1: Sessões ativas demo ────────────────────');
  planDemoActiveSessions(tools, sessions);

  console.log('\n── Fase 2d.2: Sessões do operador demo ───────────────');
  planDemoOperatorSessions(tools, sessions);

  console.log('\n── Fase 2e: Guias tool_transfers demo ────────────────');
  planDemoTransfers(tools, transfers, obras);

  console.log('\n── Fase 2f: Alertas tool_alerts demo ─────────────────');
  planDemoAlerts(tools, alerts, sessions);

  console.log('\n── Fase 3: Valores de reposição ──────────────────────');
  planFixReplacementValues(tools);

  // Relatório
  printChanges();

  // Aplicar ou sair
  if (DRY_RUN) {
    console.log('ℹ️  Dry-run concluído. Para aplicar: node scripts/curate-demo-data.js --write\n');
  } else {
    console.log('⚡ A aplicar alterações...');
    await applyChanges();
    console.log('🎉 Curação de demo concluída.\n');
  }
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message || err);
  process.exit(1);
});
