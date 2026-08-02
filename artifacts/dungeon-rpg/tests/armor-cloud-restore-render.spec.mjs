import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function tap(locator) {
  await expect(locator).toBeVisible({ timeout: 60_000 });
  await locator.tap();
}

test('cloud-restored armour keeps a visibly painted run frame', async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.clear();
    sessionStorage.clear();
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
  });

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
  const canvas = page.locator('canvas').first();
  await waitForPaintedCanvas(page, canvas, 120_000);
  const renderer = page.getByTestId('run-three-host');
  await expect(renderer).toHaveAttribute('data-equipped-armor', 'ranger-cloak');

  await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}');
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      ...meta,
      equipped: { ...meta.equipped, armor: 'warden-armor' },
    }));
    window.dispatchEvent(new Event('dungeon-veil-cloud-save-restored'));
  });

  await expect(renderer).toHaveAttribute('data-equipped-armor', 'warden-armor', { timeout: 120_000 });
  await expect(renderer).toHaveAttribute('data-equipped-armor-fallback', 'false');

  // A painted WebGL back buffer alone is insufficient evidence while the room-title
  // transition still covers the scene. Wait for the fixed room-1 title card to leave
  // the visible viewport before accepting or capturing the cloud-restored armour.
  await expect(page.getByText(/VERSORGUNGSPOSTEN|SUPPLY POST/i).first()).toBeHidden({ timeout: 120_000 });
  await waitForPaintedCanvas(page, canvas, 120_000);
  await page.screenshot({
    path: `test-results/armor-cloud-restore-painted-${testInfo.project.name}.png`,
    fullPage: false,
  });
});
