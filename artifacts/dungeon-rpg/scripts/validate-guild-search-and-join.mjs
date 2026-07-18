import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [migration, client, overlay, socialPanel, mobilePanel] = await Promise.all([
  read('../../../supabase/migrations/20260718214000_add_guild_search_and_join_requests.sql'),
  read('../src/game/guildSearchOnline.ts'),
  read('../src/components/GuildAccessOverlay.tsx'),
  read('../src/components/GuildSocialPanel.tsx'),
  read('../src/components/GuildPanelMobile.tsx'),
]);

const checks = [
  [migration.includes("join_policy text not null default 'request'") && migration.includes("check (join_policy in ('open', 'request', 'closed'))"), 'guild join policy is missing or unbounded'],
  [migration.includes('max_members smallint not null default 30') && migration.includes('max_members between 2 and 50'), 'guild member cap is missing or unsafe'],
  [migration.includes('create table if not exists public.guild_join_requests') && migration.includes("status in ('pending', 'accepted', 'declined', 'withdrawn')") && migration.includes('unique (guild_id, user_id)'), 'join request storage is missing or not idempotent'],
  [migration.includes('alter table public.guild_join_requests enable row level security') && migration.includes('guild_join_requests_read_related') && migration.includes('private.is_guild_officer(guild_id)'), 'join request RLS does not restrict requests to the player and guild officers'],
  [migration.includes('create or replace function public.search_guilds') && migration.includes('member_count bigint') && migration.includes('request_status text') && migration.includes('limit 30'), 'bounded guild search RPC is incomplete'],
  [migration.includes('create or replace function public.request_or_join_guild') && migration.includes("v_guild.join_policy = 'open'") && migration.includes("v_guild.join_policy = 'closed'") && migration.includes("'requested'::text"), 'open, request and closed join paths are incomplete'],
  [migration.includes('pg_advisory_xact_lock') && migration.includes('select * into v_guild from public.guilds where id = p_guild_id for update') && migration.includes('v_member_count >= v_guild.max_members'), 'guild join is not protected against races or full guilds'],
  [migration.includes('exists (select 1 from public.guild_members where user_id = v_user_id)') && migration.includes("raise exception 'already in a guild'"), 'guild join does not enforce one membership per player'],
  [migration.includes('create or replace function public.list_guild_join_requests') && migration.includes('create or replace function public.review_guild_join_request') && migration.includes('private.is_guild_officer'), 'guild officers cannot securely review requests'],
  [migration.includes('create or replace function public.cancel_guild_join_request') && migration.includes("status = 'withdrawn'"), 'players cannot withdraw pending requests'],
  [migration.includes('create or replace function public.set_guild_join_policy') && migration.includes("v_policy not in ('open', 'request', 'closed')"), 'officers cannot safely set the guild join policy'],
  [migration.includes('revoke all on function public.search_guilds') && migration.includes('grant execute on function public.search_guilds') && migration.includes("notify pgrst, 'reload schema'"), 'guild RPC permissions or PostgREST reload is missing'],
  [client.includes('searchGuildsOnline') && client.includes('requestOrJoinGuildOnline') && client.includes('cancelGuildJoinRequestOnline'), 'guild discovery client is incomplete'],
  [client.includes('listGuildJoinRequestsOnline') && client.includes('reviewGuildJoinRequestOnline') && client.includes('setGuildJoinPolicyOnline'), 'guild request management client is incomplete'],
  [overlay.includes('data-testid="guild-search-open"') && overlay.includes('data-testid="guild-search-input"') && overlay.includes('data-testid="guild-search-result"'), 'players without a guild lack a searchable guild result UI'],
  [overlay.includes('DIREKT BEITRETEN') && overlay.includes('BEITRITT ANFRAGEN') && overlay.includes('BEITRITT GESCHLOSSEN'), 'guild result cards do not explain open, request and closed joining'],
  [overlay.includes('ANFRAGE ZURÜCKZIEHEN') && overlay.includes("request_status === 'pending'"), 'pending request state is not visible or cancellable'],
  [overlay.includes('data-testid="guild-join-requests-open"') && overlay.includes('data-testid="guild-join-request"') && overlay.includes('AUFNEHMEN') && overlay.includes('ABLEHNEN'), 'guild officers lack mobile request review controls'],
  [overlay.includes('data-testid="guild-join-policy"') && overlay.includes("(['open', 'request', 'closed'] as GuildJoinPolicy[])"), 'mobile guild policy controls are missing'],
  [socialPanel.includes('<GuildAccessOverlay language={language} />') && socialPanel.includes('<GuildPanelMobile'), 'guild search overlay is not mounted in the active mobile guild route'],
  [mobilePanel.includes('data-testid="guild-panel-shell"') && mobilePanel.includes('GuildChatPanel') && mobilePanel.includes('data-testid="guild-members-tab"'), 'existing mobile guild chat or member management was replaced instead of extended'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Guild search audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Guild search audit passed: players can discover open/request guilds while RLS and officer-only RPCs protect membership changes.');
