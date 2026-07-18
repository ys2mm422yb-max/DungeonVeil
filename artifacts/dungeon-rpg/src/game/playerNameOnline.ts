import {
  authenticatedSupabaseRest,
  getOnlineProfile,
  type OnlineProfile,
} from './supabaseOnline';

export const PLAYER_NAME_EVENT = 'dungeon-veil-player-name-changed';
export const PLAYER_NAME_CACHE_KEY = 'dungeon-veil-confirmed-player-name-v1';
export const PLAYER_NAME_CHANGE_GOLD_COST = 5_000;

export type PlayerNameProfile = OnlineProfile & {
  display_name_confirmed_at: string | null;
  display_name_change_count: number;
};

type PlayerNameRpcRow = PlayerNameProfile & {
  initial_setup: boolean;
};

function emitPlayerName(profile: PlayerNameProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAYER_NAME_CACHE_KEY, profile.display_name);
  } catch {}
  window.dispatchEvent(new CustomEvent<PlayerNameProfile>(PLAYER_NAME_EVENT, { detail: profile }));
}

export function normalizePlayerName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validatePlayerName(value: string): string | null {
  const name = normalizePlayerName(value);
  if (name.length < 2 || name.length > 24) return 'Der Spielername muss 2 bis 24 Zeichen lang sein.';
  if (/[<>\u0000-\u001f\u007f]/.test(name)) return 'Der Spielername enthält nicht erlaubte Zeichen.';
  return null;
}

export function loadCachedPlayerName(): string {
  if (typeof window === 'undefined') return '';
  try { return normalizePlayerName(localStorage.getItem(PLAYER_NAME_CACHE_KEY) ?? ''); }
  catch { return ''; }
}

export async function loadPlayerNameProfile(): Promise<PlayerNameProfile | null> {
  const profile = await getOnlineProfile() as PlayerNameProfile | null;
  if (profile?.display_name_confirmed_at) emitPlayerName(profile);
  return profile;
}

export async function setPlayerDisplayName(displayName: string): Promise<PlayerNameRpcRow> {
  const error = validatePlayerName(displayName);
  if (error) throw new Error(error);
  const rows = await authenticatedSupabaseRest<PlayerNameRpcRow[]>('rpc/set_player_display_name', {
    method: 'POST',
    body: JSON.stringify({ p_display_name: normalizePlayerName(displayName) }),
  });
  const profile = rows[0];
  if (!profile) throw new Error('Der Spielername konnte nicht gespeichert werden.');
  emitPlayerName(profile);
  return profile;
}
