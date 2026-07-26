import { currentOnlineSession } from './supabaseOnline';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');
const REALTIME_URL = SUPABASE_URL.replace(/^http/, 'ws');

export type GuildRaidRunStatus = 'created' | 'active' | 'completed' | 'abandoned' | 'failed';
export type GuildRaidParticipantStatus = 'active' | 'disconnected' | 'completed' | 'abandoned';
export type GuildRaidRunRealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'degraded' | 'offline';

export type GuildRaidPlayerState = {
  roomNumber: number;
  roomEpoch: number;
  positionState: Record<string, unknown>;
  combatState: Record<string, unknown>;
  mechanicState: Record<string, unknown>;
  alive: boolean;
  version: number;
  updatedAt: string;
};

export type GuildRaidRunParticipant = {
  userId: string;
  slot: number;
  status: GuildRaidParticipantStatus;
  lastSeenAt: string;
  disconnectDeadlineAt: string | null;
  lastAckStateVersion: number;
  contribution: Record<string, unknown>;
  playerState: GuildRaidPlayerState | null;
};

export type GuildRaidRoomState = {
  roomNumber: number;
  roomEpoch: number;
  status: 'pending' | 'active' | 'cleared' | 'failed';
  mechanicState: Record<string, unknown>;
  enemyState: Record<string, unknown>;
  bossState: Record<string, unknown> | null;
  version: number;
  startedAt: string | null;
  clearedAt: string | null;
};

export type GuildRaidRunSnapshot = {
  raidRunId: string;
  guildId: string;
  lobbyId: string;
  status: GuildRaidRunStatus;
  currentRoom: number;
  roomEpoch: number;
  stateVersion: number;
  serverNow: string;
  startedAt: string;
  completedAt: string | null;
  abandonedAt: string | null;
  viewerUserId: string;
  participants: GuildRaidRunParticipant[];
  roomState: GuildRaidRoomState | null;
};

export type GuildRaidStateMutation = {
  playerState?: {
    positionState?: Record<string, unknown>;
    combatState?: Record<string, unknown>;
    mechanicState?: Record<string, unknown>;
    alive?: boolean;
  };
  roomMechanicPatch?: Record<string, unknown>;
  enemyState?: Record<string, unknown>;
  bossState?: Record<string, unknown>;
};

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
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
    const row = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
    throw new Error(typeof row?.message === 'string' ? row.message : `Raid-Run-Anfrage fehlgeschlagen (${response.status})`);
  }
  return payload as T;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function normalizePlayerState(value: unknown): GuildRaidPlayerState | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  return {
    roomNumber: asNumber(row.roomNumber ?? row.room_number),
    roomEpoch: asNumber(row.roomEpoch ?? row.room_epoch),
    positionState: asObject(row.positionState ?? row.position_state),
    combatState: asObject(row.combatState ?? row.combat_state),
    mechanicState: asObject(row.mechanicState ?? row.mechanic_state),
    alive: row.alive !== false,
    version: asNumber(row.version),
    updatedAt: asString(row.updatedAt ?? row.updated_at),
  };
}

function normalizeParticipant(value: unknown): GuildRaidRunParticipant | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const userId = asString(row.userId ?? row.user_id);
  const slot = asNumber(row.slot);
  if (!userId || slot < 1 || slot > 4) return null;
  const rawStatus = asString(row.status, 'active');
  const status: GuildRaidParticipantStatus = rawStatus === 'disconnected' || rawStatus === 'completed' || rawStatus === 'abandoned' ? rawStatus : 'active';
  return {
    userId,
    slot,
    status,
    lastSeenAt: asString(row.lastSeenAt ?? row.last_seen_at),
    disconnectDeadlineAt: nullableString(row.disconnectDeadlineAt ?? row.disconnect_deadline_at),
    lastAckStateVersion: asNumber(row.lastAckStateVersion ?? row.last_ack_state_version),
    contribution: asObject(row.contribution),
    playerState: normalizePlayerState(row.playerState ?? row.player_state),
  };
}

