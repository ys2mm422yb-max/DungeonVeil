import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const OUTPUT = 'test-results/complete-runtime-evidence';

function worldBossQaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'worldboss');
  return url.toString();
}

function runtimeDuoQaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime-duo');
  return url.toString();
}

function numericAttribute(locator, name) {
  return locator.getAttribute(name).then(value => Number(value || 0));
}

async function movementProbeSnapshot(page) {
  return page.evaluate(() => window.__dungeonVeilWorldBossMovementProbe?.snapshot());
}

async function resetMovementProbe(page, diagnostics) {
  await expect(diagnostics).toHaveAttribute('data-movement-probe', 'available');
  await expect.poll(() => page.evaluate(() => Boolean(window.__dungeonVeilWorldBossMovementProbe)), { timeout: 20_000 }).toBe(true);
  return page.evaluate(() => window.__dungeonVeilWorldBossMovementProbe.reset());
}

async function driveMovementProbe(page, x, y, durationMs) {
  await page.evaluate(({ x, y }) => window.__dungeonVeilWorldBossMovementProbe.setInput(x, y), { x, y });
  await page.waitForTimeout(durationMs);
  await page.evaluate(() => window.__dungeonVeilWorldBossMovementProbe.stop());
  return movementProbeSnapshot(page);
}

async function openWorldBossArena(page) {
  await page.goto(worldBossQaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('worldboss-dragon-loading')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('worldboss-dragon-load-error')).toHaveCount(0);
  const joystick = page.getByTestId('run-joystick');
  const diagnostics = page.getByTestId('worldboss-runtime-diagnostics');
  const guard = page.getByTestId('worldboss-visible-arena-guard');
  await expect(joystick).toBeVisible();
  await expect(diagnostics).toHaveAttribute('data-contract', 'movement-dash-open-arena-v3');
  await expect(diagnostics).toHaveAttribute('data-arena-boundary-contract', 'visible-walkable-interior-v3');
  await expect(diagnostics).toHaveAttribute('data-movement-probe', 'available');
  await expect(guard).toHaveAttribute('data-boundary-contract', 'visible-walkable-interior-v3');
  await expect(guard).toHaveAttribute('data-half-width-tiles', '6.25');
  await expect(guard).toHaveAttribute('data-half-height-tiles', '11.25');
  await waitForPaintedCanvas(page);
  return { joystick, diagnostics };
}

