import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

export const ONLINE_PRESENCE_WINDOW_MS = 5 * 60 * 1000;
export const ONLINE_PRESENCE_TICK_MS = 30 * 1000;
export const ONLINE_PRESENCE_POLL_MS = 60 * 1000;
export const ONLINE_PRESENCE_TICK_EVENT = 'dungeon-veil-presence-tick';
export const ONLINE_PRESENCE_REFRESH_EVENT = 'dungeon-veil-presence-refresh';

export type OnlinePresenceMap = Record<string, string>;

export function isPresenceOnline(value: string | null | undefined, now = Date.now()): boolean {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) && now - time <= ONLINE_PRESENCE_WINDOW_MS;
}

export function formatPresence(value: string | null | undefined, language: 'de' | 'en', now = Date.now()): string {
  const de = language === 'de';
  const time = value ? new Date(value).getTime() : Number.NaN;
  if (!Number.isFinite(time)) return de ? 'Zuletzt aktiv unbekannt' : 'Last active unknown';
  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  if (minutes < 5) return 'Online';
  if (minutes < 60) return de ? `Vor ${minutes} Min.` : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return de ? `Vor ${hours} Std.` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return de ? `Vor ${days} Tag${days === 1 ? '' : 'en'}` : `${days}d ago`;
}

export async function publishOnlinePresence(): Promise<boolean> {
  const session = currentOnlineSession();
  if (!session) return false;
  await authenticatedSupabaseRest(`profiles?id=eq.${encodeURIComponent(session.user.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ last_active_at: new Date().toISOString() }),
  });
  return true;
}

export async function loadPresenceByUserIds(userIds: string[]): Promise<OnlinePresenceMap> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const rows = await authenticatedSupabaseRest<Array<{ id: string; last_active_at: string | null }>>(
    `profiles?id=in.(${ids.map(id => encodeURIComponent(id)).join(',')})&select=id,last_active_at`,
  );
  return Object.fromEntries(rows.filter(row => row.id && row.last_active_at).map(row => [row.id, String(row.last_active_at)]));
}
