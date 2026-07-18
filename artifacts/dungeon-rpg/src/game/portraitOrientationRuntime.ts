type StandaloneNavigator = Navigator & { standalone?: boolean };
type LockableOrientation = {
  lock?: (orientation: string) => Promise<void>;
};

function isInstalledDisplayMode(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: fullscreen)').matches
    || (navigator as StandaloneNavigator).standalone,
  );
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
      // Some browsers only honor the manifest orientation and reject runtime locks.
    }
  }
}

export function installPortraitOrientationRuntime(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let disposed = false;
  const request = () => {
    if (!disposed) void requestPortraitOrientation();
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') request();
  };
  const displayMode = window.matchMedia?.('(display-mode: standalone)');

  request();
  window.addEventListener('pageshow', request);
  window.addEventListener('resize', request);
  document.addEventListener('visibilitychange', handleVisibility);
  displayMode?.addEventListener?.('change', request);
  screen.orientation?.addEventListener?.('change', request);

  return () => {
    disposed = true;
    window.removeEventListener('pageshow', request);
    window.removeEventListener('resize', request);
    document.removeEventListener('visibilitychange', handleVisibility);
    displayMode?.removeEventListener?.('change', request);
    screen.orientation?.removeEventListener?.('change', request);
  };
}
