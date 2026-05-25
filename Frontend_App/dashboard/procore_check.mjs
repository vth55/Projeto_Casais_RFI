import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('https://app.procore.com', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

const url = page.url();
const title = await page.title();

await page.screenshot({ path: 'procore_step1.png', fullPage: false });

console.log(JSON.stringify({ url, title }));

await browser.close();
