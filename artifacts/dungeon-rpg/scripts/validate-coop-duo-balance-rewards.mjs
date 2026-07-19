import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [balance, targets, reward, session, persistence, migration] = await Promise.all([
  read('../src/game/coopDuoBalanceV4.ts'),
  read('../src/game/buildBalanceV4.ts'),
  read('../src/game/chapterRewardContract.ts'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/components/CoopRunPersistenceBridge.tsx'),
  read('../../../supabase/migrations/20260719024500_add_coop_run_persistence_and_rewards.sql'),
]);

const checks = [
  [targets.includes('normalHp: 1.72') && targets.includes('eliteHp: 1.92') && targets.includes('bossHp: 2.18'), 'V4 Duo HP targets are missing'],
  [targets.includes('enemyAttack: 1.16') && targets.includes('spawnFactor: 1.20') && targets.includes('mobileEnemyCap: 12'), 'V4 Duo pressure or mobile cap is missing'],
  [balance.includes('DUO_CURRENCY_MULTIPLIER = 1.25'), 'Duo currency multiplier changed'],
  [balance.includes('applyDuoDisconnectFallback') && targets.includes('disconnectHpFactor: 0.78') && targets.includes('disconnectAttackFactor: 0.92'), 'fair disconnect fallback is missing'],
  [reward.includes('currencyMultiplier?: number') && reward.includes('skipEquipmentDrop?: boolean'), 'chapter reward contract cannot separate currency and shared equipment'],
  [session.includes('dispatchCoopRoomClear') && session.includes('if (duo)') && session.includes('rewardChapterRoomClear(engine.state.chapter, engine.state.floor)'), 'Duo room rewards are not server-routed or Solo flow changed'],
  [persistence.includes('currencyMultiplier: 1.25') && persistence.includes('skipEquipmentDrop: true') && persistence.includes('expectedDuoAmounts'), 'Duo entitlement application does not preserve the 1.25 currency contract'],
  [migration.includes('private.coop_room_reward_values') && migration.includes('host room-clear checkpoint required') && migration.includes('* 1.25'), 'server reward values or host clear authority is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}

console.log('V4 Duo build scaling, disconnect fallback, mobile cap, server-authoritative 1.25 currency rewards and unchanged Solo routing validated.');
