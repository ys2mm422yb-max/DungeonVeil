import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperPath = 'artifacts/dungeon-rpg/src/components/companionUpgradePrestige3D.ts';
const bindingsPath = 'artifacts/dungeon-rpg/src/components/UpgradeTierSurfaceBindings.tsx';
const liveBoundsPath = 'artifacts/dungeon-rpg/src/game/companionLiveBoundsRuntime.ts';
const mainPath = 'artifacts/dungeon-rpg/src/main.tsx';
const [helper, bindings, liveBounds, main] = await Promise.all([
  readFile(helperPath, 'utf8'),
  readFile(bindingsPath, 'utf8'),
  readFile(liveBoundsPath, 'utf8'),
  readFile(mainPath, 'utf8'),
]);

assert.doesNotMatch(helper, /createVisibleUpgradePrestige3D/,
  'live companion combat must not reuse the generic crest/orbit prestige geometry rejected on the real iPhone');
assert.doesNotMatch(helper, /OctahedronGeometry|DungeonVeilVisibleUpgradeCrest|RingGeometry|CompanionUpgradePrestigeAura/,
  'live companion prestige must not contain octahedral crest, broad ring, wing or sail-like geometry');
assert.match(helper, /if \(tier < 3\)/,
  'companion tiers one and two must remain effect-free');
assert.match(helper, /function createLiveCompanionPrestige\([\s\S]*new THREE\.SphereGeometry\(particleRadius, 8, 6\)/,
  'live companion prestige must use dedicated compact round spark geometry');
assert.match(helper, /const particleCount = tier >= 5 \? 7 : tier === 4 \? 5 : 3;/,
  'L3, L4 and L5 must have visibly distinct bounded spark counts');
assert.match(helper, /tier >= 5 \? 0\.028 : tier === 4 \? 0\.025 : 0\.022/,
  'spark size must increase by tier without growing into broad shapes');
assert.match(helper, /const horizontalRadius = bounds\.width \* \(tier >= 5 \? 0\.18 : tier === 4 \? 0\.155 : 0\.13\);/,
  'all companion sparks must remain inside a tight body-local horizontal radius');
assert.match(helper, /dungeonVeilUpgradeCombatStyle = 'compact-body-sparks'/,
  'runtime evidence must expose the dedicated compact companion combat style');
assert.match(helper, /dungeonVeilUpgradeCombatMaxRadius = Number\(\(bounds\.width \* 0\.18\)\.toFixed\(3\)\)/,
  'runtime evidence must expose the strict maximum companion effect radius');
assert.match(helper, /color: 0xf4d58d/,
  'tier five must gain a controlled premium warm accent without recoloring the model');
assert.match(helper, /livePrestige\.update\(staticFallback \? 0 : actionPulse, staticFallback\);/,
  'the compact companion effect must react to actual activity and stop moving in Reduced Motion/recovery');
assert.match(helper, /livePrestige\.dispose\(\);/,
  'removed companion rigs must dispose all dedicated prestige geometry and materials');
assert.match(helper, /publishRuntimeTelemetry\([\s\S]*!staticFallback && particleCount > 0/,
  'runtime evidence must distinguish moving prestige from static Reduced Motion and renderer recovery');
assert.doesNotMatch(helper, /visual\.traverse|material\.emissive/,
  'companion prestige must not recolor the complete companion model');

const liveUpdateStart = helper.indexOf('const update = (actionPulse: number, staticFallback: boolean) =>');
assert.notEqual(liveUpdateStart, -1, 'the dedicated live companion prestige needs an update loop');
const bindingStart = helper.indexOf('export function createCompanionUpgradePrestigeBinding');
assert.notEqual(bindingStart, -1, 'the live companion binding export must remain present');
const liveUpdateBody = helper.slice(liveUpdateStart, bindingStart);
assert.doesNotMatch(liveUpdateBody, /new THREE\./,
  'the companion prestige update loop must not allocate Three.js objects per frame');
assert.doesNotMatch(liveUpdateBody, /document\.createElement|appendChild|canvas/,
  'the combat effect must not create a DOM or second-canvas surrogate');

assert.match(bindings, /root\?\.userData\?\.dungeonVeilCompanionV5/,
  'only actual CompanionV5 combat roots may be bound');
assert.match(bindings, /root\.userData\.companionLevel/,
  'each live companion must use its own role level');
assert.match(bindings, /startsWith\('CompanionVisual_'\)/,
  'the binding must target the real moving companion model group');
assert.match(bindings, /if \(!root\.parent\) \{[\s\S]*combatBindings\.delete\(root\);/,
  'removed rigs must be released from the live binding registry');
assert.match(bindings, /THREE = await import\(\/\* @vite-ignore \*\/ THREE_URL\);[\s\S]*originalAdd = THREE\.Object3D\.prototype\.add;[\s\S]*armSceneCapture\(\);[\s\S]*if \(document\.documentElement\.dataset\.dungeonVeilActiveRun === '1'\) armSceneCapture\(\);/,
  'the narrow CompanionV5 capture must be armed immediately after the shared Three module resolves, before active-run state can race past installation');

assert.match(main, /installCompanionLiveBoundsRuntime/,
  'the live companion bounds guard must be installed by the real application entry point');
assert.match(liveBounds, /companionReadabilityAppliedV5: true/,
  'the real CompanionV5 root must bypass legacy whole-root readability scaling and recoloring');
assert.match(liveBounds, /dungeonVeilCompanionAuthoredBoundsV5: true/,
  'runtime telemetry must expose that authored companion bounds are authoritative');
assert.match(liveBounds, /node\?\.name !== 'DuskDrakeWing'[\s\S]*node\.scale\.setScalar\(0\.66\)[\s\S]*node\.position\.x \*= 0\.72/,
  'the Dusk Drake wings must remain compact enough to preserve the companion silhouette');
assert.match(liveBounds, /getObjectByName\?\.\('CompanionV5AttackTrail'\)[\s\S]*attackTrail\.parent\.remove\(attackTrail\)[\s\S]*disposeDetachedVisual\(attackTrail\)/,
  'the oversized generic companion attack plane must be removed and disposed from the real live rig');
assert.doesNotMatch(liveBounds, /multiplyScalar\(1\.34\)|multiplyScalar\(1\.2\)|CompanionReadabilityLightV5|CompanionReadabilityCoreV5/,
  'the bounds guard must never recreate the rejected global scale, accent light or accent core');

console.log('Companion combat prestige contract passed.');
