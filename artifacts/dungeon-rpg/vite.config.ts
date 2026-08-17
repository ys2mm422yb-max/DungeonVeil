import fs from 'node:fs/promises';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const THREE_VENDOR_VERSION = '0.180.0';
const THREE_VENDOR_COMMIT = '0af9729d0c143a86a1d725d6e2c3ad83301f3f34';
const THREE_VENDOR_FILES = [
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
] as const;

const ENEMY_FALLBACK_BLOCK = `        let visual = enemyVisuals.get(enemy.id);
        if (!visual) {
          let fallback = enemyFallbacks.get(enemy.id);
          if (!fallback) {
            fallback = createEnemyFallback(enemy);
            enemyFallbacks.set(enemy.id, fallback);
            scene.add(fallback);
          }
          fallback.visible = true;
          fallback.position.set(nextX, 0, nextZ);
          fallback.rotation.y = gameNow * 0.0015 + enemy.id.length;
          if (fallback.userData.ring?.material) {
            fallback.userData.ring.material.opacity = 0.46 + Math.sin(gameNow * 0.008 + enemy.id.length) * 0.16;
          }
        }
        if (!visual && !enemyLoading.has(enemy.id)) {`;

const ENEMY_DEDICATED_MODEL_BLOCK = `        let visual = enemyVisuals.get(enemy.id);
        // Required room models are prepared before the room becomes active.
        // Never draw a generic colored body while the cached visual attaches.
        if (!visual && !enemyLoading.has(enemy.id)) {`;

const ENEMY_FALLBACK_ERROR = `            // Keep the visible fallback in the scene. A failed model may never
            // turn a living, attacking enemy into an invisible target.
            console.error('KayKit enemy failed; keeping visibility fallback', error);`;

const ENEMY_DEDICATED_MODEL_ERROR = `            // Required models are retried by the entry and room staging gates.
            // Never replace the dedicated creature with a colored stand-in.
            console.error('KayKit dedicated enemy visual failed after preload', error);`;

async function hasContent(file: string) {
  try {
    return (await fs.stat(file)).size > 0;
  } catch {
    return false;
  }
}

async function fetchPinnedThreeFile(relativePath: string) {
  const sources = [
    `https://raw.githubusercontent.com/mrdoob/three.js/${THREE_VENDOR_COMMIT}/${relativePath}`,
    `https://cdn.jsdelivr.net/npm/three@${THREE_VENDOR_VERSION}/${relativePath}`,
  ];
  let lastError: unknown = null;

  for (const source of sources) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength < 100) throw new Error(`response is unexpectedly small (${bytes.byteLength} bytes)`);
      return bytes;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Unable to prepare local Three.js asset ${relativePath}: ${String(lastError)}`);
}

async function ensureLocalThreeRuntime() {
  const publicRoot = path.resolve(import.meta.dirname, 'public', 'assets', 'vendor', 'three');
  await Promise.all(THREE_VENDOR_FILES.map(async relativePath => {
    const destination = path.join(publicRoot, relativePath);
    if (await hasContent(destination)) return;

    const bytes = await fetchPinnedThreeFile(relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.tmp`;
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, destination);
  }));

  const gltfLoaderPath = path.join(publicRoot, 'examples/jsm/loaders/GLTFLoader.js');
  const gltfLoaderSource = await fs.readFile(gltfLoaderPath, 'utf8');
  const imageBitmapConstruction = 'new ImageBitmapLoader( this.options.manager )';
  const textureConstruction = 'new TextureLoader( this.options.manager )';
  if (!gltfLoaderSource.includes(imageBitmapConstruction) && !gltfLoaderSource.includes(textureConstruction)) {
    throw new Error('Pinned GLTFLoader image-decoder contract changed; refusing an unverified runtime build');
  }
  if (gltfLoaderSource.includes(imageBitmapConstruction)) {
    await fs.writeFile(
      gltfLoaderPath,
      gltfLoaderSource.replaceAll(imageBitmapConstruction, textureConstruction),
      'utf8',
    );
  }
}

