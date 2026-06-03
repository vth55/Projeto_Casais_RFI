'use strict';

/**
 * backfill-obra-scope-ids.js — preenche obraScopeIds em tool_movements e tool_transfers
 *
 * Uso:
 *   node scripts/backfill-obra-scope-ids.js                            # dry-run
 *   node scripts/backfill-obra-scope-ids.js --write                    # escreve no Firestore
 *   node scripts/backfill-obra-scope-ids.js --collection movements     # só movements
 *   node scripts/backfill-obra-scope-ids.js --collection transfers     # só transfers
 *   node scripts/backfill-obra-scope-ids.js --write --collection movements
 *
 * Idempotente: relê cada documento antes de escrever, compara via scopeIsUpToDate.
 * Nunca apaga campos existentes.
 *
 * Output por colecção:
 *   checked: N | needs_update: N | skipped (current): N | invalid: N
 */

const admin = require('firebase-admin');
const { buildObraScopeIds, scopeIsUpToDate, SCOPE_VERSION } = require('../obraScope');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'casais-rfid',
  });
}

const db = admin.firestore();
const APP_ID = 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;
const BATCH_SIZE = 400;  // conservador — limite Firestore é 500

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--write');
const collectionArg = (() => {
  const idx = args.indexOf('--collection');
  return idx !== -1 ? args[idx + 1] : null;
})();

const COLLECTIONS = {
  movements: `${BASE}/tool_movements`,
  transfers: `${BASE}/tool_transfers`,
};

const targets = collectionArg
  ? { [collectionArg]: COLLECTIONS[collectionArg] }
  : COLLECTIONS;

if (collectionArg && !COLLECTIONS[collectionArg]) {
  console.error(`[backfill] Colecção desconhecida: "${collectionArg}". Use "movements" ou "transfers".`);
  process.exitCode = 1;
  process.exit();
}

async function backfillCollection(label, collPath) {
  console.log(`\n[${label}] path=${collPath} mode=${DRY_RUN ? 'DRY-RUN' : 'WRITE'}`);

  const snap = await db.collection(collPath).get();
  let checked = 0;
  let needsUpdate = 0;
  let skipped = 0;
  let invalid = 0;

  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    checked++;
    const data = doc.data();
    const expectedScope = buildObraScopeIds(data);

    if (scopeIsUpToDate(data, expectedScope)) {
      skipped++;
      continue;
    }

    // Documents where no obra IDs exist (WAREHOUSE↔WAREHOUSE) are valid
    // and get obraScopeIds: []. We only count as "invalid" docs where the
    // source fields are completely absent (not even WAREHOUSE).
    const hasAnyField = (
      'fromObraId' in data || 'toObraId' in data ||
      (data.from !== undefined) || (data.to !== undefined)
    );
    if (!hasAnyField) {
      invalid++;
      console.warn(`[${label}] ${doc.id}: sem campos de origem — ignorado`);
      continue;
    }

    needsUpdate++;
    console.log(`[${label}] ${doc.id}: scope=${JSON.stringify(expectedScope)}`);

    if (!DRY_RUN) {
      batch.update(doc.ref, {
        obraScopeIds: expectedScope,
        scopeVersion: SCOPE_VERSION,
        scopeUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
  }

  console.log(
    `[${label}] checked: ${checked} | needs_update: ${needsUpdate}` +
    ` | skipped (current): ${skipped} | invalid: ${invalid}`
  );

  return { checked, needsUpdate, skipped, invalid };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  CASAIS — Backfill obraScopeIds');
  console.log('='.repeat(60));
  if (DRY_RUN) {
    console.log('  MODO: DRY-RUN — nenhuma escrita será feita');
    console.log('  Para escrever: node scripts/backfill-obra-scope-ids.js --write');
  } else {
    console.log('  MODO: WRITE — os documentos serão actualizados');
  }
  console.log('='.repeat(60));

  let totalNeedsUpdate = 0;
  for (const [label, collPath] of Object.entries(targets)) {
    const result = await backfillCollection(label, collPath);
    totalNeedsUpdate += result.needsUpdate;
  }

  console.log('\n' + '='.repeat(60));
  if (DRY_RUN && totalNeedsUpdate > 0) {
    console.log(`  ${totalNeedsUpdate} documentos precisam de actualização.`);
    console.log('  Corre com --write para aplicar.');
  } else if (!DRY_RUN) {
    console.log('  Backfill concluído.');
  } else {
    console.log('  Todos os documentos já estão actualizados.');
  }
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('[backfill] Erro fatal:', error);
  process.exitCode = 1;
});
