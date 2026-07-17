import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function clickAnimatedUi(locator) {
  await expect(locator).toBeVisible();
  await locator.click({ force: true, noWaitAfter: true });
}

test('room opens only with exact monster visuals and no colored placeholders', async ({ page }) => {
  test.setTimeout(120_000);
  let remoteThreeRequests = 0;
  page.on('request', request => {
    if (request.url().startsWith('https://cdn.jsdelivr.net/npm/three@0.180.0/')) remoteThreeRequests += 1;
  });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.180.0/**', route => route.abort('blockedbyclient'));
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-language', 'de'));

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await clickAnimatedUi(page.getByRole('button', { name: /Neuer Run|New Run/i }));
  await page.getByRole('textbox').first().fill('Monster Wächter');
  await clickAnimatedUi(page.getByRole('button', { name: /Run starten|Start Game/i }).first());

  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('run-room-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => globalThis.__dungeonVeilEnemyVisualDiagnostics ?? null), { timeout: 30_000 }).toMatchObject({
    fallbackCount: 0,
    exactImported: true,
  });
  const diagnostics = await page.evaluate(() => globalThis.__dungeonVeilEnemyVisualDiagnostics);
  expect(diagnostics.active).toBeGreaterThan(0);
  expect(diagnostics.loaded).toBe(diagnostics.active);
  expect(diagnostics.pending).toEqual([]);
  expect(remoteThreeRequests).toBe(0);
});
