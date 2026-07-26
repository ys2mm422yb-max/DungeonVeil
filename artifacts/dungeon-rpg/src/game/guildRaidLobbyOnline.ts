import { currentOnlineSession } from './supabaseOnline';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');

export type GuildRaidLobbySlot = {
  slot: number;
  userId: string;
  displayName: string;
  avatarKey: string | null;
  ready: boolean;
  connected: boolean;
};

export type GuildRaidLobbySnapshot = {
  lobbyId: string;
  guildId: string;
  status: 'open' | 'starting' | 'started' | 'closed';
  version: number;
  leaderUserId: string;
  runId: string | null;
  slots: Array<GuildRaidLobbySlot | null>;
};

export type GuildRaidInvitation = {
  id: string;
  lobbyId: string;
  invitedUserId: string;
  invitedDisplayName: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  expiresAt: string;
};

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const session = currentOnlineSession();
  if (!session) throw new Error('Nicht angemeldet');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload ? String((payload as { message?: unknown }).message) : `Raid-Anfrage fehlgeschlagen (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

function normalizeSnapshot(value: unknown): GuildRaidLobbySnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!row.lobby_id) return null;
  const rawSlots = Array.isArray(row.slots) ? row.slots : [];
  const slots: Array<GuildRaidLobbySlot | null> = [null, null, null, null];
  rawSlots.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const slot = Number((item as Record<string, unknown>).slot);
    if (slot < 1 || slot > 4) return;
    const member = item as Record<string, unknown>;
    slots[slot - 1] = {
      slot,
      userId: String(member.user_id ?? ''),
      displayName: String(member.display_name ?? 'Abenteurer'),
      avatarKey: typeof member.avatar_key === 'string' ? member.avatar_key : null,
      ready: Boolean(member.ready),
      connected: member.connected !== false,
    };
  });
  return {
    lobbyId: String(row.lobby_id),
    guildId: String(row.guild_id),
    status: String(row.status ?? 'open') as GuildRaidLobbySnapshot['status'],
    version: Number(row.version ?? 0),
    leaderUserId: String(row.leader_user_id ?? ''),
    runId: row.run_id ? String(row.run_id) : null,
    slots,
  };
}

export async function createOrGetGuildRaidLobby(): Promise<GuildRaidLobbySnapshot> {
  const snapshot = normalizeSnapshot(await rpc('guild_raid_create_or_get_lobby'));
  if (!snapshot) throw new Error('Raid-Lobby konnte nicht geladen werden.');
  return snapshot;
}

export async function fetchGuildRaidLobbySnapshot(): Promise<GuildRaidLobbySnapshot | null> {
  return normalizeSnapshot(await rpc('guild_raid_get_lobby_snapshot'));
}

export async function listGuildRaidInvitations(): Promise<GuildRaidInvitation[]> {
  const payload = await rpc<unknown[]>('guild_raid_list_invitations');
  return (Array.isArray(payload) ? payload : []).map(row => {
    const value = row as Record<string, unknown>;
    return {
      id: String(value.id),
      lobbyId: String(value.lobby_id),
      invitedUserId: String(value.invited_user_id),
      invitedDisplayName: String(value.invited_display_name ?? 'Abenteurer'),
      status: String(value.status) as GuildRaidInvitation['status'],
      expiresAt: String(value.expires_at),
    };
  });
}

export async function inviteGuildRaidMember(userId: string): Promise<void> {
  await rpc('guild_raid_invite_member', { p_invited_user_id: userId });
}

export async function answerGuildRaidInvitation(invitationId: string, accept: boolean): Promise<GuildRaidLobbySnapshot | null> {
  return normalizeSnapshot(await rpc(accept ? 'guild_raid_accept_invitation' : 'guild_raid_decline_invitation', { p_invitation_id: invitationId }));
}

export async function setGuildRaidReady(ready: boolean): Promise<GuildRaidLobbySnapshot> {
  const snapshot = normalizeSnapshot(await rpc('guild_raid_set_ready', { p_ready: ready }));
  if (!snapshot) throw new Error('Bereitschaft konnte nicht gespeichert werden.');
  return snapshot;
}

export async function leaveGuildRaidLobby(): Promise<void> {
  await rpc('guild_raid_leave_lobby');
}

export async function startGuildRaidLobby(idempotencyKey: string): Promise<GuildRaidLobbySnapshot> {
  const snapshot = normalizeSnapshot(await rpc('guild_raid_start_lobby', { p_idempotency_key: idempotencyKey }));
  if (!snapshot) throw new Error('Raid konnte nicht gestartet werden.');
  return snapshot;
}
