const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  
  try {
    // Login
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('input[type="email"]', 'vitorhugo22.igrejas@gmail.com');
    await page.fill('input[type="password"]', '999999');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // Go to Equipamentos to get machine IDs
    await page.click('text=Equipamentos');
    await page.waitForTimeout(3000);
    
    // Extract machine IDs from the DOM
    const machineData = await page.evaluate(() => {
      // Look for machine IDs in data attributes or text
      const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="Card"], [class*="machine"]'));
      
      // Try to find machine names and statuses
      const results = [];
      const bodyText = document.body.innerText;
      
      // Parse machines from visible text - look for patterns
      return bodyText;
    });
    
    // Navigate to Estaleiro
    await page.click('text=Estaleiro');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '../monitor-09-estaleiro.png', fullPage: false });
    console.log('Screenshot 9 (estaleiro) saved');
    
    const estaleiroText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('=== ESTALEIRO VIEW ===');
    console.log(estaleiroText);
    
    // Now go to Maquinas view (Equipamentos) and switch to table view for IDs
    await page.click('text=Equipamentos');
    await page.waitForTimeout(2000);
    
    // Switch to Tabela view if available
    await page.evaluate(() => {
      const tabela = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Tabela');
      if (tabela) tabela.click();
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '../monitor-10-maquinas-tabela.png', fullPage: true });
    console.log('Screenshot 10 (maquinas tabela) saved');
    
    const tabelaText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('=== TABELA VIEW ===');
    console.log(tabelaText);
    
  } catch(e) {
    console.error('ERROR:', e.message);
    await page.screenshot({ path: '../monitor-error3.png' }).catch(() => {});
  }
  
  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
