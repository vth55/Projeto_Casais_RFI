/**
 * demo-data-dryrun.js
 * Dry-run para curadoria de dados de demonstração.
 * MODO DRY-RUN: apenas imprime o que faria — sem escritas no Firestore.
 *
 * Para executar: node docs/sessions/demo-data-dryrun.js
 * Para aplicar: definir DRY_RUN=false (requer service account ou Firebase Admin SDK)
 *
 * Tarefas identificadas (UI-CLEANUP-FINAL-1):
 *   1. Renomear utilizadores de teste com nomes reais de campo
 *   2. Fechar sessão LIXA-001 em curso há 73h+ (operador testeoperador)
 *   3. Documentar thresholds actuais (toolOverdueDays, toolLostDays) na coleção operationalParams
 */

const DRY_RUN = true;

// ──────────────────────────────────────────────
// 1. RENOMEAR UTILIZADORES DE TESTE
// ──────────────────────────────────────────────

const USER_RENAMES = [
  {
    // UID ou doc ID a determinar via Firebase Console / Auth
    uid: 'testeoperador@fleet.com',
    current: { displayName: 'Teste Operador' },
    target: { displayName: 'João Ferreira' },
    reason: 'Nome técnico visível no dashboard do operador; substituir por nome de campo',
  },
  {
    uid: 'testeencarregado@fleet.com',
    current: { displayName: 'Teste Encarregado' },
    target: { displayName: 'Ana Rocha' },
    reason: 'Nome técnico visível na lista de operadores do encarregado',
  },
];

// ──────────────────────────────────────────────
// 2. FECHAR SESSÃO LIXA-001 STALE
// ──────────────────────────────────────────────

const STALE_SESSION = {
  // Localizar via: Firestore > artifacts/casais-rfid/public/data/tool_sessions
  // Filtro: toolId = 'LIXA-001' AND status = 'ACTIVE'
  description: 'Sessão activa LIXA-001 com >73h de duração',
  action: 'UPDATE tool_sessions/<id>',
  fields: {
    status: 'CLOSED',
    closedAt: '<timestamp agora>',
    closedReason: 'demo_cleanup',
    durationHours: 73.6,  // aproximado — calcular com closedAt - startTime
  },
  reason: 'Sessão stale cria ruído no dashboard; simula fecho manual por encarregado',
};

// ──────────────────────────────────────────────
// 3. VERIFICAR THRESHOLDS operationalParams
// ──────────────────────────────────────────────

const THRESHOLD_CHECK = {
  collection: 'artifacts/casais-rfid/public/data/operationalParams',
  docId: 'global',
  expectedFields: {
    toolOverdueDays: 3,       // Dias antes de TOOL_OVERDUE
    toolLostDays: 14,         // Dias antes de TOOL_PRESUMED_LOST
  },
  note: 'Se valores forem null/undefined, o sistema usa defaults hardcoded — confirmar no backend',
};

// ──────────────────────────────────────────────
// OUTPUT DRY-RUN
// ──────────────────────────────────────────────

console.log('=== DEMO DATA DRY-RUN ===');
console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (sem escritas)' : 'LIVE (Firestore será modificado)'}\n`);

console.log('--- 1. RENOMEAR UTILIZADORES ---');
for (const u of USER_RENAMES) {
  console.log(`  ${DRY_RUN ? '[DRY]' : '[EXEC]'} Auth.updateUser(${u.uid}) displayName: "${u.current.displayName}" → "${u.target.displayName}"`);
  console.log(`         Razão: ${u.reason}`);
}

console.log('\n--- 2. FECHAR SESSÃO STALE ---');
console.log(`  ${DRY_RUN ? '[DRY]' : '[EXEC]'} ${STALE_SESSION.action}`);
console.log(`         Descrição: ${STALE_SESSION.description}`);
console.log(`         Campos a actualizar:`, JSON.stringify(STALE_SESSION.fields, null, 4));
console.log(`         Razão: ${STALE_SESSION.reason}`);

console.log('\n--- 3. VERIFICAR THRESHOLDS ---');
console.log(`  [READ] ${THRESHOLD_CHECK.collection}/${THRESHOLD_CHECK.docId}`);
console.log(`         Valores esperados:`, JSON.stringify(THRESHOLD_CHECK.expectedFields, null, 4));
console.log(`         Nota: ${THRESHOLD_CHECK.note}`);

console.log('\n=== FIM DRY-RUN ===');
console.log('Para aplicar: definir DRY_RUN=false e configurar Firebase Admin SDK com service account.');
