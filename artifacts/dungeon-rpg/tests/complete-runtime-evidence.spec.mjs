import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';
const OUTPUT = 'test-results/complete-runtime-evidence';
const CHUNKS = [[1, 10], [11, 20], [21, 30], [31, 40], [41, 50]];
const CONTINUOUS_SCREENSHOT_ROOMS = new Set([1, 10, 13, 20, 30, 40, 50]);
const HAZARD_PREFIXES = ['forge-warn-', 'forge-hit-', 'arc-warn-', 'arc-charge-', 'arc-fire-', 'arc-source-', 'core-', 'core-inner-'];

function qaUrl(mode) {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', mode);
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
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      relics: ['ash-eye', 'marked-claw', 'veil-heart'],
      announcedEquipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      announcedRelics: ['ash-eye', 'marked-claw', 'veil-heart'],
    }));
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

function runtimeIssues(page) {
  const issues = [];
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|supabase.*(?:401|403)|WebGL context was lost/i.test(text)) return;
    issues.push(`console: ${text}`);
  });
  page.on('response', response => {
    if (response.url().startsWith(new URL(APP_URL).origin) && response.status() >= 400) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  return issues;
}

async function waitForApi(page) {
  await expect.poll(() => page.evaluate(() => Bolean(window.__dungeonVeilRuntimeEvidence)), { timeout: 60_000 }).toBe(true);
}

async function startSolo(page) {
  await seedRuntimeEvidence(page);
  await page.goto(qaUrl('runtime'), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });
  const input = page.getByRole('textbox').first();
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill('Runtime Evidence Ranger');
  const confirm = page.getByTestId('run-name-confirm');
  if (await confirm.count()) await confirm.click({ force: true });
  else await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await waitForApi(page);
  await waitForPaintedCanvas(page);
}

async function startDuo(page) {
  await seedRuntimeEvidence(page);
  await page.goto(qaUrl('runtime-duo'), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('runtime-duo-evidence-qa')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await waitForApi(page);
  await waitForPaintedCanvas(page);
}

async function canvasSignal(page) {
  return page.evaluate(async () => {
    const source = document.querySelector('[data-testid="run-three-host"] canvas');
    if (!(source instanceof HTMLCanvasElement) || source.width < 2 || source.height < 2) return { average: 0, nonDarkRatio: 0, width: 0, height: 0 };
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const probe = document.createElement('canvas');
    probe.width = 64;
    probe.height = 64;
    const context = probe.getContext('2d', { willReadFrequently: true });
    if (!context) return { average: 0, nonDarkRatio: 0, width: source.width, height: source.height };
    context.drawImage(source, 0, 0, probe.width, probe.height);
    const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
    let total = 0;
    let nonDark = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const luminance = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      total += luminance;
      if (luminance > 5) nonDark += 1;
    }
    const count = pixels.length / 4;
    return { average: total / count, nonDarkRatio: nonDark / count, width: source.width, height: source.height };
  });
}

function assertPaintedSignal(signal, mode, room) {
  expect(signal.width, JSON.stringify(signal)).toBeGreaterThan(10);
  expect(signal.height, JSON.stringify(signal)).toBeGreaterThan(10);
  expect(signal.average, `black canvas in ${mode} room ${room}: ${JSON.stringify(signal)}`).toBeGreaterThan(1.5);
  expect(signal.nonDarkRatio, `black canvas in ${mode} room ${room}: ${JSON.stringify(signal)}`).toBeGreaterThan(0.01);
}

