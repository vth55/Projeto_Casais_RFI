const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  const logs = [];
  page.on('console', m => {
    const txt = m.text().substring(0, 200);
    if (m.type() === 'error') logs.push('ERR: ' + txt);
    if (txt.toLowerCase().includes('avaria') ||
        txt.toLowerCase().includes('procore') ||
        txt.toLowerCase().includes('submit') ||
        txt.toLowerCase().includes('observation')) {
      logs.push('LOG: ' + txt);
    }
  });

  console.log('=== STEP 1: Abrir ReporteAvaria ===');
  await page.goto('http://localhost:5175/reporte-avaria', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);

  // Verificar opcoes do select
  const select = page.locator('select').first();
  const allOptions = await select.locator('option').allTextContents();
  console.log('Opcoes disponiveis:', allOptions.slice(0, 10));

  // Seleccionar CMP-001 Hamm
  const hampOption = allOptions.find(o => o.includes('CMP-001'));
  if (hampOption) {
    await select.selectOption({ label: hampOption });
    console.log('Selecionado:', hampOption);
  } else {
    console.log('AVISO: CMP-001 nao encontrado nas opcoes');
  }
  await page.waitForTimeout(500);

  // Preencher nome
  const nameInput = page.locator('input[placeholder*="Silva"]').first();
  await nameInput.fill('QA Tester Automatizado');

  // Telefone
  const telInput = page.locator('input[type=tel]').first();
  await telInput.fill('912345678');

  // Descricao
  const textarea = page.locator('textarea').first();
  await textarea.fill('Teste sync PWA-Procore: trigger onAvariaCreatedToProcore. Avaria simulada QA 2026-05-13.');

  // Clicar em tipo Mecanico
  const buttons = page.locator('button');
  const btnCount = await buttons.count();
  console.log('Total buttons:', btnCount);
  for (let i = 0; i < btnCount; i++) {
    const txt = await buttons.nth(i).textContent();
    if (txt && txt.includes('Mec')) {
      await buttons.nth(i).click();
      console.log('Clicou tipo avaria:', txt.substring(0, 30));
      break;
    }
  }
  await page.waitForTimeout(300);

  // Screenshot antes de submeter
  await page.screenshot({ path: 'docs/sessions/qa-06-form-filled.png' });
  console.log('Screenshot formulario preenchido');

  // Submeter
  console.log('=== STEP 2: Submeter avaria ===');
  const submitBtn = page.locator('button').filter({ hasText: /Submeter/i });
  const submitCount = await submitBtn.count();
  console.log('Submit buttons encontrados:', submitCount);

  if (submitCount > 0) {
    await submitBtn.first().click();
    await page.waitForTimeout(5000); // aguardar resposta Firestore

    const bodyAfter = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Estado apos submit:', bodyAfter);

    await page.screenshot({ path: 'docs/sessions/qa-07-after-submit.png' });
  }

  console.log('\n=== LOGS ===');
  logs.forEach(l => console.log(l));

  await browser.close();
  console.log('Done');
})().catch(e => console.error('FATAL ERROR:', e.message));
