import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/components/KayKitEquipmentPreview.tsx'), 'utf8');

const required = [
  ['class PreviewLoadCancelled', 'cancelled preview loads need a dedicated silent state'],
  ['const isActive = () => token === runtime.loadToken', 'preview requests are not tied to the current load token'],
  ['if (!isActive()) throw new PreviewLoadCancelled()', 'stale primary failures can still trigger a fallback'],
  ['if (isPreviewLoadCancelled(error) || !isActive()) return', 'stale preview errors are not suppressed'],
  ['runtime.loadToken += 1', 'unmount does not invalidate pending preview loads'],
  ['if (!disposed && !isPreviewLoadCancelled(error))', 'normal unmount cancellation is still logged as a fatal preview error'],
];

const failures = required.filter(([token]) => !source.includes(token)).map(([, message]) => message);
if (failures.length) {
  console.error(`Equipment preview cancellation audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

const fallbackIndex = source.indexOf('loader.loadAsync(assetUrl(visual.fallbackPath))');
const activeGuardIndex = source.lastIndexOf('if (!isActive()) throw new PreviewLoadCancelled()', fallbackIndex);
if (fallbackIndex < 0 || activeGuardIndex < 0 || activeGuardIndex > fallbackIndex) {
  console.error('Equipment preview fallback is not guarded against a stale WebKit request.');
  process.exit(1);
}

console.log('Equipment preview cancellation verified: stale WebKit loads cannot start a fallback or report a fatal error.');
