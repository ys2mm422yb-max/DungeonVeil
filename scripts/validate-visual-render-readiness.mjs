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
assert.match(source, /const ROOM_PREPARING_TEXT = \/RAUM WIRD AUFGEBAUT\|ROOM\(\?: IS\)\? \(\?:BEING \)\?BUILT\/i;/,
  'run evidence readiness must recognize room-preparing text independent of ellipsis rendering');
assert.match(source, /const RUN_OPENING_TEXT = \/DER SCHLEIER ÖFFNET SICH\|THE VEIL OPENS\/i;/,
  'run evidence readiness must reject the visible run-opening transition as non-playable evidence');
assert.match(source, /async function visibleMatchCount\(locator\) \{[\s\S]*const count = await locator\.count\(\);[\s\S]*locator\.nth\(index\)\.isVisible\(\)/,
  'run transition readiness must inspect every matching node, not just one locator match');
assert.match(source, /async function visibleRunTransitionCounts\(page\) \{[\s\S]*visibleMatchCount\(page\.getByText\(ROOM_PREPARING_TEXT\)\)[\s\S]*visibleMatchCount\(page\.getByText\(RUN_OPENING_TEXT\)\)/,
  'room-preparing and run-opening guards must both use the all-match visible-count invariant');
assert.doesNotMatch(source, /getByText\(ROOM_PREPARING_TEXT\)\.first\(\)/,
  'room-preparing evidence guards must never collapse to the first matching node');
assert.doesNotMatch(source, /getByText\(RUN_OPENING_TEXT\)\.first\(\)/,
  'run-opening evidence guards must never collapse to the first matching node');
assert.match(source, /async function waitForNoVisibleRunTransitions\(page, timeout\) \{[\s\S]*counts\.roomPreparingVisible \+ counts\.runOpeningVisible[\s\S]*\.toBe\(0\);/,
  'pre-capture readiness must require zero visible loading/opening matches');
assert.match(source, /const \{ roomPreparingVisible, runOpeningVisible \} = await visibleRunTransitionCounts\(page\);[\s\S]*roomPreparingVisible > 0 \|\| runOpeningVisible > 0[\s\S]*paintedSamples = 0;/,
  'each consecutive painted sample must reset when any loading/opening match is visible');
assert.match(source, /await waitForNoVisibleRunTransitions\(page, timeout\);[\s\S]*const screenshot = await originalScreenshot\(options\);[\s\S]*const postCaptureCounts = await visibleRunTransitionCounts\(page\);[\s\S]*roomPreparingVisible: 0,[\s\S]*runOpeningVisible: 0,/,
  'protected run evidence must check zero visible transitions immediately before and immediately after capture');
assert.match(source, /const RAW_PAGE_SCREENSHOT = Symbol\('rawPageScreenshot'\);/,
  'the readiness guard must own a recursion-safe raw compositor screenshot handle');
assert.match(source, /page\[RAW_PAGE_SCREENSHOT\] = originalScreenshot;/,
  'the page screenshot guard must preserve the original compositor capture before wrapping it');
assert.match(source, /const rawScreenshot = page\[RAW_PAGE_SCREENSHOT\] \|\| page\.screenshot\.bind\(page\);/,
  'composited evidence must use the unwrapped page-level compositor capture');
assert.match(source, /rawScreenshot\(\{[\s\S]*type: 'png',[\s\S]*animations: 'allow',[\s\S]*clip: \{[\s\S]*x: Math\.max\(0, box\.x\),[\s\S]*y: Math\.max\(0, box\.y\),[\s\S]*width: box\.width,[\s\S]*height: box\.height,/,
  'composited evidence must sample user-visible pixels clipped to the real canvas bounds');
assert.match(source, /function shouldGuardRunScreenshot\(options\)/,
  'the screenshot guard must have an explicit evidence-scope predicate');
assert.match(source, /autopilot-solo-run-/,
  'the screenshot guard must be limited to Product Autopilot solo-run evidence');
assert.match(source, /if \(shouldGuardRunScreenshot\(options\)\) \{/,
  'the run-canvas readiness guard must execute only for protected run screenshots');
assert.doesNotMatch(source, /page\.screenshot = async options => \{\s*const runRenderer/,
  'generic page screenshots must not be globally blocked by run-canvas readiness');
assert.match(source, /const composited = await compositedCanvasEvidence\(page, canvas\);/,
  'paint readiness must consult compositor-visible evidence before the raw canvas fallback');
assert.doesNotMatch(source, /canvas\.screenshot\(/,
  'WebGL readiness must not depend on locator-only canvas screenshots that can miss compositor output');

console.log('Visual render readiness compositor contract passed.');
