const https = require('https');

const API_KEY = 'AIzaSyBB7JuzN61mBYj1TcjCayruMbuSwjzvlto';
const PROJECT_ID = 'casais-rfid';

const USERS = [
  { email: 'vitorhugo22.igrejas@gmail.com', password: '999999', name: 'Vitor Hugo', systemRole: 'admin' },
  { email: 'testegestor@fleet.com', password: '123456', name: 'Teste Gestor de Frota', systemRole: 'gestor_frota' },
  { email: 'testeencarregado@fleet.com', password: '123456', name: 'Teste Encarregado', systemRole: 'encarregado_obra' },
  { email: 'testeoperador@fleet.com', password: '123456', name: 'Teste Operador', systemRole: 'operador' },
  { email: 'testesustentabilidade@fleet.com', password: '123456', name: 'Teste Sustentabilidade', systemRole: 'gestor_sustentabilidade' },
  { email: 'testeviewer@fleet.com', password: '123456', name: 'Teste Viewer', systemRole: 'gestor_frota' },
];

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    };
    if (!body) { opts.method = 'GET'; delete opts.headers['Content-Length']; }
    const req = https.request(opts, res => {
      let c = ''; res.on('data', d => c += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(c || '{}') }));
    });
    req.on('error', reject);
    if (body) req.write(data);
    req.end();
  });
}

function signIn(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password, returnSecureToken: true });
    const parsed = new URL(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`);
    const opts = {
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = https.request(opts, res => {
      let c = ''; res.on('data', d => c += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(c) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function createProfile(idToken, uid, user) {
  const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/artifacts/casais-rfid/public/data/users/${uid}`;
  const url = `https://firestore.googleapis.com/v1/${docPath}`;
  const res = await post(url, {
    fields: {
      email: { stringValue: user.email },
      name: { stringValue: user.name },
      systemRole: { stringValue: user.systemRole },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
    }
  }, { Authorization: `Bearer ${idToken}` });
  return res;
}

async function main() {
  console.log('Criando perfis Firestore...\n');
  for (const user of USERS) {
    const auth = await signIn(user.email, user.password);
    if (auth.status !== 200) {
      console.log(`  [ERRO AUTH]  ${user.email}: ${auth.data?.error?.message}`);
      continue;
    }
    const res = await createProfile(auth.data.idToken, auth.data.localId, user);
    if (res.status === 200) {
      console.log(`  [PERFIL OK]  ${user.email} → ${user.systemRole} (uid: ${auth.data.localId})`);
    } else {
      console.log(`  [ERRO]       ${user.email}: HTTP ${res.status} - ${JSON.stringify(res.data?.error?.message || res.data).substring(0, 100)}`);
    }
  }
  console.log('\nConcluído!');
}
main();
