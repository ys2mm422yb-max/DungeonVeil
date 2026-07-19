#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { simulateDuoCombatMatrixV4 } from './duo-combat-matrix-v4.mjs';

const [runtime, balance, realtime, persistence, loot] = await Promise.all([
  readFile(new URL('../src/game/coopDuoBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/buildBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CoopRunRealtimeBridge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CoopRunPersistenceBridge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CoopBossLootOverlay.tsx', import.meta.url), 'utf8'),
]);
const assert = (condition, message) => { if (!condition) throw new Error(`Duo matrix V4: ${message}`); };

assert(balance.includes('bossHp: 2.18') && balance.includes('enemyAttack: 1.16') && balance.includes('mobileEnemyCap: 12'), 'runtime factors diverge');
assert(balance.includes('disconnectHpFactor: 0.78') && balance.includes('disconnectAttackFactor: 0.92'), 'disconnect factors missing');
assert(runtime.includes('DUO_BOSS_SUPPORT_COUNT = 2') && runtime.includes('memory.disconnectAdjusted'), 'support or disconnect idempotence missing');
assert(runtime.includes('collidesWithRoomProp') && runtime.includes('isWalkable'), 'support spawn safety missing');
assert(realtime.includes('ensureDuoRoomBalance') && realtime.includes('applyDuoDisconnectFallback'), 'realtime wiring missing');
assert(persistence.includes('acknowledgeCoopRoomReward') && loot.includes('collectBalancedEquipmentDrop'), 'reward or ten-item loot wiring missing');

const report = simulateDuoCombatMatrixV4();
assert(report.scenarioCount === 180 && report.teams.length === 9, 'complete team matrix missing');
assert(report.constants.mobileEnemyCap === 12 && report.relicPairs.length === 4, 'mobile cap or relic pairs diverge');
for (const row of report.rows) {
  assert(Number.isFinite(row.ttk) && row.ttk > 0, `${row.team} invalid TTK`);
  assert(row.cooldownMin >= 125 && row.damageTaken > 10, `${row.team} speed or mitigation unsafe`);
  assert(row.disconnectTtk > row.ttk * 0.9, `${row.team} disconnect becomes easier`);
  if (row.team !== 'weakWeak') assert(row.disconnectDamage < row.survivorHp * 4, `${row.team} disconnect becomes impossible`);
}
const find = (team, relics) => report.rows.find(row => row.team === team && row.relics.join('/') === relics && row.room === 50);
const strong = find('strongStrong', 'none/none');
const critical = find('criticalCritical', 'offensive/offensive');
const speed = find('speedSpeed', 'offensive/offensive');
const tanks = find('tankTank', 'defensive/defensive');
const mixed = find('weakStrong', 'offensive/defensive');
const weak = find('weakWeak', 'none/none');
assert(strong && critical && speed && tanks && mixed && weak, 'chapter-10 references missing');
assert(strong.ttk >= 105 && strong.ttk <= 150, 'maximum team boss band invalid');
assert(critical.ttk >= 135 && speed.ttk >= 135 && speed.cooldownMin >= 200, 'double crit or speed escalates');
assert(tanks.damageTaken >= 250 && tanks.damageTaken < tanks.effectiveTeamHealth * 1.35, 'double tank immune or nonviable');
assert(mixed.ttk <= strong.ttk * 1.7 && weak.ttk > strong.ttk * 3, 'mixed or weak team progression invalid');
const final = report.checkpoints.find(point => point.room === 50);
const soloTtk = final.soloHp / (strong.teamDps / (2 * 0.92));
assert(strong.ttk / soloTtk >= 1.05 && strong.ttk / soloTtk <= 1.35, 'Duo halves or excessively extends Solo pace');
console.log(JSON.stringify({ scenarios: report.scenarioCount, strong, critical, speed, tanks, mixed }, null, 2));
console.log('Duo combat matrix V4 passed.');
