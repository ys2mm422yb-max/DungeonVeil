import { exportSaveBundle, importSaveBundle, markCloudRevision, persistentPlayerId, type DungeonVeilSaveBundle } from './persistentSaveBundle';
import { bundleHasCoreProgress, shouldRestoreRemoteBundleSafely } from './cloudSaveSafety';
import { authenticatedSupabaseRest, currentOnlineSession, pullSupabaseSave } from './supabaseOnline';

const CLOUD_URL = String(import.meta.env.VITE_DUNGEON_CLOUD_URL ?? '').replace(/\/$/, '');
const CLOUD_KEY = String(import.meta.env.VITE_DUNGEON_CLOUD_KEY ?? '');

type GuardedCloudSaveResult = {
  accepted: boolean;
  payload: DungeonVeilSaveBundle | null;
};

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

export async function readCloudSave(): Promise<DungeonVeilSaveBundle | null> {
  try {
    return currentOnlineSession() ? await pullSupabaseSave() : await pullLegacyCloud();
  } catch {
    return null;
  }
}

export async function pushCloudSave(bundle = exportSaveBundle()): Promise<boolean> {
  try {
    if (currentOnlineSession()) {
      // Online profile data is stored separately and cannot stand in for a game save.
      if (!bundleHasCoreProgress(bundle)) return false;

      const result = await authenticatedSupabaseRest<GuardedCloudSaveResult>('rpc/upsert_guarded_game_save', {
        method: 'POST',
        body: JSON.stringify({
          p_payload: bundle,
          p_save_version: bundle.version,
          p_progress_weight: Math.max(0, Math.floor(bundle.progressWeight ?? 0)),
          p_activity_at: Math.max(0, Math.floor(bundle.activityAt ?? 0)),
        }),
      });
      if (result.accepted) {
        markCloudRevision(bundle.updatedAt);
        return true;
      }
      if (result.payload?.version === 1 && shouldRestoreRemoteBundleSafely(bundle, result.payload)) importSaveBundle(result.payload);
      return false;
    }
    return pushLegacyCloud(bundle);
  } catch {
    return false;
  }
}

export function restoreCloudSave(bundle: DungeonVeilSaveBundle): boolean {
  return importSaveBundle(bundle);
}

export async function pullCloudSave(): Promise<boolean> {
  const remote = await readCloudSave();
  if (!remote) return false;
  const local = exportSaveBundle();
  if (!shouldRestoreRemoteBundleSafely(local, remote)) return false;
  return restoreCloudSave(remote);
}
