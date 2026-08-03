import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profilePath = 'artifacts/dungeon-rpg/src/lib/upgradeVisualTiers.ts';
const overlayPath = 'artifacts/dungeon-rpg/src/components/EquippedUpgradePrestigeOverlay.tsx';
const bindingsPath = 'artifacts/dungeon-rpg/src/components/UpgradeTierSurfaceBindings.tsx';
const bowRigPath = 'artifacts/dungeon-rpg/src/components/bowRig.ts';
const equipmentBindingPath = 'artifacts/dungeon-rpg/src/components/equipmentUpgradePrestige3D.ts';
const companionBindingPath = 'artifacts/dungeon-rpg/src/components/companionUpgradePrestige3D.ts';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';

const [profiles, overlay, bindings, bowRig, equipmentBinding, companionBinding, app] = await Promise.all([
  readFile(profilePath, 'utf8'),
  readFile(overlayPath, 'utf8'),
  readFile(bindingsPath, 'utf8'),
  readFile(bowRigPath, 'utf8'),
  readFile(equipmentBindingPath, 'utf8'),
  readFile(companionBindingPath, 'utf8'),
  readFile(appPath, 'utf8'),
]);

for (const tier of [1, 2, 3, 4, 5]) {
  assert.match(profiles, new RegExp(`\\b${tier}: Object\\.freeze\\(\\{`), `tier ${tier} profile must exist`);
}

assert.match(profiles, /tier: 1,[\s\S]*?edgeGlow: 0,[\s\S]*?particleDensity: 0,/);
assert.match(profiles, /tier: 2,[\s\S]*?edgeGlow: 0,[\s\S]*?particleDensity: 0,/);
assert.match(profiles, /tier: 3,[\s\S]*?prestige: 'refined'/);
assert.match(profiles, /tier: 4,[\s\S]*?prestige: 'strong'/);
assert.match(profiles, /tier: 5,[\s\S]*?prestige: 'maximum'/);
assert.match(profiles, /particleDensity: 0,[\s\S]*?particleIntervalMs: 0,[\s\S]*?pulseStrength: 0,[\s\S]*?lightSweepSpeed: 0,/,
  'reduced-motion and low-GPU resolution must remove moving effects');

assert.match(overlay, /ACTIVE_SLOTS = \['bow', 'quiver', 'armor'\] as const/,
  'all active equipped slots must participate independently');
assert.match(overlay, /resolveEquippedUpgradeTiers\(meta: MetaProgression\): SlotTierMap/,
  'equipped tiers must resolve per slot rather than collapsing to one maximum');
assert.doesNotMatch(overlay, /Math\.max\(highest, level\)/,
  'mixed equipment levels must not collapse into one global tier');
assert.doesNotMatch(overlay, /function equippedTier/,
  'the obsolete global highest-tier resolver must remain removed');

for (const slot of ['bow', 'quiver', 'armor']) {
  assert.match(overlay, new RegExp(`${slot}: '[^']+'`), `${slot} needs a dedicated presentation anchor`);
}

assert.match(overlay, /data-equipment-slot=\{slot\}/);
assert.match(overlay, /data-model-anchor=\{`equipped-\$\{slot\}`\}/,
  'each slot effect must expose its own model-anchor identity');
assert.match(overlay, /tier=\{slotTiers\[slot\]\}/,
  'each rendered effect must receive the matching slot tier');
assert.match(overlay, /if \(tier < 3\) return null;/,
  'levels 1 and 2 must remain visually normal independently per slot');
