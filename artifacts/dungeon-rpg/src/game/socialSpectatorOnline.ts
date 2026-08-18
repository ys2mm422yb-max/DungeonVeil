import type { RunGameState } from './runEngine';
import type { CompanionRoleV4 } from './companionReserveV4';
import { activeCompanionV5 } from './companionCollectionV5';
import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

const SPECTATING_ALLOWED_KEY = 'dungeon-veil-spectating-allowed-v1';
const COMPANION_ACTION_EVENT = 'dungeon-veil-companion-action-v4';
export const SPECTATOR_PUBLISH_MS = 125;
export const SPECTATOR_POLL_MS = 125;
export const SPECTATOR_REFRESH_MS = SPECTATOR_POLL_MS;
export const SPECTATOR_KEYFRAME_MS = 1_000;
export const SPECTATOR_STALE_MS = 5_000;
export const SPECTATOR_VIEWER_HEARTBEAT_MS = 3_000;

const SPECTATOR_ENEMY_LIMIT = 28;
const SPECTATOR_ITEM_LIMIT = 12;
const SPECTATOR_CHEST_LIMIT = 4;
const SPECTATOR_DAMAGE_LIMIT = 8;
const SPECTATOR_PARTICLE_LIMIT = 12;
const SPECTATOR_EFFECT_LIMIT = 14;
const SPECTATOR_VISUAL_RADIUS = 920;
const SPECTATOR_COMPANION_ACTION_LIMIT = 24;
const SPECTATOR_COMPANION_ROLES: readonly CompanionRoleV4[] = ['single-target', 'critical-support', 'shield', 'loot-comfort', 'distraction'];
const spectatorCompanionStreamId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type OnlineActivityState = 'menu' | 'run' | 'paused';
export type SpectatorCompanionIdentity = { role: CompanionRoleV4; level: number };
export type SpectatorCompanionAction = {
  sequence: number;
  roomKey: string;
  role: CompanionRoleV4;
  level: number;
  kind: 'attack' | 'guard' | 'collect' | 'distract';
  targetId?: string;
  at: number;
};
export type SpectatorCompanionEnvelope = {
  streamId: string;
  roomKey: string;
  identity: SpectatorCompanionIdentity | null;
  actions: SpectatorCompanionAction[];
};

type SpectatorNetworkState = Omit<RunGameState, 'map'> & { map?: RunGameState['map'] };

type SpectatorSnapshotV1 = {
  version: 1;
  emittedAt: number;
  state: RunGameState;
};

type SpectatorSnapshotV2 = {
  version: 2;
  emittedAt: number;
  sequence: number;
  roomKey: string;
  keyframe: boolean;
  state: SpectatorNetworkState;
  companion?: SpectatorCompanionEnvelope | null;
};

type RawSpectatorSnapshot = SpectatorSnapshotV1 | SpectatorSnapshotV2;

export type SpectatorSnapshot = {
  version: 2;
  emittedAt: number;
  sequence: number;
  roomKey: string;
  keyframe: boolean;
  state: RunGameState;
  companion: SpectatorCompanionEnvelope | null;
};

export type FriendSpectatorFeed = {
  activity_state: OnlineActivityState;
  chapter: number;
  room: number;
  updated_at: string;
  snapshot: SpectatorSnapshot | null;
};

type RawFriendSpectatorFeed = Omit<FriendSpectatorFeed, 'snapshot'> & { snapshot: RawSpectatorSnapshot | null };

let publishSequence = 0;
let lastPublishedRoomKey = '';
let lastKeyframeAt = 0;
let companionActionSequence = 0;
let companionActionCaptureInstalled = false;
let publishedCompanionRoomKey = '';
let publishedCompanionIdentity: SpectatorCompanionIdentity | null = null;
let publishedCompanionActions: SpectatorCompanionAction[] = [];
let latestSpectatorCompanion: SpectatorCompanionEnvelope | null = null;
const spectatorCompanionSubscribers = new Set<() => void>();
const spectatorMapCache = new Map<string, { roomKey: string; map: RunGameState['map']; at: number }>();

function isCompanionRole(value: unknown): value is CompanionRoleV4 {
  return typeof value === 'string' && SPECTATOR_COMPANION_ROLES.includes(value as CompanionRoleV4);
}

