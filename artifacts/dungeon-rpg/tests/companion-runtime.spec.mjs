import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function openFreshRun(page, projectName) {
  await page.addInitScript(({ ipad }) => {
    localStorage.clear();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-companion-v4', JSON.stringify({ version: 1, role: 'single-target', updatedAt: 1 }));
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: projectName.includes('ipad') });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  await expect(boot).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });
  const name = page.getByRole('textbox').first();
  await expect(name).toBeVisible();
  await name.fill('Companion Ranger');
  await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
}

test('one animated KayKit companion shares the run renderer and persists role changes', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /companion|TypeError|ReferenceError|Cannot read/i.test(message.text())) runtimeErrors.push(message.text());
  });

  await openFreshRun(page, testInfo.project.name);
  const chip = page.getByTestId('run-companion-chip');
  const runtime = page.getByTestId('companion-runtime-bridge');
  const scene = page.getByTestId('run-companion-scene');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('data-companion-role', 'single-target');
  await expect(runtime).toHaveAttribute('data-role', 'single-target');
  await expect(runtime).toHaveAttribute('data-ai-hz', '10');
  await expect(runtime).toHaveAttribute('data-revive-target', 'false');
  await expect(scene).toHaveAttribute('data-model-source', 'kaykit-adventurers');
  await expect(scene).toHaveAttribute('data-animation-source', 'kaykit-character-animations');
  await expect(scene).toHaveAttribute('data-shared-renderer', 'true');
  await expect(scene).toHaveAttribute('data-extra-canvas', 'false');
  await expect(scene).toHaveAttribute('data-visible-count', '1', { timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1);

  await chip.click({ force: true });
  await expect(chip).toHaveAttribute('data-companion-role', 'critical-support');
  await expect(runtime).toHaveAttribute('data-role', 'critical-support');
  await expect(scene).toHaveAttribute('data-local-role', 'critical-support');
  await expect(scene).toHaveAttribute('data-visible-count', '1', { timeout: 60_000 });
  const storedRole = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-v4') || '{}').role);
  expect(storedRole).toBe('critical-support');
  await expect(page.locator('canvas')).toHaveCount(1);

  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(Math.max(geometry.bodyWidth, geometry.documentWidth)).toBeLessThanOrEqual(geometry.innerWidth + 4);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
