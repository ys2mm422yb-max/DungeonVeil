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
  await expect(page.getByTestId('spectator-performance-diagnostics')).toHaveAttribute('data-contract', 'jitter-loss-long-run-v1');
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });

  const diagnostics = page.getByTestId('spectator-performance-diagnostics');
  await expect.poll(() => numberAttr(diagnostics, 'data-frames'), { timeout: 30_000 }).toBeGreaterThan(120);
  const startX = await numberAttr(diagnostics, 'data-player-x');
  const earlyRenderer = await rendererMetrics(page);

  await page.waitForTimeout(12_000);

  const finalX = await numberAttr(diagnostics, 'data-player-x');
  const frames = await numberAttr(diagnostics, 'data-frames');
  const maxFrameStep = await numberAttr(diagnostics, 'data-max-frame-step');
  const maxStagnantMs = await numberAttr(diagnostics, 'data-max-stagnant-ms');
  const bufferDepth = await numberAttr(diagnostics, 'data-buffer-depth');
  const interpolationFrames = await numberAttr(diagnostics, 'data-interpolation-frames');
  const extrapolationFrames = await numberAttr(diagnostics, 'data-extrapolation-frames');
  const heldFrames = await numberAttr(diagnostics, 'data-held-frames');
  const reactRenders = await numberAttr(diagnostics, 'data-react-renders');
  const canvasCount = await numberAttr(diagnostics, 'data-canvas-count');
  const menuCanvasCount = await numberAttr(diagnostics, 'data-menu-canvas-count');
  const lateRenderer = await rendererMetrics(page);

  expect(finalX - startX, 'spectator player did not continue moving locally between packets').toBeGreaterThan(120);
  expect(frames).toBeGreaterThan(450);
  expect(interpolationFrames, 'buffer never entered timestamp interpolation').toBeGreaterThan(100);
  expect(extrapolationFrames, 'short packet gaps were not handled by bounded extrapolation').toBeGreaterThan(0);
  expect(heldFrames, 'long packet gaps never stopped extrapolating and entered hold').toBeGreaterThan(0);
  expect(bufferDepth).toBeLessThanOrEqual(8);
  expect(maxFrameStep, 'a network correction produced a visible hard jump').toBeLessThan(9);
  expect(maxStagnantMs, 'playback froze too long during packet loss').toBeLessThan(520);
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