test('world boss loads the original FBX and accepts movement plus dash', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  if (testInfo.project.name.includes('ipad')) await page.setViewportSize({ width: 820, height: 1180 });

  const runtimeErrors = [];
  const responses = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on('response', response => {
    const url = response.url();
    if (/Dragon\.fbx|FBXLoader\.js|fflate\.module\.js|NURBSCurve\.js|NURBSUtils\.js/.test(url)) {
      responses.push({ url, status: response.status(), contentType: response.headers()['content-type'] || '' });
    }
  });

  await page.goto(worldBossQaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('worldboss-visual-qa')).toBeVisible();
  await expect(page.getByTestId('worldboss-combat-band')).toBeVisible();
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('worldboss-dragon-load-error')).toHaveCount(0);
  await expect(page.getByTestId('worldboss-dragon-loading')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('run-joystick')).toBeVisible();
  await expect(page.getByTestId('run-dash-button')).toBeVisible();

  const diagnostics = page.getByTestId('worldboss-runtime-diagnostics');
  await expect(diagnostics).toHaveAttribute('data-contract', 'movement-dash-open-arena-v3');
  await expect(diagnostics).toHaveAttribute('data-engine-status', 'playing', { timeout: 20_000 });
  await expect(diagnostics).toHaveAttribute('data-dragon-load-state', 'ready', { timeout: 20_000 });
  await expect(diagnostics).toHaveAttribute('data-boss-visual', 'original-black-fbx-dragon');
  await expect(diagnostics).toHaveAttribute('data-arena-boundary-contract', 'visible-walkable-interior-v3');
  const arenaGuard = page.getByTestId('worldboss-visible-arena-guard');
  await expect(arenaGuard).toHaveAttribute('data-boundary-contract', 'visible-walkable-interior-v3');
  await expect(arenaGuard).toHaveAttribute('data-half-width-tiles', '6.25');
  await expect(arenaGuard).toHaveAttribute('data-half-height-tiles', '11.25');
  await waitForPaintedCanvas(page, canvas, 60_000);

  const width = await numericAttribute(diagnostics, 'data-boss-width');
  const height = await numericAttribute(diagnostics, 'data-boss-height');
  const depth = await numericAttribute(diagnostics, 'data-boss-depth');
  const groundY = await numericAttribute(diagnostics, 'data-boss-ground-y');
  const topY = await numericAttribute(diagnostics, 'data-boss-top-y');
  expect(width).toBeGreaterThan(0.2);
  expect(height).toBeGreaterThan(0.2);
  expect(depth).toBeGreaterThan(0.2);
  expect(Math.max(width, height, depth)).toBeGreaterThan(3.15);
  expect(Math.max(width, height, depth)).toBeLessThan(3.35);
  expect(groundY).toBeGreaterThanOrEqual(-0.03);
  expect(groundY).toBeLessThanOrEqual(0.09);
  expect(topY).toBeGreaterThan(0.5);
  expect(await numericAttribute(diagnostics, 'data-map-width')).toBeGreaterThanOrEqual(20);
  expect(await numericAttribute(diagnostics, 'data-map-height')).toBeGreaterThanOrEqual(28);

  for (const required of ['Dragon.fbx', 'FBXLoader.js', 'fflate.module.js', 'NURBSCurve.js', 'NURBSUtils.js']) {
    const response = responses.find(item => item.url.includes(required));
    expect(response, `${required} was not requested by the live world-boss scene`).toBeTruthy();
    expect(response.status, `${required} returned ${response.status}`).toBeLessThan(400);
    expect(response.url, `${required} escaped the same-origin GitHub Pages runtime`).not.toMatch(/^https:\/\/cdn\.jsdelivr\.net/i);
  }
  const dragonResponse = responses.find(item => item.url.includes('Dragon.fbx'));
  expect(dragonResponse.contentType.toLowerCase()).not.toContain('text/html');

  const dashButton = page.getByTestId('run-dash-button');
  const dodgeBefore = await numericAttribute(diagnostics, 'data-player-last-dodge');
  await dashButton.click({ force: true });
  await expect.poll(() => numericAttribute(diagnostics, 'data-player-last-dodge'), {
    timeout: 10_000,
    intervals: [100, 200, 400],
  }).toBeGreaterThan(dodgeBefore);

  const startX = await numericAttribute(diagnostics, 'data-player-x');
  const startY = await numericAttribute(diagnostics, 'data-player-y');
  const joystick = page.getByTestId('run-joystick');
  const box = await joystick.boundingBox();
  expect(box).toBeTruthy();

  await page.evaluate(({ centerX, centerY, targetX, targetY }) => {
    const control = document.querySelector('[data-testid="run-joystick"]');
    control.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 41, pointerType: 'touch', isPrimary: true,
      clientX: centerX, clientY: centerY,
    }));
    window.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, cancelable: true, pointerId: 41, pointerType: 'touch', isPrimary: true,
      clientX: targetX, clientY: targetY,
    }));
  }, {
    centerX: box.x + box.width / 2,
    centerY: box.y + box.height / 2,
    targetX: box.x + box.width * 0.82,
    targetY: box.y + box.height * 0.38,
  });

  await expect.poll(async () => {
    const x = await numericAttribute(diagnostics, 'data-player-x');
    const y = await numericAttribute(diagnostics, 'data-player-y');
    return Math.hypot(x - startX, y - startY);
  }, { timeout: 10_000, intervals: [100, 200, 400] }).toBeGreaterThan(4);

  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, pointerId: 41, pointerType: 'touch', isPrimary: true,
    }));
  });
  await expect.poll(() => numericAttribute(diagnostics, 'data-joy-x')).toBe(0);
  await expect.poll(() => numericAttribute(diagnostics, 'data-joy-y')).toBe(0);

  await expect(page.getByTestId('worldboss-dragon-load-error')).toHaveCount(0);
  await waitForPaintedCanvas(page, canvas, 60_000);
  await testInfo.attach('worldboss-block1-ready.png', {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  });
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});

