/**
 * CASAIS Fleet Intelligence — Seed Operadores Reais
 *
 * Cria operadores no Firestore.
 * - Email é campo de contacto OPCIONAL (não Firebase Auth)
 * - Sem sync para Procore directory (decisão arquitectural: Procore→PWA apenas)
 * - cardId (RFID) pode ser adicionado depois via MaquinasView/OperadoresView
 *
 * Uso: node scripts/reset/seed_operators.js
 */

const admin = require('firebase-admin');

const APP_ID = 'casais-rfid';
const BASE = `artifacts/${APP_ID}/public/data`;
const OPERATORS_PATH = `${BASE}/operators`;

const OPERATORS = [
  {
    id: 'op-joao-pereira',
    name: 'João Pereira',
    cardId: null,        // associar depois com leitor RFID real
    email: null,
    phone: '+351 912 000 001',
    role: 'operador',
    licenses: ['escavadoras', 'retroescavadoras'],
    assignedObraId: null,
  },
  {
    id: 'op-manuel-silva',
    name: 'Manuel Silva',
    cardId: null,
    email: null,
    phone: '+351 912 000 002',
    role: 'operador',
    licenses: ['escavadoras', 'gruas'],
    assignedObraId: null,
  },
  {
    id: 'op-antonio-costa',
    name: 'António Costa',
    cardId: null,
    email: null,
    phone: '+351 912 000 003',
    role: 'operador',
    licenses: ['retroescavadoras', 'compactadores'],
    assignedObraId: null,
  },
  {
    id: 'op-carlos-rodrigues',
    name: 'Carlos Rodrigues',
    cardId: null,
    email: null,
    phone: '+351 912 000 004',
    role: 'operador',
    licenses: ['camioes', 'compactadores'],
    assignedObraId: null,
  },
  {
    id: 'op-jose-fernandes',
    name: 'José Fernandes',
    cardId: null,
    email: null,
    phone: '+351 912 000 005',
    role: 'operador',
    licenses: ['geradores', 'escavadoras'],
    assignedObraId: null,
  },
];

admin.initializeApp({ projectId: 'casais-rfid' });
const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp;

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║        CASAIS FLEET — SEED 5 OPERADORES REAIS       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log('ℹ️  Nota arquitectural:');
  console.log('   - Email é opcional (contacto, não credencial)');
  console.log('   - Sem sync para Procore directory (Procore→PWA only)');
  console.log('   - cardId (RFID) será associado depois\n');

  let created = 0;

  for (const op of OPERATORS) {
    const docData = {
      name: op.name,
      cardId: op.cardId,          // null — associar com leitor real depois
      email: op.email,            // null — opcional
      phone: op.phone,
      role: op.role,
      systemRole: null,
      licenses: op.licenses || [],
      assignedObraId: op.assignedObraId,
      procoreUserId: null,        // não sincronizar para Procore
      source: 'pwa',
      pairingStatus: 'unpaired',  // cardId é null
      createdAt: ts(),
      updatedAt: ts(),
    };

    await db.doc(`${OPERATORS_PATH}/${op.id}`).set(docData);
    console.log(`  ✓ ${op.name} criado (sem RFID por agora)`);
    created++;
  }

  console.log(`\n✅ ${created} operadores criados.`);
  console.log('📌 Próximo passo: node scripts/reset/seed_obras.js\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
