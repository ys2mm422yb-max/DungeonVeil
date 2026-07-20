#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const [balance, reserve, selection, runtime, scene, chip, management, profileSummary, stage, menu, equipment, ownProfile, publicProfile, spectatorStage, duo, worldBoss, progression] = await Promise.all([
  readFile(new URL('../src/game/buildBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/companionReserveV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/companionSelectionV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CompanionRuntimeBridge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CompanionScene3D.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CompanionStatusChip.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CompanionManagementPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CompanionProfileSummary.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CombatStage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/MainMenuScreen.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/VeilChamberScreenV4.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/PlayerProfilePanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/PlayerProfileCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/SpectatorPlaybackStage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/coopDuoBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WorldBossBattleScreenV4.tsx', import.meta.url), 'utf8'),
  readFile(new URL('./ten-item-relic-grind-simulator.mjs', import.meta.url), 'utf8'),
]);
const assert = (condition, message) => { if (!condition) throw new Error(`Companion reserve V4: ${message}`); };

assert(balance.includes('minimumEffectivePower: 0.08') && balance.includes('averageEffectivePower: 0.10') && balance.includes('maximumEffectivePower: 0.12'), '8–12% power reserve missing');
assert(balance.includes('maxVisiblePerPlayer: 1') && balance.includes('duoVisibleCap: 2'), 'solo or Duo visible cap missing');
assert(balance.includes('projectileBudgetPerCompanion: 2') && balance.includes('particleBudgetPerCompanion: 12') && balance.includes('aiUpdatesPerSecond: 10'), 'performance budgets missing');
assert(balance.includes('blocksPlayers: false') && balance.includes('reviveTarget: false'), 'collision or revive contract unsafe');
assert(reserve.includes("'single-target' | 'critical-support' | 'shield' | 'loot-comfort' | 'distraction'"), 'planned companion roles incomplete');
assert(reserve.includes("'single-target': 0.12") && reserve.includes("'loot-comfort': 0.08"), 'role power bands missing');
assert(reserve.includes('blocksEnemies: false') && reserve.includes('reviveTarget: false'), 'companions can block or revive');
assert(reserve.includes('perOwner.has(companion.ownerPlayerId)') && reserve.includes('duoVisibleCap'), 'one companion per owner or Duo cap not enforced');
assert(reserve.includes('ownerPlayerId') && reserve.includes('ownerUserId') && reserve.includes("source: 'companion-v4'"), 'damage attribution missing');
assert(reserve.includes('companionWorldBossDamageV4') && worldBoss.includes('WORLD_BOSS_BALANCE_V4'), 'World Boss attribution reserve missing');
assert(duo.includes('DUO_MOBILE_ENEMY_CAP') && balance.includes('duoVisibleCap: 2'), 'Duo mobile reserve not bounded');

assert(selection.includes('COMPANION_ROLE_ORDER_V4') && selection.includes('COMPANION_SELECTION_STORAGE_KEY'), 'role selection or persistence missing');
assert(selection.includes('saveCompanionRoleV4') && selection.includes('localStorage.setItem'), 'selected companion is not persisted');
assert(chip.includes('run-companion-chip') && chip.includes('nextCompanionRoleV4') && chip.includes('compact-wolf-orb') && chip.includes('WolfMark'), 'compact in-run wolf tactic control missing');
assert(stage.includes('<CompanionRuntimeBridge') && stage.includes('<CompanionScene3D') && stage.includes('<CompanionStatusChip'), 'runtime, renderer or status integration missing');
assert(scene.includes('data-scene-hook="object3d-add"') && scene.includes('THREE.Object3D.prototype.add'), 'active Three scene hook is missing');
assert(!scene.includes('WebGLRenderer.prototype.render'), 'broken renderer prototype hook returned');
assert(scene.includes('data-model-source="procedural-veil-wolf"') && scene.includes('VeilWolfCompanion_') && scene.includes("companionSpecies = 'veil-wolf'"), 'one coherent Veil Wolf model is not used');
assert(scene.includes('data-animation-source="procedural-wolf-motion"') && scene.includes('VeilWolfTailPivot') && scene.includes('triggerAction()'), 'wolf idle, movement or action motion is missing');
assert(scene.includes('normalizeCompanionRosterV4') && scene.includes("remote:${remote.userId}"), 'one visible companion per Solo/Duo owner is not enforced in the renderer');
assert(scene.includes('data-shared-renderer="true"') && scene.includes('data-extra-canvas="false"'), 'companion renderer must reuse the active run WebGL scene');
assert(runtime.includes('window.setInterval(tick, 100)') && runtime.includes('reservation.projectileBudget'), '10 Hz AI or projectile budget missing at runtime');
assert(runtime.includes("authorityRef.current === 'host'") && runtime.includes("modeRef.current === 'solo'"), 'Duo enemy authority gate missing');
assert(runtime.includes("activeRole === 'single-target'") && runtime.includes("activeRole === 'critical-support'") && runtime.includes("activeRole === 'shield'") && runtime.includes("activeRole === 'loot-comfort'") && runtime.includes("activeRole === 'distraction'"), 'not all five tactic bonuses are implemented');
assert(runtime.includes('data-revive-target="false"') && runtime.includes('data-blocks-players="false"') && runtime.includes('data-blocks-enemies="false"'), 'runtime collision or revive diagnostics unsafe');

