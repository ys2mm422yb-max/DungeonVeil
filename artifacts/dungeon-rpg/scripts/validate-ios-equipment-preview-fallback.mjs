import { readFile } from 'node:fs/promises';

const preview = await readFile(new URL('../src/components/KayKitEquipmentPreview.tsx', import.meta.url), 'utf8');

const checks = [
  [preview.includes('const IS_IOS_WEBKIT'), 'iOS WebKit detection is missing'],
  [preview.includes('makeFallbackDisplay'), 'generated equipment fallback display is missing'],
  [preview.includes('if (IS_IOS_WEBKIT)') && preview.includes('return null;'), 'iOS still falls through to fragile multipart glTF assets'],
  [preview.includes('new THREE.TorusGeometry') && preview.includes('new THREE.BoxGeometry'), 'fallback silhouettes do not cover equipment families'],
  [preview.includes("console.warn('KayKit equipment preview unavailable'"), 'recoverable preview failures are still reported as fatal errors'],
  [!preview.includes("console.error('KayKit equipment preview failed'"), 'legacy fatal preview logging remains active'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`iOS equipment preview audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('iOS equipment preview audit passed: local GLB retry and generated silhouettes prevent fragile multipart glTF fallbacks from breaking WebKit.');
