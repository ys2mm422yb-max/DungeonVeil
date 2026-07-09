import { exportSaveBundle, importSaveBundle, persistentPlayerId, type DungeonVeilSaveBundle } from './persistentSaveBundle';

const CLOUD_URL = String(import.meta.env.VITE_DUNGEON_CLOUD_URL ?? '').replace(/\/$/, '');
const CLOUD_KEY = String(import.meta.env.VITE_DUNGEON_CLOUD_KEY ?? '');

export function cloudSaveConfigured(): boolean {
  return CLOUD_URL.length > 0;
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

export async function pushCloudSave(): Promise<boolean> {
  if (!cloudSaveConfigured()) return false;
  try {
    const response = await fetch(endpoint(), { method: 'PUT', headers: headers(), body: JSON.stringify(exportSaveBundle()) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function pullCloudSave(): Promise<boolean> {
  if (!cloudSaveConfigured()) return false;
  try {
    const response = await fetch(endpoint(), { method: 'GET', headers: headers(), cache: 'no-store' });
    if (response.status === 404) return false;
    if (!response.ok) return false;
    const remote = await response.json() as DungeonVeilSaveBundle;
    const local = exportSaveBundle();
    if (Date.parse(remote.updatedAt) <= Date.parse(local.updatedAt) && Object.keys(local.data).length > 0) return false;
    return importSaveBundle(remote);
  } catch {
    return false;
  }
}
