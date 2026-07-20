#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [balance, reserve, collection, selection, runtime, scene, chip, management, profileSummary, stage, equipment, ownProfile, publicProfile, spectatorStage, duo, worldBoss, progression] = await Promise.all([
  read('../src/game/buildBalanceV4.ts'),
  read('../src/game/companionReserveV4.ts'),
  read('../src/game/companionCollectionV5.ts'),
  read('../src/game/companionSelectionV4.ts'),
  read('../src/components/CompanionRuntimeBridge.tsx'),
  read('../src/components/CompanionScene3D.tsx'),
  read('../src/components/CompanionStatusChip.tsx'),
  read('../src/components/CompanionManagementPanel.tsx'),
  read('../src/components/CompanionProfileSummary.tsx'),
  read('../src/components/CombatStage.tsx'),
  read('../src/components/screens/VeilChamberScreenV4.tsx'),
  read('../src/components/PlayerProfilePanel.tsx'),
  read('../src/components/PlayerProfileCard.tsx'),
  read('../src/components/SpectatorPlaybackStage.tsx'),
  read('../src/game/coopDuoBalanceV4.ts'),
  read('../src/components/WorldBossBattleScreenV4.tsx'),
  read('./ten-item-relic-grind-simulator.mjs'),
]);
const assert = (condition, message) => { if (!condition) throw new Error(`Companion collection V5: ${message}`); };

assert(balance.includes('maxVisiblePerPlayer: 1') && balance.includes('duoVisibleCap: 2'), 'solo or Duo visible cap missing');
assert(balance.includes('projectileBudgetPerCompanion: 2') && balance.includes('particleBudgetPerCompanion: 12') && balance.includes('aiUpdatesPerSecond: 10'), 'performance budgets missing');
assert(balance.includes('blocksPlayers: false') && balance.includes('reviveTarget: false'), 'collision or revive contract unsafe');
assert(reserve.includes("'single-target' | 'critical-support' | 'shield' | 'loot-comfort' | 'distraction'"), 'five bounded companion roles are incomplete');
assert(reserve.includes('blocksEnemies: false') && reserve.includes('reviveTarget: false'), 'companions can block or revive');
assert(reserve.includes('perOwner.has(companion.ownerPlayerId)') && reserve.includes('duoVisibleCap'), 'one companion per owner or Duo cap not enforced');
assert(reserve.includes('companionDamageAttributionV4') && worldBoss.includes('WORLD_BOSS_BALANCE_V4'), 'damage attribution reserve missing');
assert(duo.includes('DUO_MOBILE_ENEMY_CAP') && balance.includes('duoVisibleCap: 2'), 'Duo mobile reserve not bounded');

for (const species of ['veil-lynx', 'ember-raven', 'rune-sentinel', 'lantern-wisp', 'dusk-drake']) {
  assert(collection.includes(`'${species}'`), `distinct ${species} definition missing`);
}
for (const chapter of [2, 4, 6, 8, 10]) assert(collection.includes(`unlockChapter: ${chapter}`), `chapter ${chapter} companion find missing`);
assert(collection.includes('COMPANION_MAX_LEVEL_V5 = 5') && collection.includes('COMPANION_UPGRADE_COSTS_V5') && collection.includes('upgradeCompanionV5'), 'five-level dust upgrade path missing');
assert(collection.includes('unlockCompanionV5') && collection.includes('selectCompanionV5') && collection.includes('activeId: null'), 'locked collection or explicit pre-run selection missing');
assert(collection.includes('companionEffectivePowerV5') && collection.includes('companionAttackIntervalV5'), 'level power or attack cadence scaling missing');

assert(selection.includes('COMPANION_COLLECTION_STORAGE_KEY') && selection.includes('selectCompanionV5'), 'legacy selection compatibility is not routed through the collection');
assert(stage.includes('activeCompanionV5') && stage.includes('captured once') && !stage.includes('saveCompanionRoleV4') && !stage.includes('changeCompanionRole'), 'run companion is not frozen before combat');
assert(chip.includes('read-only-companion-status') && chip.includes('pointer-events-none') && !chip.includes('nextCompanionRoleV4') && !chip.includes('onRoleChange'), 'in-run companion switching still exists');

