import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function pressPointerUi(locator) {
  await expect(locator).toBeVisible();
  await locator.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, isPrimary: true });
}

async function openMenu(page, projectName) {
  await page.addInitScript(({ ipad }) => {
    localStorage.clear();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-player-profile-v1', JSON.stringify({
      version: 1,
      selectedTitle: 'veil-initiate',
      selectedCard: 'ash',
      selectedAvatar: 'ranger',
      stats: { runsStarted: 0, roomsCleared: 0, enemiesDefeated: 0, bossesDefeated: 0, totalDamage: 0, itemsFound: 0, questsCompleted: 0, playTimeMs: 0, highestChapter: 6, highestRoom: 1 },
      updatedAt: Date.now(),
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4, rank: 1, xp: 0, dust: 2500, gold: 0,
      owned: { 'ash-bow': { level: 1, copies: 0 }, 'ranger-quiver': { level: 1, copies: 0 }, 'ranger-cloak': { level: 1, copies: 0 } },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      cosmeticUnlocks: [], migrationCompensation: { gold: 0, dust: 0, copies: 0 }, rewardLedger: [], currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: 'single-target',
      companions: { 'single-target': { level: 1, unlockedAt: 1 } },
      updatedAt: 1,
    }));
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: projectName.includes('ipad') });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
}

