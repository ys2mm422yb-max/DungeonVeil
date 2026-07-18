import type { DuoRunContext } from './coopRunMode';
import { currentOnlineSession } from './supabaseOnline';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');
const HEARTBEAT_MS = 25_000;
const MAX_RECONNECT_MS = 8_000;
const REMOTE_STALE_MS = 5_000;

export type CoopRealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export type CoopPlayerPresence = {
  version: 1;
  lobbyId: string;
  runSeed: number;
  userId: string;
  displayName: string;
  chapter: number;
  room: number;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  state: 'idle' | 'moving' | 'attack' | 'dodging';
  lastAttackTime: number;
  lastDodgeTime: number;
  sequence: number;
  sentAt: number;
  receivedAt: number;
};

type OutgoingPresence = Omit<CoopPlayerPresence, 'version' | 'lobbyId' | 'runSeed' | 'userId' | 'sequence' | 'sentAt' | 'receivedAt'>;

type PhoenixMessage = {
  topic?: string;
  event?: string;
  payload?: Record<string, unknown>;
  ref?: string | null;
};

type RealtimeOptions = {
  context: DuoRunContext;
  onRemotePresence: (presence: CoopPlayerPresence) => void;
  onPeerLeft: (userId: string) => void;
  onStatus: (status: CoopRealtimeStatus) => void;
};

function finite(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeState(value: unknown): CoopPlayerPresence['state'] {
  return value === 'moving' || value === 'attack' || value === 'dodging' ? value : 'idle';
}

export function normalizeCoopPlayerPresence(
  value: unknown,
  expected: Pick<DuoRunContext, 'lobbyId' | 'runSeed'>,
  localUserId: string,
): CoopPlayerPresence | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const lobbyId = String(raw.lobbyId ?? '');
  const userId = String(raw.userId ?? '');
  const runSeed = Math.floor(finite(raw.runSeed, -1));
  if (!lobbyId || lobbyId !== expected.lobbyId || runSeed !== expected.runSeed || !userId || userId === localUserId) return null;
  const sequence = Math.max(0, Math.floor(finite(raw.sequence)));
  const sentAt = Math.max(0, Math.floor(finite(raw.sentAt)));
  return {
    version: 1,
    lobbyId,
    runSeed,
    userId,
    displayName: String(raw.displayName ?? 'Mitspieler').slice(0, 32) || 'Mitspieler',
    chapter: Math.max(1, Math.floor(finite(raw.chapter, 1))),
    room: clamp(Math.floor(finite(raw.room, 1)), 1, 50),
    x: finite(raw.x),
    y: finite(raw.y),
    facingX: clamp(finite(raw.facingX), -1, 1),
    facingY: clamp(finite(raw.facingY, -1), -1, 1),
    state: normalizeState(raw.state),
    lastAttackTime: Math.max(0, finite(raw.lastAttackTime)),
    lastDodgeTime: Math.max(0, finite(raw.lastDodgeTime)),
    sequence,
    sentAt,
    receivedAt: Date.now(),
  };
}

export function remotePresenceIsFresh(presence: CoopPlayerPresence | null, now = Date.now()): boolean {
  return Boolean(presence && now - presence.receivedAt <= REMOTE_STALE_MS);
}

export function interpolateCoopPresence(
  current: Pick<CoopPlayerPresence, 'x' | 'y' | 'facingX' | 'facingY'>,
  target: Pick<CoopPlayerPresence, 'x' | 'y' | 'facingX' | 'facingY'>,
  alpha: number,
) {
  const amount = clamp(alpha, 0, 1);
  return {
    x: current.x + (target.x - current.x) * amount,
    y: current.y + (target.y - current.y) * amount,
    facingX: current.facingX + (target.facingX - current.facingX) * amount,
    facingY: current.facingY + (target.facingY - current.facingY) * amount,
  };
}

