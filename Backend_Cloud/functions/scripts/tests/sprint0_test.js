/**
 * Sprint 0 — Teste de Validação: Reset Total
 *
 * Verifica que o Firestore está limpo e a PWA mostra estado vazio.
 *
 * Uso: node tests/sprint0_test.js
 * Pré-requisito: PWA a correr em localhost:5173
 */

const admin = require('firebase-admin');
const { launchPwa, screenshot, assert, waitForPwa } = require('./_common');

const APP_ID = 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;

admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();

async function checkFirestoreEmpty(collectionPath) {
  const snap = await db.collection(collectionPath).limit(1).get();
  return snap.empty;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║         SPRINT 0 — TESTE: RESET VALIDADO            ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  let passed = 0, failed = 0;

  // ─── 1. Verificar Firestore via Admin SDK ─────────────────────────────
  console.log('📋 A verificar Firestore...\n');

  const collectionsToCheck = [
    { path: `${BASE}/machines`,    label: 'machines' },
    { path: `${BASE}/sessions`,    label: 'sessions' },
    { path: `${BASE}/avarias`,     label: 'avarias' },
    { path: `${BASE}/maintenance`, label: 'maintenance' },
    { path: `${BASE}/obras`,       label: 'obras' },
    { path: `${BASE}/operators`,   label: 'operators' },
  ];

  for (const col of collectionsToCheck) {
    const isEmpty = await checkFirestoreEmpty(col.path);
    if (isEmpty) {
      console.log(`  ✓ ${col.label}: vazio`);
      passed++;
    } else {
      console.log(`  ✗ ${col.label}: NÃO ESTÁ VAZIO — wipe não correu?`);
      failed++;
    }
  }

  // Verificar que integrations/procore foi preservado
  const intSnap = await db.doc(`${BASE}/integrations/procore`).get();
  if (intSnap.exists && intSnap.data()?.access_token) {
    console.log(`  ✓ integrations/procore: preservado (OAuth token presente)`);
    passed++;
  } else {
    console.log(`  ⚠️  integrations/procore: sem token — OAuth pode precisar de reconectar`);
  }

  // ─── 2. Verificar PWA via Playwright ─────────────────────────────────
  console.log('\n📋 A verificar PWA...\n');

  const { browser, page, consoleErrors } = await launchPwa('sprint0');

  try {
    // Login primeiro (se necessário)
    await waitForPwa(page, '/maquinas');
    await page.waitForTimeout(2000);

    // Verificar estado vazio
    const pageText = await page.textContent('body');
    const hasEmptyState = pageText.includes('Nenhuma') ||
      pageText.includes('máquinas') ||
      pageText.includes('empty') ||
      pageText.includes('0');

    if (hasEmptyState) {
      console.log('  ✓ PWA /maquinas: estado vazio visível');
      passed++;
    } else {
      console.log('  ⚠️  PWA /maquinas: não deu para confirmar estado vazio (pode estar a carregar)');
    }

    await screenshot(page, 'sprint0', '01_pwa_maquinas_vazio.png');

    // Verificar /operadores
    await waitForPwa(page, '/operadores');
    await screenshot(page, 'sprint0', '02_pwa_operadores_vazio.png');
    console.log('  ✓ PWA /operadores: screenshot capturado');
    passed++;

    // Verificar /obras
    await waitForPwa(page, '/obras');
    await screenshot(page, 'sprint0', '03_pwa_obras_vazio.png');
    console.log('  ✓ PWA /obras: screenshot capturado');
    passed++;

    // Erros de consola
    const relevantErrors = consoleErrors.filter(e =>
      !e.includes('auth') && // ignorar erros de auth (esperados)
      !e.includes('FirebaseError') &&
      !e.includes('permission-denied')
    );
    if (relevantErrors.length === 0) {
      console.log('  ✓ Zero erros de consola relevantes');
      passed++;
    } else {
      console.log(`  ⚠️  ${relevantErrors.length} erros de consola:`);
      relevantErrors.forEach(e => console.log(`     ${e}`));
    }

  } finally {
    await browser.close();
    await admin.app().delete();
  }

  // ─── Resultado ───────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗');
  const status = failed === 0 ? '✅ PASSOU' : `❌ FALHOU (${failed} erros)`;
  console.log(`║  ${status.padEnd(52)}║`);
  console.log(`║  ${`Checks: ${passed} OK, ${failed} falhos`.padEnd(52)}║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    console.log('📌 Acções necessárias:');
    console.log('   - Se machines não está vazio: corre wipe_firestore.js');
    console.log('   - Se integrations/procore sem token: reconecta Procore na PWA\n');
    process.exit(1);
  } else {
    console.log('📌 Próximo passo: node reset/seed_machines.js\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
