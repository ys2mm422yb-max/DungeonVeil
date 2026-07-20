import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function openMenu(page) {
  await page.addInitScript(() => {
    localStorage.setItem('dungeon-veil-language', 'de');
  });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.locator('[data-hall-of-the-veil="true"]')).toBeVisible({ timeout: 60_000 });
}

test('main menu uses crisp premium Hall artwork with full-body player and companion', async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read|WebGL.*lost/i.test(message.text())) runtimeErrors.push(message.text());
  });

  await openMenu(page);
  const hall = page.locator('[data-hall-of-the-veil="true"]');
  await expect(hall).toHaveAttribute('data-scene-contract', 'hall-of-the-veil-v6-premium');
  await expect(hall).toHaveAttribute('data-renderer-count', '1');
  await expect(hall).toHaveAttribute('data-background-mode', 'premium-2d-artwork');
  await expect(hall).toHaveAttribute('data-background-artwork', 'premium-gothic-v3');
  await expect(hall).toHaveAttribute('data-market-stalls', '0');
  await expect(hall).toHaveAttribute('data-decorative-npcs', '0');
  await expect(hall).toHaveAttribute('data-player-anchor', 'center');
  await expect(hall).toHaveAttribute('data-player-full-body', 'true');
  await expect(hall).toHaveAttribute('data-active-companion', 'true');
  await expect(hall).toHaveAttribute('data-companion-full-body', 'true');
  const background = page.locator('[data-hall-hybrid-background="true"][data-background-artwork="premium-gothic-v3"]');
  await expect(background).toHaveCount(1);
  await expect(background).toBeVisible();
  await expect(hall.locator('canvas[data-menu-renderer="hall-of-the-veil"]')).toHaveCount(1, { timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__DUNGEON_VEIL_MENU_RANGER__?.visibleEquipment?.bow))).toBe(true);

  const diagnostics = await page.evaluate(() => window.__DUNGEON_VEIL_MENU_HALL__);
  expect(diagnostics).toMatchObject({
    contract: 'hall-of-the-veil-v6-premium',
    rendererCount: 1,
    backgroundMode: 'premium-2d-artwork',
    artwork: 'premium-gothic-v3',
    marketStalls: 0,
    decorativeNpcs: 0,
    characterCentered: true,
    playerFullBody: true,
    activeCompanionVisible: true,
    companionFullBody: true,
    spectatorHandoff: 'exclusive',
  });
  expect(diagnostics.particleCount).toBeLessThanOrEqual(22);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-renderer', { detail: { active: true } })));
  await expect(page.locator('[data-hall-of-the-veil="true"]')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator('canvas[data-menu-renderer="hall-of-the-veil"]')).toHaveCount(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-renderer', { detail: { active: false } })));
  const restored = page.locator('[data-hall-of-the-veil="true"]');
  await expect(restored).toBeVisible({ timeout: 30_000 });
  await expect(restored.locator('canvas[data-menu-renderer="hall-of-the-veil"]')).toHaveCount(1, { timeout: 60_000 });

  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
  expect(overflow).toBeLessThanOrEqual(4);
  expect(runtimeErrors).toEqual([]);
});

// Final validation is executed against the fixed test branch after the relic and codex merges.