function setLatestSpectatorCompanion(value: SpectatorCompanionEnvelope | null) {
  latestSpectatorCompanion = value;
  spectatorCompanionSubscribers.forEach(listener => listener());
}

export function subscribeSpectatorCompanion(listener: () => void): () => void {
  spectatorCompanionSubscribers.add(listener);
  return () => spectatorCompanionSubscribers.delete(listener);
}

export function getLatestSpectatorCompanion(): SpectatorCompanionEnvelope | null {
  return latestSpectatorCompanion;
}

function ensureCompanionActionCapture() {
  if (companionActionCaptureInstalled || typeof window === 'undefined') return;
  companionActionCaptureInstalled = true;
  window.addEventListener(COMPANION_ACTION_EVENT, event => {
    const detail = (event as CustomEvent<{ role?: unknown; level?: unknown; kind?: unknown; targetId?: unknown; at?: unknown }>).detail;
    if (!publishedCompanionIdentity || !publishedCompanionRoomKey || !isCompanionRole(detail?.role)) return;
    if (detail.role !== publishedCompanionIdentity.role) return;
    const kind = detail.kind;
    if (kind !== 'attack' && kind !== 'guard' && kind !== 'collect' && kind !== 'distract') return;
    const action: SpectatorCompanionAction = {
      sequence: ++companionActionSequence,
      roomKey: publishedCompanionRoomKey,
      role: detail.role,
      level: Math.max(1, Math.floor(Number(detail.level) || publishedCompanionIdentity.level)),
      kind,
      ...(typeof detail.targetId === 'string' && detail.targetId ? { targetId: detail.targetId } : {}),
      at: Number.isFinite(Number(detail.at)) ? Number(detail.at) : performance.now(),
    };
    publishedCompanionActions.push(action);
    publishedCompanionActions = publishedCompanionActions.slice(-SPECTATOR_COMPANION_ACTION_LIMIT);
    setLatestSpectatorCompanion({
      streamId: spectatorCompanionStreamId,
      roomKey: publishedCompanionRoomKey,
      identity: publishedCompanionIdentity,
      actions: publishedCompanionActions.filter(entry => entry.roomKey === publishedCompanionRoomKey),
    });
  });
}

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!currentOnlineSession()) throw new Error('Nicht angemeldet');
  return authenticatedSupabaseRest<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
}

export function loadSpectatingAllowed(): boolean {
  try { return localStorage.getItem(SPECTATING_ALLOWED_KEY) !== '0'; }
  catch { return true; }
}

export async function setSpectatingAllowed(allowed: boolean): Promise<boolean> {
  try { localStorage.setItem(SPECTATING_ALLOWED_KEY, allowed ? '1' : '0'); } catch {}
  if (!currentOnlineSession()) return allowed;
  return rpc<boolean>('set_spectating_allowed', { p_allowed: allowed });
}

export async function refreshSpectatingAllowed(): Promise<boolean> {
  if (!currentOnlineSession()) return loadSpectatingAllowed();
  const allowed = await rpc<boolean>('get_my_spectating_preference');
  try { localStorage.setItem(SPECTATING_ALLOWED_KEY, allowed ? '1' : '0'); } catch {}
  return allowed;
}

const distanceSquared = (x1: number, y1: number, x2: number, y2: number) => (x2 - x1) ** 2 + (y2 - y1) ** 2;

function nearPlayer(state: RunGameState, x: number, y: number, radius = SPECTATOR_VISUAL_RADIUS): boolean {
  return distanceSquared(state.player.x, state.player.y, x, y) <= radius * radius;
}

function compactMap(map: RunGameState['map']): RunGameState['map'] {
  return {
    ...map,
    chests: map.chests.slice(0, 12).map(chest => ({ ...chest })),
    decorations: map.decorations.slice(0, 40).map(decoration => ({ ...decoration })),
    torches: map.torches.slice(0, 40).map(torch => ({ ...torch })),
  };
}

