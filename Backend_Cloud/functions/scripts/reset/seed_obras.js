/**
 * CASAIS Fleet Intelligence — Seed Obras
 *
 * Cria obras no Firestore. As obras com procoreProjectId vêm do Procore
 * via runFullSync — este script só cria obras "estaleiro" e PWA-only.
 * As obras Procore serão criadas automaticamente pelo sync.
 *
 * Uso: node scripts/reset/seed_obras.js
 * Nota: correr DEPOIS de runFullSync para não duplicar obras Procore
 */

const admin = require('firebase-admin');

const APP_ID = 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;
const OBRAS_PATH = `${BASE}/obras`;
const INTEGRATION_PATH = `${BASE}/integrations/procore`;
const API_BASE = 'https://sandbox.procore.com';
const COMPANY_ID = '4283171';

admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp;

async function getToken() {
  const snap = await db.doc(INTEGRATION_PATH).get();
  if (!snap.exists) return null;
  return snap.data()?.access_token || null;
}

function mapProcoreStatus(p) {
  const stage = (p?.project_stage?.name || p?.stage || '').toLowerCase();
  const active = p?.active !== false;
  if (!active) return 'COMPLETED';
  if (stage.includes('preconstruction') || stage.includes('bidding')) return 'PLANNED';
  if (stage.includes('closeout') || stage.includes('completed')) return 'COMPLETED';
  return active ? 'ACTIVE' : 'COMPLETED';
}

async function importProcoreObras(token) {
  console.log('  📡 A importar obras directamente do Procore API...');

  const res = await fetch(
    `${API_BASE}/rest/v1.0/companies/${COMPANY_ID}/projects?per_page=100`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Procore-Company-Id': COMPANY_ID } }
  );

  if (!res.ok) {
    console.log(`  ⚠️  Procore API respondeu ${res.status} — a saltar import de obras`);
    return 0;
  }

  const projects = await res.json();
  let count = 0;

  for (const p of projects) {
    if (!p.id || !p.name) continue;
    if ((p.name || '').toLowerCase().includes('template')) continue;

    const obraId = `procore_${p.id}`;
    await db.doc(`${OBRAS_PATH}/${obraId}`).set({
      name: p.name,
      address: p.address || '',
      city: p.city || '',
      zip: p.zip || '',
      code: p.project_number || '',
      description: p.work_scope || p.description || '',
      manager: '',
      status: mapProcoreStatus(p),
      startDate: p.start_date || null,
      endDate: p.completion_date || null,
      source: 'procore',
      procoreProjectId: String(p.id),
      procoreSyncedAt: ts(),
      createdAt: ts(),
      updatedAt: ts(),
    });

    console.log(`  ✓ Obra importada: "${p.name}" (procore_${p.id})`);
    count++;
  }

  return count;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║           CASAIS FLEET — SEED OBRAS                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 1. Criar o estaleiro (sempre presente, não vem do Procore)
  const estaleiro = {
    name: 'Estaleiro Central — Braga',
    code: 'EST-BRG',
    address: 'Zona Industrial de Braga',
    city: 'Braga',
    zip: '4700-000',
    status: 'ACTIVE',
    manager: 'Vitor Hugo',
    description: 'Estaleiro central para parque de máquinas e logística.',
    source: 'pwa',
    procoreProjectId: null,
    startDate: null,
    endDate: null,
    createdAt: ts(),
    updatedAt: ts(),
  };

  await db.doc(`${OBRAS_PATH}/estaleiro`).set(estaleiro);
  console.log('  ✓ estaleiro criado (Estaleiro Central — Braga)');

  // 2. Importar obras directamente do Procore API
  const token = await getToken();
  if (token) {
    const imported = await importProcoreObras(token);
    console.log(`  ✓ ${imported} obras importadas do Procore`);
  } else {
    console.log('\n  ℹ️  Sem token Procore disponível.');
    console.log('     As obras Torre Boavista e Viaduto IP2 serão importadas');
    console.log('     automaticamente no próximo sync agendado (máx. 1h).');
    console.log('\n     Para forçar o sync manualmente:');
    console.log('     → Abre a PWA → Configurações → Integração Procore → Sincronizar Agora');
  }

  // 3. Verificar o que ficou criado
  const snap = await db.collection(OBRAS_PATH).get();
  console.log(`\n✅ Total de obras em Firestore: ${snap.size}`);
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(`   - ${d.id}: "${data.name}" (source: ${data.source || '?'})`);
  });

  console.log('\n📌 Próximo passo: corre o teste de validação:');
  console.log('   node scripts/tests/sprint0_test.js\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
