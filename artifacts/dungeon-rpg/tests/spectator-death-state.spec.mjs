import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function spectatorDeathQaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'spectator');
  url.searchParams.set('death', '1');
  return url.toString();
}

test('spectator shows a localized fallen-player state while the world renderer remains active', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  if (testInfo.project.name.includes('ipad')) await page.setViewportSize({ width: 820, height: 1180 });
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !/favicon/i.test(message.text())) runtimeErrors.push(`console: ${message.text()}`));
  });

  await page.goto(spectatorDeathQaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const qa = page.getByTestId('spectator-performance-qa');
  await expect(qa).toBeVisible();
  await expect(qa).toHaveAttribute('data-assets-ready', 'true');

  const stage = page.getByTestId('spectator-playback-stage');
  await expect(stage).toHaveAttribute('data-spectator-death-state', 'active');
  await expect(page.getByTestId('spectator-death-overlay')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await expect(page.getByTestId('run-three-host')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('button-retry')).toHaveCount(0);
  await expect(page.getByTestId('coop-revive-control')).toHaveCount(0);

  await page.screenshot({ path: testInfo.outputPath(`autopilot-spectator-death-state-${testInfo.project.name}.png`), fullPage: true });
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