function normalizeRoomState(value: unknown): GuildRaidRoomState | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const rawStatus = asString(row.status, 'pending');
  const status: GuildRaidRoomState['status'] = rawStatus === 'active' || rawStatus === 'cleared' || rawStatus === 'failed' ? rawStatus : 'pending';
  return {
    roomNumber: asNumber(row.roomNumber ?? row.room_number),
    roomEpoch: asNumber(row.roomEpoch ?? row.room_epoch),
    status,
    mechanicState: asObject(row.mechanicState ?? row.mechanic_state),
    enemyState: asObject(row.enemyState ?? row.enemy_state),
    bossState: (row.bossState ?? row.boss_state) && typeof (row.bossState ?? row.boss_state) === 'object' ? asObject(row.bossState ?? row.boss_state) : null,
    version: asNumber(row.version),
    startedAt: nullableString(row.startedAt ?? row.started_at),
    clearedAt: nullableString(row.clearedAt ?? row.cleared_at),
  };
}

function normalizeSnapshot(value: unknown): GuildRaidRunSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Ungültiger Raid-Run-Serverstand.');
  const row = value as Record<string, unknown>;
  const raidRunId = asString(row.raidRunId ?? row.raid_run_id);
  if (!raidRunId) throw new Error('Raid-Run-ID fehlt im Serverstand.');
  const rawStatus = asString(row.status, 'created');
  const status: GuildRaidRunStatus = rawStatus === 'active' || rawStatus === 'completed' || rawStatus === 'abandoned' || rawStatus === 'failed' ? rawStatus : 'created';
  return {
    raidRunId,
    guildId: asString(row.guildId ?? row.guild_id),
    lobbyId: asString(row.lobbyId ?? row.lobby_id),
    status,
    currentRoom: asNumber(row.currentRoom ?? row.current_room, 1),
    roomEpoch: asNumber(row.roomEpoch ?? row.room_epoch, 1),
    stateVersion: asNumber(row.stateVersion ?? row.state_version, 1),
    serverNow: asString(row.serverNow ?? row.server_now),
    startedAt: asString(row.startedAt ?? row.started_at),
    completedAt: nullableString(row.completedAt ?? row.completed_at),
    abandonedAt: nullableString(row.abandonedAt ?? row.abandoned_at),
    viewerUserId: asString(row.viewerUserId ?? row.viewer_user_id),
    participants: (Array.isArray(row.participants) ? row.participants : []).map(normalizeParticipant).filter((participant): participant is GuildRaidRunParticipant => Boolean(participant)).sort((a, b) => a.slot - b.slot),
    roomState: normalizeRoomState(row.roomState ?? row.room_state),
  };
}

export async function fetchGuildRaidRunSnapshot(raidRunId: string): Promise<GuildRaidRunSnapshot> {
  return normalizeSnapshot(await rpc('guild_raid_get_run_snapshot', { p_raid_run_id: raidRunId }));
}

export async function rejoinGuildRaidRun(raidRunId: string, lastAckStateVersion = 0): Promise<GuildRaidRunSnapshot> {
  return normalizeSnapshot(await rpc('guild_raid_rejoin', {
    p_raid_run_id: raidRunId,
    p_last_ack_state_version: Math.max(0, Math.trunc(lastAckStateVersion)),
  }));
}

export async function markGuildRaidRunDisconnected(raidRunId: string, lastAckStateVersion = 0): Promise<GuildRaidRunSnapshot> {
  return normalizeSnapshot(await rpc('guild_raid_mark_disconnected', {
    p_raid_run_id: raidRunId,
    p_last_ack_state_version: Math.max(0, Math.trunc(lastAckStateVersion)),
  }));
}

