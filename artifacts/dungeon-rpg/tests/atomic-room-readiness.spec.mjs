import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';
const OUTPUT = 'test-results/complete-runtime-evidence';
const ROOMS = [13, 14, 21, 41, 50];

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
  await page.evaluate(() => {
    window.__dvAtomicRoomEvidence = { preparing: 0, ready: 0, readyFloors: [] };
    window.addEventListener('dungeon-veil-room-preparing', event => {
      if (event.detail?.rendererRecovery) return;
      window.__dvAtomicRoomEvidence.preparing += 1;
    });
    window.addEventListener('dungeon-veil-room-ready', event => {
      if (event.detail?.recovered || event.detail?.failed) return;
      window.__dvAtomicRoomEvidence.ready += 1;
      window.__dvAtomicRoomEvidence.readyFloors.push(Number(event.detail?.floor || 0));
    });
  });
}

test('complex room transitions expose exactly one atomic ready signal', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  await startEvidence(page);

  for (const room of ROOMS) {
    await page.evaluate(() => {
      window.__dvAtomicRoomEvidence.preparing = 0;
      window.__dvAtomicRoomEvidence.ready = 0;
      window.__dvAtomicRoomEvidence.readyFloors = [];
    });
    await page.evaluate(nextRoom => window.__dungeonVeilRuntimeEvidence.loadRoom(nextRoom, 'duo'), room);
    await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.floor), { timeout: 30_000 }).toBe(room);
    await expect.poll(() => page.evaluate(() => window.__dvAtomicRoomEvidence.ready), { timeout: 60_000 }).toBe(1);
    await page.waitForTimeout(650);
    const evidence = await page.evaluate(() => ({ ...window.__dvAtomicRoomEvidence }));
    expect(evidence.preparing, JSON.stringify(evidence)).toBeGreaterThanOrEqual(1);
    expect(evidence.ready, JSON.stringify(evidence)).toBe(1);
    expect(evidence.readyFloors, JSON.stringify(evidence)).toEqual([room]);
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilRendererState !== 'recovering')).toBe(true);
    await waitForPaintedCanvas(page);
    await mkdir(OUTPUT, { recursive: true });
    await page.screenshot({ path: `${OUTPUT}/atomic-ready-room-${room}-${testInfo.project.name}.png`, fullPage: false });
  }
});
