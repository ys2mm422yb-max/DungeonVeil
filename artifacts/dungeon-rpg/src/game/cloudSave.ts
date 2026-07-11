import { cloudRevision, exportSaveBundle, importSaveBundle, markCloudRevision, persistentPlayerId, type DungeonVeilSaveBundle } from './persistentSaveBundle';
import { currentOnlineSession, pullSupabaseSave, pushSupabaseSave } from './supabaseOnline';

const CLOUD_URL = String(import.meta.env.VITE_DUNGEON_CLOUD_URL ?? '').replace(/\/$/, '');
const CLOUD_KEY = String(import.meta.env.VITE_DUNGEON_CLOUD_KEY ?? '');

export function cloudSaveConfigured(): boolean {
  return Boolean(currentOnlineSession() || CLOUD_URL.length > 0);
}

function headers(): HeadersInit {
  return {
    'content-type': 'application/json',
    ...(CLOUD_KEY ? { authorization: `Bearer ${CLOUD_KEY}` } : {}),
  };
}

function endpoint(): string {
  return `${CLOUD_URL}/saves/${encodeURIComponent(persistentPlayerId())}`;
}

async function pushLegacyCloud(bundle: DungeonVeilSaveBundle): Promise<boolean> {
  if (!CLOUD_URL) return false;
  const response = await fetch(endpoint(), { method: 'PUT', headers: headers(), body: JSON.stringify(bundle) });
  if (!response.ok) return false;
  markCloudRevision(bundle.updatedAt);
  return true;
}

async function pullLegacyCloud(): Promise<DungeonVeilSaveBundle | null> {
  if (!CLOUD_URL) return null;
  const response = await fetch(endpoint(), { method: 'GET', headers: headers(), cache: 'no-store' });
  if (response.status === 404 || !response.ok) return null;
  return response.json() as Promise<DungeonVeilSaveBundle>;
}

export async function pushCloudSave(): Promise<boolean> {
  const bundle = exportSaveBundle();
  try {
    if (currentOnlineSession()) {
      const saved = await pushSupabaseSave(bundle);
      if (saved) markCloudRevision(bundle.updatedAt);
      return saved;
    }
    return pushLegacyCloud(bundle);
  } catch {
    return false;
  }
}

export async function pullCloudSave(): Promise<boolean> {
  try {
    const remote = currentOnlineSession() ? await pullSupabaseSave() : await pullLegacyCloud();
    if (!remote) return false;
    const revision = cloudRevision();
    if (revision && Date.parse(remote.updatedAt) <= Date.parse(revision)) return false;
    return importSaveBundle(remote);
  } catch {
    return false;
  }
}
