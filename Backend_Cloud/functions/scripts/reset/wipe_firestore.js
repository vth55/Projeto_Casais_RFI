/**
 * CASAIS Fleet Intelligence — Wipe Firestore
 *
 * Apaga todas as colecções operacionais e recomeça do zero.
 * PRESERVA: integrations/procore (OAuth tokens), settings/system
 *
 * Uso: node scripts/reset/wipe_firestore.js
 * Requer: GOOGLE_APPLICATION_CREDENTIALS ou gcloud auth application-default login
 */

const admin = require('firebase-admin');
const readline = require('readline');

const APP_ID = 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;

const COLLECTIONS_TO_DELETE = [
  `${BASE}/sessions`,
  `${BASE}/avarias`,
  `${BASE}/maintenance`,
  `${BASE}/maintenance_schedules`,
  `${BASE}/machines`,
  `${BASE}/operators`,
  `${BASE}/pending_operators`,
  `${BASE}/obras`,
  `${BASE}/location_cards`,
  `${BASE}/integrations/procore/projects`,
  `${BASE}/integrations/procore/directory`,
  `${BASE}/integrations/procore/equipment`,
];

const PRESERVED = [
  `${BASE}/integrations/procore (doc raiz — OAuth tokens)`,
  `${BASE}/settings/system (parâmetros operacionais)`,
];

admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize = 400) {
  const colRef = db.collection(collectionPath);
  let deleted = 0;

  while (true) {
    const snap = await colRef.limit(batchSize).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.docs.length;
    process.stdout.write(`  ${collectionPath}: ${deleted} docs apagados...\r`);
  }

  console.log(`  ✓ ${collectionPath}: ${deleted} docs apagados`);
  return deleted;
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  // Verificar que estamos no projecto certo
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT
    || (admin.app().options?.projectId);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       CASAIS FLEET — RESET TOTAL DO FIRESTORE       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (projectId && projectId !== APP_ID) {
    console.error(`❌ ERRO DE SEGURANÇA: projectId="${projectId}" mas esperado="${APP_ID}"`);
    console.error('   Este script só pode correr contra casais-rfid.');
    process.exit(1);
  }

  console.log('📋 VAI APAGAR:');
  COLLECTIONS_TO_DELETE.forEach(c => console.log(`   ✗ ${c}`));

  console.log('\n✅ VAI PRESERVAR:');
  PRESERVED.forEach(p => console.log(`   ✓ ${p}`));

  console.log('\n⚠️  ATENÇÃO: Esta operação é irreversível!');
  const answer = await confirm('\nEscreve "RESET CASAIS" para confirmar: ');

  if (answer !== 'RESET CASAIS') {
    console.log('\n❌ Cancelado. Nada foi apagado.');
    process.exit(0);
  }

  console.log('\n🗑️  A apagar...\n');
  let totalDeleted = 0;

  for (const col of COLLECTIONS_TO_DELETE) {
    try {
      const count = await deleteCollection(col);
      totalDeleted += count;
    } catch (err) {
      if (err.code === 5) { // NOT_FOUND
        console.log(`  - ${col}: já vazia (ignorado)`);
      } else {
        console.error(`  ❌ Erro em ${col}:`, err.message);
      }
    }
  }

  console.log(`\n✅ Reset concluído — ${totalDeleted} documentos apagados.`);
  console.log('   OAuth tokens e settings preservados.\n');
  console.log('📌 Próximo passo: node scripts/reset/seed_machines.js\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
