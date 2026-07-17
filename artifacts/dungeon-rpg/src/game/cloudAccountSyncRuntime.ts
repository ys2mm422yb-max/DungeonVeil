import { pushCloudSave, readCloudSave, restoreCloudSave } from './cloudSave';
import { syncOnlineProfileCosmetics } from './onlineProfileCosmetics';
import { clearCloudRevision, exportSaveBundle, shouldRestoreRemoteBundle, type DungeonVeilSaveBundle } from './persistentSaveBundle';
import { loadPlayerProfile, PLAYER_PROFILE_EVENT } from './playerProfile';
import { SAVE_EVENT } from './saveManager';
import { SETTINGS_PERSISTENCE_EVENT } from './settingsPersistence';
import { currentOnlineSession, onlineSessionEventName } from './supabaseOnline';
import { WEEKLY_ELITE_EVENT } from './weeklyElite';

const CLOUD_USER_KEY = 'dungeon-veil-cloud-user-v1';
const CLOUD_PUSH_DELAY_MS = 700;
const CLOUD_RECONCILE_MS = 10_000;
const SYNC_EVENTS = [
  SAVE_EVENT,
  PLAYER_PROFILE_EVENT,
  SETTINGS_PERSISTENCE_EVENT,
  'dungeon-veil-meta-changed',
  'dungeon-veil-retention-update',
  'dungeon-veil-relics-changed',
  'dungeon-veil-new-content-changed',
  WEEKLY_ELITE_EVENT,
] as const;

let installed = false;
let syncPromise: Promise<void> | null = null;
let pushTimer = 0;
let lastSyncedDataSignature = '';

function storedCloudUser(): string {
  try { return localStorage.getItem(CLOUD_USER_KEY) ?? ''; } catch { return ''; }
}

function rememberCloudUser(userId: string): void {
  try { localStorage.setItem(CLOUD_USER_KEY, userId); } catch {}
}

function bundleDataSignature(bundle: DungeonVeilSaveBundle): string {
  return JSON.stringify(bundle.data);
}

async function pushCurrentAccountState(force = false): Promise<void> {
  if (!currentOnlineSession()) return;
  const bundle = exportSaveBundle();
  const signature = bundleDataSignature(bundle);
  const saveTask = force || signature !== lastSyncedDataSignature
    ? pushCloudSave(bundle)
    : Promise.resolve(true);
  const [saveResult] = await Promise.allSettled([
    saveTask,
    syncOnlineProfileCosmetics(loadPlayerProfile()),
  ]);
  if (saveResult.status === 'fulfilled' && saveResult.value) lastSyncedDataSignature = signature;
}

function schedulePush(): void {
  if (!currentOnlineSession()) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => { void pushCurrentAccountState(); }, CLOUD_PUSH_DELAY_MS);
}

async function synchronizeSignedInAccount(): Promise<void> {
  const session = currentOnlineSession();
  if (!session) {
    lastSyncedDataSignature = '';
    return;
  }

  const previousUser = storedCloudUser();
  if (previousUser !== session.user.id) {
    clearCloudRevision();
    lastSyncedDataSignature = '';
  }
  rememberCloudUser(session.user.id);

  const local = exportSaveBundle();
  const localSignature = bundleDataSignature(local);
  const remote = await readCloudSave();
  if (!remote) {
    await pushCurrentAccountState(true);
    return;
  }

  const remoteSignature = bundleDataSignature(remote);
  if (shouldRestoreRemoteBundle(local, remote)) {
    lastSyncedDataSignature = remoteSignature;
    restoreCloudSave(remote);
    return;
  }

  if (localSignature !== remoteSignature) {
    await pushCurrentAccountState(true);
    return;
  }

  lastSyncedDataSignature = localSignature;
}

function runAccountSync(): void {
  if (!currentOnlineSession() || syncPromise) return;
  syncPromise = synchronizeSignedInAccount()
    .catch(error => { console.warn('Dungeon Veil cloud sync failed', error); })
    .finally(() => { syncPromise = null; });
}

function reconcileVisibleAccount(): void {
  if (document.visibilityState === 'visible') runAccountSync();
}

export function installCloudAccountSyncRuntime(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  const sessionEvent = onlineSessionEventName();
  window.addEventListener(sessionEvent, runAccountSync);
  for (const eventName of SYNC_EVENTS) window.addEventListener(eventName, schedulePush as EventListener);
  window.addEventListener('dungeon-veil-cloud-save-restored', () => {
    window.setTimeout(() => window.location.reload(), 80);
  });
  window.addEventListener('focus', runAccountSync);
  window.addEventListener('online', runAccountSync);
  window.addEventListener('storage', runAccountSync);
  document.addEventListener('visibilitychange', reconcileVisibleAccount);
  window.addEventListener('pagehide', () => { void pushCurrentAccountState(true); });
  window.setInterval(runAccountSync, CLOUD_RECONCILE_MS);

  runAccountSync();
}
