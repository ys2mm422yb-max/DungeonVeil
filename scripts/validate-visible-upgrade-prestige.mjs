import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperPath = 'artifacts/dungeon-rpg/src/components/visibleUpgradePrestige3D.ts';
const bowRigPath = 'artifacts/dungeon-rpg/src/components/bowRig.ts';
const playerPath = 'artifacts/dungeon-rpg/src/components/kaykitPlayer3D.ts';
const villagePlayerPath = 'artifacts/dungeon-rpg/src/components/kaykitVillagePlayer3D.ts';
const companionPath = 'artifacts/dungeon-rpg/src/components/companionUpgradePrestige3D.ts';
const cssPath = 'artifacts/dungeon-rpg/src/components/visibleUpgradePrestige.css';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';

const [helper, bowRig, player, villagePlayer, companion, css, app] = await Promise.all([
  readFile(helperPath, 'utf8'),
  readFile(bowRigPath, 'utf8'),
  readFile(playerPath, 'utf8'),
  readFile(villagePlayerPath, 'utf8'),
  readFile(companionPath, 'utf8'),
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
assert.match(helper, /prefersReducedMotion/,
  'Reduced Motion must retain a static fallback');
assert.match(helper, /rendererRecoveryActive\(\)/,
  'renderer recovery must be reevaluated while the binding is alive');
assert.match(helper, /const ACTIVE_VISIBLE_BINDINGS = new Map/,
  'direct renderer bindings must own a shared factual registry');
assert.match(helper, /dungeonVeilVisibleUpgradeBindingCount = String\(active\.length\)/,
  'the registry must expose the real active 3D binding count');
assert.match(helper, /registerVisibleBinding\(registryKey, options\.slot, tier\)/,
  'each real level 3-5 model binding must register itself');
assert.match(helper, /unregisterVisibleBinding\(registryKey\)/,
  'disposed models must leave the visible prestige registry');
assert.doesNotMatch(helper, /document\.createElement|appendChild|position:\s*fixed|inset:\s*0|canvas/,
  '3D prestige must never create a DOM, canvas or viewport overlay');

assert.match(bowRig, /import \{ createVisibleUpgradePrestige3D/);
assert.match(bowRig, /createVisibleUpgradePrestige3D\(THREE, bow,[\s\S]*slot: 'bow'/,
  'the real bow rig must own the visible bow binding');
assert.match(bowRig, /createVisibleUpgradePrestige3D\(THREE, heroRoot,[\s\S]*slot: 'armor'/,
  'the real player rig must own the chest-local armor binding');
assert.match(bowRig, /createVisibleUpgradePrestige3D\(THREE, equippedQuiver,[\s\S]*slot: 'quiver'/,
  'the real attached quiver must own the visible quiver binding');
assert.match(bowRig, /visibleBinding\.update\(attackPulse\)/,
  'bow prestige must react to the actual attack pulse');
assert.match(bowRig, /armorVisibleBinding\.update\(activityPulse\)/);
assert.match(bowRig, /quiverVisibleBinding\?\.update\(activityPulse\)/);
assert.match(bowRig, /visibleBinding\.dispose\(\)/,
  'the live bow must release its bounded prestige geometry');
assert.match(bowRig, /armorVisibleBinding\.dispose\(\)/,
  'the live armor must release its bounded prestige geometry');
assert.match(bowRig, /quiverVisibleBinding\?\.dispose\(\)/,
  'the attached quiver must release its bounded prestige geometry');
assert.match(bowRig, /lifecycleRoot\.addEventListener\?\.\('removed', dispose\)/,
  'player prestige must follow the real player-root removal lifecycle');
assert.match(bowRig, /dispose: \(\) => void/,
  'the ranger bow rig must expose explicit idempotent cleanup');
assert.doesNotMatch(bowRig, /publishVisibleUpgradeTier/,
  'only the shared factual registry may publish active visible slots');
assert.doesNotMatch(bowRig, /Object3D\.prototype\.add|patchedAdd|visiblePrestigeCapture/,
  'visible player prestige must not depend on global Three.js prototype interception');

assert.match(player, /stop\(\) \{[\s\S]*bowRig\.dispose\(\);[\s\S]*mixer\.stopAllAction\(\);/,
  'aborted or unmounted player rigs must explicitly release all visible prestige bindings');

assert.match(villagePlayer, /createVisibleUpgradePrestige3D\(THREE, visual,[\s\S]*slot: 'armor'[\s\S]*visible:menu-player-armor/,
  'the real menu player body must own the menu armor prestige binding');
assert.match(villagePlayer, /createVisibleUpgradePrestige3D\(THREE, bowHolder,[\s\S]*slot: 'bow'[\s\S]*visible:menu-player-bow/,
  'the real menu bow holder must own the menu bow prestige binding');
assert.match(villagePlayer, /createVisibleUpgradePrestige3D\(THREE, quiverHolder,[\s\S]*slot: 'quiver'[\s\S]*visible:menu-player-quiver/,
  'the real menu quiver holder must own the menu quiver prestige binding');
assert.match(villagePlayer, /MainMenuCompanion_[\s\S]*MenuCompanionVisual_[\s\S]*createVisibleUpgradePrestige3D\(THREE, companionVisual,[\s\S]*slot: 'companion'/,
  'the actual menu companion visual must receive a bounded companion prestige binding');
assert.match(villagePlayer, /syncMenuCompanionPrestige\(\);[\s\S]*visibleBindings\.forEach\(binding => binding\.update\(0\)\)[\s\S]*menuCompanionBinding\?\.update\(0\)/,
  'menu bindings must stay alive through the real renderer update loop');
assert.match(villagePlayer, /visibleBindings\.forEach\(binding => binding\.dispose\(\)\)[\s\S]*menuCompanionBinding\?\.dispose\(\)/,
  'menu prestige geometry must be released on renderer teardown');
assert.doesNotMatch(villagePlayer, /document\.createElement|appendChild|position:\s*fixed/,
  'menu prestige must not use a DOM surrogate');

assert.match(companion, /import \{ createVisibleUpgradePrestige3D \}/,
  'companion prestige must use the same bounded model-local helper');
assert.match(companion, /createVisibleUpgradePrestige3D\(THREE, visual,[\s\S]*slot: 'companion'/,
  'the real companion visual must own its bounded prestige binding');
assert.match(companion, /visibleBinding\.update\(staticFallback \? 0 : actionPulse\)/,
  'companion prestige must react to the actual companion action pulse');
assert.match(companion, /visibleBinding\.dispose\(\)/,
  'companion prestige geometry must be disposed with the companion visual');
assert.match(companion, /if \(tier < 3\)/,
  'companion levels one and two must remain effect-free');
assert.doesNotMatch(companion, /visual\.traverse|RingGeometry|material\.emissive|CompanionUpgradePrestigeAura/,
  'companion prestige must not recolor the complete model or create a broad ring aura');
assert.doesNotMatch(companion, /document\.createElement|appendChild|position:\s*fixed/,
  'companion prestige must not create a screen-space surrogate');

assert.match(css, /\[data-testid="equipment-model-preview"\]\[data-upgrade-tier="3"\]/);
assert.match(css, /\[data-testid="equipment-model-preview"\]\[data-upgrade-tier="5"\]/);
assert.match(css, /\[data-testid="equipment-model-preview"\]\[data-upgrade-tier="5"\]::after\s*\{[\s\S]*?opacity:\s*1(?:\s*!important)?\s*;[\s\S]*?animation:\s*none(?:\s*!important)?\s*;[\s\S]*?\}/,
  'tier-5 preview crest must remain fully visible and non-animated');
assert.doesNotMatch(css, /\[data-testid="equipment-model-preview"\]\[data-upgrade-tier="5"\]::after\s*,[\s\S]*?animation:\s*dungeon-veil-visible-prestige-crest/,
  'tier-5 preview crest must not participate in the animated shared crest selector');
assert.match(css, /pointer-events: none/,
  'preview accents must never intercept touch input');
assert.match(css, /prefers-reduced-motion: reduce/);
assert.doesNotMatch(css, /position:\s*fixed|inset:\s*0|100vw|100vh/,
  'preview accents must remain clipped to the model preview');

assert.match(app, /visibleUpgradePrestige\.css/);
assert.doesNotMatch(app, /VisibleUpgradeRuntimeBindings|EquippedUpgradePrestigeOverlay/,
  'the app shell must mount neither a global Three.js capture nor the historical full-screen overlay');

console.log('Visible bounded upgrade prestige contract passed.');
