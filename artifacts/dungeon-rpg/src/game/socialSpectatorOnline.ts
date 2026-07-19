import type { RunGameState } from './runEngine';
import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

const SPECTATING_ALLOWED_KEY = 'dungeon-veil-spectating-allowed-v1';
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

export type OnlineActivityState = 'menu' | 'run' | 'paused';

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
};

type RawSpectatorSnapshot = SpectatorSnapshotV1 | SpectatorSnapshotV2;

export type SpectatorSnapshot = {
  version: 2;
  emittedAt: number;
  sequence: number;
  roomKey: string;
  keyframe: boolean;
  state: RunGameState;
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
const spectatorMapCache = new Map<string, { roomKey: string; map: RunGameState['map']; at: number }>();

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

export function buildSpectatorSnapshot(state: RunGameState, now = Date.now()): SpectatorSnapshotV2 {
  const currentRoomKey = `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;
  const keyframe = currentRoomKey !== lastPublishedRoomKey || now - lastKeyframeAt >= SPECTATOR_KEYFRAME_MS;
  if (keyframe) {
    lastPublishedRoomKey = currentRoomKey;
    lastKeyframeAt = now;
  }
  publishSequence += 1;

  const safeState: SpectatorNetworkState = {
    ...state,
    ...(keyframe ? { map: compactMap(state.map) } : {}),
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
  if (!raw || !raw.state || !Number.isFinite(raw.emittedAt)) return null;
  if (raw.version === 1) {
    const roomKey = `${raw.state.chapter}:${raw.state.floor}:${raw.state.map.width}x${raw.state.map.height}`;
    spectatorMapCache.set(userId, { roomKey, map: raw.state.map, at: Date.now() });
    return { version: 2, emittedAt: raw.emittedAt, sequence: 0, roomKey, keyframe: true, state: raw.state };
  }
  if (raw.version !== 2 || !raw.roomKey) return null;
  if (raw.state.map) spectatorMapCache.set(userId, { roomKey: raw.roomKey, map: raw.state.map, at: Date.now() });
  const cached = spectatorMapCache.get(userId);
  const map = raw.state.map ?? (cached?.roomKey === raw.roomKey ? cached.map : null);
  if (!map) return null;
  return {
    version: 2,
    emittedAt: raw.emittedAt,
    sequence: Number(raw.sequence) || 0,
    roomKey: raw.roomKey,
    keyframe: Boolean(raw.keyframe),
    state: { ...raw.state, map } as RunGameState,
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
