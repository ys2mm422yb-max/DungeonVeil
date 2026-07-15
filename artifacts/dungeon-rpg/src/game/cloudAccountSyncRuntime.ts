import { pullCloudSave, pushCloudSave } from './cloudSave';
import { syncOnlineProfileCosmetics } from './onlineProfileCosmetics';
import { clearCloudRevision } from './persistentSaveBundle';
import { loadPlayerProfile, PLAYER_PROFILE_EVENT } from './playerProfile';
import { currentOnlineSession, onlineSessionEventName } from './supabaseOnline';
import { WEEKLY_ELITE_EVENT } from './weeklyElite';

const CLOUD_USER_KEY = 'dungeon-veil-cloud-user-v1';
const SYNC_EVENTS = [
  PLAYER_PROFILE_EVENT,
  'dungeon-veil-meta-changed',
  'dungeon-veil-retention-update',
  'dungeon-veil-relics-changed',
  'dungeon-veil-new-content-changed',
  WEEKLY_ELITE_EVENT,
] as const;

let installed = false;
let syncPromise: Promise<void> | null = null;
let pushTimer = 0;

function storedCloudUser(): string {
  try { return localStorage.getItem(CLOUD_USER_KEY) ?? ''; } catch { return ''; }
}

function rememberCloudUser(userId: string): void {
  try { localStorage.setItem(CLOUD_USER_KEY, userId); } catch {}
}

async function pushCurrentAccountState(): Promise<void> {
  if (!currentOnlineSession()) return;
  await Promise.allSettled([
    pushCloudSave(),
    syncOnlineProfileCosmetics(loadPlayerProfile()),
  ]);
}

function schedulePush(): void {
  if (!currentOnlineSession()) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => { void pushCurrentAccountState(); }, 700);
}

async function synchronizeSignedInAccount(): Promise<void> {
  const session = currentOnlineSession();
  if (!session) return;

  const previousUser = storedCloudUser();
  if (previousUser && previousUser !== session.user.id) clearCloudRevision();
  rememberCloudUser(session.user.id);

  const restored = await pullCloudSave();
  if (restored) return;
  await pushCurrentAccountState();
}

function runAccountSync(): void {
  if (!currentOnlineSession() || syncPromise) return;
  syncPromise = synchronizeSignedInAccount()
    .catch(() => {})
    .finally(() => { syncPromise = null; });
}

export function installCloudAccountSyncRuntime(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  window.addEventListener(onlineSessionEventName(), runAccountSync);
  for (const eventName of SYNC_EVENTS) window.addEventListener(eventName, schedulePush as EventListener);
  window.addEventListener('dungeon-veil-cloud-save-restored', () => {
    window.setTimeout(() => window.location.reload(), 80);
  });
  window.addEventListener('pagehide', () => { void pushCurrentAccountState(); });

  runAccountSync();
}
