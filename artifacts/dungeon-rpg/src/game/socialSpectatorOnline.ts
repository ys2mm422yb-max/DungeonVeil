import type { RunGameState } from './runEngine';
import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

const SPECTATING_ALLOWED_KEY = 'dungeon-veil-spectating-allowed-v1';
export const SPECTATOR_REFRESH_MS = 850;
export const SPECTATOR_STALE_MS = 8_000;

export type OnlineActivityState = 'menu' | 'run' | 'paused';

export type SpectatorSnapshot = {
  version: 1;
  emittedAt: number;
  state: RunGameState;
};

export type FriendSpectatorFeed = {
  activity_state: OnlineActivityState;
  chapter: number;
  room: number;
  updated_at: string;
  snapshot: SpectatorSnapshot;
};

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

function cloneForNetwork<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function buildSpectatorSnapshot(state: RunGameState): SpectatorSnapshot {
  const safeState: RunGameState = {
    ...state,
    player: { ...state.player, playerName: '' },
    enemies: state.enemies.map(enemy => ({ ...enemy })),
    items: state.items.slice(-30).map(item => ({ ...item })),
    chests: state.chests.slice(-12).map(chest => ({ ...chest })),
    damageNumbers: state.damageNumbers.slice(-24).map(number => ({ ...number })),
    particles: state.particles.slice(-80).map(particle => ({ ...particle })),
    effects: state.effects.slice(-48).map(effect => ({ ...effect })),
    upgradeChoices: [],
    runSkills: {},
  };
  return { version: 1, emittedAt: Date.now(), state: cloneForNetwork(safeState) };
}

export async function publishSpectatorState(state: RunGameState): Promise<boolean> {
  if (!currentOnlineSession()) return false;
  const allowed = loadSpectatingAllowed();
  const activity: OnlineActivityState = state.status === 'paused' ? 'paused' : 'run';
  return rpc<boolean>('publish_spectator_snapshot', {
    p_activity_state: activity,
    p_chapter: state.chapter,
    p_room: state.floor,
    p_snapshot: allowed && activity === 'run' ? buildSpectatorSnapshot(state) : null,
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
  if (!feed?.snapshot || feed.snapshot.version !== 1) return null;
  const updatedAt = new Date(feed.updated_at).getTime();
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > SPECTATOR_STALE_MS) return null;
  return feed;
}
