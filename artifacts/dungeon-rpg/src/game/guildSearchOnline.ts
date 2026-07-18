import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

export type GuildJoinPolicy = 'open' | 'request' | 'closed';
export type GuildJoinRequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export type GuildSearchResult = {
  guild_id: string;
  name: string;
  tag: string;
  description: string;
  join_policy: GuildJoinPolicy;
  max_members: number;
  member_count: number;
  request_status: GuildJoinRequestStatus | null;
};

export type GuildJoinActionResult = {
  guild_id: string;
  action: 'joined' | 'requested';
  request_status: GuildJoinRequestStatus;
  member_count: number;
  max_members: number;
};

export type GuildJoinRequest = {
  request_id: string;
  user_id: string;
  display_name: string;
  avatar_key: string | null;
  status: GuildJoinRequestStatus;
  created_at: string;
};

function requireOnline() {
  if (!currentOnlineSession()) throw new Error('Für die Gildensuche musst du angemeldet sein.');
}

async function rpcRows<T>(name: string, body: Record<string, unknown> = {}): Promise<T[]> {
  requireOnline();
  return authenticatedSupabaseRest<T[]>(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function searchGuildsOnline(query = ''): Promise<GuildSearchResult[]> {
  return rpcRows<GuildSearchResult>('search_guilds', { p_query: query.trim().slice(0, 40) });
}

export async function requestOrJoinGuildOnline(guildId: string): Promise<GuildJoinActionResult> {
  const rows = await rpcRows<GuildJoinActionResult>('request_or_join_guild', { p_guild_id: guildId });
  if (!rows[0]) throw new Error('Gildenbeitritt konnte nicht verarbeitet werden.');
  return rows[0];
}

export async function cancelGuildJoinRequestOnline(guildId: string): Promise<boolean> {
  requireOnline();
  return authenticatedSupabaseRest<boolean>('rpc/cancel_guild_join_request', {
    method: 'POST',
    body: JSON.stringify({ p_guild_id: guildId }),
  });
}

export async function listGuildJoinRequestsOnline(guildId: string): Promise<GuildJoinRequest[]> {
  return rpcRows<GuildJoinRequest>('list_guild_join_requests', { p_guild_id: guildId });
}

export async function reviewGuildJoinRequestOnline(requestId: string, accept: boolean): Promise<GuildJoinRequestStatus> {
  const rows = await rpcRows<{ request_status: GuildJoinRequestStatus }>('review_guild_join_request', {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (!rows[0]) throw new Error('Gildenanfrage konnte nicht bearbeitet werden.');
  return rows[0].request_status;
}

export async function setGuildJoinPolicyOnline(guildId: string, policy: GuildJoinPolicy): Promise<GuildJoinPolicy> {
  const rows = await rpcRows<{ join_policy: GuildJoinPolicy }>('set_guild_join_policy', {
    p_guild_id: guildId,
    p_join_policy: policy,
  });
  if (!rows[0]) throw new Error('Beitrittsregel konnte nicht gespeichert werden.');
  return rows[0].join_policy;
}
