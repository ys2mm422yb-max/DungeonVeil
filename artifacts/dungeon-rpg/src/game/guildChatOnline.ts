import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

export type OnlineGuildChatMessage = {
  id: string;
  guild_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: { id: string; display_name: string; avatar_key: string | null } | null;
};

type MessageRow = Omit<OnlineGuildChatMessage, 'profile'>;
type ChatProfile = NonNullable<OnlineGuildChatMessage['profile']>;

export async function listGuildChatMessages(guildId: string, limit = 50): Promise<OnlineGuildChatMessage[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await authenticatedSupabaseRest<MessageRow[]>(
    `guild_messages?guild_id=eq.${encodeURIComponent(guildId)}&select=id,guild_id,user_id,body,created_at&order=created_at.desc&limit=${safeLimit}`,
  );
  if (!rows.length) return [];
  const ids = [...new Set(rows.map(row => row.user_id))];
  const profiles = await authenticatedSupabaseRest<ChatProfile[]>(
    `profiles?id=in.(${ids.map(id => encodeURIComponent(id)).join(',')})&select=id,display_name,avatar_key`,
  );
  const byId = new Map(profiles.map(profile => [profile.id, profile]));
  return rows.slice().reverse().map(row => ({ ...row, profile: byId.get(row.user_id) ?? null }));
}

export async function sendGuildChatMessage(guildId: string, body: string): Promise<void> {
  const session = currentOnlineSession();
  if (!session) throw new Error('Nicht angemeldet');
  const message = body.trim();
  if (!message) throw new Error('Nachricht eingeben');
  if (message.length > 400) throw new Error('Nachricht ist zu lang');
  await authenticatedSupabaseRest('guild_messages', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ guild_id: guildId, user_id: session.user.id, body: message }),
  });
}
