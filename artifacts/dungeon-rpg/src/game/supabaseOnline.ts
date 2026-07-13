import type { DungeonVeilSaveBundle } from './persistentSaveBundle';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');
const SESSION_KEY = 'dungeon-veil-supabase-session-v1';
const SESSION_EVENT = 'dungeon-veil-online-session';

export type OnlineUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type OnlineSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: OnlineUser;
};

export type OnlineProfile = {
  id: string;
  display_name: string;
  avatar_key: string | null;
  created_at: string;
  updated_at: string;
};

export type OnlineGuildRole = 'owner' | 'officer' | 'member';

export type OnlineGuild = {
  id: string;
  name: string;
  tag: string;
  description: string;
  owner_id: string;
};

export type OnlineGuildMembership = {
  role: OnlineGuildRole;
  guild: OnlineGuild;
};

export type OnlineGuildMember = {
  user_id: string;
  role: OnlineGuildRole;
  joined_at: string;
  profile: Pick<OnlineProfile, 'id' | 'display_name' | 'avatar_key'> | null;
};

export type OnlineGuildInvite = {
  id: string;
  guild_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  expires_at: string;
  guild: Pick<OnlineGuild, 'id' | 'name' | 'tag'>;
};

export type WorldBossEvent = {
  id: string;
  slug: string;
  name: string;
  status: 'scheduled' | 'active' | 'defeated' | 'expired';
  max_hp: number;
  current_hp: number;
  starts_at: string;
  ends_at: string;
  reward_config: Record<string, unknown>;
};

export type WorldBossContribution = {
  user_id: string;
  damage: number;
  hits: number;
};

export type WorldBossHitResult = {
  remainingHp: number | null;
  acceptedDamage: number;
  defeated: boolean;
};

type AuthPayload = Partial<OnlineSession> & {
  session?: Partial<OnlineSession> | null;
  user?: OnlineUser | null;
  error?: string;
  error_description?: string;
  msg?: string;
};

type RestResult = {
  response: Response;
  payload: unknown;
};

function emitSession(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EVENT));
}

function loadStoredSession(): OnlineSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnlineSession;
    if (!parsed?.access_token || !parsed?.refresh_token || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session: OnlineSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
  emitSession();
}

function normalizeSession(payload: AuthPayload): OnlineSession | null {
  const source = payload.session ?? payload;
  const user = (source.user ?? payload.user) as OnlineUser | null | undefined;
  if (!source.access_token || !source.refresh_token || !user?.id) return null;
  const expiresAt = Number(source.expires_at) || Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: source.access_token,
    refresh_token: source.refresh_token,
    expires_at: expiresAt,
    token_type: source.token_type ?? 'bearer',
    user,
  };
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { message: text }; }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const value = payload as Record<string, unknown>;
  for (const key of ['error_description', 'msg', 'message', 'error']) {
    if (typeof value[key] === 'string' && value[key]) return value[key] as string;
  }
  return fallback;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function isJwtTimingError(message: string): boolean {
  return /jwt.+future|issued at future|not before|nbf/i.test(message);
}

function shouldRefreshJwt(status: number, message: string): boolean {
  return status === 401 && /jwt|token|expired|claim|signature/i.test(message);
}

async function authRequest(path: string, body: Record<string, unknown>): Promise<AuthPayload> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await parseJson(response) as AuthPayload;
  if (!response.ok) throw new Error(errorMessage(payload, 'Online-Anmeldung fehlgeschlagen'));
  return payload;
}

async function refreshSession(current: OnlineSession): Promise<OnlineSession | null> {
  try {
    const payload = await authRequest('token?grant_type=refresh_token', { refresh_token: current.refresh_token });
    const session = normalizeSession(payload);
    saveSession(session);
    return session;
  } catch {
    saveSession(null);
    return null;
  }
}

async function requireSession(): Promise<OnlineSession> {
  const session = loadStoredSession();
  if (!session) throw new Error('Nicht angemeldet');
  if (session.expires_at * 1000 > Date.now() + 60_000) return session;
  const refreshed = await refreshSession(session);
  if (!refreshed) throw new Error('Sitzung abgelaufen');
  return refreshed;
}

async function performRestRequest(path: string, init: RequestInit, session: OnlineSession): Promise<RestResult> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  return { response, payload: await parseJson(response) };
}

