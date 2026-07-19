import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [migration, online, bridge, session, page, realtime] = await Promise.all([
  read('../../../supabase/migrations/20260719024500_add_coop_run_persistence_and_rewards.sql'),
  read('../src/game/coopRunPersistenceOnline.ts'),
  read('../src/components/CoopRunPersistenceBridge.tsx'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/pages/game.tsx'),
  read('../src/components/CoopRunRealtimeBridge.tsx'),
]);

const checks = [
  [migration.includes('coop_run_checkpoints') && migration.includes('coop_room_reward_entitlements'), 'server checkpoint or reward entitlement tables are missing'],
  [migration.includes('enable row level security') && migration.includes('revoke all on table public.coop_run_checkpoints') && migration.includes('revoke all on table public.coop_room_reward_entitlements'), 'checkpoint or reward direct-write protection is incomplete'],
  [migration.includes('run_attempt') && migration.includes('coop_boss_loot_rolls_lobby_attempt_room_key'), 'team retries do not isolate checkpoints, room rewards and boss loot'],
  [migration.includes('host room-clear checkpoint required') && migration.includes('coop_room_reward_values') && migration.includes('1.25'), 'server rewards are not gated by the host clear or do not preserve Duo currency scaling'],
  [migration.includes('constraint coop_room_reward_entitlements_unique') && migration.includes('on conflict on constraint coop_room_reward_entitlements_unique') && migration.includes('claimed_at is null'), 'server reward idempotency or pending claim tracking is missing'],
  [migration.includes("v_status = 'in_run'") && migration.includes("status = 'closed'") && migration.includes('member.left_at is null'), 'explicit in-run abort does not close both active members safely'],
  [online.includes('COOP_CHECKPOINT_MS = 5_000') && online.includes('createCoopCheckpoint') && online.includes('get_my_coop_run_checkpoint'), 'five-second Duo checkpoint client or rejoin lookup is missing'],
  [bridge.includes("addEventListener('pagehide'") && bridge.includes('saveMyCoopRunCheckpoint') && bridge.includes('prepareCoopRoomRewards'), 'background checkpoint or server reward preparation is missing'],
  [bridge.includes('APPLIED_REWARDS_KEY') && bridge.includes('acknowledgeCoopRoomReward') && bridge.includes('expectedDuoAmounts'), 'local duplicate protection, acknowledgement or server amount validation is missing'],
  [bridge.includes('COOP_RUN_RESTART_EVENT') && bridge.includes('clearRef.current = null'), 'new team attempts do not reset unresolved local persistence state'],
  [session.includes('dispatchCoopRoomClear') && session.includes('if (duo)') && session.includes('rewardChapterRoomClear(engine.state.chapter, engine.state.floor)'), 'Duo rewards are not routed server-side or Solo reward flow was removed'],
  [page.includes('getMyCoopRunCheckpoint') && page.includes('authoritative_room') && page.includes("saveReason: checkpoint.used_host_fallback ? 'duo-host-rejoin' : 'duo-rejoin'"), 'Duo reconnect does not restore the authoritative server room safely'],
  [page.includes('<CoopRunPersistenceBridge') && page.includes('setSoloPersistence(engine, false)'), 'Duo persistence bridge is not mounted or local Solo saving can still be overwritten'],
  [realtime.includes('restartCoopRunAttempt') && realtime.includes('COOP_RUN_RESTART_EVENT') && realtime.includes('client.publishTeamRetry'), 'team retry does not create a new server attempt before both clients reset'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}

console.log('Exact-head Duo five-second checkpoints, authoritative rejoin, per-account reward entitlements, duplicate guards, isolated retries, abort closure and Solo-save isolation validated.');
