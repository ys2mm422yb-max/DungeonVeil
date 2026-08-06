import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperPath = 'artifacts/dungeon-rpg/src/components/visibleUpgradePrestige3D.ts';
const runtimePath = 'artifacts/dungeon-rpg/src/components/VisibleUpgradeRuntimeBindings.tsx';
const cssPath = 'artifacts/dungeon-rpg/src/components/visibleUpgradePrestige.css';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';

const [helper, runtime, css, app] = await Promise.all([
  readFile(helperPath, 'utf8'),
  readFile(runtimePath, 'utf8'),
  readFile(cssPath, 'utf8'),
  readFile(appPath, 'utf8'),
]);

assert.match(helper, /export type VisibleUpgradePrestigeSlot = 'bow' \| 'quiver' \| 'armor' \| 'companion'/);
assert.match(helper, /if \(tier < 3\)[\s\S]*update: \(_activityPulse = 0\) => undefined/,
  'levels one and two must remain effect-free');
assert.match(helper, /new THREE\.OctahedronGeometry/,
  'visible prestige must use bounded model-local geometry');
assert.match(helper, /object\.add\(group\)/,
  'prestige geometry must attach to the actual 3D object');
assert.match(helper, /object\.worldToLocal/,
  'effect placement must derive from real model bounds');
assert.match(helper, /options\.slot === 'armor'[\s\S]*bounds\.width/,
  'armor accents must stay around the chest and shoulders');
assert.match(helper, /ceiling = options\.slot === 'companion'[\s\S]*0\.48/,
  'companion light must remain below the mobile ceiling');
assert.match(helper, /tier === 5 \? 0\.42 : tier === 4 \? 0\.32 : 0\.22/,
  'equipment light must remain bounded');
assert.match(helper, /prefers-reduced-motion: reduce|prefersReducedMotion/,
  'Reduced Motion must retain a static fallback');
assert.match(helper, /rendererRecoveryActive\(\)/,
  'renderer recovery must be reevaluated while the binding is alive');
assert.doesNotMatch(helper, /document\.createElement|appendChild|position:\s*fixed|inset:\s*0|canvas/,
  '3D prestige must never create a DOM, canvas or viewport overlay');

assert.match(runtime, /runtimeBinding === 'in-run-player-bow-mesh'/);
assert.match(runtime, /runtimeBinding === 'in-run-player-quiver-mesh'/);
assert.match(runtime, /startsWith\('KayKitPlayerBody_'\)/);
assert.match(runtime, /dungeonVeilCompanionV5/);
assert.match(runtime, /createVisibleUpgradePrestige3D\(THREE, object, descriptor\)/);
assert.match(runtime, /createVisibleUpgradePrestige3D\(THREE, visual/);
assert.match(runtime, /descriptor\.level < 3/,
  'runtime capture must not bind levels one and two');
assert.match(runtime, /prototype\.add = patchedAdd/);
assert.match(runtime, /prototype\?\.add === context\.patchedAdd/,
  'shared Three.js prototypes must be restored safely');
assert.doesNotMatch(runtime, /fixed inset-0|document\.createElement|appendChild/,
  'runtime capture must stay inside the real scene graph');

assert.match(css, /\[data-testid="equipment-model-preview"\]\[data-upgrade-tier="3"\]/);
assert.match(css, /\[data-testid="equipment-model-preview"\]\[data-upgrade-tier="5"\]/);
assert.match(css, /pointer-events: none/,
  'preview accents must never intercept touch input');
assert.match(css, /prefers-reduced-motion: reduce/);
assert.doesNotMatch(css, /position:\s*fixed|inset:\s*0|100vw|100vh/,
  'preview accents must remain clipped to the model preview');

assert.match(app, /import \{ VisibleUpgradeRuntimeBindings \}/);
assert.match(app, /<VisibleUpgradeRuntimeBindings \/>/);
assert.match(app, /visibleUpgradePrestige\.css/);
assert.doesNotMatch(app, /EquippedUpgradePrestigeOverlay/,
  'the full-screen regression source must remain unmounted');

console.log('Visible bounded upgrade prestige contract passed.');
