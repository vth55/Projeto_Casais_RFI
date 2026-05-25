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
    
    // Navigate to Alertas (in the bottom mobile nav or sidebar)
    // Check for Alertas link
    const alertasLinks = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      return allButtons.filter(b => b.innerText && b.innerText.includes('Alertas')).map(b => ({
        text: b.innerText.trim(),
        class: b.className.substring(0, 100)
      }));
    });
    console.log('Alertas links found:', JSON.stringify(alertasLinks));
    
    // Click sessoes-corrigidas or alerts from nav
    // Try sidebar - look for a link to sessoes-corrigidas/alertas
    await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const alertBtn = allButtons.find(b => b.innerText && b.innerText.trim() === 'Alertas');
      if (alertBtn) alertBtn.click();
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '../monitor-06-alertas.png', fullPage: false });
    console.log('Screenshot 6 (alertas) saved');
    
    const alertasText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('=== ALERTAS VIEW ===');
    console.log(alertasText);
    
    // Now navigate to Sessoes
    await page.click('text=Sessões');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '../monitor-07-sessoes.png', fullPage: false });
    console.log('Screenshot 7 (sessoes) saved');
    
    const sessoesText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('=== SESSOES VIEW ===');
    console.log(sessoesText);
    
    // Get machine IDs from Firestore via the store
    const storeData = await page.evaluate(() => {
      // Check if there's a way to access store data
      return window.__ZUSTAND_STORE__ || 'no store exposed';
    });
    console.log('Store:', typeof storeData === 'string' ? storeData : JSON.stringify(storeData).substring(0, 200));
    
    // Open DevTools and check RFID tab
    await page.click('button.bg-purple-600.rounded-full');
    await page.waitForTimeout(1000);
    
    // Click RFID tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const rfidTab = tabs.find(b => b.innerText.trim() === 'RFID');
      if (rfidTab) rfidTab.click();
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '../monitor-08-devtools-rfid.png', fullPage: false });
    console.log('Screenshot 8 (devtools RFID tab) saved');
    
    const rfidText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
    console.log('=== RFID TAB TEXT ===');
    console.log(rfidText);
    
  } catch(e) {
    console.error('ERROR:', e.message);
    await page.screenshot({ path: '../monitor-error2.png' }).catch(() => {});
  }
  
  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
