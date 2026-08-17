#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const scene = await readFile(new URL('../artifacts/dungeon-rpg/src/components/CompanionScene3D.tsx', import.meta.url), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Companion free movement: ${message}`);
};

assert(scene.includes('COMPANION_MOVEMENT_PROFILES_V5'), 'role-aware movement profiles are missing');
const movementProfileKeys = {
  'single-target': "'single-target':",
  'critical-support': "'critical-support':",
  shield: 'shield:',
  'loot-comfort': "'loot-comfort':",
  distraction: 'distraction:',
};
for (const [role, profileKey] of Object.entries(movementProfileKeys)) {
  assert(scene.includes(profileKey), `movement profile for ${role} is missing`);
}
assert(scene.includes('roamRadius'), 'bounded roam radius is missing');
assert(scene.includes('minPlayerDistance'), 'minimum player separation is missing');
assert(scene.includes('leashRadius'), 'hard player leash is missing');
assert(scene.includes('movementTarget'), 'independent companion target selection is missing');
assert(scene.includes('roamPhase'), 'movement target evolution is missing');
assert(scene.includes('isWalkable('), 'movement targets do not reject non-walkable map tiles');
assert(scene.includes('collidesWithRoomProp('), 'movement targets do not reject visible room-prop colliders');
assert(scene.includes('movementPathBlockedByRoomProp('), 'movement path does not reject visible room-prop blockers');
assert(scene.includes('acceleration') && scene.includes('deceleration'), 'role movement profiles do not define acceleration/deceleration');
assert(scene.includes('velocityX') && scene.includes('velocityZ'), 'smooth companion velocity state is missing');
assert(scene.includes('data-follow-placement="role-aware-roam"'), 'scene marker does not expose role-aware roam');
assert(scene.includes("marker.dataset.followPlacement = 'role-aware-roam'"), 'runtime marker does not expose role-aware roam');
assert(!scene.includes("marker.dataset.followPlacement = 'inward-side'"), 'legacy fixed inward-side formation is still active');
assert(scene.includes('Math.atan2(movementX, movementZ)'), 'moving companion must face actual travel direction');
assert(scene.includes('binding.initialized'), 'scene rebuild/rebind initialization contract is missing');
assert(scene.includes('maxSpeed = 5.8 + binding.level * 0.42'), 'bounded companion maximum locomotion speed changed unexpectedly');

console.log(JSON.stringify({
  roles: 5,
  roleAwareRoam: true,
  minimumPlayerDistance: true,
  hardLeash: true,
  walkabilityAndVisibleProps: true,
  smoothAccelerationAndDeceleration: true,
  movementFacing: true,
  rebuildInitialization: true,
}, null, 2));
console.log('Companion free movement contract passed.');
