import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

export default defineConfig(async () => {
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
