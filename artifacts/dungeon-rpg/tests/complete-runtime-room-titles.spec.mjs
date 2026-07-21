import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime-duo');
  return url.toString();
}

async function startEvidence(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('dungeon-veil-runtime-evidence-v1', '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
  });
  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('runtime-duo-evidence-qa')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__dungeonVeilRuntimeEvidence)), { timeout: 60_000 }).toBe(true);
  await waitForPaintedCanvas(page);
}

test('room title evidence uses distinct room-bible names beyond room 20', async ({ page }) => {
  await startEvidence(page);
  const titles = [];
  for (const room of [20, 21, 30, 40, 50]) {
    await page.evaluate(nextRoom => window.__dungeonVeilRuntimeEvidence.loadRoom(nextRoom, 'duo'), room);
    await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.floor), { timeout: 30_000 }).toBe(room);
    const title = await page.getByTestId('run-visual-viewport').getAttribute('data-room-title');
    expect(title?.trim(), `missing room title for room ${room}`).toBeTruthy();
    titles.push(title);
  }
  expect(new Set(titles).size, JSON.stringify(titles)).toBe(titles.length);
  expect(titles.slice(1)).not.toContain(titles[0]);
});
