const PLAYER_ID_KEY = 'dungeon-veil-player-id';
const CLOUD_REVISION_KEY = 'dungeon-veil-cloud-revision';
const BUNDLE_KEYS = [
  'dungeon-veil-save',
  'dungeon-veil-meta',
  'dungeon-veil-relics-v1',
  'dungeon-veil-retention-v2',
  'dungeon-veil-weekly-rift-records-v1',
  'dungeon-veil-player-profile-v1',
  'dungeon-veil-weekly-elite-v1',
  'dungeon-veil-seen-unlocks-v1',
] as const;

export type DungeonVeilSaveBundle = {
  version: 1;
  playerId: string;
  updatedAt: string;
  data: Record<string, string>;
};

function createPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `veil-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function persistentPlayerId(): string {
  try {
    const stored = localStorage.getItem(PLAYER_ID_KEY);
    if (stored) return stored;
    const id = createPlayerId();
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return createPlayerId();
  }
}

export function cloudRevision(): string {
  try { return localStorage.getItem(CLOUD_REVISION_KEY) ?? ''; } catch { return ''; }
}

export function markCloudRevision(updatedAt: string): void {
  try { localStorage.setItem(CLOUD_REVISION_KEY, updatedAt); } catch {}
}

export function clearCloudRevision(): void {
  try { localStorage.removeItem(CLOUD_REVISION_KEY); } catch {}
}

export function exportSaveBundle(): DungeonVeilSaveBundle {
  const data: Record<string, string> = {};
  for (const key of BUNDLE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    } catch {}
  }
  return { version: 1, playerId: persistentPlayerId(), updatedAt: new Date().toISOString(), data };
}

export function importSaveBundle(bundle: DungeonVeilSaveBundle): boolean {
  if (!bundle || bundle.version !== 1 || typeof bundle.playerId !== 'string' || !bundle.data) return false;
  try {
    for (const key of BUNDLE_KEYS) {
      const value = bundle.data[key];
      if (typeof value === 'string') localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    }
    localStorage.setItem(PLAYER_ID_KEY, bundle.playerId);
    markCloudRevision(bundle.updatedAt);
    window.dispatchEvent(new Event('dungeon-veil-cloud-save-restored'));
    return true;
  } catch {
    return false;
  }
}
