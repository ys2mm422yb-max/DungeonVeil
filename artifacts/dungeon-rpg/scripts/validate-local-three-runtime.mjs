import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const vitePath = path.join(root, 'vite.config.ts');
const index = fs.readFileSync(indexPath, 'utf8');
const vite = fs.readFileSync(vitePath, 'utf8');

function requireText(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function rejectText(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}

const localCore = './assets/vendor/three/build/three.module.js';
const localAddons = './assets/vendor/three/examples/jsm/';
const remoteCore = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const remoteAddons = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/';

requireText(index, `"three": "${localCore}"`, 'Bare Three.js imports are not routed to the local runtime');
requireText(index, `"three/addons/": "${localAddons}"`, 'Three.js addon imports are not routed locally');
requireText(index, `"${remoteCore}": "${localCore}"`, 'The existing Three.js dynamic import is not redirected locally');
requireText(index, `"${remoteAddons}": "${localAddons}"`, 'The existing GLTFLoader/SkeletonUtils imports are not redirected locally');
rejectText(index, '<link rel="preconnect" href="https://cdn.jsdelivr.net"', 'The page still preconnects to the removed Three.js CDN runtime');

requireText(vite, "const THREE_VENDOR_VERSION = '0.180.0';", 'The local Three.js runtime is not version-pinned');
requireText(vite, "const THREE_VENDOR_COMMIT = '0af9729d0c143a86a1d725d6e2c3ad83301f3f34';", 'The primary Three.js source is not commit-pinned');
for (const file of [
  'LICENSE',
  'build/three.module.js',
  'build/three.core.js',
  'examples/jsm/loaders/GLTFLoader.js',
  'examples/jsm/utils/BufferGeometryUtils.js',
  'examples/jsm/utils/SkeletonUtils.js',
]) {
  requireText(vite, `'${file}'`, `Local Three.js build does not prepare ${file}`);
}
requireText(vite, 'await ensureLocalThreeRuntime();', 'Vite does not prepare the local Three.js runtime before serving or building');

if (process.argv.includes('--dist')) {
  const distRoot = path.join(root, 'dist', 'public');
  const distIndex = fs.readFileSync(path.join(distRoot, 'index.html'), 'utf8');
  requireText(distIndex, 'assets/vendor/three/build/three.module.js', 'Built page does not reference the local Three.js runtime');
  requireText(distIndex, 'assets/vendor/three/examples/jsm/', 'Built page does not reference local Three.js addons');

  const expectedFiles = new Map([
    ['assets/vendor/three/LICENSE', 500],
    ['assets/vendor/three/build/three.module.js', 500_000],
    ['assets/vendor/three/build/three.core.js', 500_000],
    ['assets/vendor/three/examples/jsm/loaders/GLTFLoader.js', 50_000],
    ['assets/vendor/three/examples/jsm/utils/BufferGeometryUtils.js', 5_000],
    ['assets/vendor/three/examples/jsm/utils/SkeletonUtils.js', 2_000],
  ]);

  for (const [relativePath, minimumBytes] of expectedFiles) {
    const file = path.join(distRoot, relativePath);
    const size = fs.statSync(file).size;
    if (size < minimumBytes) throw new Error(`${relativePath} is missing or incomplete (${size} bytes)`);
  }
}

console.log('Local Three.js runtime verified: core, GLTFLoader and SkeletonUtils are served from Dungeon Veil assets.');
