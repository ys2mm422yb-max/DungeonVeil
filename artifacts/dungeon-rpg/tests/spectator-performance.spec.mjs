import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'spectator-performance');
  return url.toString();
}

function numberAttribute(locator, name) {
  return locator.getAttribute(name).then(value => Number(value || 0));
}

async function rendererMemory(page) {
  return page.evaluate(() => {
    try {
      const value = JSON.parse(localStorage.getItem('dungeon-veil-performance') || '{}');
      return {
        geometries: Number(value.geometries || 0),
        textures: Number(value.textures || 0),
        fps: Number(value.fps || 0),
        frameMs: Number(value.frameMs || 0),
      };
    } catch {
      return { geometries: 0, textures: 0, fps: 0, frameMs: 0 };
    }
  });
}

test('spectator playback stays smooth and bounded without React frame updates', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });

  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('spectator-performance-qa')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await expect(page.locator('canvas').first()).toBeVisible();

  const diagnostics = page.getByTestId('spectator-performance-qa-diagnostics');
  await expect(diagnostics).toHaveAttribute('data-contract', 'buffered-five-hertz-stable-scene-v2');
  await expect(diagnostics).toHaveAttribute('data-renderer-handoff', 'true', { timeout: 20_000 });

  await expect.poll(() => numberAttribute(diagnostics, 'data-buffer-depth'), {
    timeout: 20_000,
    intervals: [200, 400, 800],
  }).toBeGreaterThanOrEqual(4);
  await expect.poll(() => numberAttribute(diagnostics, 'data-received-snapshots'), {
    timeout: 20_000,
    intervals: [200, 400, 800],
  }).toBeGreaterThanOrEqual(5);
  await expect.poll(() => numberAttribute(diagnostics, 'data-rendered-frames'), {
    timeout: 20_000,
    intervals: [200, 400, 800],
  }).toBeGreaterThan(60);
  await expect.poll(() => numberAttribute(diagnostics, 'data-player-distance'), {
    timeout: 20_000,
    intervals: [200, 400, 800],
  }).toBeGreaterThan(24);

  const packetInterval = await numberAttribute(diagnostics, 'data-packet-interval-ms');
  const extrapolation = await numberAttribute(diagnostics, 'data-extrapolation-ms');
  const reactCommits = await numberAttribute(diagnostics, 'data-react-commits');
  expect(packetInterval).toBeGreaterThanOrEqual(190);
  expect(packetInterval).toBeLessThanOrEqual(210);
  expect(extrapolation).toBeGreaterThanOrEqual(0);
  expect(extrapolation).toBeLessThanOrEqual(110);
  expect(reactCommits).toBeLessThanOrEqual(3);
  expect(await numberAttribute(diagnostics, 'data-canvas-count')).toBe(1);

  await expect.poll(async () => (await rendererMemory(page)).fps, {
    timeout: 20_000,
    intervals: [500, 1_000],
  }).toBeGreaterThan(0);
  const earlyMemory = await rendererMemory(page);
  await page.waitForTimeout(6_000);
  const lateMemory = await rendererMemory(page);
  expect(lateMemory.geometries - earlyMemory.geometries).toBeLessThanOrEqual(8);
  expect(lateMemory.textures - earlyMemory.textures).toBeLessThanOrEqual(4);
  expect(await numberAttribute(diagnostics, 'data-canvas-count')).toBe(1);
  expect(await numberAttribute(diagnostics, 'data-rendered-frames')).toBeGreaterThan(180);

  await testInfo.attach('spectator-performance-ready.png', {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  });
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
