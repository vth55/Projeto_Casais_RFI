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
    
    // Screenshot dashboard
    await page.screenshot({ path: '../monitor-03-dashboard.png', fullPage: false });
    console.log('Screenshot 3 (dashboard) saved');
    
    // Go to Equipamentos
    await page.click('text=Equipamentos');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '../monitor-04-maquinas.png', fullPage: true });
    console.log('Screenshot 4 (maquinas full) saved');
    
    // Check for DevTools wrench button (purple circle)
    const devToolsExists = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const devBtn = allButtons.find(b => {
        const cls = b.className || '';
        return cls.includes('bg-purple') && (cls.includes('rounded-full') || cls.includes('bottom'));
      });
      return devBtn ? { found: true, html: devBtn.outerHTML.substring(0, 300) } : { found: false };
    });
    console.log('DevTools button:', JSON.stringify(devToolsExists));
    
    // Click DevTools if found
    if (devToolsExists.found) {
      await page.click('button.bg-purple-600.rounded-full');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '../monitor-05-devtools.png', fullPage: false });
      console.log('Screenshot 5 (devtools open) saved');
      
      const devToolsText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
      console.log('=== DEVTOOLS TEXT ===');
      console.log(devToolsText);
    }
    
    // Now get full machines text
    const fullMachinesText = await page.evaluate(() => document.body.innerText);
    console.log('=== MAQUINAS BODY ===');
    console.log(fullMachinesText.substring(0, 4000));
    
  } catch(e) {
    console.error('ERROR:', e.message);
    await page.screenshot({ path: '../monitor-error.png' }).catch(() => {});
  }
  
  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
