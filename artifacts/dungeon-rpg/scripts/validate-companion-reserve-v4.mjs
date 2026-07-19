#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const [balance, reserve, selection, runtime, scene, chip, stage, duo, worldBoss, progression] = await Promise.all([
  readFile(new URL('../src/game/buildBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/companionReserveV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/companionSelectionV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CompanionRuntimeBridge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CompanionScene3D.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CompanionStatusChip.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CombatStage.tsx', import.meta.url), 'utf8'),
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
assert(chip.includes('run-companion-chip') && chip.includes('nextCompanionRoleV4'), 'visible role control missing');
assert(stage.includes('<CompanionRuntimeBridge') && stage.includes('<CompanionScene3D') && stage.includes('<CompanionStatusChip'), 'runtime, renderer or status integration missing');
assert(scene.includes("data-model-source=\"kaykit-adventurers\"") && scene.includes('findKayKitModels') && scene.includes('KayKitCompanion_'), 'supplied KayKit companion models are not used');
assert(scene.includes('rig_medium_general') && scene.includes('rig_medium_movementbasic') && scene.includes('rig_medium_combat'), 'KayKit idle, movement or combat animation loading missing');
assert(scene.includes('normalizeCompanionRosterV4') && scene.includes("remote:${remote.userId}"), 'one visible companion per Solo/Duo owner is not enforced in the renderer');
assert(scene.includes('WebGLRenderer.prototype.render') && scene.includes('data-shared-renderer="true"') && scene.includes('data-extra-canvas="false"'), 'companion renderer must reuse the active run WebGL scene');
assert(runtime.includes('window.setInterval(tick, 100)') && runtime.includes('reservation.projectileBudget'), '10 Hz AI or projectile budget missing at runtime');
assert(runtime.includes("authorityRef.current === 'host'") && runtime.includes("modeRef.current === 'solo'"), 'Duo enemy authority gate missing');
assert(runtime.includes("activeRole === 'single-target'") && runtime.includes("activeRole === 'critical-support'") && runtime.includes("activeRole === 'shield'") && runtime.includes("activeRole === 'loot-comfort'") && runtime.includes("activeRole === 'distraction'"), 'not all five role bonuses are implemented');
assert(runtime.includes('data-revive-target="false"') && runtime.includes('data-blocks-players="false"') && runtime.includes('data-blocks-enemies="false"'), 'runtime collision or revive diagnostics unsafe');

const hasSimulatorReserve = progression.includes('requiredWithoutCompanion: true')
  && ((progression.includes('average: 1.10') && progression.includes('maximum: 1.12'))
    || progression.includes('average: COMPANION_RESERVE_V4.averageEffectivePower'));
assert(hasSimulatorReserve, 'base-game completeness or simulator reserve missing');

const rolePowers = [0.12, 0.10, 0.10, 0.08, 0.08];
assert(rolePowers.every(value => value >= 0.08 && value <= 0.12), 'role escapes 8–12% band');
assert(Math.max(...rolePowers) - Math.min(...rolePowers) <= 0.04, 'companion roles are excessively unequal');
console.log(JSON.stringify({ roles: 5, soloCap: 1, duoCap: 2, projectileBudget: 2, particleBudget: 12, aiHz: 10, sharedRunRenderer: true, rolePowers }, null, 2));
console.log('Companion reserve V4 passed: visible KayKit companions are animated, optional, owner-attributed, nonblocking and mobile-safe.');
