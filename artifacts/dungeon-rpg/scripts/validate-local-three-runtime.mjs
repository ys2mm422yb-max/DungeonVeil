import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./validate-pwa-portrait-orientation.mjs');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const vite = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');

function requireText(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function rejectText(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}

const localCore = './assets/vendor/three/build/three.module.js';
const localAddons = './assets/vendor/three/examples/jsm/';
const localGltf = './assets/vendor/three/examples/jsm/loaders/GLTFLoader.js';
const remoteCore = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const remoteAddons = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/';
const remoteGltf = `${remoteAddons}loaders/GLTFLoader.js`;

const requiredKayKitGltfPaths = [
  'assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf',
  'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/table_long_decorated_A.gltf',
  'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/chair.gltf',
  'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/banner_shield_red.gltf',
  'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/candle_lit.gltf',
  'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/banner_patternC_red.gltf',
  'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/chest_gold.gltf',
  'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/sword_shield_gold.gltf',
  'assets/kaykit/tools/Assets/gltf/map.gltf',
];

function validateGlbContainer(file, bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67) {
    throw new Error(`${file} is not a valid GLB container`);
  }
  if (bytes.readUInt32LE(4) !== 2) throw new Error(`${file} is not GLB version 2`);
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error(`${file} has an invalid GLB byte length`);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`${file} is missing its JSON chunk`);
}

function validateRequiredKayKitPackaging(file, relativePath, distRoot) {
  const source = JSON.parse(fs.readFileSync(file, 'utf8'));
  const buffers = source.buffers ?? [];
  if (buffers.length !== 1 || !buffers[0].uri?.startsWith('data:application/octet-stream;base64,')) {
    throw new Error(`${relativePath} must keep its binary buffer embedded before GLB packing`);
  }

  const images = source.images ?? [];
  if (images.length === 0) throw new Error(`${relativePath} has no packaged production texture`);
  const isQuiver = relativePath.endsWith('/quiver.gltf');
  for (const image of images) {
    const uri = image.uri ?? '';
    if (isQuiver) {
      if (image.bufferView !== undefined || image.mimeType !== 'image/png' || !uri.startsWith('data:image/png;base64,')) {
        throw new Error(`${relativePath} must keep its validated PNG texture data URI`);
      }
      continue;
    }

    if (!uri || uri.startsWith('/') || uri.startsWith('//') || uri.includes('://') || uri.startsWith('data:') || uri.includes('?') || uri.includes('#')) {
      throw new Error(`${relativePath} texture must use a relative local production sidecar`);
    }
    const decodedUri = decodeURIComponent(uri);
    if (!decodedUri || decodedUri.includes('..') || decodedUri.includes('\\')) {
      throw new Error(`${relativePath} texture has an unsafe relative production path: ${uri}`);
    }
    const assetFile = path.resolve(path.dirname(file), ...decodedUri.split('/'));
    const assetRelative = path.relative(distRoot, assetFile);
    if (assetRelative.startsWith('..') || path.isAbsolute(assetRelative) || !fs.existsSync(assetFile) || fs.statSync(assetFile).size === 0) {
      throw new Error(`${relativePath} texture is missing from the production build: ${uri}`);
    }
  }
}

