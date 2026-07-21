const RUN_HOST_SELECTOR = '[data-testid="run-three-host"]';
const RUN_HUD_SELECTOR = '[data-testid="run-hud"]';

declare global {
  interface Window {
    __dungeonVeilRunRendererRecoveryInstalled?: boolean;
  }
}

let boundCanvas: HTMLCanvasElement | null = null;
let restoreTimer = 0;
let reloadTimer = 0;
let lostSince = 0;

function runIsVisible(): boolean {
  return Boolean(document.querySelector(RUN_HUD_SELECTOR) && document.querySelector(RUN_HOST_SELECTOR));
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

function announceLost(canvas: HTMLCanvasElement, reason: string): void {
  if (!runIsVisible()) return;
  const html = document.documentElement;
  if (html.dataset.dungeonVeilRendererState === 'recovering') return;
  html.dataset.dungeonVeilRendererState = 'recovering';
  html.dataset.dungeonVeilRendererReason = reason;
  lostSince = performance.now();
  window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { rendererRecovery: true, reason } }));
  window.dispatchEvent(new CustomEvent('dungeon-veil-renderer-lost', { detail: { reason } }));

  const gl = contextFor(canvas);
  const extension = gl?.getExtension('WEBGL_lose_context');
  restoreTimer = window.setTimeout(() => {
    try { extension?.restoreContext(); } catch {}
  }, 180);

  reloadTimer = window.setTimeout(() => {
    if (!runIsVisible()) return;
    const live = contextFor(canvas);
    if (live && !live.isContextLost()) {
      announceRestored('context-became-available');
      return;
    }
    // The existing room-preparing listener has already saved the active run and stopped input.
    // Reloading is reserved for a renderer that did not recover after several seconds.
    window.location.reload();
  }, 5_500);
}

function announceRestored(reason: string): void {
  clearRecoveryTimers();
  const html = document.documentElement;
  html.dataset.dungeonVeilRendererState = 'ready';
  html.dataset.dungeonVeilRendererReason = reason;
  html.dataset.dungeonVeilRendererRecoveredAt = String(Date.now());
  lostSince = 0;
  window.dispatchEvent(new Event('resize'));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { recovered: true, reason } }));
  }));
}

function bindCanvas(canvas: HTMLCanvasElement): void {
  if (boundCanvas === canvas) return;
  boundCanvas = canvas;
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    announceLost(canvas, 'webgl-context-lost');
  }, { passive: false });
  canvas.addEventListener('webglcontextrestored', () => announceRestored('webgl-context-restored'));
}

function discoverCanvas(): void {
  const canvas = document.querySelector(`${RUN_HOST_SELECTOR} canvas`) as HTMLCanvasElement | null;
  if (canvas) bindCanvas(canvas);
}

export function installRunRendererRecovery(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__dungeonVeilRunRendererRecoveryInstalled) return;
  window.__dungeonVeilRunRendererRecoveryInstalled = true;

  const observer = new MutationObserver(discoverCanvas);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  discoverCanvas();

  window.setInterval(() => {
    discoverCanvas();
    const canvas = boundCanvas;
    if (!canvas || !runIsVisible()) return;
    const gl = contextFor(canvas);
    if (gl?.isContextLost()) announceLost(canvas, 'webgl-context-watchdog');
    else if (lostSince && performance.now() - lostSince > 250) announceRestored('webgl-watchdog-recovered');
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) window.dispatchEvent(new Event('resize'));
  }, 1_000);
}
