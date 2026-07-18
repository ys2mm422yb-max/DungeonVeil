import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [manifestRaw, indexHtml, runtime, main] = await Promise.all([
  read('../public/manifest.webmanifest'),
  read('../index.html'),
  read('../src/game/portraitOrientationRuntime.ts'),
  read('../src/main.tsx'),
]);

const manifest = JSON.parse(manifestRaw);
const checks = [
  [manifest.orientation === 'portrait-primary', 'installed PWA manifest is not locked to portrait-primary'],
  [String(manifest.start_url ?? '').includes('installed=4'), 'installed PWA start URL version was not refreshed'],
  [indexHtml.includes('manifest.webmanifest?v=20260718-4'), 'manifest cache version was not refreshed'],
  [indexHtml.includes('name="screen-orientation" content="portrait"'), 'portrait orientation meta hint is missing'],
  [runtime.includes('(display-mode: standalone)') && runtime.includes('(display-mode: fullscreen)'), 'runtime does not limit orientation locking to installed display modes'],
  [runtime.includes("orientation.lock('portrait-primary')") && runtime.includes("orientation.lock('portrait')"), 'runtime portrait lock and fallback are missing'],
  [runtime.includes('visibilitychange') && runtime.includes("screen.orientation?.addEventListener?.('change'"), 'runtime does not restore portrait after app or device state changes'],
  [main.includes('installPortraitOrientationRuntime();'), 'portrait orientation runtime is not installed at startup'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`PWA portrait orientation audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('PWA portrait orientation passed: installed Android, iOS and fullscreen web apps prefer and re-request portrait mode.');