assert(runtime.includes('data-basic-attacks="true"') && runtime.includes('companionAttackIntervalV5') && runtime.includes('localCompanionOrigin'), 'every companion does not perform a visible paced basic attack');
assert(runtime.includes('data-selection="pre-run-frozen"') && runtime.includes('data-level={level}') && runtime.includes('companionEffectivePowerV5'), 'runtime level or frozen selection diagnostics missing');
assert(runtime.includes("activeRole === 'shield'") && runtime.includes("activeRole === 'loot-comfort'") && runtime.includes("activeRole === 'distraction'"), 'role-specific guard, collection or distraction effects missing');
assert(runtime.includes('data-revive-target="false"') && runtime.includes('data-blocks-players="false"') && runtime.includes('data-blocks-enemies="false"'), 'runtime collision or revive diagnostics unsafe');

assert(scene.includes('data-model-source="procedural-distinct-companion-v5"') && scene.includes('data-animation-source="articulated-locomotion-and-attacks"'), 'distinct animated scene contract missing');
for (const part of ['VeilLynxLeg', 'EmberRavenWing', 'RuneSentinelLeg', 'LanternWispShard', 'DuskDrakeWing']) {
  assert(scene.includes(part), `articulated ${part} rig missing`);
}
assert(scene.includes('CompanionV5AttackTrail') && scene.includes('CompanionV5AttackRing') && scene.includes('triggerAction(detail?.kind'), 'visible attack trail or action event binding missing');
assert(scene.includes('maxStep = (5.8 + binding.level * 0.42) * delta') && scene.includes('speed > 0.025'), 'bounded locomotion still slides by positional interpolation');
assert(scene.includes('data-shared-renderer="true"') && scene.includes('data-extra-canvas="false"') && scene.includes('THREE.Object3D.prototype.add'), 'companion renderer must reuse the active run scene');

assert(management.includes('BEGLEITER-SAMMLUNG') && management.includes('FUND BEANSPRUCHEN') && management.includes('upgradeCompanionV5'), 'collection UI lacks finds or upgrades');
assert(management.includes('data-selection-surface="pre-run-only"') && management.includes('COMPANION_MAX_LEVEL_V5') && management.includes('SCHLEIERSTAUB'), 'pre-run-only level UI missing');
assert(management.includes('companionCanBeFoundV5') && management.includes('selectCompanionV5') && management.includes('unlockCompanionV5'), 'locked find and selection controls missing');
assert(equipment.includes("type ChamberTab = EquipmentTab | 'relic' | 'companion'") && equipment.includes('equipment-companion-section') && equipment.includes('<CompanionManagementPanel'), 'companion collection is not consolidated inside equipment');
assert(profileSummary.includes('COMPANION_DEFINITIONS_V5') && profileSummary.includes('data-companion-level') && !profileSummary.includes('companion-reserve-count') && !profileSummary.includes('4 / 4'), 'profiles still show fake tactic reserves');
assert(ownProfile.includes('own-player-profile-companion') && publicProfile.includes('public-player-profile-companion'), 'profile companion surfaces missing');
assert(spectatorStage.includes('<CompanionScene3D') || spectatorStage.includes('spectator-companion-contract'), 'spectator companion integration missing');

const hasSimulatorReserve = progression.includes('requiredWithoutCompanion: true')
  && ((progression.includes('average: 1.10') && progression.includes('maximum: 1.12'))
    || progression.includes('average: COMPANION_RESERVE_V4.averageEffectivePower'));
assert(hasSimulatorReserve, 'base-game completeness reserve missing');
console.log(JSON.stringify({ companions: 5, firstFindChapter: 2, maxLevel: 5, preRunSelection: true, inRunSwitching: false, basicAttacks: true, articulatedMotion: true, soloCap: 1, duoCap: 2, aiHz: 10, sharedRunRenderer: true }, null, 2));
console.log('Companion collection V5 passed: rare unlocks, dust upgrades, fixed run selection and five distinct animated allies are present.');
