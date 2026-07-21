import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';
const OUTPUT = 'test-results/complete-runtime-evidence';
const PLAYER_HAZARD_PREFIXES = ['rune-warning-', 'rune-impact-', 'forge-warn-', 'forge-hit-', 'arc-warn-', 'arc-charge-', 'arc-fire-', 'arc-source-'];

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime');
  return url.toString();
}

async function startSolo(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('dungeon-veil-runtime-evidence-v1', '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      relics: ['ash-eye', 'marked-claw', 'veil-heart'],
      announcedEquipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      announcedRelics: ['ash-eye', 'marked-claw', 'veil-heart'],
    }));
  });
  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });
  const input = page.getByRole('textbox').first();
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill('Renderer Recovery');
  const confirm = page.getByTestId('run-name-confirm');
  if (await confirm.count()) await confirm.click({ force: true });
  else await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__dungeonVeilRuntimeEvidence)), { timeout: 60_000 }).toBe(true);
  await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.loadRoom(13, 'solo'));
  await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.floor), { timeout: 30_000 }).toBe(13);
  await waitForPaintedCanvas(page);
}

test('renderer recovery saves and freezes a real Solo run while the transition HUD is hidden', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await startSolo(page);

  const setup = await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="run-hud"]');
    if (!(hud instanceof HTMLElement)) throw new Error('Run HUD missing');
    hud.style.display = 'none';
    document.documentElement.dataset.dungeonVeilRendererState = '';
    document.documentElement.dataset.dungeonVeilRendererRecoveredAt = '';
    const pageIdentity = `${Date.now()}-${Math.random()}`;
    const previousSave = JSON.parse(localStorage.getItem('dungeon-veil-save') || '{}');
    window.__dvTransitionRecoveryEvidence = { pageIdentity, preparing: 0, lost: 0, ready: 0 };
    window.addEventListener('dungeon-veil-room-preparing', () => { window.__dvTransitionRecoveryEvidence.preparing += 1; });
    window.addEventListener('dungeon-veil-renderer-lost', () => { window.__dvTransitionRecoveryEvidence.lost += 1; });
    window.addEventListener('dungeon-veil-room-ready', event => {
      if (event.detail?.recovered) window.__dvTransitionRecoveryEvidence.ready += 1;
    });
    return { pageIdentity, savedAt: Number(previousSave.savedAt || 0) };
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

  const recovered = await page.evaluate(() => ({
    evidence: { ...window.__dvTransitionRecoveryEvidence },
    save: JSON.parse(localStorage.getItem('dungeon-veil-save') || '{}'),
  }));
  expect(recovered.evidence.pageIdentity).toBe(setup.pageIdentity);
  expect(recovered.evidence.preparing, JSON.stringify(recovered.evidence)).toBe(1);
  expect(recovered.evidence.lost, JSON.stringify(recovered.evidence)).toBe(1);
  expect(recovered.evidence.ready, JSON.stringify(recovered.evidence)).toBe(1);
  expect(recovered.save.saveReason).toBe('dungeon-session');
  expect(Number(recovered.save.savedAt || 0)).toBeGreaterThanOrEqual(setup.savedAt);

  await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="run-hud"]');
    if (hud instanceof HTMLElement) hud.style.display = '';
  });
  await expect(page.getByTestId('run-hud')).toBeVisible();
  await waitForPaintedCanvas(page);

  await page.evaluate(() => {
    window.__dungeonVeilRuntimeEvidence.loadRoom(13, 'solo');
    window.__dungeonVeilRuntimeEvidence.setPlayerStats(1, 5000);
  });
  await expect.poll(
    () => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.effects.some(id => id.startsWith('rune-warning-'))),
    { timeout: 8_000 },
  ).toBe(true);
  const armed = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());

  await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="run-hud"]');
    if (hud instanceof HTMLElement) hud.style.display = 'none';
    document.documentElement.dataset.dungeonVeilRendererState = 'recovering';
    window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { rendererRecovery: true, prolongedEvidence: true } }));
  });
  await page.waitForTimeout(1_400);
  const frozen = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());
  expect(frozen.hp, JSON.stringify(frozen)).toBe(armed.hp);
  expect(frozen.effects.filter(id => PLAYER_HAZARD_PREFIXES.some(prefix => id.startsWith(prefix))), JSON.stringify(frozen)).toEqual([]);
  expect(frozen.damageNumbers.filter(id => id.startsWith('rune-hit-')), JSON.stringify(frozen)).toEqual([]);

  await page.evaluate(() => {
    document.documentElement.dataset.dungeonVeilRendererState = 'ready';
    window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { recovered: true, prolongedEvidence: true } }));
    const hud = document.querySelector('[data-testid="run-hud"]');
    if (hud instanceof HTMLElement) hud.style.display = '';
  });
  await expect(page.getByTestId('run-hud')).toBeVisible();
  await waitForPaintedCanvas(page);
  await mkdir(OUTPUT, { recursive: true });
  await page.screenshot({ path: `${OUTPUT}/webgl-recovered-hidden-hud-${testInfo.project.name}.png`, fullPage: false });
});
