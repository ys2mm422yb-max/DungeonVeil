import { authenticatedSupabaseRest } from './supabaseOnline';

export type GuildSearchResult = {
  guild_id: string;
  guild_name: string;
  guild_tag: string;
  guild_description: string;
  member_count: number;
  request_status: 'pending' | null;
};

export type GuildJoinRequest = {
  request_id: string;
  requester_user_id: string;
  display_name: string;
  avatar_key: string | null;
  created_at: string;
  expires_at: string;
};

export async function searchGuilds(query = ''): Promise<GuildSearchResult[]> {
  return authenticatedSupabaseRest<GuildSearchResult[]>('rpc/search_guilds', {
    method: 'POST',
    body: JSON.stringify({ p_query: query.trim() }),
  });
}

export async function requestGuildJoin(guildId: string): Promise<string> {
  return authenticatedSupabaseRest<string>('rpc/request_guild_join', {
    method: 'POST',
    body: JSON.stringify({ p_guild_id: guildId }),
  });
}

export async function cancelGuildJoinRequest(requestId: string): Promise<boolean> {
  return authenticatedSupabaseRest<boolean>('rpc/cancel_my_guild_join_request', {
    method: 'POST',
    body: JSON.stringify({ p_request_id: requestId }),
  });
}

export async function listGuildJoinRequests(guildId: string): Promise<GuildJoinRequest[]> {
  return authenticatedSupabaseRest<GuildJoinRequest[]>('rpc/list_guild_join_requests', {
    method: 'POST',
    body: JSON.stringify({ p_guild_id: guildId }),
  });
}

export async function answerGuildJoinRequest(requestId: string, accept: boolean): Promise<boolean> {
  return authenticatedSupabaseRest<boolean>('rpc/answer_guild_join_request', {
    method: 'POST',
    body: JSON.stringify({ p_request_id: requestId, p_accept: accept }),
  });
}
