import type { SaveData } from './saveManager';
import { currentOnlineSession, getOnlineProfile } from './supabaseOnline';

const LOCAL_RUN_NAME_KEY = 'dungeon-veil-run-name-v1';

export function sanitizeRunName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 18) : '';
}

export function rememberRunName(value: string): string {
  const name = sanitizeRunName(value);
  if (!name) return '';
  try { localStorage.setItem(LOCAL_RUN_NAME_KEY, name); } catch {}
  return name;
}

export function loadRememberedRunName(): string {
  try { return sanitizeRunName(localStorage.getItem(LOCAL_RUN_NAME_KEY)); }
  catch { return ''; }
}

export async function resolvePreferredRunName(saveData: SaveData | null): Promise<string | null> {
  const session = currentOnlineSession();
  if (session) {
    try {
      const profileName = sanitizeRunName((await getOnlineProfile())?.display_name);
      if (profileName) return rememberRunName(profileName);
    } catch {}
    const metadataName = sanitizeRunName(session.user.user_metadata?.display_name);
    if (metadataName) return rememberRunName(metadataName);
  }

  const saveName = sanitizeRunName(saveData?.playerName);
  if (saveName && saveName !== 'Hero') return rememberRunName(saveName);

  const remembered = loadRememberedRunName();
  return remembered || null;
}