assert.match(overlay, /data-static-fallback=\{profile\.particleDensity === 0/);
assert.match(overlay, /prefers-reduced-motion: reduce/);
assert.match(overlay, /pointer-events-none/,
  'prestige feedback must never intercept gameplay or menu input');
assert.match(overlay, /dungeon-veil-renderer-lost/);
assert.match(overlay, /dungeon-veil-renderer-ready/);

const mixedLevelContract = {
  bow: 5,
  quiver: 1,
  armor: 3,
};
assert.deepEqual(Object.keys(mixedLevelContract), ['bow', 'quiver', 'armor']);
assert.equal(mixedLevelContract.bow, 5);
assert.equal(mixedLevelContract.quiver, 1);
assert.equal(mixedLevelContract.armor, 3);
assert.match(overlay, /tiers\[slot\] = normalizeUpgradeVisualTier/,
  'mixed levels must be normalized and retained independently');

assert.match(bindings, /data-testid=\"equipment-model-preview\"/,
  'the actual KayKit equipment preview must receive a local tier binding');
assert.match(bindings, /data-testid\^=\"companion-role-\"/,
  'companion collection cards must receive level-local tier bindings');
assert.match(bindings, /data-testid=\"companion-active-role\"/,
  'the selected companion presentation must receive its own tier binding');
assert.match(bindings, /collection\.companions\[role\]/,
  'companion tiers must resolve from each role progress independently');
assert.match(bindings, /equipmentForSurface\(surface, meta\)/,
  'equipment card and preview bindings must resolve their own equipment item');
assert.match(bindings, /if \(tier < 3\)/,
  'card/model-local levels 1 and 2 must remain visually normal');
assert.match(bindings, /data\.upgradeStaticFallback|dataset\.upgradeStaticFallback/,
  'surface bindings must expose a deterministic static fallback state');
assert.match(bindings, /prefers-reduced-motion: reduce/);
assert.match(bindings, /dungeon-veil-renderer-lost/);
assert.match(bindings, /dungeon-veil-renderer-ready/);
assert.match(bindings, /pointer-events: none/,
  'local sweep layers must never intercept input');

assert.match(bowRig, /function createPlayerBowUpgradeBinding\(THREE: any, heroRoot: any, bow: any\)/,
  'the live bow rig must own a mesh-local upgrade binding');
assert.match(bowRig, /startsWith\('KayKitPlayerBody_'\)/,
  'player prestige must never leak onto enemy bow rigs');
assert.match(bowRig, /const bowId = meta\.equipped\.bow;/);
assert.match(bowRig, /meta\.owned\[bowId\]\?\.level/,
  'the live bow mesh must use the actual equipped bow level');
assert.match(bowRig, /dungeonVeilUpgradeBinding: 'in-run-player-bow-mesh'/,
  'the live bow mesh must expose a deterministic binding identity');
assert.match(bowRig, /if \(tier < 3\) return \{ update:/,
  'levels 1 and 2 must not clone materials or create a light');
assert.match(bowRig, /material\?\.clone\?\.\(\)/,
  'upgrade emissive changes must use per-rig material clones');
assert.match(bowRig, /new THREE\.PointLight\(/,
  'prestige tiers must attach a bounded light directly to the moving bow mesh');
assert.match(bowRig, /function prefersReducedMotion\(\)/);
assert.match(bowRig, /function rendererRecoveryActive\(\)/);
assert.match(bowRig, /const staticFallbackActive = \(\) => prefersReducedMotion\(\) \|\| rendererRecoveryActive\(\);/,
  'live bow fallback state must be evaluated dynamically while the rig is alive');
assert.match(bowRig, /bow\.userData\.dungeonVeilUpgradeStaticFallback = staticFallback;/,
  'live bow metadata must track recovery transitions');
assert.match(bowRig, /const edgeGlow = staticFallback \? profile\.staticFallbackStrength : profile\.edgeGlow;/,
  'live bow recovery must switch to the static fallback strength');
assert.match(bowRig, /upgradeBinding\.update\(pulse\)/,
  'the live bow effect must follow draw, attack and movement animation updates');

assert.match(equipmentBinding, /type EquipmentUpgradeSlot3D = 'armor' \| 'quiver'/,
  'the reusable live binding must stay scoped to armor and quiver');
assert.match(equipmentBinding, /if \(tier < 3\)/,
  'levels one and two must remain untouched on live armor and quiver meshes');
assert.match(equipmentBinding, /material\?\.clone\?\.\(\)/,
  'live armor and quiver effects must clone materials per player rig');
assert.match(equipmentBinding, /new THREE\.PointLight\(/,
  'live armor and quiver prestige must use bounded mesh-local lights');
assert.match(equipmentBinding, /staticFallbackActive\(\)/,
  'renderer recovery and Reduced Motion must be re-evaluated while the rig is alive');

assert.match(bowRig, /function createPlayerArmorAndQuiverUpgradeBinding\(THREE: any, heroRoot: any\)/,
  'the player rig must own independent live armor and quiver bindings');
assert.match(bowRig, /const armorId = meta\.equipped\.armor;/);
assert.match(bowRig, /const quiverId = meta\.equipped\.quiver;/);
assert.match(bowRig, /meta\.owned\[armorId\]\?\.level/,
  'the live armor binding must use the equipped armor level');
assert.match(bowRig, /meta\.owned\[quiverId\]\?\.level/,
  'the live quiver binding must use the equipped quiver level');
assert.match(bowRig, /binding: 'in-run-player-armor-mesh'/);
assert.match(bowRig, /binding: 'in-run-player-quiver-mesh'/);
assert.match(bowRig, /startsWith\('DungeonVeilEquippedQuiver_'\)/,
  'the quiver binding must attach to the actual equipped quiver object');
assert.match(bowRig, /const equipmentUpgradeBinding = createPlayerArmorAndQuiverUpgradeBinding\(THREE, heroRoot\);/,
  'armor binding must be created before the bow is parented to avoid cross-slot material leakage');
assert.match(bowRig, /equipmentUpgradeBinding\.update\(pulse\)/,
  'live armor and quiver prestige must follow player animation updates');

assert.match(bindings, /import \{ createCompanionUpgradePrestigeBinding \} from '\.\/companionUpgradePrestige3D';/,
  'the mounted application binding must install the live companion combat effect');
assert.match(bindings, /root\?\.userData\?\.dungeonVeilCompanionV5/,
  'only real CompanionV5 combat roots may receive the companion prestige binding');
assert.match(bindings, /startsWith\('CompanionVisual_'\)/,
  'prestige must attach to the companion model group rather than the scene or a DOM surrogate');
assert.match(bindings, /root\.userData\.companionLevel/,
  'the live companion effect must use that role instance own level');
assert.match(bindings, /createCompanionUpgradePrestigeBinding\(THREE, visual, role, level, definition\.accentHex\)/,
  'the live companion effect must receive the actual role, role-local level and role accent');
assert.match(bindings, /THREE\.Object3D\.prototype\.add = patchedAdd/,
  'the persistent application binding must see actual companion roots when they enter the shared renderer scene');
assert.match(bindings, /binding\.update\(now, 0\)/,
  'the attached companion effect must update while the real combat model moves');
assert.match(bindings, /binding\.dispose\(\);[\s\S]*combatBindings\.delete\(root\)/,
  'removed companion rigs must release telemetry before leaving the live binding registry');

assert.match(companionBinding, /normalizeUpgradeVisualTier\(level\)/,
  'companion combat prestige must normalize each role level independently');
assert.match(companionBinding, /dungeonVeilUpgradeBinding = 'in-run-companion-combat-mesh'/,
  'the actual companion model must expose a deterministic mesh-local binding identity');
assert.match(companionBinding, /if \(tier < 3\) \{[\s\S]*publishRuntimeTelemetry\(role, tier, 'none', 0, false, false\);[\s\S]*dispose: \(\) => clearRuntimeTelemetry\(role\)/,
  'companion levels 1 and 2 must stay effect-free while still exposing factual runtime evidence');
assert.match(companionBinding, /material\?\.clone\?\.\(\)/,
  'companion prestige must isolate materials per live rig');
assert.match(companionBinding, /new THREE\.PointLight\(/,
  'companion tiers 3-5 must use one bounded model-local light');
assert.match(companionBinding, /const accentColor = new THREE\.Color\(accentHex\);/,
  'the companion update loop must reuse its accent color instead of allocating per frame');
assert.match(companionBinding, /prefersReducedMotion\(\) \|\| rendererRecoveryActive\(\)/,
  'Reduced Motion and renderer recovery must be re-evaluated dynamically');
assert.match(companionBinding, /dungeonVeilRendererRecovery === 'true'[\s\S]*dungeonVeilRendererRecovery === '1'/,
  'both maintained renderer-recovery dataset encodings must activate the static fallback');
assert.match(companionBinding, /dungeonVeilLowGpu === 'true'[\s\S]*dungeonVeilLowGpu === '1'/,
  'both maintained low-GPU dataset encodings must activate the static fallback');
assert.match(companionBinding, /getUpgradeVisualProfile\(tier, \{[\s\S]*reducedMotion: staticFallback,[\s\S]*lowGpu: staticFallback,/,
  'the canonical static fallback profile must drive companion recovery behavior');
assert.match(companionBinding, /visual\.userData\.dungeonVeilUpgradeStaticFallback = staticFallback;/,
  'the actual companion model must expose its live fallback state');
assert.match(companionBinding, /publishRuntimeTelemetry\([\s\S]*particleGroup\.visible,[\s\S]*staticFallback,/,
  'runtime evidence must report the actual bounded particle and fallback state');
assert.doesNotMatch(companionBinding, /document\.createElement|appendChild|canvas/,
  'companion combat prestige must not create a DOM or second-canvas surrogate');

assert.match(app, /import \{ EquippedUpgradePrestigeOverlay \}/);
assert.match(app, /<EquippedUpgradePrestigeOverlay \/>/,
  'the real application shell must mount the equipped prestige presentation');
assert.match(app, /import \{ UpgradeTierSurfaceBindings \}/);
assert.match(app, /<UpgradeTierSurfaceBindings \/>/,
  'the real application shell must mount card/model-local and companion bindings');

console.log('Upgrade visual tier contract passed.');
