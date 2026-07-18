import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [foundation, hardening, joinFix, rpcFix, invites, client, panel, mailbox, menu, mode, packageJson] = await Promise.all([
  read('../../../supabase/migrations/20260717180000_add_coop_lobby_foundation.sql'),
  read('../../../supabase/migrations/20260717183000_harden_coop_lobby_helper.sql'),
  read('../../../supabase/migrations/20260718180000_fix_coop_join_invite_code_ambiguity.sql'),
  read('../../../supabase/migrations/20260718203000_fix_coop_rpc_output_column_ambiguities.sql'),
  read('../../../supabase/migrations/20260718190000_add_coop_direct_social_invites.sql'),
  read('../src/game/coopLobbyOnline.ts'),
  read('../src/components/CoopLobbyPanel.tsx'),
  read('../src/components/MailboxPanel.tsx'),
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/game/coopRunMode.ts'),
  read('../package.json'),
]);

const checks = [
  [foundation.includes('create table if not exists public.coop_lobbies') && foundation.includes('create table if not exists public.coop_lobby_members'), 'co-op lobby tables are missing'],
  [foundation.includes('max_players smallint not null default 2 check (max_players = 2)') && foundation.includes('coop_lobby_members_one_active_lobby_uidx'), 'two-player or one-active-lobby limits are missing'],
  [foundation.includes('alter table public.coop_lobbies enable row level security') && hardening.includes('private.is_coop_lobby_member'), 'co-op table protection is incomplete'],
  [joinFix.includes('where lobby.invite_code = v_code') && joinFix.includes("lobby.status in ('waiting', 'ready')") && joinFix.includes('for update of lobby'), 'initial join RPC lookup qualification is missing'],
  [rpcFix.includes('where target_lobby.invite_code = v_code') && rpcFix.includes('for update of target_lobby'), 'final join RPC lookup is not fully qualified'],
  [rpcFix.includes('on conflict on constraint coop_lobby_members_pkey') && !rpcFix.includes('on conflict (lobby_id, user_id)'), 'join RPC still uses ambiguous conflict columns'],
  [rpcFix.includes('create or replace function public.set_coop_lobby_ready') && rpcFix.includes('target_member.lobby_id = v_lobby.id') && rpcFix.includes('bool_and(active_member.ready)'), 'ready RPC still contains ambiguous member fields'],
  [rpcFix.includes('create or replace function public.start_coop_lobby') && rpcFix.includes('target_lobby.host_user_id = v_user_id') && rpcFix.includes('greatest(target_lobby.expires_at'), 'start RPC still contains ambiguous lobby fields'],
  [rpcFix.includes("pg_notify('pgrst', 'reload schema')"), 'PostgREST schema is not reloaded after the RPC migration'],
  [invites.includes('list_coop_invite_candidates') && invites.includes('send_coop_lobby_invite'), 'direct invite RPCs are missing'],
  [invites.includes('friendship or shared guild required') && invites.includes("activity_state <> 'menu'") && invites.includes("interval '2 minutes'"), 'invite availability checks are incomplete'],
  [invites.includes("'kind', 'coop_invite'") && invites.includes("'coop-invite:'") && invites.includes('player_mailbox'), 'personal mailbox delivery is missing'],
  [client.includes('listCoopInviteCandidates') && client.includes('sendCoopLobbyInvite') && client.includes('COOP_LOBBY_OPEN_EVENT'), 'direct invite client contract is missing'],
  [panel.includes('data-testid="coop-direct-invites"') && panel.includes('ONLINE DIREKT EINLADEN') && panel.includes('coop-code-help'), 'direct invite list or code guidance is missing'],
  [panel.includes('COOP_PLAYER_LIMIT') && panel.includes('bothReady') && !panel.includes('Solo unverändert'), 'Duo readiness or cleaned-up copy is incomplete'],
  [mailbox.includes('isCoopInvite') && mailbox.includes('answerCoopInvite') && mailbox.includes('openCoopLobbyPanel'), 'mailbox invitation actions are missing'],
  [menu.includes('COOP_LOBBY_OPEN_EVENT') && menu.includes('window.setInterval(refreshUnread, 5_000)'), 'automatic mailbox refresh or lobby opening is missing'],
  [mode.includes("SOLO_BALANCE_POLICY = 'immutable'") && mode.includes('COOP_PLAYER_LIMIT = 2'), 'run-mode isolation contract is missing'],
  [packageJson.includes('validate-coop-lobby-foundation.mjs'), 'co-op lobby audit is not wired into CI'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Co-op lobby foundation audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Co-op lobby foundation passed: private two-player lobbies, unambiguous RPCs and direct online social invitations are integrated.');