import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperPath = 'artifacts/dungeon-rpg/src/components/companionUpgradePrestige3D.ts';
const bindingsPath = 'artifacts/dungeon-rpg/src/components/UpgradeTierSurfaceBindings.tsx';
const [helper, bindings] = await Promise.all([
  readFile(helperPath, 'utf8'),
  readFile(bindingsPath, 'utf8'),
]);

assert.match(helper, /import \{ createVisibleUpgradePrestige3D \} from '\.\/visibleUpgradePrestige3D';/,
  'live companion prestige must reuse the bounded model-local prestige helper');
assert.match(helper, /if \(tier < 3\)/,
  'companion tiers one and two must remain effect-free');
assert.match(helper, /createVisibleUpgradePrestige3D\(THREE, visual,[\s\S]*slot: 'companion'/,
  'prestige geometry must be attached to the real moving companion model');
assert.match(helper, /binding: `visible:companion:\$\{role\}`/,
  'each live companion role must have a factual model binding identity');
assert.match(helper, /const particleCount = Number\(visual\.userData\.dungeonVeilVisibleUpgradeParticleCount \?\? 0\);/,
  'the real model must expose the bounded helper particle budget for runtime evidence');
assert.match(helper, /visibleBinding\.update\(staticFallback \? 0 : actionPulse\);/,
  'the bounded companion effect must react to actual companion activity and stop moving in fallback modes');
assert.match(helper, /compactLiveCompanionPrestige\(visual, tier\);/,
  'every live companion update must reassert compact model-local prestige bounds after the shared helper animates');
assert.match(helper, /const groupScale = tier >= 5 \? 0\.54 : tier === 4 \? 0\.58 : 0\.64;/,
  'live combat companion prestige must stay substantially tighter than the generic preview geometry');
assert.match(helper, /prestigeGroup\.position\.y \*= 0\.94;/,
  'live combat prestige must remain pulled toward the companion body rather than hovering above it');
assert.match(helper, /crest\.scale\.setScalar\(tier >= 5 \? 0\.52 : tier === 4 \? 0\.56 : 0\.6\);/,
  'the octahedral companion crest must be explicitly reduced so it cannot read as detached wings or sails');
assert.match(helper, /dungeonVeilUpgradeCombatScale = groupScale/,
  'runtime evidence must expose the applied combat-local scale');
assert.match(helper, /visibleBinding\.dispose\(\);/,
  'removed companion rigs must dispose all bounded prestige geometry and materials');
assert.match(helper, /publishRuntimeTelemetry\([\s\S]*!staticFallback && particleCount > 0/,
  'runtime evidence must distinguish moving prestige from static Reduced Motion and renderer recovery');
assert.doesNotMatch(helper, /visual\.traverse|RingGeometry|material\.emissive|CompanionUpgradePrestigeAura/,
  'companion prestige must not recolor the complete model or create a broad ring aura');

const updateStart = helper.indexOf('const update = (_now: number, actionPulse: number) =>');
assert.notEqual(updateStart, -1, 'the live companion binding needs an update loop');
const updateBody = helper.slice(updateStart);
assert.doesNotMatch(updateBody, /new THREE\./,
  'the companion prestige update loop must not allocate Three.js objects per frame');
assert.doesNotMatch(updateBody, /document\.createElement|appendChild|canvas/,
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

console.log('Companion combat prestige contract passed.');
