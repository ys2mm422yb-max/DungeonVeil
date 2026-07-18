import {
  authenticatedSupabaseRest,
  currentOnlineSession,
  onlineSessionEventName,
  signOutOnline,
} from './supabaseOnline';

export const ONLINE_PLAYER_IDENTITY_EVENT = 'dungeon-veil-online-player-identity';

export type OnlinePlayerIdentity = {
  id: string;
  display_name: string;
  display_name_confirmed_at: string | null;
};

function emitIdentityChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ONLINE_PLAYER_IDENTITY_EVENT));
  window.dispatchEvent(new Event(onlineSessionEventName()));
}

export async function loadMyPlayerIdentity(): Promise<OnlinePlayerIdentity | null> {
  const session = currentOnlineSession();
  if (!session) return null;
  const rows = await authenticatedSupabaseRest<OnlinePlayerIdentity[]>(
    `profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,display_name,display_name_confirmed_at`,
  );
  return rows[0] ?? null;
}

export async function loadMyPlayerIdentityWithRetry(attempts = 4): Promise<OnlinePlayerIdentity | null> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
    try {
      const identity = await loadMyPlayerIdentity();
      if (identity || !currentOnlineSession()) return identity;
    } catch (reason) {
      lastError = reason;
    }
    if (attempt + 1 < attempts) await new Promise(resolve => window.setTimeout(resolve, 250 * (attempt + 1)));
  }
  if (lastError) throw lastError;
  return null;
}

export async function confirmIngamePlayerName(displayName: string): Promise<OnlinePlayerIdentity> {
  const rows = await authenticatedSupabaseRest<OnlinePlayerIdentity[]>('rpc/set_ingame_display_name', {
    method: 'POST',
    body: JSON.stringify({ p_display_name: displayName }),
  });
  const identity = rows[0];
  if (!identity?.display_name_confirmed_at) throw new Error('Spielername konnte nicht bestätigt werden.');
  emitIdentityChanged();
  return identity;
}

export async function signOutFromIdentityGate(): Promise<void> {
  await signOutOnline();
  emitIdentityChanged();
}

export function isPlayerIdentityConfirmed(identity: OnlinePlayerIdentity | null): boolean {
  return Boolean(identity?.display_name_confirmed_at && identity.display_name.trim().length >= 2);
}
