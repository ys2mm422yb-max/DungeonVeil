import { useEffect, useRef } from 'react';
import type { VisualEffect } from '../game/entities';
import type { GameState } from '../game/runEngine';
import type { CoopPlayerPresence } from '../game/coopRealtimePresence';
import { currentOnlineSession } from '../game/supabaseOnline';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');
const HEARTBEAT_MS = 25_000;
const SCAN_MS = 40;
const MAX_LOCAL_IDS = 96;
const MAX_REMOTE_VISUALS = 18;
const MAX_RECONNECT_MS = 8_000;
const PROJECTILE_ID = /^(shot|pierce|rico)-/;
const REMOTE_MARKER = '-coop-remote-';

type Props = {
  gameState: GameState;
  remotePlayer: CoopPlayerPresence;
};

type ProjectileKind = 'shot' | 'pierce' | 'rico';
type CoopProjectileVisual = {
  version: 1;
  lobbyId: string;
  runSeed: number;
  userId: string;
  chapter: number;
  room: number;
  sourceId: string;
  kind: ProjectileKind;
  x: number;
  y: number;
  maxRadius: number;
  angle: number;
  color: string;
  element: VisualEffect['element'];
  width: number;
  lifeTime: number;
  maxLifeTime: number;
  sequence: number;
  sentAt: number;
};

type PhoenixMessage = {
  topic?: string;
  event?: string;
  payload?: Record<string, unknown>;
  ref?: string | null;
};

