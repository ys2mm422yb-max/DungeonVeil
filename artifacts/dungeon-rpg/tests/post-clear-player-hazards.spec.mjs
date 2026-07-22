import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';
const OUTPUT = 'test-results/complete-runtime-evidence';
const PLAYER_HAZARD_PREFIXES = ['rune-warning-', 'rune-impact-', 'forge-warn-', 'forge-hit-', 'arc-warn-', 'arc-charge-', 'arc-fire-', 'arc-source-'];

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime-duo');
  return url.toString();
}

async function waitForRoomReady(page, room) {
  await expect.poll(
    () => page.evaluate(expectedRoom => {
      const root = document.documentElement.dataset;
      return root.dungeonVeilRoomBuildState === 'ready'
        && Number(root.dungeonVeilRoomBuildFloor || 0) === expectedRoom;
    }, room),
    { timeout: 60_000 },
  ).toBe(true);
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
  await waitForRoomReady(page, 1);
  await waitForPaintedCanvas(page);
}

for (const room of [13, 16, 19]) {
  test(`room ${room} rune storm stops when the final living enemy dies`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await startEvidence(page);
    await page.evaluate(nextRoom => window.__dungeonVeilRuntimeEvidence.loadRoom(nextRoom, 'duo'), room);
    await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.floor), { timeout: 30_000 }).toBe(room);
    await waitForRoomReady(page, room);
    await waitForPaintedCanvas(page);
    await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.setPlayerStats(1, 5000));
    await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.livingEnemies), { timeout: 30_000 }).toBeGreaterThan(0);

    await expect.poll(
      () => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.effects.some(id => id.startsWith('rune-warning-'))),
      { timeout: 8_000 },
    ).toBe(true);

    const armed = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());
    await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.killLivingEnemies());
    await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.livingEnemies), { timeout: 10_000 }).toBe(0);
    await page.waitForTimeout(1_400);

    const viewport = page.getByTestId('run-visual-viewport');
    await expect(viewport).toHaveAttribute('data-hurt-flash', 'idle');
    await expect(viewport).toHaveAttribute('data-hit-flash', 'idle');

    const settled = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());
    expect(settled.hp, JSON.stringify(settled)).toBe(armed.hp);
    expect(settled.effects.filter(id => PLAYER_HAZARD_PREFIXES.some(prefix => id.startsWith(prefix))), JSON.stringify(settled)).toEqual([]);
    expect(settled.damageNumbers.filter(id => id.startsWith('rune-hit-')), JSON.stringify(settled)).toEqual([]);

    await mkdir(OUTPUT, { recursive: true });
    await page.screenshot({ path: `${OUTPUT}/post-clear-rune-room-${room}-${testInfo.project.name}.png`, fullPage: false });
  });
}
