/**
 * Cria perfis Firestore para os utilizadores de teste
 * Usa token do Firebase CLI (já autenticado)
 */
const https = require('https');
const { execSync } = require('child_process');

// Get token from firebase CLI
const token = execSync('firebase login:ci --no-localhost 2>/dev/null || echo ""').toString().trim();

// Use firebase-admin with the REST API approach instead
// We'll use the Firestore REST API with the access token from firebase
const PROJECT_ID = 'casais-rfid';

const USERS = [
  { uid: 'AZrUsizU8ZVi4hKuQFBbiwc3hhc2', email: 'vitorhugo22.igrejas@gmail.com', name: 'Vitor Hugo', systemRole: 'admin' },
  { uid: 'SHsrinI5nbhLPdsk7hYCy6Trnsf1', email: 'testegestor@fleet.com', name: 'Teste Gestor de Frota', systemRole: 'gestor_frota' },
  { uid: '31n1ITAFxBhvb5rHjDUvhm8eKds1', email: 'testeencarregado@fleet.com', name: 'Teste Encarregado', systemRole: 'encarregado_obra' },
  { uid: '7TwVpdJkLESxmBEQFSAu5kzNLOw1', email: 'testeoperador@fleet.com', name: 'Teste Operador', systemRole: 'operador' },
  { uid: '1iJNlWEGiyQlyruSMwf06v4MUh32', email: 'testesustentabilidade@fleet.com', name: 'Teste Sustentabilidade', systemRole: 'gestor_sustentabilidade' },
  { uid: 'c1Cud3CbOsZunnptW6ZTveMisfn2', email: 'testeviewer@fleet.com', name: 'Teste Viewer', systemRole: 'gestor_frota' },
];

// Get access token from firebase tools
function getAccessToken() {
  try {
    // Firebase stores tokens in a config file
    const configPath = require('path').join(require('os').homedir(), '.config', 'configstore', 'firebase-tools.json');
    const config = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
    if (config.tokens && config.tokens.access_token) return config.tokens.access_token;
    if (config.tokens && config.tokens.refresh_token) {
      // Need to refresh
      return refreshToken(config.tokens.refresh_token);
    }
  } catch(e) {}
  
  // Try Windows path
  try {
    const configPath = '/mnt/c/Users/vitor/.config/configstore/firebase-tools.json';
    const config = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
    if (config.tokens && config.tokens.access_token) return config.tokens.access_token;
    if (config.tokens && config.tokens.refresh_token) {
      return refreshToken(config.tokens.refresh_token);
    }
  } catch(e) {}
  
  return null;
}

function refreshToken(refreshTok) {
  const data = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshTok)}&client_id=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com&client_secret=j9iVZfS8kkCEFUPaAeJV0sAi`;
  const res = require('child_process').execSync(
    `curl -s -X POST "https://oauth2.googleapis.com/token" -H "Content-Type: application/x-www-form-urlencoded" -d '${data}'`
  );
  const json = JSON.parse(res.toString());
  return json.access_token;
}

function createDocument(token, uid, userData) {
  return new Promise((resolve, reject) => {
    const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/artifacts/casais-rfid/public/data/users/${uid}`;
    const url = `https://firestore.googleapis.com/v1/${docPath}`;
    
    const body = JSON.stringify({
      fields: {
        email: { stringValue: userData.email },
        name: { stringValue: userData.name },
        systemRole: { stringValue: userData.systemRole },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
      }
    });

    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${chunks.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Obtendo access token do Firebase CLI...');
  const token = getAccessToken();
  if (!token) {
    console.error('Não consegui obter token. Tentando via refresh...');
    process.exit(1);
  }
  console.log('Token obtido ✓\n');

  for (const user of USERS) {
    try {
      await createDocument(token, user.uid, user);
      console.log(`  [PERFIL OK]  ${user.email} → ${user.systemRole}`);
    } catch(e) {
      console.error(`  [ERRO]       ${user.email}: ${e.message}`);
    }
  }
  console.log('\nConcluído!');
}

main();
