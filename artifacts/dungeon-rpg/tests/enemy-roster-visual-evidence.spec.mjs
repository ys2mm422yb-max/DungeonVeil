import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';
const OUTPUT = 'test-results/complete-runtime-evidence/enemy-roster';
const RETENTION_KEY = 'dungeon-veil-retention-v2';
const FAMILIES = [
  'slime', 'goblin', 'cave-bat', 'thorn-crawler',
  'skeleton', 'bone-archer', 'crypt-acolyte', 'grave-hound',
  'orc', 'spider', 'briar-shaman', 'boar-brute',
  'vampire', 'shadow-rogue', 'dusk-mage', 'carrion-swarm',
  'demon', 'veil-cultist', 'golem', 'flame-imp',
  'gilded-sentinel', 'fracture-wisp', 'crystal-lancer',
  'star-seer', 'astral-mote', 'void-knight',
  'drowned-revenant', 'tidecaller', 'chain-crab',
  'cinder-knight', 'furnace-hound', 'ember-witch',
  'veil-aberration', 'nexus-herald', 'rift-beast',
];

function retention() {
  return {
    currencyVersion: 2,
    sigils: 0,
    daily: { date: '2026-08-01', selected: [], progress: {}, claimed: [] },
    codex: {
      enemies: FAMILIES,
      enemyKills: Object.fromEntries(FAMILIES.map(id => [id, 1])),
      bosses: ['1:30'], hunts: [], relics: [],
    },
  };
}

async function seed(page) {
  await page.addInitScript(({ key, profile }) => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('dungeon-veil-runtime-evidence-v1', '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem(key, JSON.stringify(profile));
    window.__dungeonVeilCodexPreviewDiagnostics = [];
  }, { key: RETENTION_KEY, profile: retention() });
}

async function paintedCodexPreview(page) {
  const preview = page.getByTestId('codex-shared-model-preview');
  await expect(preview).toHaveAttribute('data-preview-status', 'ready', { timeout: 60_000 });
  await expect(preview).toHaveAttribute('data-preview-painted', 'true');
  await waitForPaintedCanvas(page, preview.locator('canvas[data-codex-preview-canvas="true"]'), 30_000);
}

async function resetCodexDiagnostics(page) {
  await page.evaluate(() => {
    window.__dungeonVeilCodexPreviewDiagnostics = [];
  });
}

async function codexDiagnostics(page) {
  return page.evaluate(() => Array.isArray(window.__dungeonVeilCodexPreviewDiagnostics)
    ? window.__dungeonVeilCodexPreviewDiagnostics
    : []);
}

async function attachCodexDiagnostics(page, testInfo, familyId) {
  const diagnostics = await codexDiagnostics(page);
  await testInfo.attach(`codex-renderer-diagnostics-${familyId}`, {
    body: Buffer.from(JSON.stringify({ familyId, diagnostics }, null, 2)),
    contentType: 'application/json',
  });
  return diagnostics;
}

async function startRuntime(page) {
  await seed(page);
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });
  await page.getByRole('textbox').first().fill('Enemy Roster Evidence');
  await page.getByTestId('run-name-confirm').click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__dungeonVeilRuntimeEvidence)), { timeout: 60_000 }).toBe(true);
  await waitForPaintedCanvas(page);
}

async function loadRoom(page, room) {
  await page.evaluate(nextRoom => window.__dungeonVeilRuntimeEvidence.loadRoom(nextRoom, 'solo'), room);
  await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.floor), { timeout: 30_000 }).toBe(room);
  await expect.poll(() => page.evaluate(expected => {
    const root = document.documentElement.dataset;
    return root.dungeonVeilRoomBuildState === 'ready' && Number(root.dungeonVeilRoomBuildFloor) === expected;
  }, room), { timeout: 60_000 }).toBe(true);
  await waitForPaintedCanvas(page);
}

test('complete canonical enemy roster is visibly reviewable in Codex and deterministic combat', async ({ page }, testInfo) => {
  test.setTimeout(900_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`); });
  await mkdir(OUTPUT, { recursive: true });

  await seed(page);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /Kodex|Codex/i }).click();
  await expect(page.getByTestId('codex-count-beasts')).toHaveText('35/35');
  const selectionDiagnostics = [];
  for (const familyId of FAMILIES) {
    await resetCodexDiagnostics(page);
    await page.getByTestId(`codex-card-${familyId}`).click();
    try {
      await paintedCodexPreview(page);
      const diagnostics = await codexDiagnostics(page);
      const readyEntries = diagnostics.filter(entry => entry?.phase === 'ready');
      expect(readyEntries, `expected exactly one ready diagnostic for selected family ${familyId}`).toHaveLength(1);
      const ready = readyEntries[0];
      expect(typeof ready?.enemyType, `ready diagnostic missing rendered enemyType for ${familyId}`).toBe('string');
      expect(ready?.painted, `ready diagnostic not painted for ${familyId}`).toBe(true);
      expect(ready?.contextLost, `renderer context lost before ${familyId} became ready`).toBe(false);
      selectionDiagnostics.push({ familyId, ready });
      await page.screenshot({ path: `${OUTPUT}/codex-${familyId}-${testInfo.project.name}.png`, fullPage: false });
    } finally {
      await attachCodexDiagnostics(page, testInfo, familyId);
    }
  }

  await testInfo.attach('codex-renderer-diagnostics-full-sequence', {
    body: Buffer.from(JSON.stringify({ families: FAMILIES, selections: selectionDiagnostics }, null, 2)),
    contentType: 'application/json',
  });
  expect(FAMILIES).toHaveLength(35);
  expect(selectionDiagnostics).toHaveLength(35);
  expect(selectionDiagnostics.every(entry => entry?.ready?.painted === true && entry?.ready?.contextLost === false)).toBe(true);

  await startRuntime(page);
  for (let index = 0; index < FAMILIES.length; index += 4) {
    const batch = FAMILIES.slice(index, index + 4);
    const room = Math.min(99, Math.floor(index / 4) * 10 + 5);
    await loadRoom(page, room);
    const snapshot = await page.evaluate(families => window.__dungeonVeilRuntimeEvidence.setLivingEnemyFamilies(families), batch);
    expect(snapshot.livingEnemyFamilies.slice(0, batch.length)).toEqual(batch);
    await page.waitForTimeout(1_500);
    await waitForPaintedCanvas(page);
    await page.screenshot({ path: `${OUTPUT}/combat-${batch.join('_')}-${testInfo.project.name}.png`, fullPage: false });
  }

  await loadRoom(page, 15);
  await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.setLivingEnemyFamilies(['bone-archer']));
  await page.waitForTimeout(8_000);
  await page.screenshot({ path: `${OUTPUT}/bow-motion-bone-archer-${testInfo.project.name}.png`, fullPage: false });

  await loadRoom(page, 30);
  await page.waitForTimeout(10_000);
  await page.screenshot({ path: `${OUTPUT}/bow-motion-waldhauptmann-${testInfo.project.name}.png`, fullPage: false });
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
