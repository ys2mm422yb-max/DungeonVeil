import { GameEngine } from './runEngine';

type StandaloneNavigator = Navigator & { standalone?: boolean };
type LockableOrientation = {
  lock?: (orientation: string) => Promise<void>;
};
type RoomLifecycleDetail = {
  failed?: boolean;
  floor?: number;
  key?: string;
};

const BLOCKER_ID = 'dungeon-veil-portrait-blocker';
let engineGuardInstalled = false;

function isInstalledDisplayMode(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: fullscreen)').matches
    || (navigator as StandaloneNavigator).standalone,
  );
}

function viewportIsLandscape(): boolean {
  const viewport = window.visualViewport;
  const width = Math.max(1, Math.round(viewport?.width ?? window.innerWidth));
  const height = Math.max(1, Math.round(viewport?.height ?? window.innerHeight));
  return width > height;
}

function installEngineOrientationGuard(): void {
  if (engineGuardInstalled) return;
  engineGuardInstalled = true;
  const prototype = GameEngine.prototype;
  const update = prototype.update;
  prototype.update = function portraitGuardedUpdate(this: GameEngine, timestamp: number): void {
    if (document.documentElement.dataset.dungeonVeilOrientation === 'blocked') {
      this.input = { joyX: 0, joyY: 0, attack: false, skill: false, dodge: false, interact: false };
      this.lastTime = timestamp;
      return;
    }
    update.call(this, timestamp);
  };
}

function ensureBlocker(): HTMLDivElement {
  const existing = document.getElementById(BLOCKER_ID);
  if (existing instanceof HTMLDivElement) return existing;

  const blocker = document.createElement('div');
  blocker.id = BLOCKER_ID;
  blocker.setAttribute('data-testid', 'portrait-orientation-blocker');
  blocker.setAttribute('role', 'dialog');
  blocker.setAttribute('aria-modal', 'true');
  blocker.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'display:none',
    'align-items:center',
    'justify-content:center',
    'padding:32px',
    'background:radial-gradient(circle at 50% 42%,rgba(93,59,142,.34),transparent 36%),linear-gradient(180deg,#090713 0%,#030207 100%)',
    'color:#f4ead5',
    'font-family:system-ui,-apple-system,sans-serif',
    'text-align:center',
    'touch-action:none',
    'user-select:none',
  ].join(';');

  const card = document.createElement('div');
  card.style.cssText = [
    'width:min(420px,88vw)',
    'border:1px solid rgba(237,196,112,.36)',
    'border-radius:22px',
    'padding:30px 24px 26px',
    'background:rgba(9,7,17,.92)',
    'box-shadow:0 24px 70px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,242,209,.08)',
  ].join(';');

  const icon = document.createElement('div');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '↻  ▯';
  icon.style.cssText = 'font-size:48px;line-height:1;color:#e8b65b;letter-spacing:.08em;margin-bottom:18px';

  const title = document.createElement('div');
  title.setAttribute('data-orientation-copy', 'title');
  title.style.cssText = 'font-family:Cinzel,serif;font-size:22px;font-weight:900;letter-spacing:.08em';

  const text = document.createElement('div');
  text.setAttribute('data-orientation-copy', 'text');
  text.style.cssText = 'margin-top:10px;font-size:14px;line-height:1.55;color:rgba(244,234,213,.72)';

  card.append(icon, title, text);
  blocker.append(card);
  document.body.append(blocker);
  return blocker;
}

function updateBlockerCopy(blocker: HTMLDivElement): void {
  let language = 'de';
  try { language = localStorage.getItem('dungeon-veil-language') ?? 'de'; } catch {}
  const english = language === 'en';
  const title = blocker.querySelector('[data-orientation-copy="title"]');
  const text = blocker.querySelector('[data-orientation-copy="text"]');
  if (title) title.textContent = english ? 'ROTATE YOUR DEVICE' : 'GERÄT BITTE DREHEN';
  if (text) text.textContent = english
    ? 'Dungeon Veil is designed exclusively for portrait mode. Combat is paused until portrait orientation is restored.'
    : 'Dungeon Veil ist ausschließlich für Hochformat ausgelegt. Der Kampf pausiert, bis das Gerät wieder hochkant gehalten wird.';
}

