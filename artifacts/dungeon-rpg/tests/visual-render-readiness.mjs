import { expect } from '@playwright/test';

const SAMPLE_SIZE = 64;
const MIN_LIT_COVERAGE = 0.05;
const MIN_SAMPLE_PNG_BYTES = 500;

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

export async function waitForPaintedCanvas(page, canvas = page.locator('canvas').first(), timeout = 60_000) {
  await expect(canvas).toBeVisible({ timeout });
  let previousFrameHash = null;
  await expect.poll(
    async () => {
      const evidence = await canvasFrameEvidence(canvas);
      const changed = previousFrameHash !== null && evidence.frameHash !== previousFrameHash;
      previousFrameHash = evidence.frameHash;
      const coverageScore = evidence.coverage / MIN_LIT_COVERAGE;
      const pngScore = evidence.pngBytes / MIN_SAMPLE_PNG_BYTES;
      return changed && evidence.width > 0 && evidence.height > 0
        ? Math.max(coverageScore, pngScore)
        : 0;
    },
    {
      timeout,
      intervals: [100, 200, 350, 500, 750, 1_000],
      message: 'WebGL canvas remained blank, static or insufficiently painted',
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
      intervals: [100, 200, 350, 500, 750, 1_000],
      message: 'Live menu animation did not advance far enough for visual evidence',
    },
  ).toBeGreaterThanOrEqual(10);
  await waitForPaintedCanvas(page, page.getByTestId('live-hybrid-main-menu-canvas'), timeout);
  return scene;
}