function normalizeCompanionEnvelope(raw: unknown, roomKey: string): SpectatorCompanionEnvelope | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<SpectatorCompanionEnvelope>;
  if (typeof value.streamId !== 'string' || !value.streamId || value.roomKey !== roomKey) return null;
  const identity = value.identity && isCompanionRole(value.identity.role)
    ? { role: value.identity.role, level: Math.max(1, Math.floor(Number(value.identity.level) || 1)) }
    : null;
  if (!identity) return null;
  const bySequence = new Map<number, SpectatorCompanionAction>();
  for (const entry of Array.isArray(value.actions) ? value.actions : []) {
    if (!entry || !Number.isFinite(Number(entry.sequence)) || entry.roomKey !== roomKey || !isCompanionRole(entry.role)) continue;
    if (entry.kind !== 'attack' && entry.kind !== 'guard' && entry.kind !== 'collect' && entry.kind !== 'distract') continue;
    const sequence = Math.max(1, Math.floor(Number(entry.sequence)));
    bySequence.set(sequence, {
      sequence,
      roomKey,
      role: entry.role,
      level: Math.max(1, Math.floor(Number(entry.level) || identity.level)),
      kind: entry.kind,
      ...(typeof entry.targetId === 'string' && entry.targetId ? { targetId: entry.targetId } : {}),
      at: Number(entry.at) || 0,
    });
  }
  return {
    streamId: value.streamId,
    roomKey,
    identity,
    actions: [...bySequence.values()].sort((a, b) => a.sequence - b.sequence).slice(-SPECTATOR_COMPANION_ACTION_LIMIT),
  };
}

