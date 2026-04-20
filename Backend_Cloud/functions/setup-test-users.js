/**
 * Script de criação de contas de teste
 * CASAIS Fleet Intelligence
 *
 * Cria utilizadores no Firebase Auth e os respectivos documentos de perfil
 * no Firestore (artifacts/casais-rfid/public/data/users/{uid}).
 *
 * Uso:
 *   node setup-test-users.js
 *
 * Requer:
 *   - firebase-admin instalado (já incluído nas dependências das functions)
 *   - Credenciais de serviço via GOOGLE_APPLICATION_CREDENTIALS ou
 *     applicationDefault (gcloud auth application-default login)
 *
 * Para usar com service account explícito:
 *   GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/serviceAccount.json node setup-test-users.js
 */

'use strict';

const admin = require('firebase-admin');

// Inicializar Firebase Admin com Application Default Credentials
// (funciona tanto com GOOGLE_APPLICATION_CREDENTIALS como com gcloud CLI)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'casais-rfid',
  });
}

const auth = admin.auth();
const db = admin.firestore();

/** Caminho base da colecção de utilizadores */
const USERS_COLLECTION = 'artifacts/casais-rfid/public/data/users';

/**
 * Definição das contas de teste a criar.
 * Cada entrada inclui email, password, nome de display e systemRole.
 */
const TEST_USERS = [
  {
    email: 'vitorhugo22.igrejas@gmail.com',
    password: '999999',
    name: 'Vitor Hugo',
    systemRole: 'admin',
  },
  {
    email: 'testegestor@fleet.com',
    password: '123456',
    name: 'Teste Gestor de Frota',
    systemRole: 'gestor_frota',
  },
  {
    email: 'testeencarregado@fleet.com',
    password: '123456',
    name: 'Teste Encarregado',
    systemRole: 'encarregado_obra',
  },
  {
    email: 'testeoperador@fleet.com',
    password: '123456',
    name: 'Teste Operador',
    systemRole: 'operador',
  },
  {
    email: 'testesustentabilidade@fleet.com',
    password: '123456',
    name: 'Teste Sustentabilidade',
    systemRole: 'gestor_sustentabilidade',
  },
  {
    email: 'testeviewer@fleet.com',
    password: '123456',
    name: 'Teste Viewer',
    systemRole: 'gestor_frota',
  },
];

/**
 * Cria ou actualiza um utilizador no Firebase Auth.
 * Se já existir (email duplicado), actualiza a password.
 *
 * @param {{email: string, password: string, name: string}} user
 * @returns {Promise<string>} UID do utilizador
 */
const createOrUpdateAuthUser = async (user) => {
  try {
    const record = await auth.createUser({
      email: user.email,
      password: user.password,
      displayName: user.name,
      emailVerified: true,
    });
    console.log(`  [CRIADO]     ${user.email} (uid: ${record.uid})`);
    return record.uid;
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      // Utilizador já existe — obter UID e actualizar password
      const existing = await auth.getUserByEmail(user.email);
      await auth.updateUser(existing.uid, {
        password: user.password,
        displayName: user.name,
        emailVerified: true,
      });
      console.log(`  [ACTUALIZADO] ${user.email} (uid: ${existing.uid})`);
      return existing.uid;
    }
    throw err;
  }
};

/**
 * Cria ou substitui o documento de perfil do utilizador no Firestore.
 *
 * @param {string} uid
 * @param {{email: string, name: string, systemRole: string}} profile
 */
const upsertFirestoreProfile = async (uid, profile) => {
  const ref = db.doc(`${USERS_COLLECTION}/${uid}`);
  await ref.set(
    {
      email: profile.email,
      name: profile.name,
      systemRole: profile.systemRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true } // preserva campos existentes não listados (ex: assignedObraId)
  );
  console.log(`  [FIRESTORE]  perfil gravado -> systemRole: ${profile.systemRole}`);
};

/**
 * Executa a criação de todas as contas de teste.
 */
const main = async () => {
  console.log('='.repeat(60));
  console.log('  CASAIS Fleet Intelligence — Setup de contas de teste');
  console.log('='.repeat(60));
  console.log(`  Projeto: casais-rfid`);
  console.log(`  Coleccao: ${USERS_COLLECTION}`);
  console.log('='.repeat(60));
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const user of TEST_USERS) {
    console.log(`Processando: ${user.email} [${user.systemRole}]`);
    try {
      const uid = await createOrUpdateAuthUser(user);
      await upsertFirestoreProfile(uid, user);
      successCount++;
    } catch (err) {
      console.error(`  [ERRO] ${user.email}: ${err.message}`);
      errorCount++;
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`  Concluido: ${successCount} OK, ${errorCount} erros`);
  console.log('='.repeat(60));

  process.exit(errorCount > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
