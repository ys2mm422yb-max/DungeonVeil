import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [entry, panel, client, migration] = await Promise.all([
  read('../src/components/GuildSocialPanel.tsx'),
  read('../src/components/GuildRaidLobbyPanel.tsx'),
  read('../src/game/guildRaidLobbyOnline.ts'),
  read('../../../supabase/migrations/20260726113000_guild_raid_lobby_block_10.sql'),
]);

const checks = [
  [entry.includes('guild-raid-entry') && entry.includes('<GuildRaidLobbyPanel'), 'guild raid entry is not mounted inside the guild surface'],
  [panel.includes('guild-raid-slots') && panel.includes('snapshot.slots.map') && panel.includes('filled === 4') && panel.includes('ready === 4'), 'four stable slots or start eligibility is missing'],
  [panel.includes('inviteGuildRaidMember') && panel.includes('setGuildRaidReady') && panel.includes('leaveGuildRaidLobby') && panel.includes('startGuildRaidLobby'), 'lobby controls are incomplete'],
  [client.includes('/rest/v1/rpc/') && client.includes('guild_raid_create_or_get_lobby') && client.includes('guild_raid_start_lobby'), 'server-authoritative RPC client is incomplete'],
  [migration.includes('create table if not exists public.guild_raid_lobbies') && migration.includes('create table if not exists public.guild_raid_lobby_members') && migration.includes('create table if not exists public.guild_raid_invitations') && migration.includes('create table if not exists public.guild_raid_runs'), 'required persistent entities are missing'],
  [migration.includes('slot smallint not null check (slot between 1 and 4)') && migration.includes('unique (lobby_id, slot)') && migration.includes('guild_raid_members_one_active_lobby'), 'four-slot uniqueness contract is incomplete'],
  [migration.includes('security definer') && migration.includes('set search_path = public, pg_temp') && migration.includes('enable row level security'), 'RPC hardening or RLS is incomplete'],
  [migration.includes("exactly four members required") && migration.includes("all members must be ready") && migration.includes('idempotency_key') && migration.includes('unique (created_by_user_id, idempotency_key)'), 'atomic idempotent start contract is incomplete'],
  [!client.includes('duo') && !panel.includes('duo') && !migration.includes('coop_lobb'), 'guild raid lobby improperly reuses Duo state'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Block 10 guild raid lobby audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Block 10 guild raid lobby audit passed: four stable same-guild slots, explicit readiness and idempotent server start are present.');
