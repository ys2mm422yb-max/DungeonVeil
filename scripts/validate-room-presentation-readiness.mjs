import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rendererPath = 'artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx';
const journeyPath = 'artifacts/dungeon-rpg/tests/companion-runtime.spec.mjs';

const [renderer, journey] = await Promise.all([
  readFile(rendererPath, 'utf8'),
  readFile(journeyPath, 'utf8'),
]);

assert.match(renderer, /let roomPaintPresentationFrames = 0;/,
  'renderer must keep an explicit bounded presentation-frame counter for the exact current WorldRoot');
assert.match(renderer, /roomPaintPresentationFrames = 0;[\s\S]*roomPaintRoot = root;[\s\S]*roomPaintKey = key;/,
  'each newly attached room root must arm presentation readiness from zero');
assert.match(renderer, /renderer\.render\(scene, camera\);[\s\S]*roomPaintRoot === roomRoot[\s\S]*host\.dataset\.roomPaintExpectedKey === roomPaintKey[\s\S]*roomPaintPresentationFrames \+= 1;/,
  'only real render passes for the exact armed current WorldRoot may advance presentation readiness');
assert.match(renderer, /roomPaintPresentationFrames >= 2[\s\S]*host\.dataset\.roomPaintReadyKey = roomPaintKey/,
  'paint-ready must require at least two consecutive requestAnimationFrame render passes for the exact current root');
assert.match(renderer, /roomPaintPresentationFrames = 0;[\s\S]*roomPaintRoot = null;[\s\S]*roomPaintKey = '';/,
  'cleanup and room replacement must clear presentation-frame state');
assert.doesNotMatch(renderer, /setTimeout\([^\n]*(roomPaint|PaintReady|presentation)/,
  'renderer presentation readiness must not be implemented with a blind sleep');
assert.match(renderer, /raf = requestAnimationFrame\(renderLoop\);/,
  'presentation proof must remain tied to the renderer requestAnimationFrame loop');

assert.match(journey, /paintReadyKey !== expectedPaintKey/,
  'companion evidence must continue to require the renderer-owned exact-room paint-ready key');

console.log('Room presentation readiness contract validated.');