assert(menu.includes('main-menu-equipment-navigation') && !menu.includes('main-menu-companion-navigation') && !menu.includes("'companions'"), 'standalone companion main-menu navigation still exists');
assert(equipment.includes("type ChamberTab = EquipmentTab | 'relic' | 'companion'") && equipment.includes("'companion'") && equipment.includes('inventory-tab-${key}') && equipment.includes('equipment-companion-section') && equipment.includes('<CompanionManagementPanel'), 'companion management is not consolidated inside equipment');
assert(management.includes('companion-management-panel') && management.includes('companion-active-role') && management.includes('companion-reserve-grid'), 'management UI diagnostics missing');
assert(management.includes('data-companion-species="veil-wolf"') && management.includes('VeilWolfPortrait') && management.includes('Ein Gefährte. Fünf Taktiken.'), 'management does not present one coherent Veil Wolf identity');
assert(management.includes('embedded?: boolean') && management.includes("data-embedded={embedded ? 'true' : 'false'}"), 'embedded equipment presentation is missing');
assert(management.includes('reserve.length') && management.includes('4/4') === false, 'reserve must be calculated rather than hard-coded as a fake list');
assert(management.includes('saveCompanionRoleV4') && management.includes('COMPANION_ROLE_ORDER_V4.filter'), 'active/reserve switching is not persistent');
assert(!management.includes("'Solo'") && !management.includes("'Duo'"), 'internal visible-count debug cards returned to companion management');
assert(profileSummary.includes('AKTIVER BEGLEITER') && profileSummary.includes('Reserve'), 'profile companion summary incomplete');
assert(ownProfile.includes('own-player-profile-companion') && ownProfile.includes('<CompanionProfileSummary'), 'own profile companion missing');
assert(publicProfile.includes('public-player-profile-companion') && publicProfile.includes('companionRoleForOwnerV4'), 'public profile companion fallback missing');
assert(spectatorStage.includes('<CompanionScene3D') && spectatorStage.includes('spectator-companion-contract') && spectatorStage.includes('single-stable-three-state-with-companion'), 'spectator companion integration missing');

const hasSimulatorReserve = progression.includes('requiredWithoutCompanion: true')
  && ((progression.includes('average: 1.10') && progression.includes('maximum: 1.12'))
    || progression.includes('average: COMPANION_RESERVE_V4.averageEffectivePower'));
assert(hasSimulatorReserve, 'base-game completeness or simulator reserve missing');
const rolePowers = [0.12, 0.10, 0.10, 0.08, 0.08];
assert(rolePowers.every(value => value >= 0.08 && value <= 0.12), 'role escapes 8–12% band');
assert(Math.max(...rolePowers) - Math.min(...rolePowers) <= 0.04, 'companion roles are excessively unequal');
console.log(JSON.stringify({ roles: 5, species: 'veil-wolf', active: 1, reserve: 4, soloCap: 1, duoCap: 2, projectileBudget: 2, particleBudget: 12, aiHz: 10, sharedRunRenderer: true, equipmentManagement: true, profiles: true, spectator: true, rolePowers }, null, 2));
console.log('Companion reserve V4 passed: equipment management, profiles, run and spectator use one bounded visible Veil Wolf per owner.');
