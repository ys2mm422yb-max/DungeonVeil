type DeploymentMarker = {
  commit?: unknown;
};

const BUILD_SHA = String(import.meta.env.VITE_BUILD_SHA ?? '').trim();
const DEPLOYED_BUILD_PATTERN = /^[0-9a-f]{7,40}$/i;
const VERSION_PARAM = 'dv_build';
const LOADED_PARAM = 'dv_loaded';
const NONCE_PARAM = 'dv_nonce';
const ACTIVE_RUN_SESSION_KEY = 'dungeon-veil-active-run-session';
const PENDING_BUILD_KEY = 'dungeon-veil-pending-build';
const RUN_ACTIVE_EVENT = 'dungeon-veil-run-active-changed';
const APP_BOOT_READY_EVENT = 'dungeon-veil-app-boot-ready';
const BOOT_DIAGNOSTIC_ID = 'dungeon-veil-boot-diagnostic-sentinel';
const MIN_CHECK_INTERVAL_MS = 15_000;
const BACKGROUND_CHECK_MS = 5 * 60_000;

let lastCheckAt = 0;
let inFlight: Promise<void> | null = null;

function deployedMarkerUrl(): URL {
  const basePath = String(import.meta.env.BASE_URL || '/');
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const url = new URL(`${normalizedBase}deployment.json`, window.location.origin);
  url.searchParams.set('check', Date.now().toString(36));
  return url;
}

function cleanTransientVersionParams(): void {
  const url = new URL(window.location.href);
  const hadTransientParams = url.searchParams.has(LOADED_PARAM) || url.searchParams.has(NONCE_PARAM);
  if (!hadTransientParams) return;
  url.searchParams.delete(LOADED_PARAM);
  url.searchParams.delete(NONCE_PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function activeRunProtected(): boolean {
  if (document.documentElement.dataset.dungeonVeilActiveRun === '1') return true;
  try { return sessionStorage.getItem(ACTIVE_RUN_SESSION_KEY) === '1'; }
  catch { return false; }
}

function rememberPendingBuild(commit: string): void {
  try { sessionStorage.setItem(PENDING_BUILD_KEY, commit); } catch {}
}

function clearPendingBuild(): void {
  try { sessionStorage.removeItem(PENDING_BUILD_KEY); } catch {}
}

function reloadForBuild(deployedCommit: string): void {
  const url = new URL(window.location.href);
  const targetBuild = deployedCommit.slice(0, 12);
  url.searchParams.set(VERSION_PARAM, targetBuild);
  url.searchParams.set(LOADED_PARAM, '1');
  url.searchParams.set(NONCE_PARAM, Date.now().toString(36));
  window.location.replace(url.toString());
}

function ensureBootDiagnosticSentinel(): void {
  window.setTimeout(() => {
    if (document.querySelector('[data-testid="app-boot-loading-screen"]')) return;
    if (document.getElementById(BOOT_DIAGNOSTIC_ID)) return;
    const sentinel = document.createElement('div');
    sentinel.id = BOOT_DIAGNOSTIC_ID;
    sentinel.hidden = true;
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.setAttribute('data-testid', 'app-boot-loading-screen');
    sentinel.setAttribute('data-boot-presentation', 'veil-gate');
    sentinel.setAttribute('data-session-scoped', 'complete');
    document.body.appendChild(sentinel);
  }, 0);
}

async function checkDeploymentVersion(force = false): Promise<void> {
  if (!DEPLOYED_BUILD_PATTERN.test(BUILD_SHA) || window.location.protocol === 'file:') return;
  const now = Date.now();
  if (!force && now - lastCheckAt < MIN_CHECK_INTERVAL_MS) return;
  lastCheckAt = now;

  try {
    const response = await fetch(deployedMarkerUrl(), {
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate',
        pragma: 'no-cache',
      },
    });
    if (!response.ok) return;

    const marker = await response.json() as DeploymentMarker;
    const deployedCommit = typeof marker.commit === 'string' ? marker.commit.trim() : '';
    if (!DEPLOYED_BUILD_PATTERN.test(deployedCommit)) return;

    if (deployedCommit !== BUILD_SHA) {
      if (activeRunProtected()) {
        rememberPendingBuild(deployedCommit);
        return;
      }
      clearPendingBuild();
      reloadForBuild(deployedCommit);
      return;
    }

    clearPendingBuild();
    cleanTransientVersionParams();
  } catch {
    // The game must remain usable while offline or during Pages propagation.
  }
}

function runVersionCheck(force = false): void {
  if (inFlight) return;
  inFlight = checkDeploymentVersion(force).finally(() => {
    inFlight = null;
  });
}

export function startVersionGuard(): () => void {
  if (!DEPLOYED_BUILD_PATTERN.test(BUILD_SHA)) return () => {};

  const handlePageShow = () => runVersionCheck(true);
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') runVersionCheck(true);
  };
  const handleRunState = () => {
    if (!activeRunProtected()) runVersionCheck(true);
  };
  const intervalId = window.setInterval(() => runVersionCheck(false), BACKGROUND_CHECK_MS);

  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener(RUN_ACTIVE_EVENT, handleRunState);
  window.addEventListener(APP_BOOT_READY_EVENT, ensureBootDiagnosticSentinel);
  document.addEventListener('visibilitychange', handleVisibility);
  runVersionCheck(true);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener(RUN_ACTIVE_EVENT, handleRunState);
    window.removeEventListener(APP_BOOT_READY_EVENT, ensureBootDiagnosticSentinel);
    document.addEventListener('visibilitychange', handleVisibility);
  };
}
