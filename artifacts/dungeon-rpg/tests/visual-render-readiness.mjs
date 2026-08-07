import { expect } from '@playwright/test';

const SAMPLE_SIZE = 64;
const MIN_LIT_COVERAGE = 0.05;
const MIN_SAMPLE_PNG_BYTES = 500;
const MIN_COMPOSITED_PNG_BYTES = 4_000;
const MIN_COMPOSITED_BYTES_PER_PIXEL = 0.012;
const REQUIRED_PAINTED_SAMPLES = 2;
const POLL_INTERVALS = [100, 200, 350, 500, 750, 1_000];
const RESTORED_ARMOR_SCREENSHOT_GUARD = Symbol('restoredArmorScreenshotGuard');
const NAVIGATION_SAFE_EVALUATE_GUARD = Symbol('navigationSafeEvaluateGuard');
const RAW_PAGE_SCREENSHOT = Symbol('rawPageScreenshot');

async function canvasFrameEvidence(canvas) {
  return canvas.evaluate(async (element, sampleSize) => {
    await new Promise(resolve => requestAnimationFrame(() => resolve()));
    const empty = { coverage: 0, pngBytes: 0, frameHash: 0, width: element.width, height: element.height };
    const sample = document.createElement('canvas');
    sample.width = sampleSize;
    sample.height = sampleSize;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) return empty;
    let bitmap = null;
    try {
      context.clearRect(0, 0, sampleSize, sampleSize);
      try {
        bitmap = await createImageBitmap(element);
        context.drawImage(bitmap, 0, 0, sampleSize, sampleSize);
      } catch {
        context.drawImage(element, 0, 0, sampleSize, sampleSize);
      }
      const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
      let lit = 0;
      let frameHash = 2166136261;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        const brightness = pixels[index] + pixels[index + 1] + pixels[index + 2];
        if (alpha > 16 && brightness > 54) lit += 1;
        frameHash ^= pixels[index]; frameHash = Math.imul(frameHash, 16777619);
        frameHash ^= pixels[index + 1]; frameHash = Math.imul(frameHash, 16777619);
        frameHash ^= pixels[index + 2]; frameHash = Math.imul(frameHash, 16777619);
        frameHash ^= alpha; frameHash = Math.imul(frameHash, 16777619);
      }
      const pngBytes = await new Promise(resolve => sample.toBlob(blob => resolve(blob?.size || 0), 'image/png'));
      return { coverage: lit / (sampleSize * sampleSize), pngBytes, frameHash: frameHash >>> 0, width: element.width, height: element.height };
    } catch {
      return empty;
    } finally {
      bitmap?.close?.();
    }
  }, SAMPLE_SIZE);
}

async function compositedCanvasEvidence(page, canvas) {
  try {
    const box = await canvas.boundingBox();
    if (!box || box.width < 1 || box.height < 1) return { pngBytes: 0, requiredBytes: Number.POSITIVE_INFINITY };
    const rawScreenshot = page[RAW_PAGE_SCREENSHOT] || page.screenshot.bind(page);
    const png = await rawScreenshot({
      type: 'png',
      animations: 'allow',
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: box.width,
        height: box.height,
      },
    });
    const area = Math.max(1, Math.round(box.width) * Math.round(box.height));
    return { pngBytes: png.length, requiredBytes: Math.max(MIN_COMPOSITED_PNG_BYTES, Math.floor(area * MIN_COMPOSITED_BYTES_PER_PIXEL)) };
  } catch {
    return { pngBytes: 0, requiredBytes: Number.POSITIVE_INFINITY };
  }
}

async function waitForRoomRendererReady(page, timeout) {
  await expect.poll(
    async () => {
      const buildState = await page.evaluate(() => document.documentElement.dataset.dungeonVeilRoomBuildState || '');
      return !buildState || buildState === 'ready';
    },
    { timeout, intervals: POLL_INTERVALS, message: 'Room renderer did not reach ready state' },
  ).toBe(true);
}

