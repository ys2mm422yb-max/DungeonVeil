import { currentOnlineSession } from './supabaseOnline';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');
const REALTIME_URL = SUPABASE_URL.replace(/^http/, 'ws');

export type GuildRaidLobbyStatus = 'forming' | 'ready' | 'starting' | 'started' | 'dissolved';
export type GuildRaidRealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'degraded' | 'offline';

export type GuildRaidLobbyMember = {
  userId: string;
  slot: number;
  status: 'joined' | 'ready';
  ready: boolean;
  joinedAt: string;
  displayName: string;
  avatarKey: string | null;
  guildRole: 'owner' | 'officer' | 'member' | null;
  isLeader: boolean;
};

export type GuildRaidLobbyInvitation = {
  invitationId: string;
  targetUserId: string;
  displayName: string;
  avatarKey: string | null;
  status: 'pending';
  expiresAt: string;
};

export type GuildRaidIncomingInvitation = {
  invitationId: string;
  lobbyId: string;
  guildId: string;
  guildName: string;
  guildTag: string;
  leaderUserId: string;
  leaderName: string;
  expiresAt: string;
};

export type GuildRaidLobbySnapshot = {
  lobbyId: string;
  guildId: string;
  guildName: string;
  guildTag: string;
  leaderUserId: string;
  status: GuildRaidLobbyStatus;
  raidRunId: string | null;
  version: number;
  expiresAt: string;
  serverNow: string;
  viewerUserId: string;
  viewerIsLeader: boolean;
  memberCount: number;
  readyCount: number;
  canStart: boolean;
  members: GuildRaidLobbyMember[];
  invitations: GuildRaidLobbyInvitation[];
};

