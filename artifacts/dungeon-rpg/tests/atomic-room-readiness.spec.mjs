import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';
const OUTPUT = 'test-results/complete-runtime-evidence';
const ROOMS = [13, 14, 21, 41, 50];
const PLAYER_HAZARD_PREFIXES = ['rune-warning-', 'rune-impact-', 'forge-warn-', 'forge-hit-', 'arc-warn-', 'arc-charge-', 'arc-fire-', 'arc-source-'];

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

function resetEvidence(page) {
  return page.evaluate(() => {
    window.__dvAtomicRoomEvidence.preparing = 0;
    window.__dvAtomicRoomEvidence.ready = 0;
    window.__dvAtomicRoomEvidence.readyFloors = [];
  });
}

test('complex room transitions expose exactly one atomic ready signal', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  await startEvidence(page);

  for (const room of ROOMS) {
    await resetEvidence(page);
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

test('a failed atomic build cannot resume hazards before a successful retry', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await startEvidence(page);
  await page.evaluate(() => {
    window.__dungeonVeilRuntimeEvidence.loadRoom(13, 'duo');
    window.__dungeonVeilRuntimeEvidence.setPlayerStats(1, 5000);
  });
  await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.floor), { timeout: 30_000 }).toBe(13);
  await expect.poll(
    () => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.effects.some(id => id.startsWith('rune-warning-'))),
    { timeout: 8_000 },
  ).toBe(true);
  const armed = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());
  await resetEvidence(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { floor: 13, key: 'evidence-failed-build', owner: 'atomic-test' } }));
    window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { floor: 13, key: 'evidence-failed-build', failed: true, owner: 'atomic-test' } }));
  });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilRoomBuildState)).toBe('retrying');
  await page.waitForTimeout(1_500);

  const blocked = await page.evaluate(() => ({
    runtime: window.__dungeonVeilRuntimeEvidence.snapshot(),
    evidence: { ...window.__dvAtomicRoomEvidence },
  }));
  expect(blocked.evidence.preparing, JSON.stringify(blocked.evidence)).toBe(1);
  expect(blocked.evidence.ready, JSON.stringify(blocked.evidence)).toBe(0);
  expect(blocked.runtime.hp, JSON.stringify(blocked.runtime)).toBe(armed.hp);
  expect(blocked.runtime.effects.filter(id => PLAYER_HAZARD_PREFIXES.some(prefix => id.startsWith(prefix))), JSON.stringify(blocked.runtime)).toEqual([]);
  expect(blocked.runtime.damageNumbers.filter(id => id.startsWith('rune-hit-')), JSON.stringify(blocked.runtime)).toEqual([]);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { floor: 13, key: 'evidence-failed-build', owner: 'atomic-test' } }));
  });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilRoomBuildState)).toBe('ready');
  await expect.poll(() => page.evaluate(() => window.__dvAtomicRoomEvidence.ready)).toBe(1);
  await waitForPaintedCanvas(page);
  await mkdir(OUTPUT, { recursive: true });
  await page.screenshot({ path: `${OUTPUT}/failed-build-guard-room-13-${testInfo.project.name}.png`, fullPage: false });
});
