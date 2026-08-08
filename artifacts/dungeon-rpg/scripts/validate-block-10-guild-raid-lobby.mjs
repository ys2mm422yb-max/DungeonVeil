import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [entry, panel, lobbyCss, client, evidence, migrationBase, migrationActionsA, migrationActionsB, migrationStart] = await Promise.all([
  read('../src/components/GuildSocialPanel.tsx'), read('../src/components/GuildRaidLobbyPanel.tsx'), read('../src/components/guildRaidLobby.css'), read('../src/game/guildRaidLobbyOnline.ts'), read('../tests/guild-raid-lobby-mobile.spec.mjs'), read('../../../supabase/migrations/20260726113000_guild_raid_lobby_block_10.sql'), read('../../../supabase/migrations/20260726113100_guild_raid_lobby_actions_a.sql'), read('../../../supabase/migrations/20260726113200_guild_raid_lobby_actions_b.sql'), read('../../../supabase/migrations/20260726113300_guild_raid_lobby_start_realtime.sql'),
]);
const migration = [migrationBase, migrationActionsA, migrationActionsB, migrationStart].join('\n');
const publicFunctions = ['guild_raid_get_snapshot','guild_raid_list_my_invitations','guild_raid_create_lobby','guild_raid_invite_member','guild_raid_cancel_invite','guild_raid_respond_invite','guild_raid_set_ready','guild_raid_remove_member','guild_raid_leave_lobby','guild_raid_dissolve_lobby','guild_raid_start'];
const securityDefiners = (migration.match(/security definer/gi) ?? []).length;
const emptySearchPaths = (migration.match(/set search_path = ''/gi) ?? []).length;
const mutationIdempotency = ['guild_raid_create_lobby(p_idempotency_key uuid)','p_target_user_id uuid,\n  p_idempotency_key uuid','guild_raid_cancel_invite(\n  p_invitation_id uuid,\n  p_idempotency_key uuid','p_accept boolean,\n  p_idempotency_key uuid','p_ready boolean,\n  p_idempotency_key uuid','guild_raid_remove_member(','guild_raid_leave_lobby(','guild_raid_dissolve_lobby(','guild_raid_start('].every(fragment => migration.includes(fragment));
const germanVisualCopy = ["de ? 'Live-Sync' : 'Live'","de ? 'Serverstand' : 'Snapshot'","de ? 'Bereit' : 'Ready'","de ? 'Stand' : 'Server'","de ? `Platz ${index + 1}` : `Slot ${index + 1}`","member.ready ? (de ? 'Bereit' : 'Ready') : (de ? 'Nicht bereit' : 'Not ready')","de ? 'Raid-Übergabe bereit' : 'Raid handoff ready'"].every(fragment => panel.includes(fragment));
const noCssTranslationMask = !lobbyCss.includes("[aria-label='Gildenraid-Lobby']") && !lobbyCss.includes("content: 'Bereit'") && !lobbyCss.includes("content: 'Platz 1'");
const navigationMonitorContract = evidence.includes('page.__dungeonVeilIntentionalNavigation = false')
  && evidence.includes('const intentionallyNavigating = () => page.__dungeonVeilIntentionalNavigation === true')
  && evidence.includes("if (!intentionallyNavigating()) issues.push(`pageerror: ${error.message}`)")
  && evidence.includes("message.type() !== 'error' || intentionallyNavigating()")
  && evidence.includes('if (intentionallyNavigating()) return;')
  && evidence.includes('page.__dungeonVeilIntentionalNavigation = true;')
  && evidence.includes("try { await page.reload({ waitUntil: 'domcontentloaded' }); } finally { page.__dungeonVeilIntentionalNavigation = false; }")
  && evidence.includes("expect(issues, issues.join('\\n')).toEqual([])");
