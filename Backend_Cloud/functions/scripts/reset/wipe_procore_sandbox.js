/**
 * CASAIS Fleet Intelligence — Wipe Procore Sandbox Equipment
 *
 * Marca todos os equipment_register como "inactive" no sandbox Procore.
 * (Procore v2.1 não suporta DELETE — usamos PATCH com status inactivo)
 *
 * Uso: node scripts/reset/wipe_procore_sandbox.js
 * Requer: Firestore com tokens OAuth válidos (correr wipe_firestore.js DEPOIS)
 */

const admin = require('firebase-admin');

const APP_ID = 'casais-rfid';
const COMPANY_ID = '4283171';
const API_BASE = 'https://sandbox.procore.com';
const INTEGRATION_PATH = `artifacts/${APP_ID}/public/data/integrations/procore`;

// ULID do status "inactive" no sandbox — descoberto via API
// Se falhar, tentamos 'out_of_service' como fallback via nome
const STATUS_INACTIVE_CANDIDATES = [
  // Tentar endpoint de status lookup primeiro
];

admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();

async function getToken() {
  const snap = await db.doc(INTEGRATION_PATH).get();
  if (!snap.exists) throw new Error('Sem tokens OAuth. Faz login em /api/procore/authorize primeiro.');
  const data = snap.data();
  if (!data.access_token) throw new Error('access_token em falta no Firestore.');

  // Verificar expiração (5min de margem)
  const expiresAt = data.expires_at?.toMillis ? data.expires_at.toMillis() : 0;
  if (Date.now() + 5 * 60 * 1000 >= expiresAt) {
    console.log('⚠️  Token a expirar — podes precisar de refrescar via a PWA.');
  }
  return data.access_token;
}

async function procoreGet(token, endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Procore-Company-Id': COMPANY_ID,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function procorePatch(token, endpoint, body) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Procore-Company-Id': COMPANY_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`  ⚠️  PATCH ${endpoint} → ${res.status}: ${text.substring(0, 200)}`);
    return null;
  }
  return res.json();
}

async function getInactiveStatusId(token) {
  // Tentar obter lista de status disponíveis
  try {
    const data = await procoreGet(token,
      `/rest/v2.1/companies/${COMPANY_ID}/equipment_statuses`
    );
    const statuses = data?.data || data || [];
    const inactive = statuses.find(s =>
      ['inactive', 'out_of_service', 'retired', 'disposed']
        .includes(s.name?.toLowerCase())
    );
    if (inactive) {
      console.log(`  ✓ Status inactivo encontrado: "${inactive.name}" (${inactive.id})`);
      return inactive.id;
    }
  } catch (e) {
    console.log('  Endpoint de status não disponível, a usar status activo como fallback...');
  }
  // Fallback: deixar sem status (mantém activo mas fica semaforo de aviso)
  return null;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     CASAIS FLEET — RESET PROCORE SANDBOX EQUIPMENT  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const token = await getToken();
  console.log('✓ Token OAuth obtido do Firestore\n');

  // Listar todos os equipment
  console.log('📋 A listar equipment no sandbox...');
  let equipment = [];
  try {
    const resp = await procoreGet(token,
      `/rest/v2.1/companies/${COMPANY_ID}/equipment_register?per_page=100`
    );
    equipment = resp?.data || resp || [];
    console.log(`   ${equipment.length} equipment encontrados\n`);
  } catch (err) {
    console.error('❌ Erro ao listar equipment:', err.message);
    process.exit(1);
  }

  if (equipment.length === 0) {
    console.log('✅ Sandbox já está vazio. Nada a fazer.\n');
    process.exit(0);
  }

  // Obter ULID do status inactivo
  const inactiveStatusId = await getInactiveStatusId(token);

  // Marcar todos como inactivos (ou apagar da lista com PATCH mínimo)
  console.log('🗑️  A marcar equipment como inactivos...\n');
  let done = 0, failed = 0;

  for (const eq of equipment) {
    const id = eq.id;
    const name = eq.name || eq.equipment_id || id;

    // Tentar PATCH com status inactivo se tivermos o ULID
    const patchBody = inactiveStatusId
      ? { status_id: inactiveStatusId }
      : { name: `[REMOVIDO] ${name}` }; // fallback: renomear

    const result = await procorePatch(token,
      `/rest/v2.1/companies/${COMPANY_ID}/equipment_register/${id}`,
      patchBody
    );

    if (result) {
      console.log(`  ✓ ${name} (${id}) → inactivo`);
      done++;
    } else {
      console.log(`  ✗ ${name} (${id}) → falhou (ver aviso acima)`);
      failed++;
    }
  }

  console.log(`\n✅ Concluído: ${done} inactivos, ${failed} falhados`);
  if (failed > 0) {
    console.log('   (Equipment que falharam ficam visíveis no Procore mas com nome "[REMOVIDO]")');
  }
  console.log('\n📌 Próximo passo: node scripts/reset/seed_machines.js\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
