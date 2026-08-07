import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readinessPath = 'artifacts/dungeon-rpg/tests/visual-render-readiness.mjs';
const source = await readFile(readinessPath, 'utf8');

assert.match(source, /const MIN_LIT_COVERAGE = 0\.05;/,
  'painted-canvas evidence must retain the 5% lit-pixel fallback threshold');
assert.match(source, /const MIN_SAMPLE_PNG_BYTES = 500;/,
  'painted-canvas evidence must retain the sample PNG threshold');
assert.match(source, /const MIN_COMPOSITED_PNG_BYTES = 4_000;/,
  'painted-canvas evidence must retain the compositor PNG threshold');
assert.match(source, /const MIN_COMPOSITED_BYTES_PER_PIXEL = 0\.012;/,
  'painted-canvas evidence must retain the compositor bytes-per-pixel threshold');
assert.match(source, /const REQUIRED_PAINTED_SAMPLES = 2;/,
  'painted-canvas evidence must still require two consecutive painted samples');
assert.match(source, /const RAW_PAGE_SCREENSHOT = Symbol\('rawPageScreenshot'\);/,
  'the readiness guard must own a recursion-safe raw compositor screenshot handle');
assert.match(source, /page\[RAW_PAGE_SCREENSHOT\] = originalScreenshot;/,
  'the page screenshot guard must preserve the original compositor capture before wrapping it');
assert.match(source, /const rawScreenshot = page\[RAW_PAGE_SCREENSHOT\] \|\| page\.screenshot\.bind\(page\);/,
  'composited evidence must use the unwrapped page-level compositor capture');
assert.match(source, /rawScreenshot\(\{[\s\S]*type: 'png',[\s\S]*animations: 'allow',[\s\S]*clip: \{[\s\S]*x: Math\.max\(0, box\.x\),[\s\S]*y: Math\.max\(0, box\.y\),[\s\S]*width: box\.width,[\s\S]*height: box\.height,/,
  'composited evidence must sample user-visible pixels clipped to the real canvas bounds');
assert.match(source, /const composited = await compositedCanvasEvidence\(page, canvas\);/,
  'paint readiness must consult compositor-visible evidence before the raw canvas fallback');
assert.doesNotMatch(source, /canvas\.screenshot\(/,
  'WebGL readiness must not depend on locator-only canvas screenshots that can miss compositor output');

console.log('Visual render readiness compositor contract passed.');
