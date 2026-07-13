import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

export type SocialProfile = {
  id: string;
  display_name: string;
  avatar_key: string | null;
  friend_code: string;
  current_chapter: number;
  current_rank: number;
  character_key: string;
  last_active_at: string;
};

export type SocialProfileCardData = SocialProfile & {
  guild_name: string | null;
  guild_tag: string | null;
};

export type WorldBossPlayerRow = {
  rank?: number | null;
  user_id: string;
  display_name: string;
  avatar_key?: string | null;
  friend_code?: string | null;
  current_chapter?: number;
  current_rank?: number;
  damage: number;
  hits: number;
};

export type WorldBossGuildRow = {
  rank: number;
  guild_id: string;
  name: string;
  tag: string;
  damage: number;
  hits: number;
};

export type WorldBossSocialDashboard = {
  personal: { rank: number | null; damage: number; hits: number };
  global: WorldBossPlayerRow[];
  friends: WorldBossPlayerRow[];
  guilds: WorldBossGuildRow[];
  myGuild: (WorldBossGuildRow & { members: WorldBossPlayerRow[] }) | null;
};

export type WorldBossRewardPayload = {
  event_id: string;
  event_name: string;
  tier: number;
  xp: number;
  dust: number;
  gold: number;
  personal_damage: number;
  hits: number;
  guild_damage: number;
  guild_bonus: boolean;
  boss_defeated: boolean;
};

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!currentOnlineSession()) throw new Error('Nicht angemeldet');
  return authenticatedSupabaseRest<T>(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getMySocialProfile(): Promise<SocialProfile | null> {
  if (!currentOnlineSession()) return null;
  const rows = await rpc<SocialProfile[]>('get_my_social_profile');
  return rows[0] ?? null;
}

export async function syncSocialProfileProgress(chapter: number, rank: number, characterKey = 'archer'): Promise<SocialProfile | null> {
  if (!currentOnlineSession()) return null;
  const rows = await rpc<SocialProfile[]>('sync_profile_progress', {
    p_chapter: Math.max(1, Math.floor(chapter || 1)),
    p_rank: Math.max(1, Math.floor(rank || 1)),
    p_character_key: characterKey,
  });
  return rows[0] ?? null;
}

export async function findSocialProfile(query: string): Promise<SocialProfile | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;
  const rows = await rpc<SocialProfile[]>('find_social_profile', { p_query: trimmed });
  return rows[0] ?? null;
}

export async function getSocialProfileCard(userId: string): Promise<SocialProfileCardData | null> {
  const rows = await rpc<SocialProfileCardData[]>('get_social_profile_card', { p_user_id: userId });
  return rows[0] ?? null;
}

export async function getWorldBossSocialDashboard(eventId: string): Promise<WorldBossSocialDashboard> {
  return rpc<WorldBossSocialDashboard>('get_world_boss_social_dashboard', { p_event_id: eventId });
}

export async function prepareWorldBossNotice(eventId: string): Promise<boolean> {
  const result = await rpc<boolean>('prepare_my_world_boss_notice', { p_event_id: eventId });
  if (result && typeof window !== 'undefined') window.dispatchEvent(new Event('dungeon-veil-mailbox-changed'));
  return result;
}

export async function prepareWorldBossReward(eventId: string): Promise<WorldBossRewardPayload | null> {
  const result = await rpc<WorldBossRewardPayload | null>('prepare_my_world_boss_reward', { p_event_id: eventId });
  if (result && typeof window !== 'undefined') window.dispatchEvent(new Event('dungeon-veil-mailbox-changed'));
  return result;
}

export async function claimWorldBossReward(eventId: string): Promise<WorldBossRewardPayload> {
  const result = await rpc<WorldBossRewardPayload>('claim_world_boss_reward', { p_event_id: eventId });
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('dungeon-veil-mailbox-changed'));
  return result;
}
