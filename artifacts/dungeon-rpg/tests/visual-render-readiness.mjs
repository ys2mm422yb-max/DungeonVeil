import { expect } from '@playwright/test';

const SAMPLE_SIZE = 48;
const MIN_LIT_COVERAGE = 0.05;
const MIN_PNG_BYTES_PER_CANVAS_PIXEL = 0.025;

async function canvasLitCoverage(canvas) {
  return canvas.evaluate((element, sampleSize) => new Promise(resolve => {
    requestAnimationFrame(() => {
      const sample = document.createElement('canvas');
      sample.width = sampleSize;
      sample.height = sampleSize;
      const context = sample.getContext('2d', { willReadFrequently: true });
      if (!context) {
        resolve(0);
        return;
      }
      try {
        context.clearRect(0, 0, sampleSize, sampleSize);
        context.drawImage(element, 0, 0, sampleSize, sampleSize);
        const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
        let lit = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3];
          const brightness = pixels[index] + pixels[index + 1] + pixels[index + 2];
          if (alpha > 16 && brightness > 54) lit += 1;
        }
        resolve(lit / (sampleSize * sampleSize));
      } catch {
        resolve(0);
      }
    });
  }), SAMPLE_SIZE);
}

export async function waitForPaintedCanvas(page, canvas = page.locator('canvas').first(), timeout = 60_000) {
  await expect(canvas).toBeVisible({ timeout });
  let previousFrame = null;
  await expect.poll(
    async () => {
      const [coverage, dimensions, frame] = await Promise.all([
        canvasLitCoverage(canvas),
        canvas.evaluate(element => ({ width: element.width, height: element.height })),
        canvas.screenshot(),
      ]);
      const changed = previousFrame !== null && !frame.equals(previousFrame);
      previousFrame = frame;
      const minimumBytes = Math.max(12_000, dimensions.width * dimensions.height * MIN_PNG_BYTES_PER_CANVAS_PIXEL);
      const coverageScore = coverage / MIN_LIT_COVERAGE;
      const pngScore = frame.length / minimumBytes;
      return changed ? Math.max(coverageScore, pngScore) : 0;
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
