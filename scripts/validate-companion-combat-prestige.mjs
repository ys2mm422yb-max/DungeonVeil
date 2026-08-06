import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperPath = 'artifacts/dungeon-rpg/src/components/companionUpgradePrestige3D.ts';
const bindingsPath = 'artifacts/dungeon-rpg/src/components/UpgradeTierSurfaceBindings.tsx';
const [helper, bindings] = await Promise.all([
  readFile(helperPath, 'utf8'),
  readFile(bindingsPath, 'utf8'),
]);

assert.match(helper, /const particleCount = tier === 5 \? 6 : tier === 4 \? 4 : 2;/,
  'tiers 3, 4 and 5 need bounded, visibly increasing particle counts');
assert.match(helper, /for \(let index = 0; index < particleCount; index \+= 1\)/,
  'companion particles must be allocated once when the live rig is bound');
assert.match(helper, /particleGroup\.add\(particle\);[\s\S]*visual\.add\(particleGroup\);/,
  'prestige particles must be children of the actual companion model so movement cannot leave trails behind');
assert.match(helper, /new THREE\.RingGeometry\(/,
  'strong and maximum companion tiers need one restrained model-local prestige aura');
assert.match(helper, /aura\.visible = tier >= 4;/,
  'the stronger aura must remain exclusive to tiers 4 and 5');
assert.match(helper, /particleGroup\.visible = !staticFallback && profile\.particleDensity > 0;/,
  'Reduced Motion and renderer recovery must disable moving particles');
assert.match(helper, /if \(!staticFallback\) aura\.rotation\.z = now/,
  'Reduced Motion and recovery must stop the moving aura while retaining a static refinement');
assert.match(helper, /visual\.userData\.dungeonVeilUpgradeParticleCount = particleCount;/,
  'the real model must expose its bounded particle budget for runtime evidence');
assert.match(helper, /const accentColor = new THREE\.Color\(accentHex\);/,
  'the role accent must be allocated once rather than once per frame');

const updateStart = helper.indexOf('update(now: number, actionPulse: number)');
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
