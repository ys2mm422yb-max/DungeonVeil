import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';
const OUTPUT = 'test-results/complete-runtime-evidence';

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
  await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.loadRoom(13, 'duo'));
  await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.floor), { timeout: 30_000 }).toBe(13);
  await waitForPaintedCanvas(page);
}

test('renderer recovery survives a context loss while the transition HUD is hidden', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await startEvidence(page);

  const identity = await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="run-hud"]');
    if (!(hud instanceof HTMLElement)) throw new Error('Run HUD missing');
    hud.style.display = 'none';
    document.documentElement.dataset.dungeonVeilRendererState = '';
    document.documentElement.dataset.dungeonVeilRendererRecoveredAt = '';
    const pageIdentity = `${Date.now()}-${Math.random()}`;
    window.__dvTransitionRecoveryEvidence = { pageIdentity, preparing: 0, lost: 0, ready: 0 };
    window.addEventListener('dungeon-veil-room-preparing', () => { window.__dvTransitionRecoveryEvidence.preparing += 1; });
    window.addEventListener('dungeon-veil-renderer-lost', () => { window.__dvTransitionRecoveryEvidence.lost += 1; });
    window.addEventListener('dungeon-veil-room-ready', () => { window.__dvTransitionRecoveryEvidence.ready += 1; });
    return pageIdentity;
  });

  const supported = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="run-three-host"] canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(supported).toBe(true);

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilRendererState), { timeout: 20_000 }).toBe('ready');
  await expect.poll(() => page.evaluate(() => Number(document.documentElement.dataset.dungeonVeilRendererRecoveredAt || 0)), { timeout: 20_000 }).toBeGreaterThan(0);

  const evidence = await page.evaluate(() => ({ ...window.__dvTransitionRecoveryEvidence }));
  expect(evidence.pageIdentity).toBe(identity);
  expect(evidence.preparing).toBeGreaterThan(0);
  expect(evidence.lost).toBeGreaterThan(0);
  expect(evidence.ready).toBeGreaterThan(0);

  await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="run-hud"]');
    if (hud instanceof HTMLElement) hud.style.display = '';
  });
  await expect(page.getByTestId('run-hud')).toBeVisible();
  await waitForPaintedCanvas(page);
  await mkdir(OUTPUT, { recursive: true });
  await page.screenshot({ path: `${OUTPUT}/webgl-recovered-hidden-hud-${testInfo.project.name}.png`, fullPage: false });
});