export type GuildRaidLeaveResult = {
  left: boolean;
  lobbyId: string;
  dissolved: boolean;
  newLeaderUserId: string | null;
  leaderRule: 'lowest_occupied_slot';
};

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

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
    const value = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
    const message = value && typeof value.message === 'string' ? value.message : `Raid-Anfrage fehlgeschlagen (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeMember(value: unknown): GuildRaidLobbyMember | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const userId = asString(row.userId ?? row.user_id);
  const slot = asNumber(row.slot);
  if (!userId || slot < 1 || slot > 4) return null;
  return {
    userId,
    slot,
    status: row.status === 'ready' ? 'ready' : 'joined',
    ready: Boolean(row.ready),
    joinedAt: asString(row.joinedAt ?? row.joined_at),
    displayName: asString(row.displayName ?? row.display_name, 'Abenteurer'),
    avatarKey: typeof (row.avatarKey ?? row.avatar_key) === 'string' ? String(row.avatarKey ?? row.avatar_key) : null,
    guildRole: row.guildRole === 'owner' || row.guildRole === 'officer' || row.guildRole === 'member' ? row.guildRole : null,
    isLeader: Boolean(row.isLeader ?? row.is_leader),
  };
}

function normalizeInvitation(value: unknown): GuildRaidLobbyInvitation | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const invitationId = asString(row.invitationId ?? row.invitation_id);
  const targetUserId = asString(row.targetUserId ?? row.target_user_id);
  if (!invitationId || !targetUserId) return null;
  return {
    invitationId,
    targetUserId,
    displayName: asString(row.displayName ?? row.display_name, 'Abenteurer'),
    avatarKey: typeof (row.avatarKey ?? row.avatar_key) === 'string' ? String(row.avatarKey ?? row.avatar_key) : null,
    status: 'pending',
    expiresAt: asString(row.expiresAt ?? row.expires_at),
  };
}

function normalizeSnapshot(value: unknown): GuildRaidLobbySnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const lobbyId = asString(row.lobbyId ?? row.lobby_id);
  if (!lobbyId) return null;
  const status = asString(row.status, 'forming') as GuildRaidLobbyStatus;
  return {
    lobbyId,
    guildId: asString(row.guildId ?? row.guild_id),
    guildName: asString(row.guildName ?? row.guild_name),
    guildTag: asString(row.guildTag ?? row.guild_tag),
    leaderUserId: asString(row.leaderUserId ?? row.leader_user_id),
    status,
    raidRunId: (row.raidRunId ?? row.raid_run_id) ? String(row.raidRunId ?? row.raid_run_id) : null,
    version: asNumber(row.version),
    expiresAt: asString(row.expiresAt ?? row.expires_at),
    serverNow: asString(row.serverNow ?? row.server_now),
    viewerUserId: asString(row.viewerUserId ?? row.viewer_user_id),
    viewerIsLeader: Boolean(row.viewerIsLeader ?? row.viewer_is_leader),
    memberCount: asNumber(row.memberCount ?? row.member_count),
    readyCount: asNumber(row.readyCount ?? row.ready_count),
    canStart: Boolean(row.canStart ?? row.can_start),
    members: (Array.isArray(row.members) ? row.members : []).map(normalizeMember).filter((member): member is GuildRaidLobbyMember => Boolean(member)).sort((a, b) => a.slot - b.slot),
    invitations: (Array.isArray(row.invitations) ? row.invitations : []).map(normalizeInvitation).filter((invitation): invitation is GuildRaidLobbyInvitation => Boolean(invitation)),
  };
}

export async function fetchGuildRaidLobbySnapshot(lobbyId?: string | null): Promise<GuildRaidLobbySnapshot | null> {
  return normalizeSnapshot(await rpc('guild_raid_get_snapshot', { p_lobby_id: lobbyId ?? null }));
}

export async function listMyGuildRaidInvitations(): Promise<GuildRaidIncomingInvitation[]> {
  const payload = await rpc<unknown>('guild_raid_list_my_invitations');
  return (Array.isArray(payload) ? payload : []).flatMap(value => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Record<string, unknown>;
    const invitationId = asString(row.invitationId ?? row.invitation_id);
    const lobbyId = asString(row.lobbyId ?? row.lobby_id);
    if (!invitationId || !lobbyId) return [];
    return [{
      invitationId,
      lobbyId,
      guildId: asString(row.guildId ?? row.guild_id),
      guildName: asString(row.guildName ?? row.guild_name),
      guildTag: asString(row.guildTag ?? row.guild_tag),
      leaderUserId: asString(row.leaderUserId ?? row.leader_user_id),
      leaderName: asString(row.leaderName ?? row.leader_name, 'Abenteurer'),
      expiresAt: asString(row.expiresAt ?? row.expires_at),
    }];
  });
}

export async function createGuildRaidLobby(): Promise<GuildRaidLobbySnapshot> {
  const snapshot = normalizeSnapshot(await rpc('guild_raid_create_lobby', { p_idempotency_key: newIdempotencyKey() }));
  if (!snapshot) throw new Error('Raid-Lobby konnte nicht erstellt werden.');
  return snapshot;
}

export async function inviteGuildRaidMember(lobbyId: string, userId: string): Promise<GuildRaidLobbySnapshot> {
  const snapshot = normalizeSnapshot(await rpc('guild_raid_invite_member', { p_lobby_id: lobbyId, p_target_user_id: userId, p_idempotency_key: newIdempotencyKey() }));
  if (!snapshot) throw new Error('Einladung konnte nicht gesendet werden.');
  return snapshot;
}

export async function cancelGuildRaidInvitation(invitationId: string): Promise<GuildRaidLobbySnapshot> {
  const snapshot = normalizeSnapshot(await rpc('guild_raid_cancel_invite', { p_invitation_id: invitationId, p_idempotency_key: newIdempotencyKey() }));
  if (!snapshot) throw new Error('Einladung konnte nicht zurückgezogen werden.');
  return snapshot;
}

export async function answerGuildRaidInvitation(invitationId: string, accept: boolean): Promise<GuildRaidLobbySnapshot | null> {
  const response = await rpc<unknown>('guild_raid_respond_invite', { p_invitation_id: invitationId, p_accept: accept, p_idempotency_key: newIdempotencyKey() });
  return normalizeSnapshot(response);
}

export async function setGuildRaidReady(lobbyId: string, ready: boolean): Promise<GuildRaidLobbySnapshot> {
  const snapshot = normalizeSnapshot(await rpc('guild_raid_set_ready', { p_lobby_id: lobbyId, p_ready: ready, p_idempotency_key: newIdempotencyKey() }));
  if (!snapshot) throw new Error('Bereitschaft konnte nicht gespeichert werden.');
  return snapshot;
}

export async function removeGuildRaidMember(lobbyId: string, userId: string): Promise<GuildRaidLobbySnapshot> {
  const snapshot = normalizeSnapshot(await rpc('guild_raid_remove_member', { p_lobby_id: lobbyId, p_target_user_id: userId, p_idempotency_key: newIdempotencyKey() }));
  if (!snapshot) throw new Error('Mitglied konnte nicht entfernt werden.');
  return snapshot;
}

export async function leaveGuildRaidLobby(lobbyId: string): Promise<GuildRaidLeaveResult> {
  return rpc('guild_raid_leave_lobby', { p_lobby_id: lobbyId, p_idempotency_key: newIdempotencyKey() });
}

export async function dissolveGuildRaidLobby(lobbyId: string): Promise<void> {
  await rpc('guild_raid_dissolve_lobby', { p_lobby_id: lobbyId, p_idempotency_key: newIdempotencyKey() });
}

export async function startGuildRaidLobby(lobbyId: string, idempotencyKey: string): Promise<GuildRaidLobbySnapshot> {
  const snapshot = normalizeSnapshot(await rpc('guild_raid_start', { p_lobby_id: lobbyId, p_idempotency_key: idempotencyKey }));
  if (!snapshot) throw new Error('Raid konnte nicht gestartet werden.');
  return snapshot;
}

export function createGuildRaidStartKey(): string {
  return newIdempotencyKey();
}

export function watchGuildRaidLobby(
  lobbyId: string,
  initialVersion: number,
  onVersion: (version: number, gap: boolean) => void,
  onStatus?: (status: GuildRaidRealtimeStatus) => void,
): () => void {
  let stopped = false;
  let socket: WebSocket | null = null;
  let heartbeatTimer = 0;
  let reconnectTimer = 0;
  let reconnectAttempt = 0;
  let knownVersion = initialVersion;
  let ref = 0;
  let joinedRef = '';

  const status = (value: GuildRaidRealtimeStatus) => onStatus?.(value);
  const clearSocket = () => {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = 0;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try { socket.close(); } catch {}
    }
    socket = null;
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    status('reconnecting');
    const delays = [1000, 2000, 5000, 10000];
    const delay = delays[Math.min(reconnectAttempt, delays.length - 1)];
    reconnectAttempt += 1;
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(connect, delay);
  };

  const send = (topic: string, event: string, payload: Record<string, unknown>, joinRef: string | null = joinedRef || null) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    ref += 1;
    socket.send(JSON.stringify({ topic, event, payload, ref: String(ref), join_ref: joinRef }));
  };

  const connect = () => {
    if (stopped || typeof WebSocket === 'undefined') {
      status('offline');
      return;
    }
    const session = currentOnlineSession();
    if (!session) {
      status('offline');
      return;
    }
    clearSocket();
    status(reconnectAttempt ? 'reconnecting' : 'connecting');
    const topic = `realtime:guild-raid-lobby:${lobbyId}`;
    socket = new WebSocket(`${REALTIME_URL}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`);
    socket.onopen = () => {
      ref += 1;
      joinedRef = String(ref);
      socket?.send(JSON.stringify({
        topic,
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { ack: false, self: false },
            presence: { enabled: false },
            postgres_changes: [{ event: '*', schema: 'public', table: 'guild_raid_lobbies', filter: `id=eq.${lobbyId}` }],
            private: false,
          },
          access_token: session.access_token,
        },
        ref: joinedRef,
        join_ref: joinedRef,
      }));
      heartbeatTimer = window.setInterval(() => send('phoenix', 'heartbeat', {}, null), 20_000);
    };
    socket.onmessage = event => {
      let message: { event?: string; payload?: Record<string, unknown>; ref?: string } | null = null;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (!message) return;
      if (message.event === 'phx_reply' && message.ref === joinedRef) {
        const replyStatus = message.payload?.status;
        if (replyStatus === 'ok') {
          reconnectAttempt = 0;
          status('connected');
        } else {
          status('degraded');
        }
        return;
      }
      if (message.event === 'system' && message.payload?.status === 'error') {
        status('degraded');
        return;
      }
      if (message.event !== 'postgres_changes') return;
      const data = message.payload?.data;
      if (!data || typeof data !== 'object') return;
      const record = (data as Record<string, unknown>).record;
      if (!record || typeof record !== 'object') return;
      const version = asNumber((record as Record<string, unknown>).version);
      if (version <= knownVersion) return;
      const gap = version > knownVersion + 1;
      knownVersion = version;
      onVersion(version, gap);
    };
    socket.onerror = () => status('degraded');
    socket.onclose = () => {
      clearSocket();
      scheduleReconnect();
    };
  };

  connect();
  return () => {
    stopped = true;
    window.clearTimeout(reconnectTimer);
    clearSocket();
    status('offline');
  };
}
