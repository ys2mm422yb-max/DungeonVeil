import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function tap(locator) {
  await expect(locator).toBeVisible({ timeout: 60_000 });
  await locator.tap();
}

async function seedVisiblePrestigeLoadout(page) {
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 3, contrast: 'standard', textSize: 'standard', updatedAt: now }));
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: ['ash-bow', 'ember-bow', 'ranger-quiver', 'ash-armor', 'ranger-cloak'],
      announcedEquipment: ['ash-bow', 'ember-bow', 'ranger-quiver', 'ash-armor', 'ranger-cloak'],
      relics: [],
      announcedRelics: [],
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 17,
      xp: 2499,
      dust: 7755,
      gold: 80532,
      owned: {
        'ash-bow': { level: 5, copies: 6 },
        'ember-bow': { level: 2, copies: 1 },
        'ranger-quiver': { level: 4, copies: 1 },
        'ash-armor': { level: 3, copies: 0 },
        'ranger-cloak': { level: 2, copies: 1 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ash-armor' },
      cosmeticUnlocks: [],
      migrationCompensation: { gold: 0, dust: 0, copies: 0 },
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: 'single-target',
      companions: { 'single-target': { level: 5, unlockedAt: 1 } },
      updatedAt: now,
    }));
  });
}

async function waitForMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
}

async function readVisibleBindingTelemetry(page) {
  return page.evaluate(() => {
    const data = document.documentElement.dataset;
    return {
      count: Number(data.dungeonVeilVisibleUpgradeBindingCount || 0),
      slots: String(data.dungeonVeilVisibleUpgradeSlots || '').split(',').filter(Boolean),
      bow: Number(data.dungeonVeilVisibleUpgradeBowTier || 0),
      quiver: Number(data.dungeonVeilVisibleUpgradeQuiverTier || 0),
      armor: Number(data.dungeonVeilVisibleUpgradeArmorTier || 0),
      companion: Number(data.dungeonVeilVisibleUpgradeCompanionTier || 0),
    };
  });
}

async function expectRuntimeBindings(page, requiredSlots) {
  await expect.poll(async () => readVisibleBindingTelemetry(page), {
    timeout: 120_000,
    intervals: [100, 250, 500],
    message: `visible prestige must bind ${requiredSlots.join(', ')} to real 3D objects`,
  }).toMatchObject({ bow: 5, quiver: 4, armor: 3 });

  const telemetry = await readVisibleBindingTelemetry(page);
  for (const slot of requiredSlots) expect(telemetry.slots).toContain(slot);
  expect(telemetry.count).toBeGreaterThanOrEqual(requiredSlots.length);
  return telemetry;
}

async function waitForRenderedPreview(page, itemId) {
  const preview = page.getByTestId('equipment-model-preview');
  await expect(preview).toHaveAttribute('data-equipment-preview-state', 'ready', { timeout: 120_000 });
  await expect(preview).toHaveAttribute('data-equipment-preview-rendered-item', itemId, { timeout: 120_000 });
  await waitForPaintedCanvas(page, preview.locator('canvas'), 120_000);
  return preview;
}

async function readPreviewAccent(preview) {
  return preview.evaluate(element => {
    const before = getComputedStyle(element, '::before');
    const after = getComputedStyle(element, '::after');
    return {
      beforeContent: before.content,
      beforeOpacity: Number.parseFloat(before.opacity || '0'),
      afterContent: after.content,
      afterOpacity: Number.parseFloat(after.opacity || '0'),
      beforePosition: before.position,
      afterPosition: after.position,
    };
  });
}

