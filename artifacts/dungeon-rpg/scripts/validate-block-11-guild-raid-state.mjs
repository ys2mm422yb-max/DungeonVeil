import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [client, migration, plan] = await Promise.all([
  read('../src/game/guildRaidRunOnline.ts'),
  read('../../../supabase/migrations/20260726130000_guild_raid_synchronized_state_block_11.sql'),
  read('../../../docs/BLOCK_11_SYNCHRONIZED_RAID_STATE_EXECUTION_PLAN.md'),
]);

const publicFunctions = [
  'guild_raid_get_run_snapshot',
  'guild_raid_rejoin',
  'guild_raid_mark_disconnected',
  'guild_raid_mutate_state',
  'guild_raid_abort_run',
];

const checks = [
  [migration.includes('create table public.guild_raid_player_states') && migration.includes('create table public.guild_raid_run_events'), 'canonical player-state or idempotency-event table is missing'],
  [migration.includes('unique (raid_run_id, idempotency_key)') && migration.includes('select event.response into v_existing'), 'exact-once mutation replay contract is missing'],
  [migration.includes('stale raid state version') && migration.includes('v_next_version := v_run.state_version + 1'), 'stale-version rejection or monotonic version increment is missing'],
  [migration.includes("status not in ('created', 'active')") && migration.includes('raid run is not mutable'), 'terminal run mutation lockout is missing'],
  [migration.includes("disconnect_deadline_at = clock_timestamp() + interval '5 minutes'") && migration.includes("set status = 'active'"), 'disconnect grace period or authoritative rejoin restoration is missing'],
  [migration.includes('private.guild_raid_assert_active_participant') && migration.includes('private.guild_raid_build_run_snapshot'), 'participant authorization or canonical snapshot helper is missing'],
  [migration.includes('guild_raid_participants') && migration.includes('guild_raid_room_states') && migration.includes('guild_raid_player_states'), 'participant, room and player state are not joined into the canonical snapshot'],
  [migration.includes('room.mechanic_state || p_room_mechanic_patch') && migration.includes('enemy_state = coalesce(p_enemy_state, room.enemy_state)') && migration.includes('boss_state = case when p_boss_state is null'), 'room mechanic, enemy or boss state synchronization is incomplete'],
  [migration.includes("set status = 'abandoned'") && migration.includes("event_type") && migration.includes("'run_aborted'"), 'authoritative abort event or terminal status transition is missing'],
  [migration.includes('enable row level security') && migration.includes('private.is_guild_raid_run_participant'), 'participant-scoped RLS is missing'],
  [!migration.includes('grant insert') && !migration.includes('grant update') && !migration.includes('grant delete'), 'direct authenticated writes were granted to canonical raid tables'],
  [publicFunctions.every(name => migration.includes(`revoke all on function public.${name}`)) && publicFunctions.every(name => migration.includes(`grant execute on function public.${name}`)), 'RPC execute privileges are not explicitly hardened'],
  [(migration.match(/security definer/gi) ?? []).length === (migration.match(/set search_path = ''/gi) ?? []).length, 'SECURITY DEFINER functions do not all use an empty fixed search path'],
  [migration.includes('alter publication supabase_realtime add table public.guild_raid_runs') && migration.includes('alter publication supabase_realtime add table public.guild_raid_player_states'), 'required Realtime publications are missing'],
  [client.includes("rpc('guild_raid_get_run_snapshot'") && client.includes("rpc('guild_raid_rejoin'") && client.includes("rpc('guild_raid_mark_disconnected'") && client.includes("rpc('guild_raid_mutate_state'") && client.includes("rpc('guild_raid_abort_run'"), 'client adapter does not cover all authoritative Block 11 RPCs'],
  [client.includes('version > knownVersion + 1') && client.includes('postgres_changes') && client.includes('heartbeat'), 'Realtime version-gap reconciliation or heartbeat is missing'],
  [client.includes('guild_raid_runs') && client.includes('guild_raid_participants') && client.includes('guild_raid_room_states') && client.includes('guild_raid_player_states'), 'Realtime subscriptions do not cover the complete synchronized state surface'],
  [!client.toLowerCase().includes('duo') && !migration.includes('coop_lobb'), 'Block 11 improperly reuses Duo state'],
  [plan.includes('Gleicher Request-Key erzeugt genau eine Mutation') && plan.includes('Veraltete Version abgewiesen') && plan.includes('Abbruch sperrt weitere Mutationen'), 'execution plan does not preserve the required exact-once, stale-version and abort tests'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Block 11 synchronized raid state audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Block 11 synchronized raid state audit passed: participant-scoped canonical snapshots, exact-once mutations, monotonic versions, disconnect/rejoin, terminal lockout and isolated Realtime synchronization are present.');
