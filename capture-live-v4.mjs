import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
});
await context.addInitScript(() => localStorage.setItem('dungeon-veil-language', 'de'));
const page = await context.newPage();
const errors = [];
const failed = [];
page.on('pageerror', error => errors.push(String(error?.stack || error)));
page.on('requestfailed', request => failed.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));
await page.goto('https://ys2mm422yb-max.github.io/DungeonVeil/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(25000);
await page.screenshot({ path: 'main-menu-v4-live.png', fullPage: true });
const state = await page.evaluate(() => ({
  canvases: document.querySelectorAll('canvas').length,
  bodyText: document.body.innerText.slice(0, 1500),
  resources: performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /Ranger|quiver|bow|DungeonVeil/i.test(name)),
}));
await writeFile('main-menu-v4-live.json', JSON.stringify({ state, errors, failed }, null, 2));
await browser.close();