function packEmbeddedGltfBufferAsGlb(file) {
  const original = fs.readFileSync(file);
  if (original.length >= 4 && original.readUInt32LE(0) === 0x46546c67) {
    validateGlbContainer(file, original);
    return;
  }

  const source = JSON.parse(original.toString('utf8'));
  const buffers = source.buffers ?? [];
  if (buffers.length !== 1) throw new Error(`${file} must contain exactly one required production buffer`);
  const buffer = buffers[0];
  const match = /^data:(application\/(?:octet-stream|gltf-buffer));base64,([A-Za-z0-9+/=]+)$/.exec(buffer.uri ?? '');
  if (!match) throw new Error(`${file} buffer must be embedded before GLB packing`);

  const binary = Buffer.from(match[2], 'base64');
  if (binary.length < (buffer.byteLength ?? 0)) throw new Error(`${file} embedded buffer is shorter than declared byteLength`);
  delete buffer.uri;

  const json = Buffer.from(JSON.stringify(source), 'utf8');
  const jsonPadding = (4 - (json.length % 4)) % 4;
  const binaryPadding = (4 - (binary.length % 4)) % 4;
  const jsonChunkLength = json.length + jsonPadding;
  const binaryChunkLength = binary.length + binaryPadding;
  const totalLength = 12 + 8 + jsonChunkLength + 8 + binaryChunkLength;
  const glb = Buffer.alloc(totalLength, 0);

  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(totalLength, 8);
  glb.writeUInt32LE(jsonChunkLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  json.copy(glb, 20);
  glb.fill(0x20, 20 + json.length, 20 + jsonChunkLength);
  const binaryHeaderOffset = 20 + jsonChunkLength;
  glb.writeUInt32LE(binaryChunkLength, binaryHeaderOffset);
  glb.writeUInt32LE(0x004e4942, binaryHeaderOffset + 4);
  binary.copy(glb, binaryHeaderOffset + 8);

  fs.writeFileSync(file, glb);
  validateGlbContainer(file, glb);
}

requireText(index, `"three": "${localCore}"`, 'Bare Three.js imports are not routed locally');
requireText(index, `"three/addons/": "${localAddons}"`, 'Three.js addon imports are not routed locally');
requireText(index, `"${remoteCore}": "${localCore}"`, 'Existing Three.js dynamic imports are not redirected locally');
requireText(index, `"${remoteGltf}": "${localGltf}"`, 'GLTFLoader dynamic imports do not have an exact WebKit-safe local mapping');
requireText(index, `"${remoteAddons}": "${localAddons}"`, 'Existing addon dynamic imports are not redirected locally');
requireText(index, `<link rel="modulepreload" href="${localCore}" />`, 'Local Three.js core is not preloaded before the menu renderer');
requireText(index, `<link rel="modulepreload" href="${localGltf}" />`, 'Local GLTFLoader is not preloaded before the menu renderer');
rejectText(index, '<link rel="preconnect" href="https://cdn.jsdelivr.net"', 'The page still preconnects to the removed runtime CDN');

requireText(vite, "const THREE_VENDOR_VERSION = '0.180.0';", 'Three.js runtime is not version-pinned');
requireText(vite, "const THREE_VENDOR_COMMIT = '0af9729d0c143a86a1d725d6e2c3ad83301f3f34';", 'Three.js source is not commit-pinned');
for (const file of [
  'LICENSE',
  'build/three.module.js',
  'build/three.core.js',
  'examples/jsm/loaders/GLTFLoader.js',
  'examples/jsm/loaders/FBXLoader.js',
  'examples/jsm/libs/fflate.module.js',
  'examples/jsm/curves/NURBSCurve.js',
  'examples/jsm/curves/NURBSUtils.js',
  'examples/jsm/utils/BufferGeometryUtils.js',
  'examples/jsm/utils/SkeletonUtils.js',
]) {
  requireText(vite, `'${file}'`, `Local build does not prepare ${file}`);
}
requireText(vite, 'await ensureLocalThreeRuntime();', 'Vite does not prepare the local runtime before serving or building');

if (process.argv.includes('--dist')) {
  const distRoot = path.join(root, 'dist', 'public');
  const distIndex = fs.readFileSync(path.join(distRoot, 'index.html'), 'utf8');
  requireText(distIndex, 'assets/vendor/three/build/three.module.js', 'Built page does not reference local Three.js');
  requireText(distIndex, 'assets/vendor/three/examples/jsm/loaders/GLTFLoader.js', 'Built page does not reference the local GLTFLoader');
  requireText(distIndex, 'assets/vendor/three/examples/jsm/', 'Built page does not reference local addons');

  for (const relativePath of requiredKayKitGltfPaths) {
    const file = path.join(distRoot, relativePath);
    if (!fs.existsSync(file)) throw new Error(`Required production KayKit asset is missing: ${relativePath}`);
    validateRequiredKayKitPackaging(file, relativePath, distRoot);
    packEmbeddedGltfBufferAsGlb(file);
  }

  const expectedFiles = new Map([
    ['assets/vendor/three/LICENSE', 500],
    ['assets/vendor/three/build/three.module.js', 500_000],
    ['assets/vendor/three/build/three.core.js', 500_000],
    ['assets/vendor/three/examples/jsm/loaders/GLTFLoader.js', 50_000],
    ['assets/vendor/three/examples/jsm/loaders/FBXLoader.js', 100_000],
    ['assets/vendor/three/examples/jsm/libs/fflate.module.js', 20_000],
    ['assets/vendor/three/examples/jsm/curves/NURBSCurve.js', 2_000],
    ['assets/vendor/three/examples/jsm/curves/NURBSUtils.js', 4_000],
    ['assets/vendor/three/examples/jsm/utils/BufferGeometryUtils.js', 5_000],
    ['assets/vendor/three/examples/jsm/utils/SkeletonUtils.js', 2_000],
  ]);

  for (const [relativePath, minimumBytes] of expectedFiles) {
    const file = path.join(distRoot, relativePath);
    const size = fs.statSync(file).size;
    if (size < minimumBytes) throw new Error(`${relativePath} is missing or incomplete (${size} bytes)`);
  }
}

console.log('Local Three.js runtime verified, including exact WebKit mappings, module preloads, GLB-packed required KayKit buffers and the pinned FBX loader dependencies.');
