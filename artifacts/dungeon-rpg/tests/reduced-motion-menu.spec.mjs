import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

test('reduced motion replaces and unmounts the moving menu canvas with a static Ranger composition', async ({ page }, testInfo) => {
  const runtimeIssues = [];
  page.on('pageerror', error => runtimeIssues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read|module script failed|failed to initialize/i.test(message.text())) runtimeIssues.push(`console: ${message.text()}`);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ ipad }) => {
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({ version: 2, initialized: true, equipment: [], relics: [], announcedEquipment: [], announcedRelics: [] }));
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: testInfo.project.name.includes('ipad') });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 60_000 });
  const presentation = page.getByTestId('main-menu-scene-presentation');
  await expect(presentation).toHaveAttribute('data-reduced-motion-contract', 'static-ranger-and-portal-fallback');
  await expect(presentation).toHaveAttribute('data-reduced-motion-active', 'true');
  await expect(presentation).toHaveAttribute('data-composition', 'live-hybrid-scene');
  await expect(page.getByTestId('main-menu-reduced-motion-fallback')).toBeVisible();
  await expect(page.getByTestId('live-hybrid-main-menu-frame')).toHaveCount(0);
  await expect(page.getByTestId('live-hybrid-main-menu-scene')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.screenshot({ path: `test-results/visual-main-menu-reduced-motion-${testInfo.project.name}.png`, fullPage: false });

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(presentation).toHaveAttribute('data-reduced-motion-active', 'false', { timeout: 20_000 });
  await expect(presentation).toHaveAttribute('data-composition', 'live-hybrid-scene');
  await expect(page.getByTestId('main-menu-reduced-motion-fallback')).toHaveCount(0);
  await expect(page.getByTestId('live-hybrid-main-menu-frame')).toBeVisible();
  await expect(page.getByTestId('live-hybrid-main-menu-scene')).toHaveAttribute('data-ranger-loaded', 'true', { timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});
