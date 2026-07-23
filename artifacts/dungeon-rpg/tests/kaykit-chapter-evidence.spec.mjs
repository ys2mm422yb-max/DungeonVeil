import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';
const OUTPUT = 'test-results';
const EVIDENCE_ROOMS = [1, 10, 11, 20, 21, 30, 31, 40, 41, 50];

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime');
  return url.toString();
}

async function seedRuntimeEvidence(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('dungeon-veil-runtime-evidence-v1', '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 3, contrast: 'standard', textSize: 'standard', updatedAt: Date.now() }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 20,
      xp: 0,
      dust: 5000,
      gold: 25000,
      owned: {
        'ash-bow': { level: 3, copies: 2 },
        'ranger-quiver': { level: 3, copies: 2 },
        'ranger-cloak': { level: 3, copies: 2 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      rewardLedger: [],
      currentRunId: '',
    }));
  });
}

async function startSolo(page) {
  await seedRuntimeEvidence(page);
  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });
  const input = page.getByRole('textbox').first();
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill('KayKit Chapter Evidence');
  const confirm = page.getByTestId('run-name-confirm');
  if (await confirm.count()) await confirm.click({ force: true });
  else await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__dungeonVeilRuntimeEvidence)), { timeout: 60_000 }).toBe(true);
  await waitForPaintedCanvas(page);
}

async function loadRoom(page, room) {
  await page.evaluate(nextRoom => window.__dungeonVeilRuntimeEvidence.loadRoom(nextRoom, 'solo'), room);
  await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.floor), { timeout: 30_000 }).toBe(room);
  await expect.poll(
    () => page.evaluate(expectedRoom => {
      const state = document.documentElement.dataset;
      return state.dungeonVeilRoomBuildState === 'ready' && Number(state.dungeonVeilRoomBuildFloor || 0) === expectedRoom;
    }, room),
    { timeout: 60_000 },
  ).toBe(true);
  await expect(page.getByText(`RAUM ${room}/50`, { exact: false }).first()).toBeVisible({ timeout: 30_000 });

  // The first paint may need several seconds on a cold mobile WebGL context.
  // Warm the renderer first, then respawn the same encounter so auto-attacks
  // cannot clear early rooms before the actual evidence screenshot.
  await waitForPaintedCanvas(page);
  const respawned = await page.evaluate(nextRoom => window.__dungeonVeilRuntimeEvidence.loadRoom(nextRoom, 'solo'), room);
  expect(respawned?.livingEnemies, `Room ${room} did not respawn an active encounter`).toBeGreaterThan(0);
  await page.waitForTimeout(220);

  const snapshot = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());
  expect(snapshot?.livingEnemies, `Room ${room} has no active encounter after renderer warmup`).toBeGreaterThan(0);
  return snapshot;
}

test('compact chapter and boss evidence stays readable on the supported portrait device', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const issues = [];
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|supabase.*(?:401|403)|WebGL context was lost/i.test(text)) return;
    issues.push(`console: ${text}`);
  });

  await startSolo(page);
  await mkdir(OUTPUT, { recursive: true });
  for (const room of EVIDENCE_ROOMS) {
    await loadRoom(page, room);
    await page.screenshot({
      path: `${OUTPUT}/chapter-evidence-room-${String(room).padStart(2, '0')}-${testInfo.project.name}.png`,
      fullPage: false,
    });
  }

  expect(issues, issues.join('\n')).toEqual([]);
});
