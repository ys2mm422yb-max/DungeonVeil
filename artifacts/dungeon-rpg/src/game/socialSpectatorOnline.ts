import type { RunGameState } from './runEngine';
import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

const SPECTATING_ALLOWED_KEY = 'dungeon-veil-spectating-allowed-v1';
const SPECTATOR_PUBLISH_DIAGNOSTICS_KEY = 'dungeon-veil-spectator-publisher-performance';
const SPECTATOR_PACKET_MEASURE_MS = 2_000;
const SPECTATOR_ITEM_LIMIT = 12;
const SPECTATOR_CHEST_LIMIT = 6;
const SPECTATOR_DAMAGE_LIMIT = 6;
const SPECTATOR_PARTICLE_LIMIT = 12;
const SPECTATOR_EFFECT_LIMIT = 12;

export const SPECTATOR_REFRESH_MS = 200;
export const SPECTATOR_STALE_MS = 5_000;
export const SPECTATOR_VIEWER_HEARTBEAT_MS = 3_000;

export type OnlineActivityState = 'menu' | 'run' | 'paused';

export type SpectatorSnapshotDiagnostics = {
  estimatedBytes: number;
  enemies: number;
  effects: number;
  particles: number;
  damageNumbers: number;
  refreshMs: number;
};

export type SpectatorSnapshot = {
  version: 1;
  emittedAt: number;
  state: RunGameState;
  diagnostics?: SpectatorSnapshotDiagnostics;
};

export type FriendSpectatorFeed = {
  activity_state: OnlineActivityState;
  chapter: number;
  room: number;
  updated_at: string;
  snapshot: SpectatorSnapshot | null;
};

let lastPacketMeasureAt = 0;
let lastEstimatedBytes = 0;

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

function packetDiagnostics(state: RunGameState, emittedAt: number): SpectatorSnapshotDiagnostics {
  const now = performance.now();
  const diagnostics = {
    estimatedBytes: lastEstimatedBytes,
    enemies: state.enemies.length,
    effects: state.effects.length,
    particles: state.particles.length,
    damageNumbers: state.damageNumbers.length,
    refreshMs: SPECTATOR_REFRESH_MS,
  };
  if (now - lastPacketMeasureAt >= SPECTATOR_PACKET_MEASURE_MS) {
    lastPacketMeasureAt = now;
    try {
      lastEstimatedBytes = JSON.stringify({ version: 1, emittedAt, state }).length;
      diagnostics.estimatedBytes = lastEstimatedBytes;
      localStorage.setItem(SPECTATOR_PUBLISH_DIAGNOSTICS_KEY, JSON.stringify({ ...diagnostics, estimatedBytes: lastEstimatedBytes, at: Date.now() }));
    } catch {}
  }
  return diagnostics;
}

export function buildSpectatorSnapshot(state: RunGameState): SpectatorSnapshot {
  const emittedAt = Date.now();
  const safeState: RunGameState = {
    ...state,
    player: { ...state.player, playerName: '' },
    camera: { ...state.camera },
    enemies: state.enemies.map(enemy => ({ ...enemy })),
    items: state.items.slice(-SPECTATOR_ITEM_LIMIT).map(item => ({ ...item })),
    chests: state.chests.slice(-SPECTATOR_CHEST_LIMIT).map(chest => ({ ...chest })),
    damageNumbers: state.damageNumbers.slice(-SPECTATOR_DAMAGE_LIMIT).map(number => ({ ...number })),
    particles: state.particles.slice(-SPECTATOR_PARTICLE_LIMIT).map(particle => ({ ...particle })),
    effects: state.effects.slice(-SPECTATOR_EFFECT_LIMIT).map(effect => ({ ...effect })),
    upgradeChoices: [],
    runSkills: { ...state.runSkills },
  };
  return { version: 1, emittedAt, state: safeState, diagnostics: packetDiagnostics(safeState, emittedAt) };
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

export async function loadFriendSpectatorFeed(userId: string): Promise<FriendSpectatorFeed | null> {
  const rows = await rpc<FriendSpectatorFeed[]>('get_friend_spectator_snapshot', { p_user_id: userId });
  const feed = rows[0];
  if (!feed) return null;
  const snapshot = feed.snapshot?.version === 1 ? feed.snapshot : null;
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
