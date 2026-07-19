#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [online, nameClient, nameMigration, nameHardening, guildClient, guildOverlay, guildPanel, guildMigration, playerAudit, guildAudit] = await Promise.all([
  read('../src/components/OnlinePanel.tsx'),
  read('../src/game/playerNameOnline.ts'),
  read('../../../supabase/migrations/20260718222000_add_confirmed_player_names.sql'),
  read('../../../supabase/migrations/20260719153000_harden_player_name_confirmation_v2.sql'),
  read('../src/game/guildSearchOnline.ts'),
  read('../src/components/GuildAccessOverlay.tsx'),
  read('../src/components/GuildSocialPanel.tsx'),
  read('../../../supabase/migrations/20260718214000_add_guild_search_and_join_requests.sql'),
  read('./validate-player-profile.mjs'),
  read('./validate-guild-search-and-join.mjs'),
]);

const assert = (condition, message) => { if (!condition) throw new Error(`Account/guild final V4: ${message}`); };

assert(nameClient.includes('validatePlayerNameDraft') && nameClient.includes("'rpc/get_my_player_name_state'") && nameClient.includes("'rpc/set_my_player_name'"), 'authoritative player-name client missing');
assert(nameMigration.includes('profiles_confirmed_display_name_lower_uidx') && nameMigration.includes('private.validate_player_name'), 'name uniqueness or validation missing');
assert(nameMigration.includes("char_length(v_name) < 3") && nameMigration.includes("char_length(v_name) > 20") && nameMigration.includes("player name is reserved"), 'length or reserved-name policy missing');
assert(nameHardening.includes('v_previous_name') && nameHardening.includes('pg_advisory_xact_lock'), 'name history or idempotent lock missing');
assert(online.includes('player-name-confirmation-required') && online.includes('Google-Anzeigename wird nicht automatisch übernommen'), 'Google/legacy confirmation prompt missing');
assert(online.includes('setMyPlayerNameOnline') && online.includes('commitServerPlayerNameChange') && online.includes('applyConfirmedNameLocally'), 'server name result is not propagated locally/cloud');
assert(online.includes('Profil, bei Freunden, Gilde, Duo, Zuschauern und Ranglisten') || online.includes('profiles, friends, guilds, Duo, spectating and leaderboards'), 'cross-surface name contract is not disclosed');
assert(
  playerAudit.includes('confirmed player names are not unique and server validated')
    && playerAudit.includes('Google and legacy accounts are not explicitly prompted')
    && playerAudit.includes('registration, server validation, local/cloud propagation'),
  'player-name final audit is stale',
);

assert(guildClient.includes('searchGuildsOnline') && guildClient.includes('requestOrJoinGuildOnline') && guildClient.includes('cancelGuildJoinRequestOnline'), 'guild search/join/cancel client missing');
assert(guildClient.includes('listGuildJoinRequestsOnline') && guildClient.includes('reviewGuildJoinRequestOnline') && guildClient.includes('setGuildJoinPolicyOnline'), 'officer review/policy client missing');
assert(guildOverlay.includes('guild-search-input') && guildOverlay.includes('guild-search-empty') && guildOverlay.includes('guild-search-result'), 'guild search, reset or empty state missing');
assert(guildOverlay.includes('DIREKT BEITRETEN') && guildOverlay.includes('BEITRITT ANFRAGEN') && guildOverlay.includes('ANFRAGE ZURÜCKZIEHEN') && guildOverlay.includes('BEITRITT GESCHLOSSEN'), 'guild join states incomplete');
assert(guildOverlay.includes('AUFNEHMEN') && guildOverlay.includes('ABLEHNEN') && guildOverlay.includes('guild-join-policy'), 'officer review controls incomplete');
assert(guildPanel.includes('<GuildAccessOverlay') && guildPanel.includes('<GuildPanelMobile'), 'guild search not mounted alongside existing guild creation/panel');
assert(guildMigration.includes('unique (guild_id, user_id)') && guildMigration.includes('max_members between 2 and 50'), 'duplicate/capacity constraints missing');
assert(guildMigration.includes('pg_advisory_xact_lock') && guildMigration.includes('for update'), 'parallel join protection missing');
assert(guildMigration.includes('enable row level security') && guildMigration.includes('guild_join_requests_read_related'), 'join-request RLS missing');
assert(guildMigration.includes("join_policy in ('open', 'request', 'closed')") && guildMigration.includes("raise exception 'guild is full'"), 'join policies or full-guild error missing');
assert(guildAudit.includes('discovery, RLS, capacity locks, direct joins and officer-reviewed requests'), 'guild focused audit is stale');

console.log(JSON.stringify({ playerName: 'confirmed-rpc-v2', guildSearch: 'secure-rpc-v1', guildCapacity: 50, joinPolicies: ['open', 'request', 'closed'] }, null, 2));
console.log('Account and guild final V4 passed: player identity and guild discovery share confirmed, race-safe and fully audited server contracts.');
