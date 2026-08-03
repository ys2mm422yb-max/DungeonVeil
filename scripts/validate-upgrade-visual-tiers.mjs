import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profilePath = 'artifacts/dungeon-rpg/src/lib/upgradeVisualTiers.ts';
const overlayPath = 'artifacts/dungeon-rpg/src/components/EquippedUpgradePrestigeOverlay.tsx';
const bindingsPath = 'artifacts/dungeon-rpg/src/components/UpgradeTierSurfaceBindings.tsx';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';

const [profiles, overlay, bindings, app] = await Promise.all([
  readFile(profilePath, 'utf8'),
  readFile(overlayPath, 'utf8'),
  readFile(bindingsPath, 'utf8'),
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

assert.match(app, /import \{ EquippedUpgradePrestigeOverlay \}/);
assert.match(app, /<EquippedUpgradePrestigeOverlay \/>/,
  'the real application shell must mount the equipped prestige presentation');
assert.match(app, /import \{ UpgradeTierSurfaceBindings \}/);
assert.match(app, /<UpgradeTierSurfaceBindings \/>/,
  'the real application shell must mount card/model-local and companion bindings');

console.log('Upgrade visual tier contract passed.');