function dedicatedEnemyModelsOnly(code: string) {
  const safetyNeedle = '        const requiresPermanentSafety = state.floor >= 13 && !enemy.isDead;';
  if (!code.includes(safetyNeedle)) throw new Error('Enemy safety-shell contract changed; refusing to build generic enemy bodies');
  if (!code.includes(ENEMY_FALLBACK_BLOCK)) throw new Error('Enemy fallback creation contract changed; refusing to build generic enemy bodies');
  if (!code.includes(ENEMY_FALLBACK_ERROR)) throw new Error('Enemy fallback error contract changed; refusing to build generic enemy bodies');

  return code
    .replace(safetyNeedle, '        const requiresPermanentSafety = false;')
    .replace(ENEMY_FALLBACK_BLOCK, ENEMY_DEDICATED_MODEL_BLOCK)
    .replace(ENEMY_FALLBACK_ERROR, ENEMY_DEDICATED_MODEL_ERROR);
}

function sidecarMimeType(fileName: string, declaredMime?: string) {
  if (declaredMime) return declaredMime;
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

async function resolveGltfSidecar(gltfPath: string, uri: string) {
  const directory = path.dirname(gltfPath);
  const sidecarPath = path.resolve(directory, decodeURIComponent(uri));
  const relative = path.relative(directory, sidecarPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing glTF sidecar outside its asset directory: ${uri}`);
  }
  if (!(await hasContent(sidecarPath))) throw new Error(`Required glTF sidecar is missing: ${sidecarPath}`);
  return sidecarPath;
}

async function inlineGltfSidecars(gltfPath: string) {
  const source = JSON.parse(await fs.readFile(gltfPath, 'utf8')) as {
    buffers?: Array<{ uri?: string; byteLength?: number }>;
    images?: Array<{ uri?: string; mimeType?: string; bufferView?: number }>;
  };
  const buffers = source.buffers ?? [];
  const embeddedBuffers = new Map<number, Buffer>();
  let changed = false;

  for (const [index, entry] of buffers.entries()) {
    const uri = entry.uri;
    if (!uri || uri.startsWith('data:') || uri.includes('://')) continue;
    const sidecarPath = await resolveGltfSidecar(gltfPath, uri);
    embeddedBuffers.set(index, await fs.readFile(sidecarPath));
    changed = true;
  }

  for (const entry of source.images ?? []) {
    const uri = entry.uri;
    if (!uri || uri.startsWith('data:') || uri.includes('://')) continue;
    const imagePath = await resolveGltfSidecar(gltfPath, uri);
    const imageBytes = await fs.readFile(imagePath);
    const mimeType = sidecarMimeType(uri, entry.mimeType);
    entry.uri = `data:${mimeType};base64,${imageBytes.toString('base64')}`;
    entry.mimeType = mimeType;
    delete entry.bufferView;
    changed = true;
  }

  for (const [index, bytes] of embeddedBuffers) {
    const entry = buffers[index];
    if (!entry) throw new Error(`Missing glTF buffer entry ${index} while embedding sidecars`);
    entry.byteLength = bytes.byteLength;
    entry.uri = `data:application/octet-stream;base64,${bytes.toString('base64')}`;
  }

  if (changed) await fs.writeFile(gltfPath, `${JSON.stringify(source)}\n`, 'utf8');
}

async function validateNoExternalGltfSidecars(gltfPath: string) {
  const source = JSON.parse(await fs.readFile(gltfPath, 'utf8')) as {
    buffers?: Array<{ uri?: string }>;
    images?: Array<{ uri?: string }>;
  };
  for (const buffer of source.buffers ?? []) {
    if (buffer.uri && !buffer.uri.startsWith('data:')) {
      throw new Error(`Required production glTF still references an external buffer: ${gltfPath}`);
    }
  }
  for (const image of source.images ?? []) {
    if (image.uri && !image.uri.startsWith('data:')) {
      throw new Error(`Required production glTF still references an external image: ${gltfPath}`);
    }
  }
}

async function validateRequiredQuiverPackaging(gltfPath: string) {
  const source = JSON.parse(await fs.readFile(gltfPath, 'utf8')) as {
    buffers?: Array<{ uri?: string }>;
    images?: Array<{ uri?: string; mimeType?: string; bufferView?: number }>;
  };
  const [buffer] = source.buffers ?? [];
  if (!buffer?.uri?.startsWith('data:application/octet-stream;base64,')) {
    throw new Error('Required quiver binary buffer must remain embedded as a data URI');
  }
  const images = source.images ?? [];
  if (images.length === 0) throw new Error('Required quiver texture is missing from the production glTF');
  for (const image of images) {
    if (image.bufferView !== undefined) {
      throw new Error('Required quiver texture must not be packaged as a glTF bufferView');
    }
    if (!image.uri?.startsWith('data:image/png;base64,') || image.mimeType !== 'image/png') {
      throw new Error('Required quiver texture must be a validated PNG data URI');
    }
  }
}

async function inlineRequiredKayKitSidecars(outDir: string) {
  const relativeGltfPaths = [
    'assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf',
    'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/table_long_decorated_A.gltf',
    'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/chair.gltf',
    'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/banner_shield_red.gltf',
    'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/candle_lit.gltf',
    'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/banner_patternC_red.gltf',
    'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/chest_gold.gltf',
    'assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/sword_shield_gold.gltf',
    'assets/kaykit/tools/Assets/gltf/map.gltf',
  ] as const;
  for (const relativeGltfPath of relativeGltfPaths) {
    const gltfPath = path.join(outDir, relativeGltfPath);
    if (!(await hasContent(gltfPath))) throw new Error(`Required KayKit glTF is missing from the production build: ${gltfPath}`);
    await inlineGltfSidecars(gltfPath);
    await validateNoExternalGltfSidecars(gltfPath);
    if (relativeGltfPath.endsWith('/quiver.gltf')) await validateRequiredQuiverPackaging(gltfPath);
  }
}

export default defineConfig(async () => {
  await ensureLocalThreeRuntime();

  const rawPort = process.env.PORT ?? '3000';
  const port = Number(rawPort);
  const basePath = process.env.BASE_PATH ?? '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const replitPlugins = [];
  const buildOutDir = path.resolve(import.meta.dirname, 'dist/public');

  const dedicatedEnemyModelsPlugin: Plugin = {
    name: 'dungeon-veil-dedicated-enemy-models-only',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replaceAll('\\', '/');
      if (!normalizedId.endsWith('/src/components/GameCanvasKayKit3D.tsx')) return null;
      return { code: dedicatedEnemyModelsOnly(code), map: null };
    },
  };

  const internalAssetBasePlugin: Plugin = {
    name: 'dungeon-veil-internal-asset-base',
    enforce: 'pre',
    transform(code, id) {
      if (normalizedBasePath === '/' || !id.includes('/src/') || !code.includes('/assets/')) return null;
      if (id.endsWith('/src/components/kaykitEnemy3D.ts')) {
        return {
          code: code.replaceAll('/assets/', 'assets/'),
          map: null,
        };
      }
      return {
        code: code.replaceAll('/assets/', `${normalizedBasePath}assets/`),
        map: null,
      };
    },
  };

  const inlineKayKitSidecarsPlugin: Plugin = {
    name: 'dungeon-veil-inline-kaykit-sidecars',
    async writeBundle() {
      await inlineRequiredKayKitSidecars(buildOutDir);
    },
  };

  if (process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined) {
    const [{ cartographer }, { devBanner }] = await Promise.all([
      import('@replit/vite-plugin-cartographer'),
      import('@replit/vite-plugin-dev-banner'),
    ]);

    replitPlugins.push(
      cartographer({
        root: path.resolve(import.meta.dirname, '..'),
      }),
      devBanner(),
    );
  }

  return {
    base: normalizedBasePath,
    plugins: [dedicatedEnemyModelsPlugin, internalAssetBasePlugin, inlineKayKitSidecarsPlugin, react(), tailwindcss(), runtimeErrorOverlay(), ...replitPlugins],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: buildOutDir,
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
