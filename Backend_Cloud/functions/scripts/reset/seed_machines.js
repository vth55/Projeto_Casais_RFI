/**
 * CASAIS Fleet Intelligence — Seed 7 máquinas reais
 *
 * Cria 7 máquinas no Firestore E no Procore sandbox equipment_register.
 * RFID readers associados posteriormente (rfidReaderId: null por agora).
 *
 * Uso: node scripts/reset/seed_machines.js
 * Pré-requisito: wipe_firestore.js já correu (máquinas a zero)
 */

const admin = require('firebase-admin');

const APP_ID = 'casais-rfid';
const COMPANY_ID = '4283171';
const BASE = `artifacts/${APP_ID}/public/data`;
const MACHINES_PATH = `${BASE}/machines`;
const INTEGRATION_PATH = `${BASE}/integrations/procore`;
const API_BASE = 'https://sandbox.procore.com';

// ULIDs estáveis do sandbox (de FINDINGS.md)
const PROCORE_STATUS_ACTIVE  = '01KPRV693GQFM6FCM77D59YKFT';
const PROCORE_CATEGORY_TERRA = '01KQCGF5S8GME0ZQNGKXPS9WN8';
const PROCORE_TYPE_ESCAVADORA = '01KQCGFKFZK4P5H84XG98SYPM6';

// Dataset das 7 máquinas — rfidReaderId sempre null (associar depois)
const MACHINES = [
  {
    id: 'mach-cat320',
    name: 'Escavadora CAT 320',
    equipmentId: 'ESC-001',
    category: 'escavadoras',
    make: 'Caterpillar',
    model: '320F L',
    year: 2022,
    rfidReaderId: null,
    obraId: 'estaleiro',
    consumptionRate: 22,    // L/h estimado
    maintenanceInterval: 250,
  },
  {
    id: 'mach-komatsu',
    name: 'Escavadora Komatsu PC210',
    equipmentId: 'ESC-002',
    category: 'escavadoras',
    make: 'Komatsu',
    model: 'PC210LC-11',
    year: 2021,
    rfidReaderId: null,
    obraId: 'estaleiro',
    consumptionRate: 20,
    maintenanceInterval: 250,
  },
  {
    id: 'mach-jcb4cx',
    name: 'Retroescavadora JCB 4CX',
    equipmentId: 'RET-001',
    category: 'retroescavadoras',
    make: 'JCB',
    model: '4CX Sitemaster',
    year: 2023,
    rfidReaderId: null,
    obraId: 'estaleiro',
    consumptionRate: 12,
    maintenanceInterval: 200,
  },
  {
    id: 'mach-liebherr',
    name: 'Grua Torre Liebherr 172 EC-B',
    equipmentId: 'GRU-001',
    category: 'gruas',
    make: 'Liebherr',
    model: '172 EC-B 8 Litronic',
    year: 2020,
    rfidReaderId: null,
    obraId: 'estaleiro',
    consumptionRate: 8,
    maintenanceInterval: 500,
  },
  {
    id: 'mach-volvo-a30',
    name: 'Dumper Volvo A30G',
    equipmentId: 'DMP-001',
    category: 'camioes',
    make: 'Volvo',
    model: 'A30G',
    year: 2022,
    rfidReaderId: null,
    obraId: 'estaleiro',
    consumptionRate: 28,
    maintenanceInterval: 300,
  },
  {
    id: 'mach-hamm',
    name: 'Compactador Hamm H13i',
    equipmentId: 'CMP-001',
    category: 'compactadores',
    make: 'Hamm',
    model: 'H13i',
    year: 2021,
    rfidReaderId: null,
    obraId: 'estaleiro',
    consumptionRate: 10,
    maintenanceInterval: 200,
  },
  {
    id: 'mach-atlas',
    name: 'Gerador Atlas Copco 60kVA',
    equipmentId: 'GER-001',
    category: 'geradores',
    make: 'Atlas Copco',
    model: 'QAS 60',
    year: 2023,
    rfidReaderId: null,
    obraId: 'estaleiro',
    consumptionRate: 15,
    maintenanceInterval: 250,
  },
];

admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp;

// Mapa categoria PT → ULID Procore (expandir conforme necessário)
const CATEGORY_ULID_MAP = {
  'escavadoras':     { category_id: PROCORE_CATEGORY_TERRA, type_id: PROCORE_TYPE_ESCAVADORA },
  'retroescavadoras':{ category_id: PROCORE_CATEGORY_TERRA, type_id: PROCORE_TYPE_ESCAVADORA },
  'gruas':           { category_id: PROCORE_CATEGORY_TERRA, type_id: PROCORE_TYPE_ESCAVADORA },
  'camioes':         { category_id: PROCORE_CATEGORY_TERRA, type_id: PROCORE_TYPE_ESCAVADORA },
  'compactadores':   { category_id: PROCORE_CATEGORY_TERRA, type_id: PROCORE_TYPE_ESCAVADORA },
  'geradores':       { category_id: PROCORE_CATEGORY_TERRA, type_id: PROCORE_TYPE_ESCAVADORA },
};

async function getToken() {
  const snap = await db.doc(INTEGRATION_PATH).get();
  if (!snap.exists) throw new Error('Sem tokens OAuth. Conecta o Procore primeiro.');
  const data = snap.data();
  if (!data.access_token) throw new Error('access_token em falta.');
  return data.access_token;
}

