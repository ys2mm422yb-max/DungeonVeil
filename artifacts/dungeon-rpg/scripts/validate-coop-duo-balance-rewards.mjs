import { readFile } from 'node:fs/promises';
import { simulateDuoCombatMatrixV4 } from './duo-combat-matrix-v4.mjs';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [balance, targets, reward, session, persistence, migration, authority, spawns, engine, matrixSource] = await Promise.all([
  read('../src/game/coopDuoBalanceV4.ts'),
  read('../src/game/buildBalanceV4.ts'),
  read('../src/game/chapterRewardContract.ts'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/components/CoopRunPersistenceBridge.tsx'),
  read('../../../supabase/migrations/20260719024500_add_coop_run_persistence_and_rewards.sql'),
  read('../src/game/coopEnemyAuthority.ts'),
  read('../src/game/roomSpawn3D.ts'),
  read('../src/game/runEngine.ts'),
  read('./duo-combat-matrix-v4.mjs'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Duo combat matrix V4 audit failed: ${message}`);
}

function numericContract(source, key) {
  const match = source.match(new RegExp(`${key}:\\s*([0-9.]+)`));
  return match ? Number(match[1]) : Number.NaN;
}

const checks = [
  [targets.includes('normalHp: 1.72') && targets.includes('eliteHp: 1.92') && targets.includes('bossHp: 2.18'), 'V4 Duo HP targets are missing'],
  [targets.includes('enemyAttack: 1.16') && targets.includes('spawnFactor: 1.20') && targets.includes('mobileEnemyCap: 12'), 'V4 Duo pressure or mobile cap is missing'],
  [balance.includes('DUO_BOSS_SUPPORT_COUNT = 2') && balance.includes('DUO_CURRENCY_MULTIPLIER = 1.25'), 'Duo boss support or currency multiplier changed'],
  [balance.includes('balanceMemory = new WeakMap') && balance.includes('scaledEnemyIds'), 'Duo scaling is not idempotent per room and enemy'],
  [balance.includes('getDuoRoomSpawnPoints') && balance.includes('collidesWithRoomProp') && balance.includes('isWalkable'), 'Duo support spawns bypass collision-safe authored points'],
  [balance.includes('applyDuoDisconnectFallback') && targets.includes('disconnectHpFactor: 0.78') && targets.includes('disconnectAttackFactor: 0.92'), 'fair disconnect fallback is missing'],
  [authority.includes('ensureDuoRoomBalance(state, context.runSeed)') && authority.indexOf('ensureDuoRoomBalance(state, context.runSeed)') < authority.indexOf('enemies: state.enemies'), 'host snapshot does not apply Duo balance before serialization'],
  [spawns.includes('export function getDuoRoomSpawnPoints') && spawns.includes('const maximum = isBossRoom(room) ? 4 : 12'), 'separate Duo spawn capacity is missing'],
  [reward.includes('currencyMultiplier?: number') && reward.includes('skipEquipmentDrop?: boolean'), 'chapter reward contract cannot separate currency and shared equipment'],
  [session.includes('dispatchCoopRoomClear') && session.includes('if (duo)') && session.includes('rewardChapterRoomClear(engine.state.chapter, engine.state.floor)'), 'Duo room rewards are not server-routed or Solo flow changed'],
  [persistence.includes('currencyMultiplier: 1.25') && persistence.includes('skipEquipmentDrop: true') && persistence.includes('expectedDuoAmounts'), 'Duo entitlement application does not preserve the 1.25 currency contract'],
  [migration.includes('private.coop_room_reward_values') && migration.includes('host room-clear checkpoint required') && migration.includes('* 1.25'), 'server reward values or host clear authority is missing'],
  [!engine.includes('DUO_NORMAL_HP_MULTIPLIER') && !engine.includes('DUO_CURRENCY_MULTIPLIER'), 'Duo scaling leaked into the Solo engine'],
  [matrixSource.includes('profile: profile.id') && matrixSource.includes('disconnectA') && matrixSource.includes('mobileControlScore'), 'Duo matrix does not cover loadouts, disconnects and mobile control'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}

const report = simulateDuoCombatMatrixV4();
assert(report.buildCount === 7, `expected seven canonical builds, found ${report.buildCount}`);
assert(report.pairCount === 28, `expected 28 unordered build pairs, found ${report.pairCount}`);
assert(report.profileCount === 5, `expected five Duo loadout profiles, found ${report.profileCount}`);
assert(report.checkpoints.length === 11, `expected eleven room and boss checkpoints, found ${report.checkpoints.length}`);
assert(report.scenarioCount === 1540, `expected 1540 Duo scenarios, found ${report.scenarioCount}`);

const runtimeContracts = {
  normalHp: numericContract(targets, 'normalHp'),
  eliteHp: numericContract(targets, 'eliteHp'),
  bossHp: numericContract(targets, 'bossHp'),
  enemyAttack: numericContract(targets, 'enemyAttack'),
  spawnFactor: numericContract(targets, 'spawnFactor'),
  mobileEnemyCap: numericContract(targets, 'mobileEnemyCap'),
  disconnectHpFactor: numericContract(targets, 'disconnectHpFactor'),
  disconnectAttackFactor: numericContract(targets, 'disconnectAttackFactor'),
};
for (const [key, value] of Object.entries(runtimeContracts)) {
  assert(Number.isFinite(value) && report.duoBalance[key] === value, `${key} differs between runtime and matrix`);
}
assert(report.duoBalance.bossSupportCount === 2, 'matrix boss support count differs from runtime');

for (const row of report.rows) {
  assert(Number.isFinite(row.duoTtkSeconds) && row.duoTtkSeconds > 0, `${row.pair}/${row.profile}/${row.chapter}:${row.room} invalid TTK`);
  assert(Number.isFinite(row.incomingDps) && row.incomingDps > 0, `${row.pair}/${row.chapter}:${row.room} invalid incoming pressure`);
  assert(row.healingNeeded >= 0, `${row.pair}/${row.chapter}:${row.room} negative healing requirement`);
  assert(row.enemyCount >= 3 && row.enemyCount <= 12, `${row.chapter}:${row.room} enemy count ${row.enemyCount} escapes the mobile cap`);
  if (row.encounterType === 'boss') assert(row.enemyCount === 3, `${row.chapter}:${row.room} boss support count is not two`);
  assert(row.pacingRatio >= 1.05 && row.pacingRatio <= 1.25, `${row.pair}/${row.chapter}:${row.room} Duo pacing diverges from the equivalent Solo build`);
  assert(row.minimumAttackCooldownMs >= 125, `${row.pair}/${row.profile} attack cooldown falls below 125 ms`);
  assert(row.maxPlayerProjectileRate <= 24, `${row.pair}/${row.profile} per-player projectile rate exceeds the mobile budget`);
  assert(row.totalProjectileLoad <= 50, `${row.pair}/${row.profile}/${row.chapter}:${row.room} combined projectile load exceeds 50`);
  assert(row.mobileControlScore >= 0.25, `${row.pair}/${row.profile}/${row.chapter}:${row.room} mobile control reserve is exhausted`);
  for (const fallback of [row.disconnectA, row.disconnectB]) {
    assert(Number.isFinite(fallback.ttkSeconds) && fallback.ttkSeconds > 0, `${row.pair}/${row.chapter}:${row.room} disconnect TTK is invalid`);
    assert(fallback.soloPacingRatio >= 1.60 && fallback.soloPacingRatio <= 1.95, `${row.pair}/${row.chapter}:${row.room} disconnect fallback is unfair`);
    assert(Number.isFinite(fallback.incomingDps) && fallback.incomingDps > 0, `${row.pair}/${row.chapter}:${row.room} disconnect pressure is invalid`);
    assert(fallback.healingNeeded >= 0, `${row.pair}/${row.chapter}:${row.room} disconnect healing requirement is negative`);
  }
}

const find = (buildA, buildB, profile, chapter, room) => report.rows.find(row => (
  row.buildA === buildA && row.buildB === buildB && row.profile === profile && row.chapter === chapter && row.room === room
));
const starterOpening = find('starter', 'starter', 'baseline', 1, 1);
const maximumOpening = find('maximum', 'maximum', 'maximum-offense', 1, 1);
const maximumLatePack = find('maximum', 'maximum', 'maximum-offense', 10, 49);
const maximumFinalBoss = find('maximum', 'maximum', 'maximum-offense', 10, 50);
const maximumSpeedLatePack = find('maximum', 'maximum', 'maximum-speed', 10, 49);
const attackCriticalFinalBoss = find('attack', 'critical', 'maximum-offense', 10, 50);
const rangeTankFinalBoss = find('range', 'tank', 'maximum-offense', 10, 50);
const tankTankFinalBoss = find('tank', 'tank', 'maximum-offense', 10, 50);

assert(starterOpening && maximumOpening && maximumLatePack && maximumFinalBoss && maximumSpeedLatePack && attackCriticalFinalBoss && rangeTankFinalBoss && tankTankFinalBoss, 'reference Duo scenarios are missing');
assert(starterOpening.duoTtkSeconds >= 4 && starterOpening.duoTtkSeconds <= 9, 'starter Duo opening pace is outside the intended band');
assert(maximumOpening.duoTtkSeconds >= 0.7 && maximumOpening.duoTtkSeconds <= 1.5, 'maximum Duo opening pace is invalid');
assert(maximumLatePack.duoTtkSeconds >= 35 && maximumLatePack.duoTtkSeconds <= 65, 'maximum Duo room-49 pace is outside the intended band');
assert(maximumFinalBoss.duoTtkSeconds >= 45 && maximumFinalBoss.duoTtkSeconds <= 90, 'maximum Duo final-boss pace is outside the intended band');
assert(attackCriticalFinalBoss.duoTtkSeconds >= 80 && attackCriticalFinalBoss.duoTtkSeconds <= 120, 'attack/critical Duo final-boss pace is outside the intended band');
assert(rangeTankFinalBoss.duoTtkSeconds >= 100 && rangeTankFinalBoss.duoTtkSeconds <= 140, 'range/tank Duo final-boss pace is outside the intended band');
assert(tankTankFinalBoss.incomingDps < attackCriticalFinalBoss.incomingDps, 'tank pair does not reduce incoming pressure');
assert(rangeTankFinalBoss.mobileControlScore > attackCriticalFinalBoss.mobileControlScore, 'range/tank pair does not preserve its control advantage');
assert(maximumFinalBoss.healingNeeded < attackCriticalFinalBoss.healingNeeded, 'maximum defense and damage do not reduce final-boss healing demand');
assert(maximumSpeedLatePack.totalProjectileLoad <= 50 && maximumSpeedLatePack.mobileControlScore >= 0.25, 'maximum-speed Duo exceeds the mobile projectile reserve');
assert(maximumFinalBoss.disconnectA.soloPacingRatio >= 1.75 && maximumFinalBoss.disconnectA.soloPacingRatio <= 1.90, 'final-boss disconnect fallback misses its intended pacing band');

const viableFinalBossRows = report.rows.filter(row => (
  row.profile === 'maximum-offense' && row.chapter === 10 && row.room === 50
  && row.buildA !== 'starter' && row.buildB !== 'starter'
));
const fastestFinal = Math.min(...viableFinalBossRows.map(row => row.duoTtkSeconds));
const slowestFinal = Math.max(...viableFinalBossRows.map(row => row.duoTtkSeconds));
assert(fastestFinal >= 55 && slowestFinal <= 140, 'a viable non-starter Duo pair escapes the final-boss TTK band');
assert(slowestFinal / fastestFinal >= 1.7 && slowestFinal / fastestFinal <= 2.4, 'Duo build identities are either flat or excessively divergent');

console.log(JSON.stringify({
  scenarioCount: report.scenarioCount,
  pairCount: report.pairCount,
  profileCount: report.profileCount,
  checkpointCount: report.checkpoints.length,
  pacingRatio: {
    minimum: Math.min(...report.rows.map(row => row.pacingRatio)),
    maximum: Math.max(...report.rows.map(row => row.pacingRatio)),
  },
  finalBoss: {
    fastestViableSeconds: fastestFinal,
    slowestViableSeconds: slowestFinal,
    maximumPairSeconds: maximumFinalBoss.duoTtkSeconds,
    attackCriticalSeconds: attackCriticalFinalBoss.duoTtkSeconds,
    rangeTankSeconds: rangeTankFinalBoss.duoTtkSeconds,
  },
  maximumProjectileLoad: Math.max(...report.rows.map(row => row.totalProjectileLoad)),
  minimumMobileControlScore: Math.min(...report.rows.map(row => row.mobileControlScore)),
}, null, 2));
console.log('V4 Duo build scaling, disconnect fallback, mobile cap, server-authoritative 1.25 currency rewards and unchanged Solo routing validated.');
console.log('Duo combat matrix V4 passed: 1,540 build-pair, loadout, room, boss, pressure, healing, projectile and disconnect scenarios remain bounded.');
