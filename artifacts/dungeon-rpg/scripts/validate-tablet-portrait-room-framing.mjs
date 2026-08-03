import { readFile } from 'node:fs/promises';

const camera = await readFile(new URL('../src/components/RunCameraRig.ts', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(camera.includes('function isTabletPortrait(aspect: number)'), 'tablet portrait camera classifier is missing');
assert(camera.includes('aspect >= 0.68') && camera.includes('aspect <= 0.92'), 'tablet portrait aspect contract is missing');
assert(camera.includes('Math.min(metrics.width, metrics.height) >= 600'), 'tablet portrait physical viewport guard is missing');
assert(camera.includes("if (isTabletPortrait(aspect)) return { height: 17.2, distance: 19.8, lookAhead: 3.1 }"), 'tablet portrait room-filling frame is missing');
assert(camera.indexOf('if (isTabletPortrait(aspect))') < camera.indexOf("if (isSpectatorViewport() && aspect < 0.55)"), 'tablet portrait frame must be selected before narrow spectator fallbacks');
assert(camera.includes('RUN_CAMERA.minFollowX') && camera.includes('RUN_CAMERA.maxFollowX') && camera.includes('RUN_CAMERA.minFollowZ') && camera.includes('RUN_CAMERA.maxFollowZ'), 'camera framing change must retain gameplay follow bounds');

console.log('Tablet portrait room framing contract passed: tablet devices receive a closer room-filling camera while gameplay follow bounds remain unchanged.');