async function createProcoreEquipment(token, machine) {
  const ulids = CATEGORY_ULID_MAP[machine.category] || {
    category_id: PROCORE_CATEGORY_TERRA,
    type_id: PROCORE_TYPE_ESCAVADORA,
  };

  const body = {
    name: machine.name,
    identification_number: machine.equipmentId, // v2.1 usa identification_number
    status_id: PROCORE_STATUS_ACTIVE,
    category_id: ulids.category_id,
    type_id: ulids.type_id,
    ownership: 'owned',
    make: machine.make || null,
    model: machine.model || null,
    year: machine.year || null,
  };

  const url = `${API_BASE}/rest/v2.1/companies/${COMPANY_ID}/equipment_register`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Procore-Company-Id': COMPANY_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    // 409 ou 422 "Identification number already exists" → actualizar o existente
    if (res.status === 409 || (res.status === 422 && text.includes('already exists'))) {
      process.stdout.write(` (já existe — a actualizar...)`);
      const existingId = await getProcoreEquipmentByCode(token, machine.equipmentId);
      if (existingId) {
        // PATCH para actualizar nome, status activo, make/model
        await fetch(`${API_BASE}/rest/v2.1/companies/${COMPANY_ID}/equipment_register/${existingId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Procore-Company-Id': COMPANY_ID,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: machine.name,
            status_id: PROCORE_STATUS_ACTIVE,
            make: machine.make || null,
            model: machine.model || null,
            year: machine.year || null,
          }),
        });
        return existingId;
      }
    }
    throw new Error(`POST equipment falhou (${res.status}): ${text.substring(0, 300)}`);
  }

  const json = await res.json();
  return json?.data?.id || json?.id || null;
}

async function getProcoreEquipmentByCode(token, equipmentId) {
  const url = `${API_BASE}/rest/v2.1/companies/${COMPANY_ID}/equipment_register?per_page=100`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Procore-Company-Id': COMPANY_ID,
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const items = json?.data || json || [];
  // v2.1 usa "identification_number", não "equipment_id"
  const found = items.find(e =>
    e.identification_number === equipmentId ||
    e.equipment_id === equipmentId ||
    e.equipment_number === equipmentId
  );
  return found?.id || null;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║        CASAIS FLEET — SEED 7 MÁQUINAS REAIS         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Verificar que está tudo limpo
  const existing = await db.collection(MACHINES_PATH).limit(1).get();
  if (!existing.empty) {
    console.log('⚠️  machines/ não está vazia. Corre wipe_firestore.js primeiro.');
    console.log('   (A continuar mesmo assim — pode duplicar dados)\n');
  }

  let token;
  try {
    token = await getToken();
    console.log('✓ Token Procore obtido\n');
  } catch (err) {
    console.error('❌ Sem token Procore:', err.message);
    console.log('   A criar máquinas só no Firestore (sem sync Procore)...\n');
    token = null;
  }

  let created = 0, procoreSynced = 0, errors = 0;

  for (const machine of MACHINES) {
    process.stdout.write(`  [${created + 1}/7] ${machine.name}...`);

    // 1. Criar/actualizar no Procore
    let procoreEquipmentId = null;
    if (token) {
      try {
        procoreEquipmentId = await createProcoreEquipment(token, machine);
        if (procoreEquipmentId) {
          procoreSynced++;
          process.stdout.write(` Procore OK (${procoreEquipmentId.substring(0, 8)}...)`);
        }
      } catch (err) {
        console.log(`\n    ⚠️  Procore falhou: ${err.message}`);
        errors++;
      }
    }

    // 2. Criar no Firestore
    const docData = {
      name: machine.name,
      category: machine.category,
      status: 'idle',
      obraId: machine.obraId,
      rfidReaderId: machine.rfidReaderId, // null — associar depois
      pairingStatus: 'unpaired',
      source: 'pwa',
      make: machine.make || null,
      model: machine.model || null,
      year: machine.year || null,
      equipmentCode: machine.equipmentId,
      // Procore link
      procoreEquipmentId: procoreEquipmentId,
      procoreEquipmentNumber: machine.equipmentId,
      procoreSyncStatus: procoreEquipmentId ? 'synced' : 'pending',
      procoreSyncedAt: procoreEquipmentId ? ts() : null,
      lastSyncSource: procoreEquipmentId ? 'pwa' : null,
      // Operacional (tudo a zero)
      totalHours: 0,
      partialHours: 0,
      consumptionRate: machine.consumptionRate,
      maintenanceInterval: machine.maintenanceInterval,
      co2Factor: 2.68,
      currentTariff: null,
      tariffHistory: [
        // Tarifa inicial padrão — imutável após criação
        {
          effectiveFrom: new Date().toISOString().split('T')[0],
          ratePerHour: 45.00,
          currency: 'EUR',
          createdAt: new Date().toISOString(),
        }
      ],
      // QR features (padrão)
      qrFeatures: {
        reportAvaria: true,
        startSession: false,
        viewHistory: true,
      },
      createdAt: ts(),
      updatedAt: ts(),
    };

    await db.doc(`${MACHINES_PATH}/${machine.id}`).set(docData);
    console.log(` ✓ Firestore OK`);
    created++;
  }

  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  RESULTADO: ${created}/7 criadas | Procore: ${procoreSynced}/7 | Erros: ${errors}  ║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
  console.log('💡 RFID readers: serão associados depois em MaquinasView.');
  console.log('📌 Próximo passo: node scripts/reset/seed_operators.js\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
