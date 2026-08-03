import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profilePath = 'artifacts/dungeon-rpg/src/lib/upgradeVisualTiers.ts';
const overlayPath = 'artifacts/dungeon-rpg/src/components/EquippedUpgradePrestigeOverlay.tsx';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';

const [profiles, overlay, app] = await Promise.all([
  readFile(profilePath, 'utf8'),
  readFile(overlayPath, 'utf8'),
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

assert.match(overlay, /ACTIVE_SLOTS[^\n]*\['bow', 'quiver', 'armor'\]/,
  'all active equipped slots must participate in the visible tier');
assert.match(overlay, /if \(tier < 3\) return null;/,
  'levels 1 and 2 must remain visually normal');
assert.match(overlay, /data-upgrade-tier=\{tier\}/);
assert.match(overlay, /data-static-fallback=\{profile\.particleDensity === 0/);
assert.match(overlay, /prefers-reduced-motion: reduce/);
assert.match(overlay, /pointer-events-none/,
  'prestige feedback must never intercept gameplay or menu input');
assert.match(overlay, /dungeon-veil-renderer-lost/);
assert.match(overlay, /dungeon-veil-renderer-ready/);

assert.match(app, /import \{ EquippedUpgradePrestigeOverlay \}/);
assert.match(app, /<EquippedUpgradePrestigeOverlay \/>/,
  'the real application shell must mount the equipped prestige presentation');

console.log('Upgrade visual tier contract passed.');
