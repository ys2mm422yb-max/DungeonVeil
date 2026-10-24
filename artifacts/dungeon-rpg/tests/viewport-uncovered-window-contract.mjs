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

export function blocksUncoveredViewportWindow(titlePaintState, viewport) {
  if (!titlePaintState || titlePaintState.effectivelyPainted !== true) return false;
  return rectIntersectsViewport(titlePaintState.box, viewport);
}

export function advanceUncoveredViewportWindow({
  titlePaintStates,
  viewport,
  hiddenSince,
  now,
  requiredMs,
}) {
  if (!Array.isArray(titlePaintStates)) throw new TypeError('titlePaintStates must be an array');
  if (!Number.isFinite(now)) throw new TypeError('now must be finite');
  if (!Number.isFinite(requiredMs) || requiredMs <= 0) {
    throw new TypeError('requiredMs must be positive');
  }

  if (titlePaintStates.some((state) => blocksUncoveredViewportWindow(state, viewport))) {
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
  const offscreenPaintedTitle = { box: offscreenTitle, effectivelyPainted: true };
  const transparentIntersectingTitle = { box: intersectingTitle, effectivelyPainted: false };
  const paintedIntersectingTitle = { box: intersectingTitle, effectivelyPainted: true };

  assert.equal(rectIntersectsViewport(offscreenTitle, viewport), false);
  assert.equal(rectIntersectsViewport(intersectingTitle, viewport), true);
  assert.equal(blocksUncoveredViewportWindow(transparentIntersectingTitle, viewport), false);
  assert.equal(blocksUncoveredViewportWindow(paintedIntersectingTitle, viewport), true);

  const started = advanceUncoveredViewportWindow({
    titlePaintStates: [offscreenPaintedTitle, transparentIntersectingTitle],
    viewport,
    hiddenSince: 0,
    now: 1_000,
    requiredMs: 3_000,
  });
  assert.deepEqual(started, { hiddenSince: 1_000, settled: false });

  const settled = advanceUncoveredViewportWindow({
    titlePaintStates: [offscreenPaintedTitle, transparentIntersectingTitle],
    viewport,
    hiddenSince: started.hiddenSince,
    now: 4_000,
    requiredMs: 3_000,
  });
  assert.deepEqual(settled, { hiddenSince: 1_000, settled: true });

  const reset = advanceUncoveredViewportWindow({
    titlePaintStates: [paintedIntersectingTitle],
    viewport,
    hiddenSince: settled.hiddenSince,
    now: 4_100,
    requiredMs: 3_000,
  });
  assert.deepEqual(reset, { hiddenSince: 0, settled: false });

  const restarted = advanceUncoveredViewportWindow({
    titlePaintStates: [offscreenPaintedTitle, transparentIntersectingTitle],
    viewport,
    hiddenSince: reset.hiddenSince,
    now: 4_200,
    requiredMs: 3_000,
  });
  assert.deepEqual(restarted, { hiddenSince: 4_200, settled: false });

  console.log('Room-title painted-visibility viewport contract self-test passed.');
}

if (process.argv.includes('--self-test')) selfTest();

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && !process.argv.includes('--self-test')) {
  throw new Error('Pass --self-test when invoking this contract directly.');
}

