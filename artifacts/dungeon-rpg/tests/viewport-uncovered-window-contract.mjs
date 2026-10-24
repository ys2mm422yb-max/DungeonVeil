import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export function rectIntersectsViewport(rect, viewport) {
  if (!rect || !viewport) return false;
  const { x, y, width, height } = rect;
  if (![x, y, width, height, viewport.width, viewport.height].every(Number.isFinite)) return false;
  if (width <= 0 || height <= 0 || viewport.width <= 0 || viewport.height <= 0) return false;

  return x < viewport.width
    && y < viewport.height
    && x + width > 0
    && y + height > 0;
}

export function advanceUncoveredViewportWindow({
  boxes,
  viewport,
  hiddenSince,
  now,
  requiredMs,
}) {
  if (!Array.isArray(boxes)) throw new TypeError('boxes must be an array');
  if (!Number.isFinite(now)) throw new TypeError('now must be finite');
  if (!Number.isFinite(requiredMs) || requiredMs <= 0) {
    throw new TypeError('requiredMs must be positive');
  }

  if (boxes.some((box) => rectIntersectsViewport(box, viewport))) {
    return { hiddenSince: 0, settled: false };
  }

  const nextHiddenSince = hiddenSince || now;
  return {
    hiddenSince: nextHiddenSince,
    settled: now - nextHiddenSince >= requiredMs,
  };
}

function selfTest() {
  const viewport = { width: 390, height: 844 };
  const offscreenTitle = { x: 40, y: -80, width: 210, height: 44 };
  const intersectingTitle = { x: 40, y: -43, width: 210, height: 44 };

  assert.equal(rectIntersectsViewport(offscreenTitle, viewport), false);
  assert.equal(rectIntersectsViewport(intersectingTitle, viewport), true);

  const started = advanceUncoveredViewportWindow({
    boxes: [offscreenTitle],
    viewport,
    hiddenSince: 0,
    now: 1_000,
    requiredMs: 3_000,
  });
  assert.deepEqual(started, { hiddenSince: 1_000, settled: false });

  const settled = advanceUncoveredViewportWindow({
    boxes: [offscreenTitle],
    viewport,
    hiddenSince: started.hiddenSince,
    now: 4_000,
    requiredMs: 3_000,
  });
  assert.deepEqual(settled, { hiddenSince: 1_000, settled: true });

  const reset = advanceUncoveredViewportWindow({
    boxes: [intersectingTitle],
    viewport,
    hiddenSince: settled.hiddenSince,
    now: 4_100,
    requiredMs: 3_000,
  });
  assert.deepEqual(reset, { hiddenSince: 0, settled: false });

  const restarted = advanceUncoveredViewportWindow({
    boxes: [offscreenTitle],
    viewport,
    hiddenSince: reset.hiddenSince,
    now: 4_200,
    requiredMs: 3_000,
  });
  assert.deepEqual(restarted, { hiddenSince: 4_200, settled: false });

  console.log('Room-title viewport contract self-test passed.');
}

if (process.argv.includes('--self-test')) selfTest();

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && !process.argv.includes('--self-test')) {
  throw new Error('Pass --self-test when invoking this contract directly.');
}

