import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const REQUIRED_MODELS = [
  '/assets/imported/enemies/Slime.glb',
  '/assets/imported/enemies/Rat.glb',
  '/assets/imported/enemies/Spider.glb',
  '/assets/imported/enemies/Bat.glb',
  '/assets/imported/enemies/Snake_angry.glb',
  '/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb',
];

test('boot preloads every real creature and the actual Mage model', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-language', 'de'));

  const responses = REQUIRED_MODELS.map(path => page.waitForResponse(response => {
    const pathname = new URL(response.url()).pathname;
    return pathname.endsWith(path) && response.ok();
  }, { timeout: 120_000 }));

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const loaded = await Promise.all(responses);
  expect(loaded.map(response => response.status())).toEqual(REQUIRED_MODELS.map(() => 200));

  const boot = page.getByTestId('app-boot-loading-screen');
  await expect(boot).toBeHidden({ timeout: 120_000 });
  await expect(page.getByRole('button', { name: /Neuer Run|New Run/i })).toBeVisible({ timeout: 60_000 });
});