async function restRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let session = await requireSession();
  let result = await performRestRequest(path, init, session);

  if (!result.response.ok) {
    let message = errorMessage(result.payload, `Online-Anfrage fehlgeschlagen (${result.response.status})`);

    if (isJwtTimingError(message)) {
      await wait(1800);
      result = await performRestRequest(path, init, session);
      if (result.response.ok) return result.payload as T;
      message = errorMessage(result.payload, `Online-Anfrage fehlgeschlagen (${result.response.status})`);
    }

    if (shouldRefreshJwt(result.response.status, message)) {
      const refreshed = await refreshSession(loadStoredSession() ?? session);
      if (refreshed) {
        session = refreshed;
        if (isJwtTimingError(message)) await wait(1400);
        result = await performRestRequest(path, init, session);
      }
    }
  }

  if (!result.response.ok) {
    throw new Error(errorMessage(result.payload, `Online-Anfrage fehlgeschlagen (${result.response.status})`));
  }
  return result.payload as T;
}

export function supabaseOnlineConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export function currentOnlineSession(): OnlineSession | null {
  return loadStoredSession();
}

export function onlineSessionEventName(): string {
  return SESSION_EVENT;
}

export async function signUpOnline(email: string, password: string, displayName: string): Promise<{ session: OnlineSession | null; confirmationRequired: boolean }> {
  const payload = await authRequest('signup', {
    email: email.trim(),
    password,
    data: { display_name: displayName.trim() || 'Abenteurer' },
  });
  const session = normalizeSession(payload);
  if (session) saveSession(session);
  return { session, confirmationRequired: !session };
}

export async function signInOnline(email: string, password: string): Promise<OnlineSession> {
  const payload = await authRequest('token?grant_type=password', { email: email.trim(), password });
  const session = normalizeSession(payload);
  if (!session) throw new Error('Keine gültige Online-Sitzung erhalten');
  saveSession(session);
  return session;
}

export async function signOutOnline(): Promise<void> {
  const session = loadStoredSession();
  try {
    if (session) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${session.access_token}` },
      });
    }
  } finally {
    saveSession(null);
  }
}

export async function getOnlineProfile(): Promise<OnlineProfile | null> {
  const session = await requireSession();
  const rows = await restRequest<OnlineProfile[]>(`profiles?id=eq.${encodeURIComponent(session.user.id)}&select=*`);
  return rows[0] ?? null;
}

export async function updateOnlineProfile(displayName: string): Promise<OnlineProfile | null> {
  const session = await requireSession();
  const rows = await restRequest<OnlineProfile[]>(`profiles?id=eq.${encodeURIComponent(session.user.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ display_name: displayName.trim() }),
  });
  return rows[0] ?? null;
}

export async function pushSupabaseSave(bundle: DungeonVeilSaveBundle): Promise<boolean> {
  const session = await requireSession();
  await restRequest(`game_saves?on_conflict=user_id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: session.user.id, save_version: bundle.version, payload: bundle }),
  });
  return true;
}

export async function pullSupabaseSave(): Promise<DungeonVeilSaveBundle | null> {
  const session = await requireSession();
  const rows = await restRequest<Array<{ payload: DungeonVeilSaveBundle; updated_at: string }>>(
    `game_saves?user_id=eq.${encodeURIComponent(session.user.id)}&select=payload,updated_at`,
  );
  const bundle = rows[0]?.payload;
  return bundle?.version === 1 ? bundle : null;
}

export async function listGuilds(): Promise<OnlineGuild[]> {
  return restRequest<OnlineGuild[]>('guilds?select=id,name,tag,description,owner_id&order=name.asc');
}

export async function getMyGuildMembership(): Promise<OnlineGuildMembership | null> {
  const session = await requireSession();
  const rows = await restRequest<Array<{ role: OnlineGuildRole; guilds: OnlineGuild }>>(
    `guild_members?user_id=eq.${encodeURIComponent(session.user.id)}&select=role,guilds(id,name,tag,description,owner_id)`,
  );
  const row = rows[0];
  return row?.guilds ? { role: row.role, guild: row.guilds } : null;
}

export async function listGuildMembers(guildId: string): Promise<OnlineGuildMember[]> {
  const rows = await restRequest<Array<{ user_id: string; role: OnlineGuildRole; joined_at: string }>>(
    `guild_members?guild_id=eq.${encodeURIComponent(guildId)}&select=user_id,role,joined_at&order=joined_at.asc`,
  );
  if (!rows.length) return [];

  const ids = [...new Set(rows.map(row => row.user_id))];
  const profiles = await restRequest<OnlineProfile[]>(
    `profiles?id=in.(${ids.map(id => encodeURIComponent(id)).join(',')})&select=id,display_name,avatar_key,created_at,updated_at`,
  );
  const byId = new Map(profiles.map(profile => [profile.id, profile]));

  return rows.map(row => ({
    ...row,
    profile: byId.get(row.user_id) ?? null,
  }));
}

export async function findOnlineProfileByDisplayName(displayName: string): Promise<OnlineProfile | null> {
  const name = displayName.trim();
  if (!name) return null;
  const rows = await restRequest<OnlineProfile[]>(
    `profiles?display_name=ilike.${encodeURIComponent(name)}&select=id,display_name,avatar_key,created_at,updated_at&limit=2`,
  );
  return rows.find(profile => profile.display_name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0) ?? rows[0] ?? null;
}

export async function createGuild(name: string, tag: string, description = ''): Promise<OnlineGuild> {
  const session = await requireSession();
  const rows = await restRequest<OnlineGuild[]>('guilds', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name: name.trim(), tag: tag.trim().toUpperCase(), description: description.trim(), owner_id: session.user.id }),
  });
  if (!rows[0]) throw new Error('Gilde konnte nicht erstellt werden');
  return rows[0];
}

export async function updateGuildDescription(guildId: string, description: string): Promise<OnlineGuild> {
  const rows = await restRequest<OnlineGuild[]>(`guilds?id=eq.${encodeURIComponent(guildId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ description: description.trim() }),
  });
  if (!rows[0]) throw new Error('Gildenbeschreibung konnte nicht gespeichert werden');
  return rows[0];
}

