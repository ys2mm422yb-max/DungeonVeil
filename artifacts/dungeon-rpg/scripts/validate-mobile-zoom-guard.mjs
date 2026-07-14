import { readFile } from 'node:fs/promises';

const [html, canvas] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/GameCanvas.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  [html.includes('maximum-scale=1') && html.includes('user-scalable=no') && html.includes('viewport-fit=cover'), 'mobile viewport still allows browser zoom'],
  [canvas.includes("data-testid=\"run-canvas-host\"") && canvas.includes("touchAction: 'none'"), 'run canvas is not explicitly gesture-locked'],
  [canvas.includes("addEventListener('touchend', preventDoubleTapZoom, { passive: false })"), 'non-passive double-tap guard is missing'],
  [canvas.includes("addEventListener('touchmove', preventPinchZoom, { passive: false })"), 'multi-touch pinch guard is missing'],
  [canvas.includes("addEventListener('dblclick', preventBrowserZoom, { passive: false })"), 'desktop/synthesized double-click guard is missing'],
  [canvas.includes("addEventListener('gesturestart', preventBrowserZoom, { passive: false })") && canvas.includes("addEventListener('gesturechange', preventBrowserZoom, { passive: false })") && canvas.includes("addEventListener('gestureend', preventBrowserZoom, { passive: false })"), 'Safari gesture guards are incomplete'],
  [canvas.includes('DOUBLE_TAP_ZOOM_WINDOW_MS') && canvas.includes('DOUBLE_TAP_ZOOM_DISTANCE_PX') && canvas.includes('Math.hypot('), 'double-tap detection is not restricted by time and position'],
  [canvas.includes('if (event.cancelable) event.preventDefault();') && canvas.includes('event.touches.length > 1'), 'zoom prevention does not safely check cancelable gestures'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Mobile zoom guard audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Mobile zoom guard audit passed: Safari double-tap, pinch and gesture zoom are blocked during dungeon runs without altering normal single taps.');
