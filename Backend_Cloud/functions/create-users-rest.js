/**
 * Cria contas de teste usando a Firebase Auth REST API (não precisa de service account)
 * Usa a Web API Key do projeto casais-rfid
 */
const https = require('https');

const API_KEY = 'AIzaSyBB7JuzN61mBYj1TcjCayruMbuSwjzvlto';
const SIGN_UP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
const SIGN_IN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

const TEST_USERS = [
  { email: 'vitorhugo22.igrejas@gmail.com', password: '999999', name: 'Vitor Hugo' },
  { email: 'testegestor@fleet.com', password: '123456', name: 'Teste Gestor de Frota' },
  { email: 'testeencarregado@fleet.com', password: '123456', name: 'Teste Encarregado' },
  { email: 'testeoperador@fleet.com', password: '123456', name: 'Teste Operador' },
  { email: 'testesustentabilidade@fleet.com', password: '123456', name: 'Teste Sustentabilidade' },
  { email: 'testeviewer@fleet.com', password: '123456', name: 'Teste Viewer' },
];

function post(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
        catch (e) { resolve({ status: res.statusCode, data: chunks }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function createUser(user) {
  // Try sign up
  const res = await post(SIGN_UP_URL, {
    email: user.email,
    password: user.password,
    displayName: user.name,
    returnSecureToken: true,
  });

  if (res.status === 200) {
    console.log(`  [CRIADO]      ${user.email} (uid: ${res.data.localId})`);
    return res.data.localId;
  }

  // If already exists, try sign in
  if (res.data?.error?.message === 'EMAIL_EXISTS') {
    const signIn = await post(SIGN_IN_URL, {
      email: user.email,
      password: user.password,
      returnSecureToken: true,
    });
    if (signIn.status === 200) {
      console.log(`  [JÁ EXISTE]   ${user.email} (uid: ${signIn.data.localId})`);
      return signIn.data.localId;
    }
    // Try with old password then update
    console.log(`  [JÁ EXISTE]   ${user.email} (password pode ser diferente - conta já existia)`);
    return null;
  }

  console.error(`  [ERRO]        ${user.email}: ${res.data?.error?.message || JSON.stringify(res.data)}`);
  return null;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  CASAIS Fleet Intelligence — Criação de contas (REST API)');
  console.log('='.repeat(60));
  console.log('');

  let ok = 0, fail = 0;
  for (const user of TEST_USERS) {
    const uid = await createUser(user);
    if (uid) ok++; else fail++;
  }

  console.log('');
  console.log(`Resultado: ${ok} criadas/existentes, ${fail} com erro`);
  console.log('');
  console.log('NOTA: Os perfis Firestore (systemRole) precisam de ser criados');
  console.log('      manualmente ou via gcloud auth para o script principal.');
}

main().catch(console.error);
