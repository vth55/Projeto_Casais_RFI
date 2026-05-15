const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  const logs = [];
  page.on('console', m => {
    const txt = m.text().substring(0, 250);
    if (m.type() === 'error') logs.push('ERR: ' + txt);
    if (txt.toLowerCase().includes('avaria') ||
        txt.toLowerCase().includes('procore') ||
        txt.toLowerCase().includes('observation') ||
        txt.toLowerCase().includes('submit')) {
      logs.push('LOG: ' + txt);
    }
  });

  const networkReqs = [];
  page.on('request', req => {
    const u = req.url();
    if (u.includes('firestore') || u.includes('cloudfunctions') || u.includes('googleapis')) {
      networkReqs.push({ method: req.method(), url: u.substring(0, 120) });
    }
  });

  console.log('=== STEP 1: Abrir /reporte-avaria ===');
  await page.goto('http://localhost:5175/reporte-avaria', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);

  const select = page.locator('select').first();
  const allOptions = await select.locator('option').allTextContents();
  console.log('Total opcoes maquinas:', allOptions.length);
  const hampOption = allOptions.find(o => o.includes('CMP-001'));
  console.log('CMP-001 encontrado:', hampOption || 'NAO ENCONTRADO');

  if (hampOption) {
    await select.selectOption({ label: hampOption });
  }
  await page.waitForTimeout(300);

  const textarea = page.locator('textarea').first();
  await textarea.fill('Teste sync PWA-Procore 2026-05-13: verificar trigger Cloud Function onAvariaCreatedToProcore para Observation no Procore.');
  await page.waitForTimeout(200);

  const allBtns = page.locator('button');
  const count = await allBtns.count();
  console.log('Total botoes:', count);

  const btnTexts = [];
  for (let i = 0; i < count; i++) {
    const txt = await allBtns.nth(i).textContent();
    btnTexts.push({ i, txt: txt.trim().substring(0, 50) });
  }
  console.log('Botoes:', JSON.stringify(btnTexts));

  for (const b of btnTexts) {
    if (b.txt.includes('Mec')) {
      await allBtns.nth(b.i).click({ force: true });
      console.log('Clicou tipo:', b.txt);
      break;
    }
  }
  await page.waitForTimeout(200);

  // maquinaParada: clicar botao com "Ainda opera" ou "Nao"
  for (const b of btnTexts) {
    if (b.txt.includes('Ainda') || (b.txt.startsWith('N') && b.i < 5)) {
      await allBtns.nth(b.i).click({ force: true });
      console.log('Clicou maquinaParada:', b.txt);
      break;
    }
  }
  await page.waitForTimeout(300);

  const submitState = await page.evaluate(() => {
    const allBtnsEl = Array.from(document.querySelectorAll('button'));
    const submitBtn = allBtnsEl.find(b => b.textContent.includes('Submeter'));
    return {
      submitDisabled: submitBtn ? submitBtn.disabled : 'not found',
      submitText: submitBtn ? submitBtn.textContent.trim().substring(0, 30) : 'not found'
    };
  });
  console.log('Submit state:', JSON.stringify(submitState));

  await page.screenshot({ path: 'docs/sessions/qa-06-form-filled.png' });

  console.log('\n=== STEP 2: Submeter avaria ===');
  const submitBtn = page.locator('button:has-text("Submeter")').first();
  const isDisabled = await submitBtn.evaluate(el => el.disabled);
  console.log('Submit disabled:', isDisabled);

  if (!isDisabled) {
    await submitBtn.click({ force: true });
    console.log('Clicou submeter!');
    await page.waitForTimeout(8000);

    const bodyAfter = await page.evaluate(() => document.body.innerText.substring(0, 600));
    console.log('Estado apos submit:', bodyAfter);
    await page.screenshot({ path: 'docs/sessions/qa-07-after-submit.png' });
  } else {
    const fieldState = await page.evaluate(() => {
      const sel = document.querySelector('select');
      const ta = document.querySelector('textarea');
      return {
        machineSelected: sel ? sel.value : 'N/A',
        descLen: ta ? ta.value.length : 0,
      };
    });
    console.log('DEBUG campos:', JSON.stringify(fieldState));
    await page.screenshot({ path: 'docs/sessions/qa-debug-fields.png' });
  }

  console.log('\n=== NETWORK ===');
  networkReqs.slice(0, 10).forEach(r => console.log(r.method, r.url));

  console.log('\n=== LOGS ===');
  logs.forEach(l => console.log(l));

  await browser.close();
  console.log('\nDone');
})().catch(e => console.error('FATAL ERROR:', e.message));