const checks = [
  [entry.includes('guild-raid-entry') && entry.includes('<GuildRaidLobbyPanel') && !entry.includes('!qaMode && raidOpen'), 'guild raid entry is not mounted consistently inside the guild surface'],
  [panel.includes('guild-raid-guildless-blocked') && panel.includes('guild-raid-incoming-invitations'), 'guildless or invitation states are missing'],
  [panel.includes('guild-raid-slots') && panel.includes('Array.from({ length: 4 }') && panel.includes('guild-raid-slot-'), 'four stable visible slots are missing'],
  [panel.includes('cancelGuildRaidInvitation') && panel.includes('removeGuildRaidMember') && panel.includes('dissolveGuildRaidLobby'), 'leader administration controls are incomplete'],
  [panel.includes('guild-raid-landscape-blocker') && panel.includes('min-h-11') && !panel.includes('min-h-10') && panel.includes('h-11 w-11'), 'landscape lock or 44px touch-target contract is incomplete'],
  [germanVisualCopy && noCssTranslationMask, 'German guild raid lobby copy is not localized in React or still depends on a CSS text mask'],
  [client.includes('/rest/v1/rpc/') && client.includes('/realtime/v1/websocket') && client.includes('postgres_changes') && client.includes('heartbeat'), 'authoritative RPC or Supabase Realtime client is incomplete'],
  [client.includes('version > knownVersion + 1') && panel.includes('fetchGuildRaidLobbySnapshot'), 'version-gap snapshot reconciliation is missing'],
  [migration.includes('create table public.guild_raid_lobbies') && migration.includes('create table public.guild_raid_lobby_members') && migration.includes('create table public.guild_raid_invitations') && migration.includes('create table public.guild_raid_runs') && migration.includes('create table public.guild_raid_participants') && migration.includes('create table public.guild_raid_room_states'), 'required persistent lobby/run handoff entities are missing'],
  [migration.includes('slot smallint') && migration.includes('slot between 1 and 4') && migration.includes('guild_raid_lobby_members_slot_uidx') && migration.includes('guild_raid_lobby_members_active_user_uidx'), 'stable slot or unique active membership constraints are incomplete'],
  [migration.includes('all four players must remain active members of the same guild') && migration.includes('raid participant freeze failed'), 'same-guild start revalidation or four-participant freeze is missing'],
  [migration.includes("status = 'starting'") && migration.includes("status = 'started'") && migration.includes('on conflict (lobby_id) do nothing'), 'atomic single-run start transition is incomplete'],
  [mutationIdempotency && migration.includes('guild_raid_lobby_events') && migration.includes('idempotency_key uuid not null unique'), 'mutating RPC idempotency ledger is incomplete'],
  [securityDefiners > 0 && securityDefiners === emptySearchPaths && !migration.includes('set search_path = public'), 'SECURITY DEFINER functions do not all use a fixed empty search path'],
  [publicFunctions.every(name => migration.includes(`revoke all on function public.${name}`)) && publicFunctions.every(name => migration.includes(`grant execute on function public.${name}`)), 'RPC execute privileges are not explicitly revoked and re-granted'],
  [migration.includes('enable row level security') && migration.includes('private.is_guild_raid_lobby_member') && migration.includes('private.is_guild_raid_run_participant'), 'non-recursive participant-scoped RLS helpers are missing'],
  [migration.includes('public.profiles') && !migration.includes('public.player_profiles'), 'migration references the wrong profile table'],
  [migration.includes('alter publication supabase_realtime add table public.guild_raid_lobbies') && migration.includes('alter publication supabase_realtime add table public.guild_raid_lobby_members'), 'Realtime publication setup is missing'],
  [!client.toLowerCase().includes('duo') && !panel.toLowerCase().includes('duo') && !migration.includes('coop_lobb'), 'guild raid lobby improperly reuses Duo state'],
  [evidence.includes('iphone-webkit') || evidence.includes('testInfo.project.name'), 'mobile evidence is not project-specific'],
  [evidence.includes('guild-raid-landscape-blocker') && evidence.includes('guild-raid-started-handoff') && evidence.includes('guild-raid-incoming-invitations'), 'required runtime states are not covered by evidence'],
  [navigationMonitorContract, 'guild raid runtime monitor must suppress errors only during explicitly flagged intentional reload navigation while keeping strict issue assertions'],
];
const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) { console.error(`Block 10 guild raid lobby audit failed with ${failures.length} error(s):`); failures.forEach(message => console.error(`  - ${message}`)); process.exit(1); }
console.log(`Block 10 guild raid lobby audit passed: ${securityDefiners} hardened functions, four stable same-guild slots, React-localized German copy, complete lobby controls, strict intentional-navigation runtime monitoring, Realtime reconciliation and exact-once server start are present.`);