async function startFreshRun(page) {
  await pressPointerUi(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await pressPointerUi(page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first());
  const name = page.getByRole('textbox').first();
  await expect(name).toBeVisible();
  await name.fill('Companion Collection Runtime');
  await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  const skipIntro = page.getByRole('button', { name: /ÜBERSPRINGEN|SKIP/i });
  if (await skipIntro.isVisible({ timeout: 8_000 }).catch(() => false)) await skipIntro.click({ force: true });
  await expect(skipIntro).toBeHidden({ timeout: 20_000 });
  await page.waitForTimeout(10_000);
}

test('companions are found and upgraded before a run, then remain fixed with articulated combat motion', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /companion|lynx|raven|sentinel|wisp|drake|TypeError|ReferenceError|Cannot read/i.test(message.text())) runtimeErrors.push(message.text());
  });

  await openMenu(page, testInfo.project.name);
  await expect(page.getByTestId('main-menu-companion-navigation')).toHaveCount(0);
  const equipmentEntry = page.getByTestId('main-menu-equipment-navigation');
  await expect(equipmentEntry).toBeVisible();
  await pressPointerUi(equipmentEntry.getByRole('button'));
  await expect(page.getByRole('heading', { name: /AUSRÜSTUNG|EQUIPMENT/i })).toBeVisible();
  await page.getByTestId('inventory-tab-companion').click({ force: true });

  const management = page.getByTestId('companion-management-panel');
  await expect(management).toBeVisible();
  await expect(management).toHaveAttribute('data-embedded', 'true');
  await expect(management).toHaveAttribute('data-selection-surface', 'pre-run-only');
  await expect(management).toHaveAttribute('data-companion-species', 'veil-lynx');
  await expect(page.getByRole('heading', { name: /Gefährten des Schleiers|Allies of the Veil/i })).toBeVisible();
  await expect(page.getByTestId('equipment-permanent-progression-copy')).toBeHidden();
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'single-target');
  await expect(page.getByTestId('companion-reserve-count')).toContainText('1 / 5');
  await expect(page.getByTestId('companion-role-single-target')).toHaveAttribute('data-unlocked', 'true');
  await expect(page.getByTestId('companion-role-shield')).toHaveAttribute('data-unlocked', 'false');
  await expect(page.getByTestId('companion-role-distraction')).toHaveAttribute('data-unlocked', 'false');

  const shieldCard = page.getByTestId('companion-role-shield');
  await shieldCard.getByRole('button', { name: /FUND BEANSPRUCHEN|CLAIM FIND/i }).click({ force: true });
  await expect(shieldCard).toHaveAttribute('data-unlocked', 'true');
  await shieldCard.getByRole('button', { name: /AUSWÄHLEN|SELECT/i }).click({ force: true });
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'shield');
  await shieldCard.getByRole('button', { name: /VERBESSERN|UPGRADE/i }).click({ force: true });
  await expect(page.getByTestId('companion-active-role')).toContainText(/STUFE 2|LEVEL 2/i);
  await expect(page.getByTestId('companion-reserve-count')).toContainText('2 / 5');
  await page.screenshot({ path: `test-results/companion-management-${testInfo.project.name}.png`, fullPage: false });

  const storedBeforeRun = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}'));
  expect(storedBeforeRun.activeId).toBe('shield');
  expect(storedBeforeRun.companions.shield.level).toBe(2);

  await page.getByRole('button', { name: /Zurück|Back/i }).click({ force: true });
  await expect(management).toBeHidden();
  await expect(page.getByRole('heading', { name: 'DUNGEON VEIL' })).toBeVisible({ timeout: 60_000 });
  await startFreshRun(page);

  const chip = page.getByTestId('run-companion-chip');
  const runtime = page.getByTestId('companion-runtime-bridge');
  const scene = page.getByTestId('run-companion-scene');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('data-presentation', 'read-only-companion-status');
  await expect(chip).toHaveAttribute('data-companion-role', 'shield');
  await expect(chip).toHaveAttribute('data-companion-species', 'rune-sentinel');
  await expect(chip).toHaveAttribute('data-companion-level', '2');
  expect(await chip.evaluate(element => element.tagName)).toBe('DIV');

  await expect(runtime).toHaveAttribute('data-role', 'shield');
  await expect(runtime).toHaveAttribute('data-level', '2');
  await expect(runtime).toHaveAttribute('data-species', 'rune-sentinel');
  await expect(runtime).toHaveAttribute('data-basic-attacks', 'true');
  await expect(runtime).toHaveAttribute('data-selection', 'pre-run-frozen');
  await expect(runtime).toHaveAttribute('data-ai-hz', '10');
  await expect(runtime).toHaveAttribute('data-revive-target', 'false');
  await expect.poll(async () => Number(await runtime.getAttribute('data-basic-attack-count') || 0), { timeout: 20_000 }).toBeGreaterThan(0);

  await expect(scene).toHaveAttribute('data-scene-hook', 'object3d-add');
  await expect(scene).toHaveAttribute('data-model-source', 'procedural-distinct-companion-v5');
  await expect(scene).toHaveAttribute('data-animation-source', 'articulated-locomotion-and-attacks');
  await expect(scene).toHaveAttribute('data-selection-surface', 'pre-run-only');
  await expect(scene).toHaveAttribute('data-local-species', 'rune-sentinel');
  await expect(scene).toHaveAttribute('data-local-level', '2');
  await expect(scene).toHaveAttribute('data-follow-placement', 'inward-side');
  await expect(scene).toHaveAttribute('data-shared-renderer', 'true');
  await expect(scene).toHaveAttribute('data-extra-canvas', 'false');
  await expect(scene).toHaveAttribute('data-scene-captured', 'true', { timeout: 60_000 });
  await expect(scene).toHaveAttribute('data-loaded-count', '1', { timeout: 60_000 });
  await expect(scene).toHaveAttribute('data-visible-count', '1', { timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({ path: `test-results/companion-run-${testInfo.project.name}.png`, fullPage: false });

  await chip.click({ force: true });
  await page.waitForTimeout(500);
  await expect(chip).toHaveAttribute('data-companion-role', 'shield');
  await expect(runtime).toHaveAttribute('data-role', 'shield');
  await expect(scene).toHaveAttribute('data-local-role', 'shield');
  const storedAfterClick = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}'));
  expect(storedAfterClick.activeId).toBe('shield');
  expect(storedAfterClick.companions.shield.level).toBe(2);

  const geometry = await page.evaluate(() => ({ innerWidth: window.innerWidth, bodyWidth: document.body.scrollWidth, documentWidth: document.documentElement.scrollWidth }));
  expect(Math.max(geometry.bodyWidth, geometry.documentWidth)).toBeLessThanOrEqual(geometry.innerWidth + 4);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
