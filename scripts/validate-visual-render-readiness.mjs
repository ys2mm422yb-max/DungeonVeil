import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readinessPath = 'artifacts/dungeon-rpg/tests/visual-render-readiness.mjs';
const source = await readFile(readinessPath, 'utf8');

assert.match(source, /const MIN_LIT_COVERAGE = 0\.05;/);
assert.match(source, /const MIN_SAMPLE_PNG_BYTES = 500;/);
assert.match(source, /const MIN_COMPOSITED_PNG_BYTES = 4_000;/);
assert.match(source, /const MIN_COMPOSITED_BYTES_PER_PIXEL = 0\.012;/);
assert.match(source, /const REQUIRED_PAINTED_SAMPLES = 2;/);
assert.match(source, /const REQUIRED_TRANSITION_FREE_FRAMES = 2;/);
assert.match(source, /const RESTORED_ARMOR_STABLE_MS = 3_000;/);
assert.match(source, /const ROOM_PREPARING_TEXT = \/RAUM WIRD AUFGEBAUT\|ROOM\(\?: IS\)\? \(\?:BEING \)\?BUILT\/i;/);
assert.match(source, /const RUN_OPENING_TEXT = \/DER SCHLEIER ÖFFNET SICH\|THE VEIL OPENS\/i;/);
assert.match(source, /const ROOM_TITLE_TEXT = \/VERSORGUNGSPOSTEN\|SUPPLY POST\/i;/);
assert.match(source, /async function visibleMatchCount\(locator\) \{[\s\S]*const count = await locator\.count\(\);[\s\S]*locator\.nth\(index\)\.isVisible\(\)/);
assert.doesNotMatch(source, /getByText\(ROOM_PREPARING_TEXT\)\.first\(\)|getByText\(RUN_OPENING_TEXT\)\.first\(\)/);
assert.match(source, /async function waitForStableRunTransitionFreeCompositor\(page, timeout\) \{[\s\S]*frame < REQUIRED_TRANSITION_FREE_FRAMES[\s\S]*requestAnimationFrame[\s\S]*dungeonVeilRoomBuildState[\s\S]*visibleRunTransitionCounts\(page\)[\s\S]*return false;/);
assert.match(source, /async function waitForStableRestoredArmorEvidence\(page, timeout\) \{[\s\S]*let stableSince = 0;[\s\S]*let lastSnapshot = null;[\s\S]*let lastReset = null;/,
  'restored armour stability must retain exact predicate diagnostics');
assert.match(source, /const snapshot = \{ buildState, roomPreparingVisible, runOpeningVisible, roomTitleVisible \};[\s\S]*lastReset = \{ \.\.\.snapshot, elapsedStableMs: stableSince === 0 \? 0 : now - stableSince \};[\s\S]*stableSince = 0;/,
  'every stability reset must retain all predicate values and elapsed stable duration');
assert.match(source, /const diagnostic = \{ lastSnapshot, lastReset, elapsedStableMs, requiredStableMs: RESTORED_ARMOR_STABLE_MS \};[\s\S]*Restored armour evidence stability diagnostics:/,
  'timeout must report the final snapshot, reset reason values and elapsed\/required stability');
assert.match(source, /const now = Date\.now\(\);[\s\S]*now - stableSince >= RESTORED_ARMOR_STABLE_MS/,
  'three-second continuous stability threshold must remain unchanged');
assert.match(source, /function shouldRequireRestoredArmorStability\(options\)[\s\S]*autopilot-solo-run-warden-armor-cloud-restored-/);
assert.match(source, /if \(shouldRequireRestoredArmorStability\(options\)\) await waitForStableRestoredArmorEvidence\(page, timeout\);/);
assert.match(source, /await waitForStableRunTransitionFreeCompositor\(page, timeout\);[\s\S]*return originalScreenshot\(options\);/);
assert.doesNotMatch(source, /postCaptureCounts|protected run screenshot captured while a loading\/opening overlay was visible/);
assert.match(source, /const RAW_PAGE_SCREENSHOT = Symbol\('rawPageScreenshot'\);/);
assert.match(source, /page\[RAW_PAGE_SCREENSHOT\] = originalScreenshot;/);
assert.match(source, /const rawScreenshot = page\[RAW_PAGE_SCREENSHOT\] \|\| page\.screenshot\.bind\(page\);/);
assert.match(source, /const composited = await compositedCanvasEvidence\(page, canvas\);/);
assert.doesNotMatch(source, /canvas\.screenshot\(/);

console.log('Visual render readiness compositor contract passed.');