import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [migration, client, overlay, socialPanel] = await Promise.all([
  read('../../../supabase/migrations/20260718214000_add_guild_search_and_join_requests.sql'),
  read('../src/game/guildSearchOnline.ts'),
  read('../src/components/GuildAccessOverlay.tsx'),
  read('../src/components/GuildSocialPanel.tsx'),
]);

const functionNames = [
  'search_guilds',
  'request_or_join_guild',
  'cancel_guild_join_request',
  'list_guild_join_requests',
  'review_guild_join_request',
  'set_guild_join_policy',
];

const checks = [
  [migration.includes('create table if not exists public.guild_join_requests')
    && migration.includes("status in ('pending', 'accepted', 'declined', 'withdrawn')")
    && migration.includes('unique (guild_id, user_id)'), 'join-request persistence is incomplete'],
  [migration.includes("join_policy in ('open', 'request', 'closed')")
    && migration.includes('max_members between 2 and 50'), 'guild joining rules or capacity are not bounded'],
  [migration.includes('enable row level security')
    && migration.includes('guild_join_requests_read_related')
    && migration.includes('private.is_guild_officer'), 'join requests are not protected by player/officer RLS'],
  [functionNames.every(name => migration.includes(`function public.${name}`)), 'one or more authoritative guild RPCs are missing'],
  [functionNames.every(name => migration.includes(`grant execute on function public.${name}`))
    && functionNames.every(name => migration.includes(`revoke all on function public.${name}`)), 'guild RPC grants or revokes are incomplete'],
  [migration.includes('pg_advisory_xact_lock')
    && migration.includes('for update')
    && migration.includes("raise exception 'already in a guild'")
    && migration.includes("raise exception 'guild is full'"), 'guild membership changes lack race, duplicate or capacity protection'],
  [migration.includes("join_policy = 'open'")
    && migration.includes("join_policy = 'closed'")
    && migration.includes("'requested'::text"), 'open, request and closed join outcomes are incomplete'],
  [client.includes("rpcRows<GuildSearchResult>('search_guilds'")
    && client.includes("rpcRows<GuildJoinActionResult>('request_or_join_guild'")
    && client.includes("authenticatedSupabaseRest<boolean>('rpc/cancel_guild_join_request'"), 'guild discovery client does not use the secure RPC contract'],
  [client.includes("rpcRows<GuildJoinRequest>('list_guild_join_requests'")
    && client.includes("rpcRows<{ request_status: GuildJoinRequestStatus }>('review_guild_join_request'")
    && client.includes("rpcRows<{ join_policy: GuildJoinPolicy }>('set_guild_join_policy'"), 'guild officer client contract is incomplete'],
  [overlay.includes("'guild-search-open'")
    && overlay.includes('data-testid="guild-search-input"')
    && overlay.includes('data-testid="guild-search-result"')
    && overlay.includes('data-testid="guild-search-empty"'), 'guild discovery UI lacks its dynamic trigger, search, results or empty state'],
  [overlay.includes('DIREKT BEITRETEN')
    && overlay.includes('BEITRITT ANFRAGEN')
    && overlay.includes('ANFRAGE ZURÜCKZIEHEN')
    && overlay.includes('BEITRITT GESCHLOSSEN'), 'guild cards do not expose all join and pending states'],
  [overlay.includes("'guild-join-requests-open'")
    && overlay.includes('data-testid="guild-join-request"')
    && overlay.includes('data-testid="guild-join-policy"')
    && overlay.includes('AUFNEHMEN')
    && overlay.includes('ABLEHNEN'), 'guild officers lack the dynamic request trigger, review or policy controls'],
  [socialPanel.includes("import { GuildAccessOverlay }")
    && socialPanel.includes('<GuildAccessOverlay language={language} />')
    && socialPanel.includes('<GuildPanelMobile'), 'guild discovery is not mounted beside the existing mobile guild panel'],
  [migration.includes("notify pgrst, 'reload schema'"), 'PostgREST schema reload is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Guild search audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

// Revalidated after the Duo projectile integration reached the target branch.
console.log('Guild search audit passed: discovery, RLS, capacity locks, direct joins and officer-reviewed requests share one bounded RPC contract.');
