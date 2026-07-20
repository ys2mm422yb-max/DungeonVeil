import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function openMenu(page, projectName) {
  await page.addInitScript(({ ipad }) => {
    localStorage.clear();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-companion-v4', JSON.stringify({ version: 1, role: 'single-target', updatedAt: 1 }));
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: projectName.includes('ipad') });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
}

async function startFreshRun(page) {
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });
  const name = page.getByRole('textbox').first();
  await expect(name).toBeVisible();
  await name.fill('Veil Wolf Runtime');
  await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  const skipIntro = page.getByRole('button', { name: /ÜBERSPRINGEN|SKIP/i });
  if (await skipIntro.isVisible({ timeout: 8_000 }).catch(() => false)) await skipIntro.click({ force: true });
  await expect(skipIntro).toBeHidden({ timeout: 20_000 });
  await page.waitForTimeout(3_000);
}

test('one Veil Wolf identity spans equipment management and the shared run renderer', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /companion|wolf|TypeError|ReferenceError|Cannot read/i.test(message.text())) runtimeErrors.push(message.text());
  });

  await openMenu(page, testInfo.project.name);
  await expect(page.getByTestId('main-menu-companion-navigation')).toHaveCount(0);
  const equipmentEntry = page.getByTestId('main-menu-equipment-navigation');
  await expect(equipmentEntry).toBeVisible();
  await equipmentEntry.getByRole('button').click({ force: true });
  await expect(page.getByRole('heading', { name: /AUSRÜSTUNG|EQUIPMENT/i })).toBeVisible();
  await page.getByTestId('inventory-tab-companion').click({ force: true });
  const management = page.getByTestId('companion-management-panel');
  await expect(management).toBeVisible();
  await expect(management).toHaveAttribute('data-embedded', 'true');
  await expect(management).toHaveAttribute('data-companion-species', 'veil-wolf');
  await expect(page.getByRole('heading', { name: /Dein Schleierwolf|Your Veil Wolf/i })).toBeVisible();
  await expect(page.getByTestId('equipment-permanent-progression-copy')).toBeHidden();
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'single-target');
  await expect(page.getByTestId('companion-reserve-count')).toContainText('4');
  const reserveButtons = page.getByTestId('companion-reserve-grid').locator('button');
  await expect(reserveButtons).toHaveCount(4);
  const managementGeometry = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="companion-management-panel"]');
    const buttons = [...document.querySelectorAll('[data-testid="companion-reserve-grid"] button')];
    const panelBox = panel?.getBoundingClientRect();
    const boxes = buttons.map(button => button.getBoundingClientRect());
    return {
      height: panelBox?.height ?? 9999,
      firstRowDelta: boxes.length >= 2 ? Math.abs(boxes[0].top - boxes[1].top) : 9999,
      thirdRowDelta: boxes.length >= 4 ? Math.abs(boxes[2].top - boxes[3].top) : 9999,
      secondRowStartsBelowFirst: boxes.length >= 3 ? boxes[2].top > boxes[0].bottom - 1 : false,
    };
  });
  expect(managementGeometry.height).toBeLessThanOrEqual(520);
  expect(managementGeometry.firstRowDelta).toBeLessThanOrEqual(2);
  expect(managementGeometry.thirdRowDelta).toBeLessThanOrEqual(2);
  expect(managementGeometry.secondRowStartsBelowFirst).toBe(true);
  await page.screenshot({ path: `test-results/companion-management-${testInfo.project.name}.png`, fullPage: false });
  await page.getByTestId('companion-role-shield').click({ force: true });
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'shield');
  await page.getByRole('button', { name: /Zurück|Back/i }).click({ force: true });
  await expect(management).toBeHidden();
  await expect(page.getByRole('heading', { name: 'DUNGEON VEIL' })).toBeVisible({ timeout: 60_000 });

  await startFreshRun(page);
  const chip = page.getByTestId('run-companion-chip');
  const runtime = page.getByTestId('companion-runtime-bridge');
  const scene = page.getByTestId('run-companion-scene');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('data-presentation', 'compact-wolf-orb');
  await expect(chip).toHaveAttribute('data-companion-role', 'shield');
  await expect(runtime).toHaveAttribute('data-role', 'shield');
  await expect(runtime).toHaveAttribute('data-ai-hz', '10');
  await expect(runtime).toHaveAttribute('data-revive-target', 'false');
  await expect(scene).toHaveAttribute('data-scene-hook', 'object3d-add');
  await expect(scene).toHaveAttribute('data-model-source', 'procedural-veil-wolf');
  await expect(scene).toHaveAttribute('data-animation-source', 'procedural-wolf-motion');
  await expect(scene).toHaveAttribute('data-companion-species', 'veil-wolf');
  await expect(scene).toHaveAttribute('data-shared-renderer', 'true');
  await expect(scene).toHaveAttribute('data-extra-canvas', 'false');
  await expect(scene).toHaveAttribute('data-scene-captured', 'true', { timeout: 60_000 });
  await expect(scene).toHaveAttribute('data-loaded-count', '1', { timeout: 60_000 });
  await expect(scene).toHaveAttribute('data-visible-count', '1', { timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1);

  const chipGeometry = await chip.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height, left: box.left, right: box.right, viewportWidth: innerWidth };
  });
  expect(chipGeometry.width).toBeLessThanOrEqual(52);
  expect(chipGeometry.height).toBeLessThanOrEqual(52);
  expect(chipGeometry.left).toBeGreaterThanOrEqual(0);
  expect(chipGeometry.right).toBeLessThanOrEqual(chipGeometry.viewportWidth + 1);
  await page.screenshot({ path: `test-results/companion-run-${testInfo.project.name}.png`, fullPage: false });

  await chip.click({ force: true });
  await expect(chip).toHaveAttribute('data-companion-role', 'loot-comfort');
  await expect(runtime).toHaveAttribute('data-role', 'loot-comfort');
  await expect(scene).toHaveAttribute('data-local-role', 'loot-comfort');
  await expect(scene).toHaveAttribute('data-visible-count', '1', { timeout: 60_000 });
  const storedRole = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-v4') || '{}').role);
  expect(storedRole).toBe('loot-comfort');
  await expect(page.locator('canvas')).toHaveCount(1);

  const geometry = await page.evaluate(() => ({ innerWidth: window.innerWidth, bodyWidth: document.body.scrollWidth, documentWidth: document.documentElement.scrollWidth }));
  expect(Math.max(geometry.bodyWidth, geometry.documentWidth)).toBeLessThanOrEqual(geometry.innerWidth + 4);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
