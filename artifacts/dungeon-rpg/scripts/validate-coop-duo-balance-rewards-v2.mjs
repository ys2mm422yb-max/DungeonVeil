import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [balance, reward, session, persistence, migration] = await Promise.all([
  read('../src/game/coopDuoBalance.ts'),
  read('../src/game/chapterRewardContract.ts'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/components/CoopRunPersistenceBridge.tsx'),
  read('../../../supabase/migrations/20260719024500_add_coop_run_persistence_and_rewards.sql'),
]);

const checks = [
  [balance.includes('DUO_NORMAL_HP_MULTIPLIER = 1.65') && balance.includes('DUO_ELITE_HP_MULTIPLIER = 1.8') && balance.includes('DUO_BOSS_HP_MULTIPLIER = 2'), 'Duo HP scaling contract changed'],
  [balance.includes('DUO_ENEMY_ATTACK_MULTIPLIER = 1.12') && balance.includes('DUO_ENEMY_COUNT_MULTIPLIER = 1.25') && balance.includes('DUO_MOBILE_ENEMY_CAP = 12'), 'Duo attack, count or mobile cap contract changed'],
  [balance.includes('DUO_CURRENCY_MULTIPLIER = 1.25'), 'Duo currency multiplier changed'],
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

console.log('Duo combat scaling, mobile cap, server-authoritative 1.25 currency rewards and unchanged Solo routing validated.');
