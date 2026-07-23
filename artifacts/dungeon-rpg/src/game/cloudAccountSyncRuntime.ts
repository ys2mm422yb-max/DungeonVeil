import { pushCloudSave, readCloudSave, restoreCloudSave } from './cloudSave';
import {
  bundleHasCoreProgress,
  recoveryBundleForThinRemote,
  shouldRestoreRemoteBundleSafely,
} from './cloudSaveSafety';
import { syncOnlineProfileCosmetics } from './onlineProfileCosmetics';
import { clearCloudRevision, exportSaveBundle, type DungeonVeilSaveBundle } from './persistentSaveBundle';
import { loadPlayerProfile, PLAYER_PROFILE_EVENT } from './playerProfile';
import { SAVE_EVENT } from './saveManager';
import { SETTINGS_PERSISTENCE_EVENT } from './settingsPersistence';
import { currentOnlineSession, onlineSessionEventName } from './supabaseOnline';
import { WEEKLY_ELITE_EVENT } from './weeklyElite';
import { OPTIONAL_EQUIPMENT_EVENT } from './optionalEquipmentState';
import { COMPANION_COLLECTION_EVENT } from './companionCollectionV5';

const CLOUD_USER_KEY = 'dungeon-veil-cloud-user-v1';
const CLOUD_PUSH_DELAY_MS = 700;
const CLOUD_RECONCILE_MS = 10_000;
const shouldRestoreRemoteBundle = shouldRestoreRemoteBundleSafely;
const SYNC_EVENTS = [
  SAVE_EVENT,
  PLAYER_PROFILE_EVENT,
  SETTINGS_PERSISTENCE_EVENT,
  OPTIONAL_EQUIPMENT_EVENT,
  COMPANION_COLLECTION_EVENT,
  'dungeon-veil-meta-changed',
  'dungeon-veil-retention-update',
  'dungeon-veil-relic-changed',
  'dungeon-veil-relics-changed',
  'dungeon-veil-new-content-changed',
  WEEKLY_ELITE_EVENT,
] as const;

let installed = false;
let syncPromise: Promise<void> | null = null;
let pushTimer = 0;
let lastSyncedDataSignature = '';
let hydratedUserId = '';
let pendingPush = false;

function storedCloudUser(): string {
  try { return localStorage.getItem(CLOUD_USER_KEY) ?? ''; } catch { return ''; }
}

function rememberCloudUser(userId: string): void {
  try { localStorage.setItem(CLOUD_USER_KEY, userId); } catch {}
}

function bundleDataSignature(bundle: DungeonVeilSaveBundle): string {
  return JSON.stringify(bundle.data);
}

export function cloudAccountHydrated(): boolean {
  const session = currentOnlineSession();
  return Boolean(session && hydratedUserId === session.user.id);
}

async function pushCurrentAccountState(force = false, bundle = exportSaveBundle()): Promise<void> {
  const session = currentOnlineSession();
  if (!session || hydratedUserId !== session.user.id) {
    pendingPush = true;
    return;
  }
  if (!bundleHasCoreProgress(bundle)) return;

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
  if (!cloudAccountHydrated()) {
    pendingPush = true;
    runAccountSync();
    return;
  }
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => { void pushCurrentAccountState(); }, CLOUD_PUSH_DELAY_MS);
}

async function synchronizeSignedInAccount(): Promise<void> {
  const session = currentOnlineSession();
  if (!session) {
    lastSyncedDataSignature = '';
    hydratedUserId = '';
    pendingPush = false;
    return;
  }

  const previousUser = storedCloudUser();
  if (previousUser !== session.user.id) {
    clearCloudRevision();
    lastSyncedDataSignature = '';
    hydratedUserId = '';
  }
  rememberCloudUser(session.user.id);

  const local = exportSaveBundle();
  const localSignature = bundleDataSignature(local);
  const remote = await readCloudSave();

  if (!remote) {
    hydratedUserId = session.user.id;
    if (bundleHasCoreProgress(local)) await pushCurrentAccountState(true);
    pendingPush = false;
    return;
  }

  const remoteSignature = bundleDataSignature(remote);
  if (shouldRestoreRemoteBundle(local, remote)) {
    lastSyncedDataSignature = remoteSignature;
    hydratedUserId = session.user.id;
    pendingPush = false;
    restoreCloudSave(remote);
    return;
  }

  hydratedUserId = session.user.id;
  if (localSignature !== remoteSignature && bundleHasCoreProgress(local)) {
    const upload = recoveryBundleForThinRemote(local, remote);
    await pushCurrentAccountState(true, upload);
  } else {
    lastSyncedDataSignature = localSignature;
  }

  if (pendingPush) {
    pendingPush = false;
    await pushCurrentAccountState();
  }
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
  window.addEventListener('pagehide', () => {
    if (cloudAccountHydrated()) void pushCurrentAccountState(true);
  });
  window.setInterval(runAccountSync, CLOUD_RECONCILE_MS);

  runAccountSync();
}
