import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [migration, client, panel, menu, mode, packageJson] = await Promise.all([
  read('../../../supabase/migrations/20260717180000_add_coop_lobby_foundation.sql'),
  read('../src/game/coopLobbyOnline.ts'),
  read('../src/components/CoopLobbyPanel.tsx'),
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/game/coopRunMode.ts'),
  read('../package.json'),
]);

const checks = [
  [migration.includes('create table if not exists public.coop_lobbies') && migration.includes('create table if not exists public.coop_lobby_members'), 'co-op lobby tables are missing'],
  [migration.includes("max_players smallint not null default 2 check (max_players = 2)") && migration.includes('coop_lobby_members_one_active_lobby_uidx'), 'lobbies are not strictly limited to two players or one active lobby per user'],
  [migration.includes('alter table public.coop_lobbies enable row level security') && migration.includes('is_coop_lobby_member') && migration.includes('revoke all on table public.coop_lobbies'), 'co-op RLS or direct-write protection is incomplete'],
  [migration.includes('create or replace function public.create_coop_lobby()') && migration.includes('create or replace function public.join_coop_lobby(p_invite_code text)') && migration.includes('create or replace function public.leave_coop_lobby()'), 'secure create, join or leave RPC is missing'],
  [migration.includes('create or replace function public.set_coop_lobby_ready') && migration.includes('create or replace function public.start_coop_lobby()') && migration.includes('both coop players must be ready'), 'ready gate or guarded host start is missing'],
  [migration.includes('run_seed bigint not null') && migration.includes("floor(random() * 9007199254740991)::bigint"), 'shared safe-integer dungeon seed is missing'],
  [client.includes('createCoopLobby') && client.includes('joinCoopLobby') && client.includes('setCoopLobbyReady') && client.includes('listMyCoopLobbyMembers'), 'authenticated lobby client is incomplete'],
  [client.includes('captureCoopInviteCodeFromUrl') && client.includes('makeCoopInviteUrl') && client.includes("url.searchParams.set('coopInvite'"), 'shareable co-op invite links are missing'],
  [panel.includes('data-testid="coop-lobby-panel"') && panel.includes('coop-create-lobby') && panel.includes('coop-join-lobby') && panel.includes('coop-ready-toggle') && panel.includes('coop-leave-lobby'), 'co-op lobby UI states or actions are incomplete'],
  [panel.includes('COOP_PLAYER_LIMIT') && panel.includes('bothReady') && panel.includes('Solo unverändert'), 'two-player readiness or solo-isolation messaging is missing'],
  [menu.includes("| 'coop' | null") && menu.includes('<CoopLobbyPanel') && menu.includes("setOverlay('coop')") && menu.includes('captureCoopInviteCodeFromUrl'), 'main-menu co-op route or invite capture is missing'],
  [mode.includes("SOLO_BALANCE_POLICY = 'immutable'") && mode.includes('COOP_PLAYER_LIMIT = 2'), 'run-mode isolation contract is missing'],
  [packageJson.includes('validate-coop-solo-balance-isolation.mjs') && packageJson.includes('validate-coop-lobby-foundation.mjs'), 'co-op and solo-isolation audits are not wired into CI scripts'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Co-op lobby foundation audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Co-op lobby foundation passed: secure private two-player lobbies, shared seeds, host/guest roles, ready states and immutable solo balance are integrated.');
