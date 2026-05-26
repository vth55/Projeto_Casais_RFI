// LEGACY — heavy machines model pré-pivot 2026-05
// Este script opera sobre a colecção `machines` (modelo heavy machines).
// NÃO usar para ferramentas NFC — essas estão em `tools`.
// Mantido para compatibilidade com o Procore exporter e audit trail.
/**
 * Migração Sprint 1 — Schema de Máquinas v2
 *
 * Adiciona campos novos a todas as máquinas existentes sem sobrescrever valores já presentes:
 *   - localizacao  : objeto com obraId/obraName/type/gps (derivado de location legado ou obraId)
 *   - estadoOperacional : 'disponivel' | 'em_obra' | 'em_transito'
 *   - movedToYardAt : copiado de updatedAt se máquina está no estaleiro
 *
 * Corrige também o bug de totalHours=0 se as sessões já fechadas não acumularam.
 *
 * Uso:
 *   node scripts/migrate-machine-schema-v2.js [--dry-run]
 *
 * Requer: GOOGLE_APPLICATION_CREDENTIALS ou firebase-admin com emulator local.
 */

const admin = require('firebase-admin');

const DRY_RUN = process.argv.includes('--dry-run');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const APP_ID = 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;

async function main() {
  console.log(`[migrate] Modo: ${DRY_RUN ? 'DRY RUN (sem escritas)' : 'REAL'}`);

  const machinesSnap = await db.collection(`${BASE}/machines`).get();
  console.log(`[migrate] ${machinesSnap.size} máquinas encontradas`);

  let updated = 0;
  let skipped = 0;

  for (const machineDoc of machinesSnap.docs) {
    const data = machineDoc.data();
    const update = {};

    // --- localizacao ---
    if (!data.localizacao) {
      const loc = data.location;
      const obraId = loc?.workId || data.obraId || null;
      const obraName = loc?.workName || null;
      const isEstaleiro = !obraId || obraId === 'estaleiro';

      update.localizacao = {
        obraId: isEstaleiro ? 'estaleiro' : obraId,
        obraName: isEstaleiro ? 'Estaleiro' : (obraName || obraId),
        gps: loc?.gps || null,
        type: isEstaleiro ? 'estaleiro' : 'obra',
        updatedAt: loc?.updatedAt || data.updatedAt || admin.firestore.FieldValue.serverTimestamp(),
        cardId: loc?.updatedBy || null,
      };
    }

    // --- estadoOperacional ---
    if (!data.estadoOperacional) {
      const status = data.status || 'IDLE';
      const isInObra = data.obraId && data.obraId !== 'estaleiro';

      if (['ACTIVE'].includes(status)) {
        update.estadoOperacional = 'em_obra';
      } else if (data.despachoPendente) {
        update.estadoOperacional = 'em_transito';
      } else if (isInObra) {
        update.estadoOperacional = 'em_obra';
      } else {
        update.estadoOperacional = 'disponivel';
      }
    }

    // --- movedToYardAt ---
    if (!data.movedToYardAt) {
      const isYard = !data.obraId || data.obraId === 'estaleiro';
      if (isYard) {
        update.movedToYardAt = data.updatedAt || data.createdAt || admin.firestore.FieldValue.serverTimestamp();
      }
    }

    if (Object.keys(update).length === 0) {
      skipped++;
      continue;
    }

    console.log(`[migrate] ${machineDoc.id}: ${JSON.stringify(Object.keys(update))}`);

    if (!DRY_RUN) {
      await machineDoc.ref.update(update);
    }

    updated++;
  }

  console.log(`\n[migrate] Concluído: ${updated} actualizadas, ${skipped} já tinham os campos.`);
}

main().catch(err => {
  console.error('[migrate] ERRO:', err);
  process.exit(1);
});
