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

export default defineConfig(async () => {
  await ensureLocalThreeRuntime();

  const rawPort = process.env.PORT ?? '3000';
  const port = Number(rawPort);
  const basePath = process.env.BASE_PATH ?? '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const replitPlugins = [];

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
    plugins: [dedicatedEnemyModelsPlugin, internalAssetBasePlugin, react(), tailwindcss(), runtimeErrorOverlay(), ...replitPlugins],
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
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
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