export async function inviteGuildMember(guildId: string, invitedUserId: string): Promise<void> {
  const session = await requireSession();
  await restRequest('guild_invites', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ guild_id: guildId, invited_user_id: invitedUserId, invited_by: session.user.id }),
  });
}

export async function inviteGuildMemberByDisplayName(guildId: string, displayName: string): Promise<OnlineProfile> {
  const session = await requireSession();
  const profile = await findOnlineProfileByDisplayName(displayName);
  if (!profile) throw new Error('Spieler nicht gefunden');
  if (profile.id === session.user.id) throw new Error('Du bist bereits in dieser Gilde');
  await inviteGuildMember(guildId, profile.id);
  return profile;
}

export async function updateGuildMemberRole(guildId: string, userId: string, role: Exclude<OnlineGuildRole, 'owner'>): Promise<void> {
  await restRequest(`guild_members?guild_id=eq.${encodeURIComponent(guildId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ role }),
  });
}

export async function removeGuildMember(guildId: string, userId: string): Promise<void> {
  await restRequest(`guild_members?guild_id=eq.${encodeURIComponent(guildId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
}

export async function listMyGuildInvites(): Promise<OnlineGuildInvite[]> {
  const session = await requireSession();
  return restRequest<OnlineGuildInvite[]>(
    `guild_invites?invited_user_id=eq.${encodeURIComponent(session.user.id)}&status=eq.pending&select=id,guild_id,status,expires_at,guild:guilds(id,name,tag)&order=created_at.desc`,
  );
}

export async function acceptGuildInvite(inviteId: string): Promise<string> {
  const result = await restRequest<string>('rpc/accept_guild_invite', {
    method: 'POST',
    body: JSON.stringify({ p_invite_id: inviteId }),
  });
  return result;
}

export async function declineGuildInvite(inviteId: string): Promise<void> {
  await restRequest(`guild_invites?id=eq.${encodeURIComponent(inviteId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'declined' }),
  });
}

export async function getCurrentWorldBoss(): Promise<WorldBossEvent | null> {
  const rows = await restRequest<WorldBossEvent[]>(
    'world_boss_events?status=in.(active,scheduled)&select=*&order=starts_at.asc&limit=1',
  );
  return rows[0] ?? null;
}

export async function getWorldBossLeaderboard(eventId: string, limit = 20): Promise<WorldBossContribution[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return restRequest<WorldBossContribution[]>(
    `world_boss_contributions?event_id=eq.${encodeURIComponent(eventId)}&select=user_id,damage,hits&order=damage.desc&limit=${safeLimit}`,
  );
}

export async function submitWorldBossHit(eventId: string, damage: number, hitToken = crypto.randomUUID()): Promise<WorldBossHitResult> {
  const session = await requireSession();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/world-boss-hit`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ eventId, hitToken, damage: Math.floor(damage) }),
  });
  const payload = await parseJson(response);
  if (!response.ok) throw new Error(errorMessage(payload, `Weltboss-Treffer abgelehnt (${response.status})`));
  return payload as WorldBossHitResult;
}

export async function authenticatedSupabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return restRequest<T>(path, init);
}

