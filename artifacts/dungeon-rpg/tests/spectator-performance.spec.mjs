import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'spectator');
  return url.toString();
}

const numberAttr = (locator, name) => locator.getAttribute(name).then(value => Number(value || 0));

async function rendererMetrics(page) {
  return page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('dungeon-veil-performance') || '{}'); }
    catch { return {}; }
  });
}

test('spectator playback stays smooth and bounded through jitter and packet loss', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  if (testInfo.project.name.includes('ipad')) await page.setViewportSize({ width: 820, height: 1180 });

  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !/favicon/i.test(message.text())) runtimeErrors.push(`console: ${message.text()}`);
  });

  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('spectator-performance-qa')).toBeVisible();
  await expect(page.getByTestId('spectator-playback-stage')).toHaveAttribute('data-render-contract', 'single-stable-three-state');
  await expect(page.getByTestId('spectator-performance-diagnostics')).toHaveAttribute('data-contract', 'jitter-loss-layout-long-run-v5');
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });

  const diagnostics = page.getByTestId('spectator-performance-diagnostics');
  await expect.poll(() => numberAttr(diagnostics, 'data-frames'), { timeout: 45_000 }).toBeGreaterThan(8);
  await expect.poll(() => numberAttr(diagnostics, 'data-measured-frames'), { timeout: 45_000 }).toBeGreaterThan(1);
  await expect(diagnostics).toHaveAttribute('data-delta-has-map', 'false');
  const keyframeBytes = await numberAttr(diagnostics, 'data-keyframe-bytes');
  const deltaBytes = await numberAttr(diagnostics, 'data-delta-bytes');
  expect(keyframeBytes).toBeGreaterThan(1_000);
  expect(deltaBytes, 'spectator delta packet was not smaller than its room keyframe').toBeLessThan(keyframeBytes * 0.85);

  const startX = await numberAttr(diagnostics, 'data-player-x');
  const startFrames = await numberAttr(diagnostics, 'data-frames');
  const startMeasuredFrames = await numberAttr(diagnostics, 'data-measured-frames');
  const earlyRenderer = await rendererMetrics(page);

  await page.waitForTimeout(12_000);

  const finalX = await numberAttr(diagnostics, 'data-player-x');
  const frames = await numberAttr(diagnostics, 'data-frames');
  const measuredFrames = await numberAttr(diagnostics, 'data-measured-frames');
  const maxExcessStepPx = await numberAttr(diagnostics, 'data-max-excess-step-px');
  const maxCorrectionPx = await numberAttr(diagnostics, 'data-max-correction-px');
  const maxFrameIntervalMs = await numberAttr(diagnostics, 'data-max-frame-interval-ms');
  const maxStagnantMs = await numberAttr(diagnostics, 'data-max-stagnant-ms');
  const bufferDepth = await numberAttr(diagnostics, 'data-buffer-depth');
  const interpolationFrames = await numberAttr(diagnostics, 'data-interpolation-frames');
  const extrapolationFrames = await numberAttr(diagnostics, 'data-extrapolation-frames');
  const heldFrames = await numberAttr(diagnostics, 'data-held-frames');
  const outagePackets = await numberAttr(diagnostics, 'data-outage-packets');
  const layoutChanges = await numberAttr(diagnostics, 'data-layout-changes');
  const reactRenders = await numberAttr(diagnostics, 'data-react-renders');
  const canvasCount = await numberAttr(diagnostics, 'data-canvas-count');
  const menuCanvasCount = await numberAttr(diagnostics, 'data-menu-canvas-count');
  const lateRenderer = await rendererMetrics(page);

  expect(finalX - startX, 'spectator player did not continue moving locally between packets').toBeGreaterThan(50);
  expect(frames - startFrames, 'spectator requestAnimationFrame heartbeat stopped during the long run').toBeGreaterThan(2);
  expect(measuredFrames - startMeasuredFrames, 'spectator had no post-warmup render progress during the long run').toBeGreaterThan(2);
  expect(interpolationFrames, 'buffer never entered timestamp interpolation').toBeGreaterThan(2);
  expect(extrapolationFrames + heldFrames, 'packet gaps were not exercised').toBeGreaterThan(0);
  expect(heldFrames, 'the repeated 500ms packet outage never settled into bounded hold').toBeGreaterThan(0);
  expect(outagePackets, 'the synthetic long packet outage was not generated').toBeGreaterThanOrEqual(4);
  expect(layoutChanges, 'enemy additions and removals were not exercised').toBeGreaterThanOrEqual(2);
  expect(bufferDepth).toBeLessThanOrEqual(8);
  expect(maxCorrectionPx, 'spectator correction exceeded its explicit clamp').toBeLessThanOrEqual(24.01);
  expect(maxExcessStepPx, 'enemy layout changes caused a player/camera hard snap beyond motion and correction budgets').toBeLessThan(2);
  expect(maxStagnantMs, 'playback remained stagnant beyond the packet-outage and runner-frame allowance').toBeLessThan(Math.max(900, maxFrameIntervalMs * 3.5));
  expect(reactRenders, 'spectator React tree rerendered at animation-frame frequency').toBeLessThanOrEqual(4);
  expect(canvasCount).toBe(1);
  expect(menuCanvasCount).toBe(0);

  if (Number.isFinite(earlyRenderer.geometries) && Number.isFinite(lateRenderer.geometries)) {
    expect(lateRenderer.geometries - earlyRenderer.geometries, 'WebGL geometries grew without a bound during the long run').toBeLessThan(28);
  }
  if (Number.isFinite(earlyRenderer.textures) && Number.isFinite(lateRenderer.textures)) {
    expect(lateRenderer.textures - earlyRenderer.textures, 'WebGL textures grew without a bound during the long run').toBeLessThan(18);
  }

  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
