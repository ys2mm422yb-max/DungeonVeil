import { expect } from '@playwright/test';

const SAMPLE_SIZE = 64;
const MIN_LIT_COVERAGE = 0.05;
const MIN_SAMPLE_PNG_BYTES = 500;
const MIN_COMPOSITED_PNG_BYTES = 4_000;
const MIN_COMPOSITED_BYTES_PER_PIXEL = 0.012;
const REQUIRED_PAINTED_SAMPLES = 2;
const POLL_INTERVALS = [100, 200, 350, 500, 750, 1_000];

async function canvasFrameEvidence(canvas) {
  return canvas.evaluate(async (element, sampleSize) => {
    await new Promise(resolve => requestAnimationFrame(() => resolve()));
    const empty = {
      coverage: 0,
      pngBytes: 0,
      frameHash: 0,
      width: element.width,
      height: element.height,
    };
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
        frameHash ^= pixels[index];
        frameHash = Math.imul(frameHash, 16777619);
        frameHash ^= pixels[index + 1];
        frameHash = Math.imul(frameHash, 16777619);
        frameHash ^= pixels[index + 2];
        frameHash = Math.imul(frameHash, 16777619);
        frameHash ^= alpha;
        frameHash = Math.imul(frameHash, 16777619);
      }
      const pngBytes = await new Promise(resolve => {
        sample.toBlob(blob => resolve(blob?.size || 0), 'image/png');
      });
      return {
        coverage: lit / (sampleSize * sampleSize),
        pngBytes,
        frameHash: frameHash >>> 0,
        width: element.width,
        height: element.height,
      };
    } catch {
      return empty;
    } finally {
      bitmap?.close?.();
    }
  }, SAMPLE_SIZE);
}

async function compositedCanvasEvidence(canvas) {
  try {
    const box = await canvas.boundingBox();
    if (!box || box.width < 1 || box.height < 1) return { pngBytes: 0, requiredBytes: Number.POSITIVE_INFINITY };
    const png = await canvas.screenshot({ type: 'png', animations: 'allow' });
    const area = Math.max(1, Math.round(box.width) * Math.round(box.height));
    const requiredBytes = Math.max(MIN_COMPOSITED_PNG_BYTES, Math.floor(area * MIN_COMPOSITED_BYTES_PER_PIXEL));
    return { pngBytes: png.length, requiredBytes };
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
    {
      timeout,
      intervals: POLL_INTERVALS,
      message: 'Room renderer did not reach ready state',
    },
  ).toBe(true);
}

export async function waitForPaintedCanvas(page, canvas = page.locator('canvas').first(), timeout = 60_000) {
  await expect(canvas).toBeVisible({ timeout });

  // Room staging and GPU painting are separate phases. Slow software WebGL runners
  // may legitimately spend most of the readiness budget building a complex room.
  // Give the subsequent two composited paint samples their own complete budget so a
  // visible room cannot fail merely because staging consumed the shared timeout.
  await waitForRoomRendererReady(page, timeout);

  let paintedSamples = 0;
  await expect.poll(
    async () => {
      const buildState = await page.evaluate(() => document.documentElement.dataset.dungeonVeilRoomBuildState || '');
      if (buildState && buildState !== 'ready') {
        paintedSamples = 0;
        return 0;
      }

      // The compositor is the user-visible source of truth. WebGL canvases render
      // with preserveDrawingBuffer disabled, so reading their back buffer through
      // createImageBitmap can be empty and—on software WebGL—can stall for tens of
      // seconds. First verify the exact pixels the browser visibly composites.
      const composited = await compositedCanvasEvidence(canvas);
      let paintScore = composited.pngBytes / composited.requiredBytes;

      // Keep the direct canvas sample as a fallback for environments where element
      // screenshots are unavailable. It is no longer on the successful hot path.
      if (paintScore < 1) {
        const evidence = await canvasFrameEvidence(canvas);
        const coverageScore = evidence.coverage / MIN_LIT_COVERAGE;
        const samplePngScore = evidence.pngBytes / MIN_SAMPLE_PNG_BYTES;
        paintScore = Math.max(paintScore, coverageScore, samplePngScore);
      }

      const painted = Number.isFinite(paintScore) && paintScore >= 1;
      paintedSamples = painted ? paintedSamples + 1 : 0;
      return paintedSamples >= REQUIRED_PAINTED_SAMPLES ? paintScore : 0;
    },
    {
      timeout,
      intervals: POLL_INTERVALS,
      message: 'WebGL canvas remained blank or insufficiently painted',
    },
  ).toBeGreaterThanOrEqual(1);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

export async function waitForLiveMenuPaint(page, timeout = 60_000) {
  const scene = page.getByTestId('live-hybrid-main-menu-scene');
  await expect(scene).toHaveAttribute('data-ranger-loaded', 'true', { timeout });
  await expect(scene).toHaveAttribute('data-animation-state', 'running', { timeout });
  await expect.poll(
    async () => Number(await scene.getAttribute('data-animation-frames') || 0),
    {
      timeout,
      intervals: POLL_INTERVALS,
      message: 'Live menu animation did not advance far enough for visual evidence',
    },
  ).toBeGreaterThanOrEqual(10);
  await waitForPaintedCanvas(page, page.getByTestId('live-hybrid-main-menu-canvas'), timeout);
  return scene;
}