function socketUrl() {
  const protocolUrl = SUPABASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${protocolUrl}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`;
}

function finite(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function projectileKind(id: string): ProjectileKind | null {
  if (id.startsWith('shot-')) return 'shot';
  if (id.startsWith('pierce-')) return 'pierce';
  if (id.startsWith('rico-')) return 'rico';
  return null;
}

function normalizeElement(value: unknown): VisualEffect['element'] {
  return value === 'fire' || value === 'ice' || value === 'arcane' || value === 'piercing' ? value : 'normal';
}

function normalizeProjectile(
  value: unknown,
  expected: Pick<CoopPlayerPresence, 'lobbyId' | 'runSeed' | 'userId'>,
  localUserId: string,
): CoopProjectileVisual | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const lobbyId = String(raw.lobbyId ?? '');
  const runSeed = Math.floor(finite(raw.runSeed, -1));
  const userId = String(raw.userId ?? '');
  const kind = raw.kind === 'shot' || raw.kind === 'pierce' || raw.kind === 'rico' ? raw.kind : null;
  const maxLifeTime = clamp(finite(raw.maxLifeTime, 200), 100, 600);
  if (!kind || lobbyId !== expected.lobbyId || runSeed !== expected.runSeed || userId !== expected.userId || userId === localUserId) return null;
  return {
    version: 1,
    lobbyId,
    runSeed,
    userId,
    chapter: Math.max(1, Math.floor(finite(raw.chapter, 1))),
    room: clamp(Math.floor(finite(raw.room, 1)), 1, 50),
    sourceId: String(raw.sourceId ?? '').slice(0, 96),
    kind,
    x: clamp(finite(raw.x), -10_000, 10_000),
    y: clamp(finite(raw.y), -10_000, 10_000),
    maxRadius: clamp(finite(raw.maxRadius), 1, 2_000),
    angle: clamp(finite(raw.angle), -Math.PI * 4, Math.PI * 4),
    color: /^#[0-9a-f]{6}$/i.test(String(raw.color ?? '')) ? String(raw.color) : '#ffe5a3',
    element: normalizeElement(raw.element),
    width: clamp(finite(raw.width, 4), 1, 16),
    lifeTime: clamp(finite(raw.lifeTime), 0, maxLifeTime),
    maxLifeTime,
    sequence: Math.max(0, Math.floor(finite(raw.sequence))),
    sentAt: Math.max(0, Math.floor(finite(raw.sentAt))),
  };
}

function trimSet(set: Set<string>, maximum: number) {
  while (set.size > maximum) {
    const first = set.values().next().value;
    if (typeof first !== 'string') break;
    set.delete(first);
  }
}

function removeRemoteVisuals(state: GameState) {
  for (let index = state.effects.length - 1; index >= 0; index--) {
    if (state.effects[index].id.includes(REMOTE_MARKER)) state.effects.splice(index, 1);
  }
}

/**
 * Uses a small visual-only realtime stream. Damage remains owned by the
 * existing host-authoritative hit-intent path; these events can only create
 * short-lived arrow meshes in the other player's already running scene.
 */
export function CoopProjectileRealtimeBridge({ gameState, remotePlayer }: Props) {
  const stateRef = useRef(gameState);
  const remoteRef = useRef(remotePlayer);
  stateRef.current = gameState;
  remoteRef.current = remotePlayer;

  useEffect(() => {
    const session = currentOnlineSession();
    if (!session?.user?.id || !session.access_token) return;
    const localUserId = session.user.id;
    const topic = `realtime:duo-run:${remotePlayer.lobbyId}`;
    let socket: WebSocket | null = null;
    let joined = false;
    let closed = false;
    let reference = 0;
    let joinRef = '';
    let sequence = 0;
    let latestRemoteSequence = -1;
    let reconnectAttempt = 0;
    let reconnectTimer: number | null = null;
    let heartbeatTimer: number | null = null;
    const localIds = new Set<string>();
    const remoteIds = new Set<string>();
    let roomKey = `${gameState.chapter}:${gameState.floor}`;

    const nextRef = () => String(++reference);
    const send = (message: PhoenixMessage) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };
    const broadcast = (event: string, payload: unknown) => send({
      topic,
      event: 'broadcast',
      payload: { type: 'broadcast', event, payload } as unknown as Record<string, unknown>,
      ref: null,
    });

    const startHeartbeat = () => {
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      heartbeatTimer = window.setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: nextRef() }), HEARTBEAT_MS);
    };

    const join = () => {
      joinRef = nextRef();
      send({
        topic,
        event: 'phx_join',
        payload: {
          config: { broadcast: { ack: false, self: false }, presence: { key: `${localUserId}:projectiles` }, postgres_changes: [] },
          access_token: session.access_token,
        },
        ref: joinRef,
      });
    };

    const injectRemote = (projectile: CoopProjectileVisual) => {
      const state = stateRef.current;
      if (projectile.chapter !== state.chapter || projectile.room !== state.floor) return;
      const remoteId = `${projectile.kind}${REMOTE_MARKER}${projectile.userId.slice(0, 8)}-${projectile.sequence}`;
      if (remoteIds.has(remoteId)) return;
      const latency = clamp(Date.now() - projectile.sentAt, 0, projectile.maxLifeTime);
      const lifeTime = Math.min(projectile.maxLifeTime - 1, projectile.lifeTime + latency);
      if (lifeTime >= projectile.maxLifeTime - 1) return;
      remoteIds.add(remoteId);
      trimSet(remoteIds, 160);
      state.effects.push({
        id: remoteId,
        x: projectile.x,
        y: projectile.y,
        radius: 0,
        maxRadius: projectile.maxRadius,
        color: projectile.color,
        lifeTime,
        maxLifeTime: projectile.maxLifeTime,
        type: 'beam',
        angle: projectile.angle,
        width: projectile.width,
        element: projectile.element,
      });
      const remoteVisuals = state.effects.filter(effect => effect.id.includes(REMOTE_MARKER));
      if (remoteVisuals.length > MAX_REMOTE_VISUALS) {
        const overflow = new Set(remoteVisuals.slice(0, remoteVisuals.length - MAX_REMOTE_VISUALS).map(effect => effect.id));
        for (let index = state.effects.length - 1; index >= 0; index--) {
          if (overflow.has(state.effects[index].id)) state.effects.splice(index, 1);
        }
      }
    };

    const handleMessage = (data: unknown) => {
      let message: PhoenixMessage;
      try { message = JSON.parse(String(data)) as PhoenixMessage; } catch { return; }
      if (message.event === 'phx_reply' && message.ref === joinRef) {
        const status = String((message.payload as { status?: unknown } | undefined)?.status ?? '');
        if (status !== 'ok') {
          socket?.close();
          return;
        }
        joined = true;
        reconnectAttempt = 0;
        startHeartbeat();
        return;
      }
      if (message.event === 'phx_error') {
        socket?.close();
        return;
      }
      if (message.event !== 'broadcast' || !message.payload || String(message.payload.event ?? '') !== 'projectile_visual') return;
      const projectile = normalizeProjectile(message.payload.payload, remoteRef.current, localUserId);
      if (!projectile || projectile.sequence <= latestRemoteSequence) return;
      latestRemoteSequence = projectile.sequence;
      injectRemote(projectile);
    };

    const connect = () => {
      if (closed || socket) return;
      socket = new WebSocket(socketUrl());
      socket.addEventListener('open', join);
      socket.addEventListener('message', event => handleMessage(event.data));
      socket.addEventListener('error', () => socket?.close());
      socket.addEventListener('close', () => {
        socket = null;
        joined = false;
        if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        if (closed) return;
        const delay = Math.min(MAX_RECONNECT_MS, 700 * 2 ** Math.min(4, reconnectAttempt++));
        if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, delay);
      });
    };

    const scanTimer = window.setInterval(() => {
      const state = stateRef.current;
      const nextRoomKey = `${state.chapter}:${state.floor}`;
      if (nextRoomKey !== roomKey) {
        roomKey = nextRoomKey;
        localIds.clear();
        remoteIds.clear();
        latestRemoteSequence = -1;
        removeRemoteVisuals(state);
      }
      if (!joined) return;
      const candidates = state.effects.filter(effect => PROJECTILE_ID.test(effect.id) && !effect.id.includes(REMOTE_MARKER));
      for (const effect of candidates) {
        if (localIds.has(effect.id)) continue;
        const kind = projectileKind(effect.id);
        if (!kind) continue;
        localIds.add(effect.id);
        trimSet(localIds, MAX_LOCAL_IDS);
        broadcast('projectile_visual', {
          version: 1,
          lobbyId: remoteRef.current.lobbyId,
          runSeed: remoteRef.current.runSeed,
          userId: localUserId,
          chapter: state.chapter,
          room: state.floor,
          sourceId: effect.id.slice(0, 96),
          kind,
          x: effect.x,
          y: effect.y,
          maxRadius: effect.maxRadius,
          angle: effect.angle ?? 0,
          color: effect.color,
          element: effect.element ?? 'normal',
          width: effect.width ?? 4,
          lifeTime: effect.lifeTime,
          maxLifeTime: effect.maxLifeTime,
          sequence: ++sequence,
          sentAt: Date.now(),
        } satisfies CoopProjectileVisual);
      }
    }, SCAN_MS);

    connect();
    return () => {
      closed = true;
      window.clearInterval(scanTimer);
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (joined) send({ topic, event: 'phx_leave', payload: {}, ref: nextRef() });
      socket?.close();
      removeRemoteVisuals(stateRef.current);
    };
  }, [remotePlayer.lobbyId, remotePlayer.runSeed, remotePlayer.userId]);

  return <span data-testid="coop-projectile-realtime" className="hidden" aria-hidden="true" />;
}
