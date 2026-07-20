import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function openReferenceMenu(page) {
  await page.addInitScript(() => {
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-companion-v4', JSON.stringify({ version: 1, role: 'shield', updatedAt: Date.now() }));
  });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('modern-village-square-scene')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'DUNGEON VEIL' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForTimeout(4_000);
}

test('reference main menu keeps one renderer, the full Veil Wolf and the approved UI hierarchy', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read|WebGL.*lost/i.test(message.text())) runtimeErrors.push(message.text());
  });

  await openReferenceMenu(page);
  const hall = page.getByTestId('modern-village-square-scene');
  await expect(hall).toHaveAttribute('data-scene', 'hall-of-the-veil-reference');
  await expect(hall).toHaveAttribute('data-active-companion', 'veil-wolf');
  await expect(hall).toHaveAttribute('data-companion-full-body', 'true');
  await expect(hall).toHaveAttribute('data-companion-role', 'shield');
  await expect(page.locator('canvas')).toHaveCount(1);

  await expect(page.getByRole('button', { name: 'Mehr' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Weltboss/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Tägliche Belohnung/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Gildenkiste/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Kapitel 1/i })).toBeVisible();
  await expect(page.getByTestId('veil-village-npc-hub')).toBeVisible();
  await expect(page.getByRole('button', { name: /Aufträge/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Post/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Freunde/i })).toBeVisible();
  await expect(page.getByTestId('npc-guildmaster')).toBeVisible();
  await expect(page.getByRole('button', { name: /Spielen/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Inventar/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Kodex/i })).toBeVisible();
  await expect(page.getByTestId('main-menu-companion-navigation')).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-companion-selection-v4', { detail: { role: 'distraction' } })));
  await expect(hall).toHaveAttribute('data-companion-role', 'distraction');

  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
  expect(overflow).toBeLessThanOrEqual(4);
  await page.screenshot({ path: `test-results/main-menu-reference-${testInfo.project.name}.png`, fullPage: false });

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-renderer', { detail: { active: true } })));
  await expect(page.getByTestId('modern-village-square-scene')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator('canvas')).toHaveCount(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-renderer', { detail: { active: false } })));
  const restored = page.getByTestId('modern-village-square-scene');
  await expect(restored).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await expect(restored).toHaveAttribute('data-active-companion', 'veil-wolf');
  expect(runtimeErrors).toEqual([]);
});
