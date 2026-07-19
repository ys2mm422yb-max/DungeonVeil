import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
function qaUrl() { const url = new URL(APP_URL); url.searchParams.set('qa', 'relics'); return url.toString(); }
async function columnCount(locator) { return locator.evaluate(element => { const value = getComputedStyle(element).gridTemplateColumns.trim(); return value ? value.split(/\s+/).length : 0; }); }
async function assertNoHorizontalOverflow(page) { const overflow = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth })); expect(Math.max(overflow.document, overflow.body) - overflow.viewport, JSON.stringify(overflow)).toBeLessThanOrEqual(2); }

test('seven relics use one responsive preview and explicit mode policies', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const wide = testInfo.project.name.includes('ipad') || testInfo.project.name.includes('desktop');
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/favicon/i.test(message.text())) runtimeErrors.push(`console: ${message.text()}`); });

  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('relic-inventory-qa')).toHaveAttribute('data-contract', 'seven-relic-responsive-audit-v4');
  await page.getByTestId('inventory-tab-relic').click({ force: true });

  const shell = page.getByTestId('inventory-responsive-shell');
  const inventory = page.getByTestId('relic-inventory-responsive');
  const columns = page.getByTestId('relic-inventory-tablet-columns');
  await expect(inventory).toBeVisible();
  await expect(inventory).toHaveAttribute('data-relic-count', '7');
  await expect(inventory).toHaveAttribute('data-hunt-count', '3');
  await expect(inventory).toHaveAttribute('data-boss-count', '3');
  await expect(inventory).toHaveAttribute('data-worldboss-count', '1');
  await expect(inventory).toHaveAttribute('data-equipment-slot-consumption', '0');
  await expect(page.getByTestId('relic-card-grid').locator('button')).toHaveCount(7);
  expect(await columnCount(columns)).toBe(wide ? 2 : 1);
  const shellBounds = await shell.boundingBox();
  expect(shellBounds).toBeTruthy();
  if (wide) expect(shellBounds.width).toBeGreaterThan(700);

  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.getByTestId('relic-card-broken-guardian-crown').click({ force: true });
  await expect(page.getByTestId('relic-selected-detail')).toHaveAttribute('data-relic-id', 'broken-guardian-crown');
  await expect(page.getByTestId('relic-mode-policy').locator('[data-mode="worldboss"]')).toHaveAttribute('data-enabled', 'false');

  await page.getByTestId('relic-card-veil-heart').click({ force: true });
  await expect(page.getByTestId('relic-mode-policy').locator('[data-mode="worldboss"]')).toHaveAttribute('data-enabled', 'true');
  await page.getByTestId('relic-equip-button').click({ force: true });
  await expect(page.getByTestId('relic-card-veil-heart')).toHaveAttribute('data-equipped', 'true');
  const equipped = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-relics-v2') || '{}').equipped);
  expect(equipped).toBe('veil-heart');
  await expect(page.locator('canvas')).toHaveCount(1);
  await assertNoHorizontalOverflow(page);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
