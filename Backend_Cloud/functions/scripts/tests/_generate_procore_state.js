/**
 * Gera .procore_state.json com a sessão autenticada do Procore sandbox.
 * Corre uma vez, faz login manual, guarda os cookies.
 * O ficheiro é gitignored — nunca commitar.
 *
 * Uso: node tests/_generate_procore_state.js
 */

const path = require('path');
const { chromium } = require('playwright');
const STATE_FILE = path.join(__dirname, '.procore_state.json');

(async () => {
  console.log('\n🔐 A abrir browser para login no Procore sandbox...');
  console.log('   Faz login manualmente e depois fecha o browser.\n');

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto('https://sandbox.procore.com');
  console.log('   (Browser aberto — faz login agora)\n');

  // Aguardar que o utilizador feche o browser ou pressione Enter
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
    console.log('   Pressiona Enter depois de fazer login...');
  });

  await ctx.storageState({ path: STATE_FILE });
  console.log(`\n✅ Sessão guardada em ${STATE_FILE}`);
  console.log('   (Este ficheiro é gitignored — seguro)\n');

  await browser.close();
  process.exit(0);
})();
