import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function spectatorQaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'spectator');
  return url.toString();
}

function numberAttribute(locator, name) {
  return locator.getAttribute(name).then(value => Number(value || 0));
}

test('spectator rendering stays smooth and bounded through packet loss', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeIssues = [];
  page.on('pageerror', error => runtimeIssues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon/i.test(text)) return;
    runtimeIssues.push(`console: ${text}`);
  });

  await page.goto(spectatorQaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('spectator-performance-qa')).toBeVisible();
  const diagnostics = page.getByTestId('spectator-performance-diagnostics');
  await expect(diagnostics).toHaveAttribute('data-contract', 'timestamp-buffer-direct-render-v1');
  await expect(page.locator('[data-testid="spectator-performance-qa"] canvas')).toHaveCount(1, { timeout: 60_000 });
  await expect(page.locator('[data-testid="spectator-performance-qa"] canvas')).toBeVisible();

  await expect.poll(() => numberAttribute(diagnostics, 'data-buffer-depth'), {
    timeout: 20_000,
    intervals: [250, 500],
  }).toBeGreaterThanOrEqual(3);
  await expect.poll(() => numberAttribute(diagnostics, 'data-interpolated-frames'), {
    timeout: 20_000,
    intervals: [250, 500],
  }).toBeGreaterThan(10);

  // The synthetic feed drops four consecutive ten-hertz packets every cycle.
  // The client must first extrapolate, then hold instead of jumping or running away.
  await expect.poll(() => numberAttribute(diagnostics, 'data-extrapolated-frames'), {
    timeout: 15_000,
    intervals: [250, 500],
  }).toBeGreaterThan(0);
  await expect.poll(() => numberAttribute(diagnostics, 'data-held-frames'), {
    timeout: 15_000,
    intervals: [250, 500],
  }).toBeGreaterThan(0);
  await expect.poll(() => numberAttribute(diagnostics, 'data-max-packet-gap-ms'), {
    timeout: 15_000,
    intervals: [250, 500],
  }).toBeGreaterThanOrEqual(400);

  const metrics = {
    bufferDepth: await numberAttribute(diagnostics, 'data-buffer-depth'),
    networkHz: await numberAttribute(diagnostics, 'data-network-hz'),
    reactPaintHz: await numberAttribute(diagnostics, 'data-react-paint-hz'),
    renderFps: await numberAttribute(diagnostics, 'data-render-fps'),
    maxExtrapolatedDistancePx: await numberAttribute(diagnostics, 'data-max-extrapolated-distance-px'),
    effects: await numberAttribute(diagnostics, 'data-effects'),
    particles: await numberAttribute(diagnostics, 'data-particles'),
    damageNumbers: await numberAttribute(diagnostics, 'data-damage-numbers'),
    canvases: await numberAttribute(diagnostics, 'data-canvases'),
    menuRendererSuspended: await diagnostics.getAttribute('data-menu-renderer-suspended'),
  };

  expect(metrics.bufferDepth).toBeLessThanOrEqual(8);
  expect(metrics.networkHz).toBeGreaterThan(5.5);
  expect(metrics.networkHz).toBeLessThanOrEqual(11.5);
  expect(metrics.reactPaintHz).toBeGreaterThan(0);
  expect(metrics.reactPaintHz).toBeLessThanOrEqual(8);
  expect(metrics.renderFps).toBeGreaterThan(15);
  expect(metrics.maxExtrapolatedDistancePx).toBeLessThanOrEqual(28.1);
  expect(metrics.effects).toBeLessThanOrEqual(16);
  expect(metrics.particles).toBeLessThanOrEqual(12);
  expect(metrics.damageNumbers).toBeLessThanOrEqual(6);
  expect(metrics.canvases).toBe(1);
  expect(metrics.menuRendererSuspended).toBe('true');

  const contextHealthy = await page.locator('[data-testid="spectator-performance-qa"] canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return Boolean(gl && !gl.isContextLost());
  });
  expect(contextHealthy).toBe(true);

  await testInfo.attach('spectator-performance-metrics.json', {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: 'application/json',
  });
  await testInfo.attach('spectator-performance-ready.png', {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  });
  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});
