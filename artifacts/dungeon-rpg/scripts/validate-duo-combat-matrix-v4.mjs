#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { simulateDuoCombatMatrixV4 } from './duo-combat-matrix-v4.mjs';

const [duoSource, balanceSource, realtimeSource, persistenceSource, lootSource] = await Promise.all([
  readFile(new URL('../src/game/coopDuoBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/buildBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CoopRunRealtimeBridge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CoopRunPersistenceBridge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CoopBossLootOverlay.tsx', import.meta.url), 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Duo combat matrix V4 audit failed: ${message}`);
}

assert(balanceSource.includes('normalHp: 1.72') && balanceSource.includes('eliteHp: 1.92') && balanceSource.includes('bossHp: 2.18'), 'separate normal, elite or boss HP factors are missing');
assert(balanceSource.includes('enemyAttack: 1.16') && balanceSource.includes('spawnFactor: 1.20'), 'Duo attack or encounter-size factor is missing');
assert(balanceSource.includes('mobileEnemyCap: 12'), 'Duo mobile enemy cap is not 12');
assert(balanceSource.includes('disconnectHpFactor: 0.78') && balanceSource.includes('disconnectAttackFactor: 0.92'), 'disconnect fallback factors are missing');
assert(duoSource.includes('DUO_BOSS_SUPPORT_COUNT = 2') && duoSource.includes('Math.min(1 + DUO_BOSS_SUPPORT_COUNT, DUO_MOBILE_ENEMY_CAP)'), 'boss support count is not separately bounded');
assert(duoSource.includes('memory.scaledEnemyIds') && duoSource.includes('memory.disconnectAdjusted'), 'Duo scaling or disconnect fallback is not idempotent');
assert(duoSource.includes('collidesWithRoomProp') && duoSource.includes('isWalkable'), 'Duo support spawns bypass collision or walkability');
assert(realtimeSource.includes('ensureDuoRoomBalance') && realtimeSource.includes('applyDuoDisconnectFallback'), 'Duo balance or disconnect fallback is not wired into realtime');
assert(persistenceSource.includes('dispatchCoopRoomClear') || persistenceSource.includes('acknowledgeCoopRoomReward'), 'Duo persistence/reward bridge is missing');
assert(lootSource.includes('collectBalancedEquipmentDrop') && lootSource.includes('my_consolation_dust'), 'Duo loot is not compatible with balanced equipment and consolation');

const report = simulateDuoCombatMatrixV4();
assert(report.teams.length === 9, `expected nine team profiles, found ${report.teams.length}`);
assert(report.checkpoints.length === 5, 'expected five boss checkpoints');
assert(report.relicPairs.length === 4, 'expected four Duo relic combinations');
assert(report.scenarioCount === 180, `expected 180 Duo scenarios, found ${report.scenarioCount}`);
assert(report.constants.mobileEnemyCap === 12 && report.constants.spawnFactor === 1.20, 'matrix constants diverge from runtime');
assert(report.hitUptime.boss === 0.025 && report.hitUptime.disconnect === 0.018, 'telegraph/dodge hit uptime changed unexpectedly');

for (const row of report.rows) {
  assert(Number.isFinite(row.ttk) && row.ttk > 0, `${row.team}/${row.chapter}:${row.room} invalid TTK`);
  assert(Number.isFinite(row.damageTaken) && row.damageTaken > 0, `${row.team}/${row.chapter}:${row.room} invalid incoming damage`);
  assert(row.cooldownMin >= 125, `${row.team} escapes the minimum attack cooldown`);
  assert(row.damageTaken > 10, `${row.team}/${row.chapter}:${row.room} becomes effectively damage immune`);
  assert(row.disconnectTtk > row.ttk * 0.9, `${row.team}/${row.chapter}:${row.room} disconnect makes the fight easier than the team fight`);
  if (row.team !== 'weakWeak') assert(row.disconnectDamage < row.survivorHp * 4, `${row.team}/${row.chapter}:${row.room} disconnect fallback becomes practically impossible`);
}

const find = (team, relics, room) => report.rows.find(row => row.team === team && row.relics.join('/') === relics.join('/') && row.room === room);
const strong = find('strongStrong', ['none', 'none'], 50);
const critical = find('criticalCritical', ['offensive', 'offensive'], 50);
const speed = find('speedSpeed', ['offensive', 'offensive'], 50);
const tanks = find('tankTank', ['defensive', 'defensive'], 50);
const mixed = find('weakStrong', ['offensive', 'defensive'], 50);
const weak = find('weakWeak', ['none', 'none'], 50);
assert(strong && critical && speed && tanks && mixed && weak, 'late-game reference scenarios are missing');
assert(strong.ttk >= 105 && strong.ttk <= 150, 'two maximum builds miss the intended chapter-10 Duo boss band');
assert(critical.ttk >= 135, 'double critical build deletes the chapter-10 boss too quickly');
assert(speed.ttk >= 135 && speed.cooldownMin >= 200, 'double attack-speed build is too fast or floods projectiles');
assert(tanks.damageTaken >= 250 && tanks.damageTaken < tanks.effectiveTeamHealth * 1.35, 'double tank is immune or nonviable');
assert(mixed.ttk <= strong.ttk * 1.7, 'weak plus strong composition is disproportionately punished');
assert(weak.ttk > strong.ttk * 3, 'equipment progression does not meaningfully affect Duo performance');

const finalCheckpoint = report.checkpoints.find(checkpoint => checkpoint.room === 50);
const singleMaximumDps = strong.teamDps / (2 * 0.92);
const soloMaximumTtk = finalCheckpoint.soloHp / singleMaximumDps;
const equalTeamRatio = strong.ttk / soloMaximumTtk;
assert(equalTeamRatio >= 1.05 && equalTeamRatio <= 1.35, 'equal Duo builds halve or excessively extend boss duration versus Solo');
assert(strong.disconnectTtk <= 230 && strong.disconnectDamage < strong.survivorHp * 2, 'strong survivor disconnect fallback is not fair');

console.log(JSON.stringify({
  scenarios: report.scenarioCount,
  chapter10: {
    weakWeak: weak,
    weakStrong: mixed,
    strongStrong: strong,
    criticalCritical: critical,
    speedSpeed: speed,
    tankTank: tanks,
    equalTeamToSoloTtkRatio: equalTeamRatio,
  },
  mobileEnemyCap: report.constants.mobileEnemyCap,
}, null, 2));
console.log('Duo combat matrix V4 passed: all team builds, relic pairs, boss targets, mobile caps and disconnect transitions remain bounded without halving Solo progression.');
