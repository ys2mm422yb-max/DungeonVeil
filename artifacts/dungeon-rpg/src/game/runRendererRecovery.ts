const RUN_HOST_SELECTOR = '[data-testid="run-three-host"]';
const PRIMARY_RECOVERY_GRACE_MS = 1_800;

declare global {
  interface Window {
    __dungeonVeilRunRendererRecoveryInstalled?: boolean;
  }
}

let boundCanvas: HTMLCanvasElement | null = null;
let restoreTimer = 0;
let reloadTimer = 0;
let lostSince = 0;
let fallbackActive = false;
let primaryRecoverySignal = 0;
let primaryRecoveryStartedAt = 0;

function runRendererIsMounted(): boolean {
  return Boolean(document.querySelector(RUN_HOST_SELECTOR));
}

function clearRecoveryTimers(): void {
  if (restoreTimer) window.clearTimeout(restoreTimer);
  if (reloadTimer) window.clearTimeout(reloadTimer);
  restoreTimer = 0;
  reloadTimer = 0;
}

function contextFor(canvas: HTMLCanvasElement): WebGLRenderingContext | WebGL2RenderingContext | null {
  return canvas.getContext('webgl2') ?? canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
}

function primaryRecoveryHasGrace(now = performance.now()): boolean {
  return primaryRecoveryStartedAt > 0 && now - primaryRecoveryStartedAt < PRIMARY_RECOVERY_GRACE_MS;
}

function markRecovering(reason: string): void {
  const html = document.documentElement;
  html.dataset.dungeonVeilRendererState = 'recovering';
  html.dataset.dungeonVeilRendererReason = reason;
}

function markRestored(reason: string): void {
  clearRecoveryTimers();
  fallbackActive = false;
  lostSince = 0;
  primaryRecoveryStartedAt = 0;
  const html = document.documentElement;
  html.dataset.dungeonVeilRendererState = 'ready';
  html.dataset.dungeonVeilRendererReason = reason;
  html.dataset.dungeonVeilRendererRecoveredAt = String(Date.now());
}

function announceFallbackLost(canvas: HTMLCanvasElement, reason: string): void {
  if (!runRendererIsMounted() || fallbackActive || primaryRecoveryHasGrace()) return;
  fallbackActive = true;
  lostSince = performance.now();
  markRecovering(reason);
  window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { rendererRecovery: true, reason, fallback: true } }));
  window.dispatchEvent(new CustomEvent('dungeon-veil-renderer-lost', { detail: { reason, fallback: true } }));

  const gl = contextFor(canvas);
  const extension = gl?.getExtension('WEBGL_lose_context');
  restoreTimer = window.setTimeout(() => {
    try { extension?.restoreContext(); } catch {}
  }, 180);

  reloadTimer = window.setTimeout(() => {
    if (!runRendererIsMounted()) return;
    const liveCanvas = boundCanvas ?? canvas;
    const live = contextFor(liveCanvas);
    if (live && !live.isContextLost()) {
      announceFallbackRestored('context-became-available');
      return;
    }
    // The room-preparing and renderer-lost listeners have already saved the active run and stopped input.
    // Reloading remains the final fallback only when neither remount nor direct restoration succeeded.
    window.location.reload();
  }, 5_500);
}

function announceFallbackRestored(reason: string): void {
  markRestored(reason);
  window.dispatchEvent(new Event('resize'));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { recovered: true, reason, fallback: true } }));
  }));
}

function bindCanvas(canvas: HTMLCanvasElement): void {
  if (boundCanvas === canvas) return;
  boundCanvas = canvas;
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    const signalBeforePrimaryHandlers = primaryRecoverySignal;
    queueMicrotask(() => {
      // GameCanvas is the primary recovery owner. Depending on listener registration
      // order, its synchronous signal can arrive before or after this listener.
      if (primaryRecoverySignal !== signalBeforePrimaryHandlers || primaryRecoveryHasGrace()) return;
      announceFallbackLost(canvas, 'webgl-context-fallback');
    });
  }, { passive: false });
  canvas.addEventListener('webglcontextrestored', () => {
    if (fallbackActive) announceFallbackRestored('webgl-context-restored');
  });
}

function discoverCanvas(): void {
  const canvas = document.querySelector(`${RUN_HOST_SELECTOR} canvas`) as HTMLCanvasElement | null;
  if (canvas) bindCanvas(canvas);
  else boundCanvas = null;
}

export function installRunRendererRecovery(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__dungeonVeilRunRendererRecoveryInstalled) return;
  window.__dungeonVeilRunRendererRecoveryInstalled = true;

  window.addEventListener('dungeon-veil-renderer-lost', event => {
    primaryRecoverySignal += 1;
    const detail = (event as CustomEvent<{ reason?: string; fallback?: boolean }>).detail;
    if (!detail?.fallback) primaryRecoveryStartedAt = performance.now();
    markRecovering(detail?.reason ?? 'renderer-lost');
  });
  window.addEventListener('dungeon-veil-room-ready', event => {
    const detail = (event as CustomEvent<{ recovered?: boolean; reason?: string }>).detail;
    if (!detail?.recovered) return;
    markRestored(detail.reason ?? 'renderer-restored');
  });

  const observer = new MutationObserver(discoverCanvas);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  discoverCanvas();

  window.setInterval(() => {
    discoverCanvas();
    const canvas = boundCanvas;
    if (!canvas || !runRendererIsMounted()) return;
    const gl = contextFor(canvas);
    const now = performance.now();
    if (gl?.isContextLost() && !fallbackActive && !primaryRecoveryHasGrace(now)) announceFallbackLost(canvas, 'webgl-context-watchdog');
    else if (fallbackActive && lostSince && gl && !gl.isContextLost() && now - lostSince > 250) announceFallbackRestored('webgl-watchdog-recovered');
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) window.dispatchEvent(new Event('resize'));
  }, 1_000);
}