function realtimeSocketUrl(): string {
  const protocolUrl = SUPABASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${protocolUrl}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`;
}

export class CoopRealtimePresenceClient {
  private socket: WebSocket | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private closed = false;
  private joined = false;
  private reference = 0;
  private joinRef = '';
  private sequence = 0;
  private latestOutgoing: OutgoingPresence | null = null;
  private latestRemoteSequence = new Map<string, number>();
  private status: CoopRealtimeStatus = 'offline';
  private readonly userId: string;
  private readonly topic: string;

  constructor(private readonly options: RealtimeOptions) {
    const session = currentOnlineSession();
    if (!session?.user?.id) throw new Error('Für den Duo-Run fehlt eine Online-Sitzung.');
    this.userId = session.user.id;
    this.topic = `realtime:duo-run:${options.context.lobbyId}`;
  }

  connect(): void {
    if (this.closed || this.socket) return;
    this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    const socket = new WebSocket(realtimeSocketUrl());
    this.socket = socket;

    socket.addEventListener('open', () => this.joinChannel());
    socket.addEventListener('message', event => this.handleMessage(event.data));
    socket.addEventListener('error', () => socket.close());
    socket.addEventListener('close', () => this.handleClose());
  }

  publish(presence: OutgoingPresence): void {
    this.latestOutgoing = presence;
    if (!this.joined) return;
    this.sendPresence(presence);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.joined) {
      this.sendBroadcast('player_left', { userId: this.userId, lobbyId: this.options.context.lobbyId });
      this.send({ topic: this.topic, event: 'phx_leave', payload: {}, ref: this.nextRef() });
    }
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
    this.joined = false;
    this.setStatus('offline');
  }

  private joinChannel(): void {
    const session = currentOnlineSession();
    if (!session?.access_token) {
      this.socket?.close();
      return;
    }
    this.joinRef = this.nextRef();
    this.send({
      topic: this.topic,
      event: 'phx_join',
      payload: {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: this.userId },
          postgres_changes: [],
        },
        access_token: session.access_token,
      },
      ref: this.joinRef,
    });
  }

  private handleMessage(data: unknown): void {
    let message: PhoenixMessage;
    try { message = JSON.parse(String(data)) as PhoenixMessage; }
    catch { return; }

    if (message.event === 'phx_reply' && message.ref === this.joinRef) {
      const status = String((message.payload as { status?: unknown } | undefined)?.status ?? '');
      if (status !== 'ok') {
        this.socket?.close();
        return;
      }
      this.joined = true;
      this.reconnectAttempt = 0;
      this.setStatus('connected');
      this.startHeartbeat();
      if (this.latestOutgoing) this.sendPresence(this.latestOutgoing);
      return;
    }

    if (message.event === 'phx_error') {
      this.socket?.close();
      return;
    }

    if (message.event !== 'broadcast' || !message.payload) return;
    const event = String(message.payload.event ?? '');
    const payload = message.payload.payload;
    if (event === 'player_left' && payload && typeof payload === 'object') {
      const userId = String((payload as Record<string, unknown>).userId ?? '');
      if (userId && userId !== this.userId) {
        this.latestRemoteSequence.delete(userId);
        this.options.onPeerLeft(userId);
      }
      return;
    }
    if (event !== 'player_state') return;
    const normalized = normalizeCoopPlayerPresence(payload, this.options.context, this.userId);
    if (!normalized) return;
    const previousSequence = this.latestRemoteSequence.get(normalized.userId) ?? -1;
    if (normalized.sequence <= previousSequence) return;
    this.latestRemoteSequence.set(normalized.userId, normalized.sequence);
    this.options.onRemotePresence(normalized);
  }

  private sendPresence(presence: OutgoingPresence): void {
    const payload: Omit<CoopPlayerPresence, 'receivedAt'> = {
      version: 1,
      lobbyId: this.options.context.lobbyId,
      runSeed: this.options.context.runSeed,
      userId: this.userId,
      displayName: presence.displayName,
      chapter: presence.chapter,
      room: presence.room,
      x: presence.x,
      y: presence.y,
      facingX: presence.facingX,
      facingY: presence.facingY,
      state: presence.state,
      lastAttackTime: presence.lastAttackTime,
      lastDodgeTime: presence.lastDodgeTime,
      sequence: ++this.sequence,
      sentAt: Date.now(),
    };
    this.sendBroadcast('player_state', payload);
  }

  private sendBroadcast(event: string, payload: unknown): void {
    this.send({
      topic: this.topic,
      event: 'broadcast',
      payload: { type: 'broadcast', event, payload },
      ref: null,
    });
  }

  private send(message: PhoenixMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: this.nextRef() });
    }, HEARTBEAT_MS);
  }

  private handleClose(): void {
    this.socket = null;
    this.joined = false;
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    if (this.closed) return;
    this.setStatus('reconnecting');
    const delay = Math.min(MAX_RECONNECT_MS, 700 * 2 ** Math.min(4, this.reconnectAttempt++));
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
  }

  private nextRef(): string {
    this.reference += 1;
    return String(this.reference);
  }

  private setStatus(status: CoopRealtimeStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.options.onStatus(status);
  }
}
