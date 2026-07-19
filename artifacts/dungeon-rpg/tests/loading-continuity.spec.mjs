import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dungeon-veil-language', 'de');
    sessionStorage.removeItem('dungeon-veil-boot-complete');
  });
});

test('boot presentation uses the violet Dungeon Veil D identity', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  await expect(boot).toBeVisible({ timeout: 8_000 });
  await expect(boot).toHaveAttribute('data-boot-visual', 'violet-d-monogram-v2');
  await expect(page.getByTestId('dungeon-veil-d-mark')).toBeVisible();
  await expect(boot).toBeHidden({ timeout: 60_000 });
});

test('fast room swaps stay seamless and slow swaps use the lightweight veil', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { key: 'audit-fast', floor: 7 } })));
  await page.waitForTimeout(260);
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden();
  await expect(page.getByTestId('run-room-loading-screen')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { key: 'audit-fast', floor: 7 } })));
  await page.waitForTimeout(320);
  await expect(page.getByTestId('run-room-loading-screen')).toHaveCount(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { key: 'audit-slow', floor: 8 } })));
  const transition = page.getByTestId('run-room-loading-screen');
  await expect(transition).toBeVisible({ timeout: 2_500 });
  await expect(transition).toHaveAttribute('data-transition-presentation', 'seamless-violet-veil');
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { key: 'audit-slow', floor: 8 } })));
  await expect(transition).toBeHidden({ timeout: 2_000 });
});
