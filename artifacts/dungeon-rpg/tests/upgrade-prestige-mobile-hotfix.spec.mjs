import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function tap(locator) {
  await expect(locator).toBeVisible({ timeout: 60_000 });
  await locator.tap();
}

async function seedMaxiVisualLoadout(page) {
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
  });
}

async function openEquipment(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  await tap(page.getByTestId('main-menu-equipment-navigation').getByRole('button'));
  await expect(page.getByTestId('equipment-category-tabs')).toBeVisible({ timeout: 60_000 });
}

async function expectPreviewBinding(page, itemId, tier) {
  const preview = page.getByTestId('equipment-model-preview');
  await expect(preview).toBeVisible({ timeout: 60_000 });
  await expect.poll(async () => preview.getAttribute('data-upgrade-binding'), {
    timeout: 60_000,
    message: `selected preview must bind exactly to ${itemId}`,
  }).toBe(`equipment:${itemId}`);
  await expect(preview).toHaveAttribute('data-upgrade-tier', String(tier));
  return preview;
}

test('mobile prestige stays local, item-accurate and below the iPhone safe area', async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  await seedMaxiVisualLoadout(page);
  await openEquipment(page);

  await expect(page.getByTestId('equipped-upgrade-prestige-overlay')).toHaveCount(0);
  await expectPreviewBinding(page, 'ash-bow', 5);
  await page.screenshot({ path: `test-results/visual-upgrade-hotfix-bow5-${testInfo.project.name}.png`, fullPage: false });

  await tap(page.getByRole('button', { name: /Glutbogen|Ember Bow/i }).first());
  const preview = page.getByTestId('equipment-model-preview');
  await expect.poll(async () => preview.getAttribute('data-upgrade-binding'), { timeout: 60_000 }).toBe(null);
  await expect(preview).not.toHaveAttribute('data-upgrade-tier', /.+/);
  await expect(page.getByTestId('equipment-upgrade-preview')).not.toHaveAttribute('data-upgrade-binding', /.+/);
  await page.screenshot({ path: `test-results/visual-upgrade-hotfix-bow2-normal-${testInfo.project.name}.png`, fullPage: false });

  await tap(page.getByTestId('inventory-tab-quiver'));
  await expectPreviewBinding(page, 'ranger-quiver', 4);
  await page.screenshot({ path: `test-results/visual-upgrade-hotfix-quiver4-${testInfo.project.name}.png`, fullPage: false });

  await tap(page.getByTestId('inventory-tab-armor'));
  await expectPreviewBinding(page, 'ash-armor', 3);
  await tap(page.getByRole('button', { name: /Waldläufermantel|Ranger Cloak/i }).first());
  await expect.poll(async () => preview.getAttribute('data-upgrade-binding'), { timeout: 60_000 }).toBe(null);
  await expect(preview).not.toHaveAttribute('data-upgrade-tier', /.+/);

  const scrollRoot = page.locator('[data-testid="forge-mark-chamber-wrapper"] > div.fixed.inset-0:visible').first();
  await expect(scrollRoot).toBeVisible({ timeout: 60_000 });
  await scrollRoot.evaluate(element => element.scrollTo({ top: 420, behavior: 'instant' }));
  await page.waitForTimeout(250);
  const safeAreaState = await scrollRoot.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const viewportTop = window.visualViewport?.offsetTop ?? 0;
    const topStyle = getComputedStyle(element).top;
    return { rectTop: rect.top, viewportTop, topStyle };
  });
  expect(safeAreaState.rectTop).toBeGreaterThanOrEqual(safeAreaState.viewportTop - 0.5);
  expect(safeAreaState.topStyle).not.toBe('auto');
  await page.screenshot({ path: `test-results/visual-upgrade-hotfix-safe-area-${testInfo.project.name}.png`, fullPage: false });

  await scrollRoot.evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(150);
  await tap(page.getByRole('button', { name: /Zurück|Back/i }).first());
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await tap(page.getByRole('button', { name: /SPIELEN|PLAY/i }).first());
  await tap(page.getByRole('button', { name: /Solo-Run|Solo Run/i }));
  const runHud = page.getByTestId('run-hud');
  const namePrompt = page.getByTestId('run-name-prompt');
  await expect(namePrompt.or(runHud).first()).toBeVisible({ timeout: 60_000 });
  if (await namePrompt.isVisible()) {
    await page.getByTestId('run-name-input').fill('Maxi Hotfix');
    await tap(page.getByTestId('run-name-confirm'));
  }
  await expect(runHud).toBeVisible({ timeout: 120_000 });
  await waitForPaintedCanvas(page, page.locator('canvas').first(), 120_000);
  await page.waitForTimeout(3_000);
  await expect(page.getByTestId('equipped-upgrade-prestige-overlay')).toHaveCount(0);
  await page.screenshot({ path: `test-results/visual-upgrade-hotfix-combat-${testInfo.project.name}.png`, fullPage: false });
});
