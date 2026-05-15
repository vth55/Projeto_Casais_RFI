import { chromium } from 'playwright';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:/Users/vitor/AppData/Local/ms-playwright/chromium-1223/chrome-win/chrome.exe'
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  
  // First load the page to establish localStorage context
  await page.goto('http://localhost:5175', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  
  // Inject auth state into localStorage to bypass login
  await page.evaluate(() => {
    const authState = {
      state: {
        currentUser: {
          id: 'qa-test-user',
          email: 'admin@casais.pt',
          name: 'QA Tester',
          systemRole: 'admin',
          permissions: ['*'],
          assignedObraId: null,
          cardId: null
        },
        isAuthenticated: true,
        customRoles: {}
      },
      version: 0
    };
    localStorage.setItem('casais-auth', JSON.stringify(authState));
    console.log('Auth state injected');
  });
  
  // Reload after injecting auth state
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(3000);
  
  console.log('After reload URL:', page.url());
  await page.screenshot({ path: 'docs/sessions/qa-03-after-auth.png' });
  
  const bodyText = await page.evaluate(() => {
    const h1s = [...document.querySelectorAll('h1, h2, h3')].map(h => h.innerText).slice(0, 10);
    return h1s.join(' | ');
  });
  console.log('Headings:', bodyText);
  
  await browser.close();
}

main().catch(console.error);
