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
  'examples/jsm/loaders/GLTFLoader.js',
  'examples/jsm/utils/BufferGeometryUtils.js',
  'examples/jsm/utils/SkeletonUtils.js',
] as const;

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

export default defineConfig(async () => {
  await ensureLocalThreeRuntime();

  const rawPort = process.env.PORT ?? '3000';
  const port = Number(rawPort);
  const basePath = process.env.BASE_PATH ?? '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const replitPlugins = [];

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
    plugins: [internalAssetBasePlugin, react(), tailwindcss(), runtimeErrorOverlay(), ...replitPlugins],
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