test('visible prestige is clear and bounded in menu, preview and live run', async ({ page }, testInfo) => {
  test.setTimeout(420_000);
  await seedVisiblePrestigeLoadout(page);
  await waitForMenu(page);

  const menuTelemetry = await expectRuntimeBindings(page, ['bow', 'quiver', 'armor']);
  expect(menuTelemetry.companion === 0 || menuTelemetry.companion === 5).toBeTruthy();
  await page.screenshot({ path: `test-results/visible-prestige-menu-${testInfo.project.name}.png`, fullPage: false });

  await tap(page.getByTestId('main-menu-equipment-navigation').getByRole('button'));
  await expect(page.getByTestId('equipment-category-tabs')).toBeVisible({ timeout: 60_000 });

  const bowPreview = await waitForRenderedPreview(page, 'ash-bow');
  await expect(bowPreview).toHaveAttribute('data-upgrade-tier', '5');
  const bowAccent = await readPreviewAccent(bowPreview);
  expect(bowAccent.beforeOpacity).toBeGreaterThanOrEqual(0.75);
  expect(bowAccent.afterOpacity).toBeGreaterThanOrEqual(0.8);
  expect(bowAccent.beforePosition).toBe('absolute');
  expect(bowAccent.afterPosition).toBe('absolute');
  await page.screenshot({ path: `test-results/visible-prestige-bow5-${testInfo.project.name}.png`, fullPage: false });

  await tap(page.getByRole('button', { name: /Glutbogen|Ember Bow/i }).first());
  const normalPreview = await waitForRenderedPreview(page, 'ember-bow');
  await expect(normalPreview).not.toHaveAttribute('data-upgrade-tier', /.+/);
  const normalAccent = await readPreviewAccent(normalPreview);
  expect(['none', 'normal', '""']).toContain(normalAccent.beforeContent);
  expect(['none', 'normal', '""']).toContain(normalAccent.afterContent);
  await page.screenshot({ path: `test-results/visible-prestige-bow2-normal-${testInfo.project.name}.png`, fullPage: false });

  await tap(page.getByTestId('inventory-tab-quiver'));
  const quiverPreview = await waitForRenderedPreview(page, 'ranger-quiver');
  await expect(quiverPreview).toHaveAttribute('data-upgrade-tier', '4');
  const quiverAccent = await readPreviewAccent(quiverPreview);
  expect(quiverAccent.beforeOpacity).toBeGreaterThanOrEqual(0.8);
  await page.screenshot({ path: `test-results/visible-prestige-quiver4-${testInfo.project.name}.png`, fullPage: false });

  const equipmentBack = page.getByRole('button', { name: /^(Zurück|Back)$/i }).first();
  await equipmentBack.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, isPrimary: true });
  await expect(page.getByTestId('equipment-category-tabs')).toHaveCount(0, { timeout: 60_000 });
  await expect(page.getByTestId('player-profile-panel')).toHaveCount(0, { timeout: 60_000 });

  const menuControls = page.getByTestId('main-menu-control-stack');
  await tap(menuControls.getByRole('button', { name: /^(SPIELEN|PLAY)\b/i }).first());
  await tap(page.getByRole('button', { name: /^(Solo-Run|Solo Run)\b/i }).first());
  const runHud = page.getByTestId('run-hud');
  const namePrompt = page.getByTestId('run-name-prompt');
  await expect(namePrompt.or(runHud).first()).toBeVisible({ timeout: 60_000 });
  if (await namePrompt.isVisible()) {
    await page.getByTestId('run-name-input').fill('Maxi Visible Prestige');
    await tap(page.getByTestId('run-name-confirm'));
  }
  await expect(runHud).toBeVisible({ timeout: 120_000 });
  await waitForPaintedCanvas(page, page.locator('canvas').first(), 120_000);

  const runTelemetry = await expectRuntimeBindings(page, ['bow', 'quiver', 'armor']);
  expect(runTelemetry.bow).toBe(5);
  expect(runTelemetry.quiver).toBe(4);
  expect(runTelemetry.armor).toBe(3);
  await page.waitForTimeout(2_000);
  await page.screenshot({ path: `test-results/visible-prestige-live-run-${testInfo.project.name}.png`, fullPage: false });
});