async function requestPortraitOrientation(): Promise<void> {
  if (!isInstalledDisplayMode() || typeof screen === 'undefined') return;
  const orientation = screen.orientation as unknown as LockableOrientation | undefined;
  if (!orientation?.lock) return;

  try {
    await orientation.lock('portrait-primary');
  } catch {
    try {
      await orientation.lock('portrait');
    } catch {
      // Browsers may only honor the manifest orientation. The visible blocker and
      // runtime guard still enforce the portrait-only product contract.
    }
  }
}

export function installPortraitOrientationRuntime(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  installEngineOrientationGuard();
  let disposed = false;
  let blocked: boolean | null = null;
  let roomWasReadyBeforeBlock = false;
  let roomFloorBeforeBlock = 0;
  let pendingRoomReady: RoomLifecycleDetail | null = null;

  const broadcastBlocked = () => {
    const detail = { key: 'orientation:blocked', floor: roomFloorBeforeBlock };
    window.dispatchEvent(new CustomEvent('dungeon-veil-orientation-blocked', { detail }));
    window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail }));
  };

  const apply = () => {
    if (disposed) return;
    const nextBlocked = viewportIsLandscape();
    const blocker = ensureBlocker();
    updateBlockerCopy(blocker);
    blocker.style.display = nextBlocked ? 'flex' : 'none';
    blocker.setAttribute('aria-hidden', nextBlocked ? 'false' : 'true');
    document.documentElement.dataset.dungeonVeilOrientation = nextBlocked ? 'blocked' : 'portrait';
    const root = document.getElementById('root');
    if (root instanceof HTMLElement) root.inert = nextBlocked;

    if (blocked === nextBlocked) return;
    const wasBlocked = blocked;
    blocked = nextBlocked;

    if (nextBlocked) {
      roomWasReadyBeforeBlock = document.documentElement.dataset.dungeonVeilRoomBuildState === 'ready';
      roomFloorBeforeBlock = Number(document.documentElement.dataset.dungeonVeilRoomBuildFloor || 0);
      pendingRoomReady = null;
      broadcastBlocked();
      if (wasBlocked === null) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!disposed && blocked) broadcastBlocked();
        }));
      }
      return;
    }

    window.dispatchEvent(new CustomEvent('dungeon-veil-orientation-ready'));
    const readyDetail = pendingRoomReady
      ?? (roomWasReadyBeforeBlock ? { key: 'orientation:resumed', floor: roomFloorBeforeBlock } : null);
    pendingRoomReady = null;
    roomWasReadyBeforeBlock = false;
    if (readyDetail) window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: readyDetail }));
  };

  const interceptRoomReady = (event: Event) => {
    if (!blocked) return;
    const detail = (event as CustomEvent<RoomLifecycleDetail>).detail;
    if (detail?.failed) return;
    pendingRoomReady = detail ?? {};
    event.stopImmediatePropagation();
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      void requestPortraitOrientation();
      apply();
    }
  };
  const displayMode = window.matchMedia?.('(display-mode: standalone)');

  window.addEventListener('dungeon-veil-room-ready', interceptRoomReady);
  void requestPortraitOrientation();
  apply();
  window.addEventListener('pageshow', apply);
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  window.visualViewport?.addEventListener('resize', apply);
  document.addEventListener('visibilitychange', handleVisibility);
  displayMode?.addEventListener?.('change', apply);
  screen.orientation?.addEventListener?.('change', apply);

  return () => {
    disposed = true;
    window.removeEventListener('dungeon-veil-room-ready', interceptRoomReady);
    window.removeEventListener('pageshow', apply);
    window.removeEventListener('resize', apply);
    window.removeEventListener('orientationchange', apply);
    window.visualViewport?.removeEventListener('resize', apply);
    document.removeEventListener('visibilitychange', handleVisibility);
    displayMode?.removeEventListener?.('change', apply);
    screen.orientation?.removeEventListener?.('change', apply);
  };
}