test('world boss movement probe crosses the former invisible phone clamp', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });

  const { diagnostics } = await openWorldBossArena(page);
  const start = await resetMovementProbe(page, diagnostics);
  const right = await driveMovementProbe(page, 1, 0, 1_600);
  expect(right.x - start.x).toBeGreaterThan(205);
  expect(Math.abs(right.y - start.y)).toBeLessThan(5);
  expect(right.hp).toBeGreaterThan(0);
  expect(right.status).toBe('playing');

  await mkdir(OUTPUT, { recursive: true });
  await page.screenshot({ path: `${OUTPUT}/worldboss-open-arena-${testInfo.project.name}.png`, fullPage: false });
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});

test('world boss movement probe keeps every cardinal route direct', async ({ page }) => {
  test.setTimeout(180_000);
  const { diagnostics } = await openWorldBossArena(page);
  const directions = [
    { x: -1, y: 0, axis: 'x', sign: -1 },
    { x: 1, y: 0, axis: 'x', sign: 1 },
    { x: 0, y: -1, axis: 'y', sign: -1 },
    { x: 0, y: 1, axis: 'y', sign: 1 },
  ];

  for (const direction of directions) {
    const before = await resetMovementProbe(page, diagnostics);
    const after = await driveMovementProbe(page, direction.x, direction.y, 420);
    const primary = direction.axis === 'x' ? after.x - before.x : after.y - before.y;
    const cross = direction.axis === 'x' ? after.y - before.y : after.x - before.x;
    expect(primary * direction.sign).toBeGreaterThan(35);
    expect(Math.abs(cross)).toBeLessThan(5);
    expect(after.hp).toBeGreaterThan(0);
    expect(after.status).toBe('playing');
  }
});

test('mobile landscape blocks gameplay and the same portrait fight resumes', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('dungeon-veil-runtime-evidence-v1', '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
  });

  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto(runtimeDuoQaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('runtime-duo-evidence-qa')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__dungeonVeilRuntimeEvidence)), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilRoomBuildState), { timeout: 60_000 }).toBe('ready');
  await expect(page.getByTestId('portrait-orientation-blocker')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilOrientation)).toBe('portrait');
  await waitForPaintedCanvas(page);

  const before = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());
  await page.setViewportSize({ width: 900, height: 600 });
  const blocker = page.getByTestId('portrait-orientation-blocker');
  await expect(blocker).toBeVisible();
  await expect(blocker).toContainText(/GERÄT BITTE DREHEN|ROTATE YOUR DEVICE/i);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilOrientation)).toBe('blocked');
  expect(await page.evaluate(() => document.getElementById('root')?.inert)).toBe(true);

  await page.waitForTimeout(1_500);
  const blocked = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());
  expect(blocked.floor).toBe(before.floor);
  expect(blocked.hp).toBe(before.hp);
  expect(blocked.effects).toEqual(before.effects);
  expect(blocked.damageNumbers).toEqual(before.damageNumbers);
  expect(blocked.orientation).toBe('blocked');

  await mkdir(OUTPUT, { recursive: true });
  await page.screenshot({ path: `${OUTPUT}/portrait-only-landscape-blocked-${testInfo.project.name}.png`, fullPage: false });

  await page.setViewportSize({ width: 600, height: 900 });
  await expect(blocker).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilOrientation)).toBe('portrait');
  expect(await page.evaluate(() => document.getElementById('root')?.inert)).toBe(false);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilRoomBuildState), { timeout: 60_000 }).toBe('ready');
  await waitForPaintedCanvas(page);
  const resumed = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot());
  expect(resumed.floor).toBe(before.floor);
  expect(resumed.hp).toBe(before.hp);
  expect(resumed.orientation).toBe('portrait');
});
