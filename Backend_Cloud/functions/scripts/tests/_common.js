/**
 * Setup partilhado para todos os testes Playwright — Casais Fleet Intelligence
 *
 * Uso:
 *   const { launchPwa, launchProcore, screenshot, assert } = require('./_common');
 */

const path = require('path');
const fs = require('fs');

const PRINTS_DIR = path.join(__dirname, '..', '..', '..', '..', '..', '_prints');
const PROCORE_STATE_FILE = path.join(__dirname, '.procore_state.json');

const PWA_URL = 'http://localhost:5173';
const PROCORE_BASE = 'https://sandbox.procore.com';
const COMPANY_ID = '4283171';

async function getPlaywright() {
  try {
    return require('playwright');
  } catch {
    // Tentar via caminho do npx
    const npxPath = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'playwright');
    return require(npxPath);
  }
}

async function launchPwa(sprintName) {
  const { chromium } = await getPlaywright();
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Capturar erros de consola
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  return { browser, page, consoleErrors };
}

async function launchProcore() {
  const { chromium } = await getPlaywright();

  // Usar sessão guardada se existir
  let storageState;
  if (fs.existsSync(PROCORE_STATE_FILE)) {
    storageState = PROCORE_STATE_FILE;
  } else {
    console.log('⚠️  .procore_state.json não encontrado.');
    console.log('   Corre: node tests/_generate_procore_state.js');
    storageState = undefined;
  }

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({
    storageState,
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  return { browser, page };
}

function ensurePrintsDir(sprintName) {
  const dir = path.join(PRINTS_DIR, sprintName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function screenshot(page, sprintName, filename) {
  const dir = ensurePrintsDir(sprintName);
  const filePath = path.join(dir, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  📸 ${filename} → _prints/${sprintName}/${filename}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERT FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function waitForPwa(page, route = '') {
  await page.goto(`${PWA_URL}${route}`);
  await page.waitForLoadState('networkidle');
  // Aguardar que o React carregue (sem skeleton)
  await page.waitForTimeout(1000);
}

module.exports = {
  PWA_URL,
  PROCORE_BASE,
  COMPANY_ID,
  launchPwa,
  launchProcore,
  screenshot,
  assert,
  waitForPwa,
  ensurePrintsDir,
};
