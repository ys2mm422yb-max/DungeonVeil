import { readFile } from 'node:fs/promises';
import { simulateDuoCombatMatrixV4 } from './duo-combat-matrix-v4.mjs';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [balance, targets, authority, reward, session, persistence, migration] = await Promise.all([
  read('../src/game/coopDuoBalanceV4.ts'),
  read('../src/game/buildBalanceV4.ts'),
  read('../src/game/coopEnemyAuthority.ts'),
  read('../src/game/chapterRewardContract.ts'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/components/CoopRunPersistenceBridge.tsx'),
  read('../../../supabase/migrations/20260719024500_add_coop_run_persistence_and_rewards.sql'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Duo combat matrix V4 audit failed: ${message}`);
}

const sourceChecks = [
  [targets.includes('normalHp: 1.72') && targets.includes('eliteHp: 1.92') && targets.includes('bossHp: 2.18'), 'canonical Duo HP multipliers are missing'],
  [targets.includes('enemyAttack: 1.16') && targets.includes('spawnFactor: 1.20') && targets.includes('mobileEnemyCap: 12'), 'canonical Duo pressure or enemy cap is missing'],
  [targets.includes('disconnectHpFactor: 0.78') && targets.includes('disconnectAttackFactor: 0.92'), 'disconnect fallback targets are missing'],
  [balance.includes('DUO_BOSS_SUPPORT_COUNT = 2') && balance.includes('applyDuoDisconnectFallback'), 'bounded boss support or disconnect fallback runtime is missing'],
  [balance.includes('Math.min(DUO_MOBILE_ENEMY_CAP') && balance.includes('Math.ceil(originalCount * DUO_ENEMY_COUNT_MULTIPLIER)'), 'runtime enemy count does not use the canonical bounded scaling'],
  [authority.includes('ensureDuoRoomBalance') && authority.includes('createCoopEnemySnapshot'), 'host-authoritative Duo room scaling is not wired into enemy publication'],
  [balance.includes('DUO_CURRENCY_MULTIPLIER = 1.25'), 'Duo currency multiplier changed'],
  [reward.includes('currencyMultiplier?: number') && reward.includes('skipEquipmentDrop?: boolean'), 'chapter reward contract cannot separate currency and shared equipment'],
  [session.includes('dispatchCoopRoomClear') && session.includes('if (duo)') && session.includes('rewardChapterRoomClear(engine.state.chapter, engine.state.floor)'), 'Duo room rewards are not server-routed or Solo flow changed'],
  [persistence.includes('currencyMultiplier: 1.25') && persistence.includes('skipEquipmentDrop: true') && persistence.includes('expectedDuoAmounts'), 'Duo entitlement application does not preserve the 1.25 currency contract'],
  [migration.includes('private.coop_room_reward_values') && migration.includes('host room-clear checkpoint required') && migration.includes('* 1.25'), 'server reward values or host clear authority is missing'],
];
const sourceFailures = sourceChecks.filter(([ok]) => !ok).map(([, message]) => message);
assert(sourceFailures.length === 0, sourceFailures.join('; '));

const report = simulateDuoCombatMatrixV4();
assert(report.buildCount === 7, `expected seven canonical builds, found ${report.buildCount}`);
assert(report.pairCount === 28, `expected 28 unordered build pairings, found ${report.pairCount}`);
assert(report.loadoutProfileCount === 5, `expected five loadout profiles, found ${report.loadoutProfileCount}`);
assert(report.loadoutOrientationCount === 8, `expected eight oriented loadouts, found ${report.loadoutOrientationCount}`);
assert(report.checkpointCount === 11, `expected eleven normal, elite and boss checkpoints, found ${report.checkpointCount}`);
assert(report.scenarioCount === 7392, `expected 7392 connected and disconnect scenarios, found ${report.scenarioCount}`);

for (const row of report.rows) {
  const label = `${row.pair.join('+')}/${row.loadout}/${row.orientation}/${row.chapter}:${row.room}/${row.connectivity}${row.survivorIndex === null ? '' : `:${row.survivorIndex}`}`;
  assert(Number.isFinite(row.ttkSeconds) && row.ttkSeconds > 0, `${label} has invalid TTK`);
  assert(Number.isFinite(row.totalDps) && row.totalDps > 0, `${label} has invalid player DPS`);
  assert(row.enemyCount >= 1 && row.enemyCount <= 12, `${label} escapes the twelve-enemy mobile cap`);
  assert(row.supportCount >= 0 && row.supportCount <= 2, `${label} escapes the support cap`);
  assert(row.attackCooldownMs.every(value => value >= 125), `${label} falls below the attack cooldown floor`);
  assert(row.localProjectileLoad <= 35, `${label} exceeds the local projectile budget`);
  assert(row.mobileControlScore >= 0.27, `${label} falls below the mobile control floor`);
  assert(row.damageReceived.length === (row.connectivity === 'connected' ? 2 : 1), `${label} has incomplete incoming-damage accounting`);
  assert(row.damageReceived.every(value => Number.isFinite(value) && value >= 1), `${label} has invalid incoming damage`);

  if (row.connectivity === 'connected') {
    const fastestSolo = Math.min(...row.soloBaselines);
    const slowestSolo = Math.max(...row.soloBaselines);
    assert(row.survivorIndex === null, `${label} carries a survivor index while connected`);
    assert(Math.min(...row.contributionShares) >= 0.18, `${label} makes one player effectively irrelevant`);
    assert(row.ttkSeconds >= fastestSolo * 1.02, `${label} makes Duo faster than the strongest Solo baseline`);
    assert(row.ttkSeconds <= slowestSolo * 1.20, `${label} makes Duo slower than the weaker Solo baseline by too much`);
  } else {
    const survivorSolo = row.soloBaselines[row.survivorIndex];
    const ratio = row.ttkSeconds / survivorSolo;
    assert(row.disconnectHpFactor === 0.78 && row.disconnectAttackFactor === 0.92, `${label} does not use the canonical disconnect fallback`);
    assert(ratio >= 1.65, `${label} over-reduces the disconnected room`);
    assert(ratio <= 1.90, `${label} leaves the disconnected player with excessive endurance`);
  }
}

const find = (first, second, loadout, orientation, chapter, room, connectivity, survivorIndex = null) => report.rows.find(row => (
  row.pair[0] === first && row.pair[1] === second && row.loadout === loadout && row.orientation === orientation
  && row.chapter === chapter && row.room === room && row.connectivity === connectivity && row.survivorIndex === survivorIndex
));
const starterOpening = find('starter', 'starter', 'none', 'symmetric', 1, 1, 'connected');
const maximumFinalBoss = find('maximum', 'maximum', 'maximum', 'symmetric', 10, 50, 'connected');
const maximumDisconnect = find('maximum', 'maximum', 'maximum', 'symmetric', 10, 50, 'disconnected', 0);
const tankFinalBoss = find('tank', 'tank', 'resilience', 'forward', 10, 50, 'connected');
assert(starterOpening && starterOpening.ttkSeconds >= 6 && starterOpening.ttkSeconds <= 8, 'starter Duo opening pace escaped its intended band');
assert(maximumFinalBoss && maximumFinalBoss.ttkSeconds >= 55 && maximumFinalBoss.ttkSeconds <= 70, 'maximum Duo final-boss pace escaped its intended band');
assert(maximumDisconnect && maximumDisconnect.ttkSeconds > maximumFinalBoss.ttkSeconds * 1.45 && maximumDisconnect.ttkSeconds < maximumFinalBoss.ttkSeconds * 1.65, 'maximum-build disconnect fallback escaped its measured band');
assert(tankFinalBoss && tankFinalBoss.ttkSeconds > maximumFinalBoss.ttkSeconds * 3, 'tank pair does not preserve its damage tradeoff');

console.log(JSON.stringify({
  buildCount: report.buildCount,
  pairCount: report.pairCount,
  loadoutProfileCount: report.loadoutProfileCount,
  loadoutOrientationCount: report.loadoutOrientationCount,
  checkpointCount: report.checkpointCount,
  scenarioCount: report.scenarioCount,
  maximumLocalProjectileLoad: Math.max(...report.rows.map(row => row.localProjectileLoad)),
  minimumMobileControlScore: Math.min(...report.rows.map(row => row.mobileControlScore)),
  references: { starterOpening, maximumFinalBoss, maximumDisconnect, tankFinalBoss },
}, null, 2));
console.log('Duo combat matrix V4 passed: all build pairings, relic/gift orientations, normal/elite/boss checkpoints, disconnect survivors and server-authoritative rewards remain bounded.');
