'use strict';

/**
 * backfill-user-operator-links.js — liga users/{uid} ↔ operators/{id} por email
 *
 * Uso:
 *   node scripts/backfill-user-operator-links.js                 # dry-run
 *   node scripts/backfill-user-operator-links.js --write         # escreve no Firestore
 *
 * Regras de match:
 *   - Só por email (normalizado para lowercase/trim)
 *   - Email deve existir em ambos os lados
 *   - Se múltiplos utilizadores têm o mesmo email → ambiguous → não escreve
 *   - Se link já existe e está correcto → skip (idempotente)
 *   - Se um lado já aponta para outro ID → conflict → não sobrescreve
 *
 * Saída:
 *   checkedUsers: N
 *   checkedOperators: N
 *   proposedLinks: N
 *   ambiguous: N  (com detalhes)
 *   alreadyLinked: N
 *   conflicts: N  (com detalhes)
 *   written: N    (só se --write)
 */

const admin = require('firebase-admin');
const { computeLinkProposals, buildUserOperatorLinkPatch } = require('../userOperatorLink');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'casais-rfid',
  });
}

const db = admin.firestore();
const APP_ID = 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;
const USERS_PATH = `${BASE}/users`;
const OPERATORS_PATH = `${BASE}/operators`;

const DRY_RUN = !process.argv.includes('--write');

async function main() {
  console.log('='.repeat(60));
  console.log('  CASAIS — Backfill users ↔ operators links');
  console.log('='.repeat(60));
  console.log(`  Modo: ${DRY_RUN ? 'DRY-RUN (nenhuma escrita)' : 'WRITE'}`);
  if (DRY_RUN) {
    console.log('  Para escrever: node scripts/backfill-user-operator-links.js --write');
  }
  console.log('='.repeat(60));

  const [usersSnap, operatorsSnap] = await Promise.all([
    db.collection(USERS_PATH).get(),
    db.collection(OPERATORS_PATH).get(),
  ]);

  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const operators = operatorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`\nLidos: ${users.length} users, ${operators.length} operators`);

  const { proposed, ambiguous, alreadyLinked, conflicts } = computeLinkProposals(operators, users);

  // Ambiguous
  if (ambiguous.length > 0) {
    console.log(`\n[AMBIGUOUS] ${ambiguous.length} email(s) com múltiplos utilizadores — ignorados:`);
    ambiguous.forEach(a => console.log(`  ${a.email} → ${a.candidateUids.join(', ')}`));
  }

  // Conflicts
  if (conflicts.length > 0) {
    console.log(`\n[CONFLICT] ${conflicts.length} link(s) existentes apontam para IDs diferentes — não sobrescritos:`);
    conflicts.forEach(c => console.log(`  operator=${c.operatorId} user=${c.uid} existingUserId=${c.existingUserId}`));
  }

  // Proposed
  if (proposed.length > 0) {
    console.log(`\n[PROPOSED] ${proposed.length} link(s) a criar:`);
    proposed.forEach(p => console.log(`  ${p.email}: users/${p.uid} ↔ operators/${p.operatorId}`));
  } else {
    console.log('\n[PROPOSED] Nenhum link novo a criar.');
  }

  console.log(`\n[SUMMARY]`);
  console.log(`  checkedUsers:     ${users.length}`);
  console.log(`  checkedOperators: ${operators.length}`);
  console.log(`  proposedLinks:    ${proposed.length}`);
  console.log(`  ambiguous:        ${ambiguous.length}`);
  console.log(`  alreadyLinked:    ${alreadyLinked}`);
  console.log(`  conflicts:        ${conflicts.length}`);

  if (DRY_RUN || proposed.length === 0) {
    console.log(`  written:          0 (${DRY_RUN ? 'dry-run' : 'nothing to write'})`);
    console.log('\n' + '='.repeat(60));
    return;
  }

  // Write in batches of 200 ops (each link = 2 ops)
  const BATCH_PAIRS = 200;
  let written = 0;
  let batchOps = 0;
  let batch = db.batch();

  const usersRef = db.collection(USERS_PATH);
  const operatorsRef = db.collection(OPERATORS_PATH);

  for (const { uid, operatorId } of proposed) {
    const userRef = usersRef.doc(uid);
    const operatorRef = operatorsRef.doc(operatorId);
    const { userPatch, operatorPatch } = buildUserOperatorLinkPatch({ id: uid }, { id: operatorId });

    batch.update(userRef, userPatch);
    batch.update(operatorRef, operatorPatch);
    batchOps += 2;
    written++;

    if (batchOps >= BATCH_PAIRS * 2) {
      await batch.commit();
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
  }

  console.log(`  written:          ${written}`);
  console.log('\n' + '='.repeat(60));
  console.log('  Backfill concluído.');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('[backfill-user-operator-links] Erro fatal:', error);
  process.exitCode = 1;
});