export async function mutateGuildRaidRunState(
  raidRunId: string,
  expectedStateVersion: number,
  mutation: GuildRaidStateMutation,
  idempotencyKey = newIdempotencyKey(),
): Promise<GuildRaidRunSnapshot> {
  return normalizeSnapshot(await rpc('guild_raid_mutate_state', {
    p_raid_run_id: raidRunId,
    p_expected_state_version: Math.trunc(expectedStateVersion),
    p_idempotency_key: idempotencyKey,
    p_player_state: mutation.playerState ?? null,
    p_room_mechanic_patch: mutation.roomMechanicPatch ?? null,
    p_enemy_state: mutation.enemyState ?? null,
    p_boss_state: mutation.bossState ?? null,
  }));
}

export async function abortGuildRaidRun(
  raidRunId: string,
  expectedStateVersion: number,
  idempotencyKey = newIdempotencyKey(),
): Promise<GuildRaidRunSnapshot> {
  return normalizeSnapshot(await rpc('guild_raid_abort_run', {
    p_raid_run_id: raidRunId,
    p_expected_state_version: Math.trunc(expectedStateVersion),
    p_idempotency_key: idempotencyKey,
  }));
}

export function createGuildRaidMutationKey(): string {
  return newIdempotencyKey();
}

export function watchGuildRaidRun(
  raidRunId: string,
  initialStateVersion: number,
  onVersion: (stateVersion: number, gap: boolean) => void,
  onStatus?: (status: GuildRaidRunRealtimeStatus) => void,
): () => void {
  let stopped = false;
  let socket: WebSocket | null = null;
  let heartbeatTimer = 0;
  let reconnectTimer = 0;
  let reconnectAttempt = 0;
  let knownVersion = initialStateVersion;
  let ref = 0;
  let joinedRef = '';

  const setStatus = (status: GuildRaidRunRealtimeStatus) => onStatus?.(status);
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
    setStatus('reconnecting');
    const delay = [1000, 2000, 5000, 10000][Math.min(reconnectAttempt, 3)];
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
    if (stopped) return;
    clearSocket();
    const session = currentOnlineSession();
    if (!session) { setStatus('offline'); return; }
    setStatus(reconnectAttempt ? 'reconnecting' : 'connecting');
    const url = `${REALTIME_URL}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`;
    socket = new WebSocket(url);
    socket.onopen = () => {
      reconnectAttempt = 0;
      joinedRef = String(++ref);
      socket?.send(JSON.stringify({
        topic: `realtime:guild-raid-run:${raidRunId}`,
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
            postgres_changes: [
              { event: '*', schema: 'public', table: 'guild_raid_runs', filter: `id=eq.${raidRunId}` },
              { event: '*', schema: 'public', table: 'guild_raid_participants', filter: `raid_run_id=eq.${raidRunId}` },
              { event: '*', schema: 'public', table: 'guild_raid_room_states', filter: `raid_run_id=eq.${raidRunId}` },
              { event: '*', schema: 'public', table: 'guild_raid_player_states', filter: `raid_run_id=eq.${raidRunId}` },
            ],
            private: true,
          },
          access_token: session.access_token,
        },
        ref: joinedRef,
        join_ref: joinedRef,
      }));
      heartbeatTimer = window.setInterval(() => send('phoenix', 'heartbeat', {}, null), 25_000);
    };
    socket.onmessage = event => {
      let message: Record<string, unknown>;
      try { message = JSON.parse(String(event.data)) as Record<string, unknown>; } catch { return; }
      if (message.event === 'phx_reply') {
        const payload = asObject(message.payload);
        if (payload.status === 'ok') setStatus('connected');
        return;
      }
      if (message.event !== 'postgres_changes') return;
      const payload = asObject(message.payload);
      const data = asObject(payload.data);
      const record = asObject(data.record ?? data.new);
      const nextVersion = asNumber(record.state_version ?? record.version);
      if (nextVersion <= 0 || nextVersion <= knownVersion) return;
      const gap = nextVersion > knownVersion + 1;
      knownVersion = nextVersion;
      onVersion(nextVersion, gap);
    };
    socket.onerror = () => setStatus('degraded');
    socket.onclose = scheduleReconnect;
  };

  connect();
  return () => {
    stopped = true;
    window.clearTimeout(reconnectTimer);
    clearSocket();
    setStatus('offline');
  };
}