function isNavigationTransitionError(error) {
  const message = String(error?.message || error);
  return /execution context was destroyed|most likely because of a navigation/i.test(message)
    || /null is not an object \(evaluating 'document\.(?:body|documentElement)\.scrollWidth'\)/i.test(message);
}

async function waitForDocumentBody(page, timeout) {
  await page.waitForLoadState('domcontentloaded', { timeout });
  await page.locator('body').waitFor({ state: 'attached', timeout });
}

function installNavigationSafeEvaluate(page, timeout) {
  if (page[NAVIGATION_SAFE_EVALUATE_GUARD]) return;
  const originalEvaluate = page.evaluate.bind(page);
  page.evaluate = async (...args) => {
    try {
      return await originalEvaluate(...args);
    } catch (error) {
      if (!isNavigationTransitionError(error)) throw error;
      await waitForDocumentBody(page, timeout);
      return originalEvaluate(...args);
    }
  };
  page[NAVIGATION_SAFE_EVALUATE_GUARD] = true;
}

function installRestoredArmorScreenshotGuard(page, timeout) {
  if (page[RESTORED_ARMOR_SCREENSHOT_GUARD]) return;
  const originalScreenshot = page.screenshot.bind(page);
  page[RAW_PAGE_SCREENSHOT] = originalScreenshot;
  page.screenshot = async options => {
    const runRenderer = page.getByTestId('run-three-host');
    if (await runRenderer.count()) {
      const runCanvas = runRenderer.locator('canvas').first();
      if (await runCanvas.count()) {
        await waitForPaintedCanvas(page, runCanvas, timeout);
      }
    }
    return originalScreenshot(options);
  };
  page[RESTORED_ARMOR_SCREENSHOT_GUARD] = true;
}

export async function waitForPaintedCanvas(page, canvas = page.locator('canvas').first(), timeout = 60_000) {
  installNavigationSafeEvaluate(page, timeout);
  installRestoredArmorScreenshotGuard(page, timeout);
  await expect(canvas).toBeVisible({ timeout });
  await waitForRoomRendererReady(page, timeout);
  let paintedSamples = 0;
  await expect.poll(
    async () => {
      const buildState = await page.evaluate(() => document.documentElement.dataset.dungeonVeilRoomBuildState || '');
      if (buildState && buildState !== 'ready') {
        paintedSamples = 0;
        return 0;
      }
      const composited = await compositedCanvasEvidence(page, canvas);
      let paintScore = composited.pngBytes / composited.requiredBytes;
      if (paintScore < 1) {
        const evidence = await canvasFrameEvidence(canvas);
        paintScore = Math.max(paintScore, evidence.coverage / MIN_LIT_COVERAGE, evidence.pngBytes / MIN_SAMPLE_PNG_BYTES);
      }
      const painted = Number.isFinite(paintScore) && paintScore >= 1;
      paintedSamples = painted ? paintedSamples + 1 : 0;
      return paintedSamples >= REQUIRED_PAINTED_SAMPLES ? paintScore : 0;
    },
    { timeout, intervals: POLL_INTERVALS, message: 'WebGL canvas remained blank or insufficiently painted' },
  ).toBeGreaterThanOrEqual(1);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

export async function waitForLiveMenuPaint(page, timeout = 60_000) {
  const scene = page.getByTestId('live-hybrid-main-menu-scene');
  await expect(scene).toHaveAttribute('data-ranger-loaded', 'true', { timeout });
  await expect(scene).toHaveAttribute('data-animation-state', 'running', { timeout });
  await expect.poll(
    async () => Number(await scene.getAttribute('data-animation-frames') || 0),
    { timeout, intervals: POLL_INTERVALS, message: 'Live menu animation did not advance far enough for visual evidence' },
  ).toBeGreaterThanOrEqual(10);
  await waitForPaintedCanvas(page, page.getByTestId('live-hybrid-main-menu-canvas'), timeout);
  return scene;
}
