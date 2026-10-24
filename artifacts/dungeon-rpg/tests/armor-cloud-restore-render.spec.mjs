import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const FIXTURE_SENTINEL = 'dungeon-veil-armor-restore-fixture-v1';

async function tap(locator) {
  await expect(locator).toBeVisible({ timeout: 60_000 });
  await locator.tap();
}

async function waitForStableUncoveredRoom(page) {
  const roomTitles = page.getByText(/VERSORGUNGSPOSTEN|SUPPLY POST/i);
  let hiddenSince = 0;

  await expect.poll(async () => {
    const count = await roomTitles.count();
    for (let index = 0; index < count; index += 1) {
      if (await roomTitles.nth(index).isVisible()) {
        hiddenSince = 0;
        return false;
      }
    }

    if (hiddenSince === 0) hiddenSince = Date.now();
    return Date.now() - hiddenSince >= 3_000;
  }, {
    timeout: 120_000,
    intervals: [100, 250, 500],
    message: 'every room-title transition must remain outside the visible viewport for three continuous seconds before evidence capture',
  }).toBe(true);

  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

test('cloud-restored armour keeps a visibly painted run frame', async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  await page.addInitScript(({ fixtureSentinel }) => {
    if (sessionStorage.getItem(fixtureSentinel) === 'seeded') {
      sessionStorage.setItem('dungeon-veil-runtime-evidence-v1', '1');
      return;
    }

    const now = Date.now();
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem(fixtureSentinel, 'seeded');
    sessionStorage.setItem('dungeon-veil-runtime-evidence-v1', '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 2, contrast: 'standard', textSize: 'standard', updatedAt: now }));
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: ['ranger-cloak', 'warden-armor'],
      announcedEquipment: ['ranger-cloak', 'warden-armor'],
      relics: [],
      announcedRelics: [],
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 20,
      xp: 420,
      dust: 999999,
      gold: 999999,
      owned: {
        'ranger-cloak': { level: 1, copies: 1 },
        'warden-armor': { level: 1, copies: 1 },
      },
      equipped: { bow: null, quiver: null, armor: 'ranger-cloak' },
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.removeItem('dungeon-veil-active-session-v1');
  }, { fixtureSentinel: FIXTURE_SENTINEL });

  const viewport = page.viewportSize();
  expect(viewport, `${testInfo.project.name} must expose a fixed portrait viewport`).not.toBeNull();
  expect(viewport.width, `${testInfo.project.name} viewport width must be positive`).toBeGreaterThan(0);
  expect(viewport.height, `${testInfo.project.name} viewport height must be positive`).toBeGreaterThan(0);
  expect(viewport.height, `${testInfo.project.name} must remain portrait`).toBeGreaterThan(viewport.width);

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await tap(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await tap(page.getByRole('button', { name: /Solo-Run|Solo Run/i }));

  const runHud = page.getByTestId('run-hud');
  const namePrompt = page.getByTestId('run-name-prompt');
  await expect(namePrompt.or(runHud).first()).toBeVisible({ timeout: 60_000 });
  if (await namePrompt.isVisible()) {
    await page.getByTestId('run-name-input').fill('Armor Paint QA');
    await tap(page.getByTestId('run-name-confirm'));
  }

  await expect(runHud).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(10_000);
  const canvas = page.locator('canvas').first();
  await waitForPaintedCanvas(page, canvas, 120_000);
  const renderer = page.getByTestId('run-three-host');
  await expect(renderer).toHaveAttribute('data-equipped-armor', 'ranger-cloak');

  const reloadPromise = page.waitForEvent('framenavigated', {
    predicate: (frame) => frame === page.mainFrame(),
    timeout: 60_000,
  });
  const restore = await page.evaluate(() => {
    const api = window.__dungeonVeilRuntimeEvidence;
    if (!api) throw new Error('runtime evidence bridge is unavailable');
    const bundle = api.exportSaveBundle();
    const save = JSON.parse(bundle.data['dungeon-veil-save'] || '{}');
    if (typeof save.playerName !== 'string' || save.playerName.length === 0) {
      throw new Error('cloud restore evidence requires a persisted player identity');
    }
    if (!Number.isFinite(save.floor) || save.floor < 1 || !Number.isFinite(save.chapter) || save.chapter < 1) {
      throw new Error('cloud restore evidence requires a structurally loadable room');
    }
    if (!save.overworldMap || !Array.isArray(save.overworldMap.tiles)) {
      throw new Error('cloud restore evidence requires a persisted map');
    }

    const meta = JSON.parse(bundle.data['dungeon-veil-meta'] || '{}');
    const restoredMeta = {
      ...meta,
      equipped: { ...meta.equipped, armor: 'warden-armor' },
    };
    const imported = api.importSaveBundle({
      ...bundle,
      updatedAt: new Date(Date.now() + 1_000).toISOString(),
      data: {
        ...bundle.data,
        'dungeon-veil-meta': JSON.stringify(restoredMeta),
      },
    });
    return {
      imported,
      playerName: save.playerName,
      floor: save.floor,
      chapter: save.chapter,
      armor: restoredMeta.equipped?.armor ?? null,
    };
  });
  expect(restore).toMatchObject({
    imported: true,
    playerName: 'Armor Paint QA',
    floor: 1,
    chapter: 1,
    armor: 'warden-armor',
  });
  await reloadPromise;

  const restoredBoot = page.getByTestId('app-boot-loading-screen');
  if (await restoredBoot.count()) await expect(restoredBoot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}');
    return meta.equipped?.armor ?? null;
  }), {
    timeout: 60_000,
    message: 'the imported Warden bundle must survive the intentional reload',
  }).toBe('warden-armor');
  const continueButton = page.getByRole('button', { name: /Fortsetzen|Continue/i }).first();
  await expect(continueButton).toBeEnabled({ timeout: 60_000 });
  await tap(continueButton);
  await expect(runHud).toBeVisible({ timeout: 120_000 });

  const restoredRenderer = page.getByTestId('run-three-host');
  await expect(restoredRenderer).toHaveAttribute('data-equipped-armor', 'warden-armor', { timeout: 120_000 });
  await expect(restoredRenderer).toHaveAttribute('data-equipped-armor-fallback', 'false');

  await waitForStableUncoveredRoom(page);
  await waitForPaintedCanvas(page, canvas, 120_000);
  await page.screenshot({
    path: `test-results/armor-cloud-restore-painted-${testInfo.project.name}.png`,
    fullPage: false,
  });
});