export function buildSpectatorSnapshot(state: RunGameState, now = Date.now()): SpectatorSnapshotV2 {
  ensureCompanionActionCapture();
  const currentRoomKey = `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;
  const keyframe = currentRoomKey !== lastPublishedRoomKey || now - lastKeyframeAt >= SPECTATOR_KEYFRAME_MS;
  if (keyframe) {
    lastPublishedRoomKey = currentRoomKey;
    lastKeyframeAt = now;
  }
  publishSequence += 1;

  const activeCompanion = activeCompanionV5();
  publishedCompanionIdentity = activeCompanion ? { role: activeCompanion.id, level: activeCompanion.level } : null;
  if (publishedCompanionRoomKey !== currentRoomKey) {
    publishedCompanionRoomKey = currentRoomKey;
    publishedCompanionActions = publishedCompanionActions.filter(entry => entry.roomKey === currentRoomKey);
  }
  const companion: SpectatorCompanionEnvelope | null = publishedCompanionIdentity ? {
    streamId: spectatorCompanionStreamId,
    roomKey: currentRoomKey,
    identity: publishedCompanionIdentity,
    actions: publishedCompanionActions.filter(entry => entry.roomKey === currentRoomKey).slice(-SPECTATOR_COMPANION_ACTION_LIMIT),
  } : null;
  setLatestSpectatorCompanion(companion);

  const { map, ...stateWithoutMap } = state;
  const safeState: SpectatorNetworkState = {
    ...stateWithoutMap,
    ...(keyframe ? { map: compactMap(map) } : {}),
    player: { ...state.player, playerName: '', facing: { ...state.player.facing } },
    enemies: state.enemies
      .filter(enemy => enemy.enemyType === 'boss' || nearPlayer(state, enemy.x, enemy.y, 1_250))
      .slice(-SPECTATOR_ENEMY_LIMIT)
      .map(enemy => ({ ...enemy })),
    items: state.items.filter(item => nearPlayer(state, item.x, item.y)).slice(-SPECTATOR_ITEM_LIMIT).map(item => ({ ...item })),
    chests: state.chests.filter(chest => nearPlayer(state, chest.x, chest.y)).slice(-SPECTATOR_CHEST_LIMIT).map(chest => ({ ...chest })),
    damageNumbers: state.damageNumbers.filter(number => nearPlayer(state, number.x, number.y)).slice(-SPECTATOR_DAMAGE_LIMIT).map(number => ({ ...number })),
    particles: state.particles.filter(particle => nearPlayer(state, particle.x, particle.y, 700)).slice(-SPECTATOR_PARTICLE_LIMIT).map(particle => ({ ...particle })),
    effects: state.effects.filter(effect => nearPlayer(state, effect.x, effect.y, 1_050)).slice(-SPECTATOR_EFFECT_LIMIT).map(effect => ({ ...effect })),
    upgradeChoices: [],
    runSkills: { ...state.runSkills },
  };

  return {
    version: 2,
    emittedAt: now,
    sequence: publishSequence,
    roomKey: currentRoomKey,
    keyframe,
    state: safeState,
    companion,
  };
}

export async function publishSpectatorState(state: RunGameState): Promise<boolean> {
  if (!currentOnlineSession()) return false;
  const allowed = loadSpectatingAllowed();
  const activity: OnlineActivityState = state.status === 'paused' ? 'paused' : 'run';
  return rpc<boolean>('publish_spectator_snapshot', {
    p_activity_state: activity,
    p_chapter: state.chapter,
    p_room: state.floor,
    p_snapshot: allowed ? buildSpectatorSnapshot(state) : null,
  });
}

export async function publishMenuActivity(chapter = 1, room = 1): Promise<boolean> {
  if (!currentOnlineSession()) return false;
  return rpc<boolean>('publish_spectator_snapshot', {
    p_activity_state: 'menu',
    p_chapter: Math.max(1, chapter),
    p_room: Math.max(1, room),
    p_snapshot: null,
  });
}

function normalizeSnapshot(userId: string, raw: RawSpectatorSnapshot | null): SpectatorSnapshot | null {
  if (!raw || !raw.state || !Number.isFinite(raw.emittedAt)) {
    setLatestSpectatorCompanion(null);
    return null;
  }
  if (raw.version === 1) {
    const roomKey = `${raw.state.chapter}:${raw.state.floor}:${raw.state.map.width}x${raw.state.map.height}`;
    spectatorMapCache.set(userId, { roomKey, map: raw.state.map, at: Date.now() });
    setLatestSpectatorCompanion(null);
    return { version: 2, emittedAt: raw.emittedAt, sequence: 0, roomKey, keyframe: true, state: raw.state, companion: null };
  }
  if (raw.version !== 2 || !raw.roomKey) {
    setLatestSpectatorCompanion(null);
    return null;
  }
  if (raw.state.map) spectatorMapCache.set(userId, { roomKey: raw.roomKey, map: raw.state.map, at: Date.now() });
  const cached = spectatorMapCache.get(userId);
  const map = raw.state.map ?? (cached?.roomKey === raw.roomKey ? cached.map : null);
  if (!map) return null;
  const companion = normalizeCompanionEnvelope(raw.companion, raw.roomKey);
  setLatestSpectatorCompanion(companion);
  return {
    version: 2,
    emittedAt: raw.emittedAt,
    sequence: Number(raw.sequence) || 0,
    roomKey: raw.roomKey,
    keyframe: Boolean(raw.keyframe),
    state: { ...raw.state, map } as RunGameState,
    companion,
  };
}

export async function loadFriendSpectatorFeed(userId: string): Promise<FriendSpectatorFeed | null> {
  const rows = await rpc<RawFriendSpectatorFeed[]>('get_friend_spectator_snapshot', { p_user_id: userId });
  const feed = rows[0];
  if (!feed) return null;
  const snapshot = normalizeSnapshot(userId, feed.snapshot);
  const updatedAt = new Date(feed.updated_at).getTime();
  const stale = !Number.isFinite(updatedAt) || Date.now() - updatedAt > SPECTATOR_STALE_MS;
  if ((feed.activity_state === 'run' || feed.activity_state === 'paused') && (!snapshot || stale)) {
    setLatestSpectatorCompanion(null);
    return { ...feed, snapshot: null };
  }
  return { ...feed, snapshot };
}

export async function heartbeatSpectatorViewer(hostUserId: string): Promise<boolean> {
  if (!currentOnlineSession()) return false;
  return rpc<boolean>('heartbeat_spectator_viewer', { p_host_user_id: hostUserId });
}

export async function leaveSpectatorViewer(hostUserId: string): Promise<void> {
  if (!currentOnlineSession()) return;
  await rpc<boolean>('leave_spectator_viewer', { p_host_user_id: hostUserId });
}

export async function loadMySpectatorViewerCount(): Promise<number> {
  if (!currentOnlineSession()) return 0;
  const value = await rpc<number>('get_my_spectator_viewer_count');
  return Math.max(0, Math.floor(Number(value) || 0));
}