async function loadAndCheckRoom(page, mode, room, settleMs = 850) {
  await page.evaluate(({ nextRoom, nextMode }) => window.__dungeonVeilRuntimeEvidence.loadRoom(nextRoom, nextMode), { nextRoom: room, nextMode: mode });
  await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.floor), { timeout: 30_000 }).toBe(room);
  await expect(page.getByText(`RAUM ${room}/50`, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
  await waitForPaintedCanvas(page);
  await page.waitForTimeout(settleMs);
  const signal = await canvasSignal(page);
  assertPaintedSignal(signal, mode, room);
  return signal;
}

async function loadAndCaptureRoom(page, mode, room, projectName) {
  await loadAndCheckRoom(page, mode, room);
  await mkdir(OUTPUT, { recursive: true });
  await page.screenshot({ path: `${OUTPUT}/${mode}-room-${String(room).padStart(2, '0')}-${projectName}.png`, fullPage: false });
}

for (const mode of ['solo', 'duo']) {
  for (const [first, last] of CHUNKS) {
    test(`${mode} continuous renderer evidence rooms ${first}-${last}`, async ({ page }, testInfo) => {
      test.setTimeout(900_000);
      const issues = runtimeIssues(page);
      if (mode === 'solo') await startSolo(page);
      else await startDuo(page);
      for (let room = first; room <= last; room += 1) await loadAndCaptureRoom(page, mode, room, testInfo.project.name);
      await testInfo.attach(`${mode}-${first}-${last}-runtime-issues.json`, {
        body: Buffer.from(JSON.stringify(issues, null, 2)),
        contentType: 'application/json',
      });
      expect(issues, issues.join('\n')).toEqual([]);
    });
  }

  test(`${mode} one renderer survives uninterrupted rooms 1-50`, async ({ page }, testInfo) => {
    test.setTimeout(900_000);
    const issues = runtimeIssues(page);
    if (mode === 'solo') await startSolo(page);
    else await startDuo(page);
    const pageIdentity = await page.evaluate(() => {
      window.__dvContinuousRoomPageIdentity = `${Date.now()}-${Math.random()}`;
      return window.__dvContinuousRoomPageIdentity;
    });
    const readings = [];
    await mkdir(OUTPUT, { recursive: true });

    for (let room = 1; room <= 50; room += 1) {
      const signal = await loadAndCheckRoom(page, mode, room, 260);
      const liveIdentity = await page.evaluate(() => window.__dvContinuousRoomPageIdentity);
      expect(liveIdentity, `unexpected page reload in ${mode} room ${room}`).toBe(pageIdentity);
      readings.push({ room, ...signal });
      if (CONTINUOUS_SCREENSHOT_ROOMS.has(room)) {
        await page.screenshot({ path: `${OUTPUT}/continuous-${mode}-room-${String(room).padStart(2, '0')}-${testInfo.project.name}.png`, fullPage: false });
      }
    }

    await testInfo.attach(`${mode}-continuous-1-50-canvas-readings.json`, {
      body: Buffer.from(JSON.stringify({ pageIdentity, readings, issues }, null, 2)),
      contentType: 'application/json',
    });
    expect(readings).toHaveLength(50);
    expect(issues, issues.join('\n')).toEqual([]);
  });
}

test('room hazards stop before the final enemy death animation finishes', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const issues = runtimeIssues(page);
  await startSolo(page);
  for (const room of [16, 18]) {
    await page.evaluate(nextRoom => window.__dungeonVeilRuntimeEvidence.loadRoom(nextRoom, 'solo'), room);
    await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.setPlayerStats(1, 5000));
    await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.livingEnemies), { timeout: 30_000 }).toBeGreaterThan(0);
    const warningPrefix = room === 16 ? 'arc-warn-' : 'forge-warn-';
    await expect.poll(
      () => page.evaluate(prefix => window.__dungeonVeilRuntimeEvidence.snapshot()?.effects.some(id => id.startsWith(prefix)), warningPrefix),
      { timeout: 12_000, intervals: [200, 350, 500] },
    ).toBe(true);
    const armed = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());
    expect(armed.effects.some(id => id.startsWith(warningPrefix)), JSON.stringify(armed)).toBe(true);
    await page.evaluate(() => {
      const baseline = Number(window.__dungeonVeilRuntimeEvidence.snapshot()?.hp ?? 0);
      const probe = { baseline, minimum: baseline, samples: [baseline], active: true };
      window.__dvPostClearHpProbe = probe;
      const sample = () => {
        if (!probe.active) return;
        const hp = Number(window.__dungeonVeilRuntimeEvidence.snapshot()?.hp ?? 0);
        probe.samples.push(hp);
        probe.minimum = Math.min(probe.minimum, hp);
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.killLivingEnemies());
    await expect.poll(() => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.livingEnemies), { timeout: 10_000 }).toBe(0);
    await page.waitForTimeout(1_850);
    const result = await page.evaluate(() => {
      window.__dvPostClearHpProbe.active = false;
      return {
        probe: window.__dvPostClearHpProbe,
        settled: window.__dungeonVeilRuntimeEvidence.snapshot(),
      };
    });
    expect(result.probe.minimum, JSON.stringify({ armed, ...result })).toBeGreaterThanOrEqual(result.probe.baseline);
    expect(result.settled.effects.filter(id => HAZARD_PREFIXES.some(prefix => id.startsWith(prefix))), JSON.stringify(result.settled)).toEqual([]);
    await mkdir(OUTPUT, { recursive: true });
    await page.screenshot({ path: `${OUTPUT}/ghost-damage-room-${room}-${testInfo.project.name}.png`, fullPage: false });
  }
  expect(issues, issues.join('\n')).toEqual([]);
});

test('lost WebGL context recovers without leaving a black active fight', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await startSolo(page);
  await loadAndCaptureRoom(page, 'solo', 13, testInfo.project.name);
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
  await expect(page.getByTestId('run-hud')).toBeVisible();
  await waitForPaintedCanvas(page);
  const signal = await canvasSignal(page);
  expect(signal.average, JSON.stringify(signal)).toBeGreaterThan(1.5);
  await mkdir(OUTPUT, { recursive: true });
  await page.screenshot({ path: `${OUTPUT}/webgl-recovered-room-13-${testInfo.project.name}.png`, fullPage: false });
});
