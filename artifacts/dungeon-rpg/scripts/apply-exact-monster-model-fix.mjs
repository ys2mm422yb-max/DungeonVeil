import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function write(relative, content) {
  fs.writeFileSync(path.join(root, relative), content);
}

function replaceOnce(source, oldText, newText, label) {
  if (!source.includes(oldText)) throw new Error(`Patch source missing: ${label}`);
  return source.replace(oldText, newText);
}

function removeBetween(source, start, end, label) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Patch range missing: ${label}`);
  return source.slice(0, startIndex) + source.slice(endIndex);
}

// Failed imported creature requests must be retryable instead of caching null forever.
{
  const file = 'src/components/kaykitEnemyBase3D.ts';
  let source = read(file);
  source = replaceOnce(
    source,
    "  })();\n  importedPromises.set(type, promise);\n",
    "  })().then(result => {\n    if (!result) importedPromises.delete(type);\n    return result;\n  });\n  importedPromises.set(type, promise);\n",
    'retry failed imported creature model',
  );
  source = replaceOnce(
    source,
    "  if (!libraryPromise) libraryPromise = (async () => {\n",
    "  if (!libraryPromise) libraryPromise = (async () => {\n",
    'enemy library start',
  );
  source = replaceOnce(
    source,
    "  })();\n  return libraryPromise;\n}\n\nexport function preloadKayKitEnemyVisuals()",
    "  })().catch(error => {\n    libraryPromise = null;\n    throw error;\n  });\n  return libraryPromise;\n}\n\nexport function preloadKayKitEnemyVisuals()",
    'retry failed enemy library',
  );
  write(file, source);
}

// Imported creature identities may never fall back to a generic humanoid model.
{
  const file = 'src/components/kaykitEnemy3D.ts';
  let source = read(file);
  source = replaceOnce(
    source,
    "function wait(milliseconds: number) {\n  return new Promise<void>(resolve => globalThis.setTimeout(resolve, milliseconds));\n}\n",
    "function wait(milliseconds: number) {\n  return new Promise<void>(resolve => globalThis.setTimeout(resolve, milliseconds));\n}\n\nfunction disposeTemporaryVisual(visual: KayKitEnemyVisual | null) {\n  if (!visual) return;\n  visual.mixer?.stopAllAction?.();\n  visual.root?.traverse?.((node: any) => {\n    node.geometry?.dispose?.();\n    if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());\n    else node.material?.dispose?.();\n  });\n}\n",
    'temporary enemy visual disposal',
  );
  source = replaceOnce(
    source,
    "    const retry = await createBaseKayKitEnemyVisual(THREE, enemy);\n    if (retry) visual = retry;\n    if (visual?.imported) return visual;\n",
    "    const retry = await createBaseKayKitEnemyVisual(THREE, enemy);\n    if (retry) {\n      if (visual && visual !== retry && !visual.imported) disposeTemporaryVisual(visual);\n      visual = retry;\n    }\n    if (visual?.imported) return visual;\n",
    'exact imported enemy retry',
  );
  source = replaceOnce(
    source,
    "  if (visual) visual.root.userData.importedCreatureLoadTimedOut = enemy.enemyType;\n  return visual;\n",
    "  disposeTemporaryVisual(visual);\n  console.warn(`Exact creature model still unavailable: ${enemy.enemyType}; retrying before room reveal`);\n  return null;\n",
    'reject generic imported fallback',
  );
  write(file, source);
}

// The room renderer prepares exact enemy visuals atomically and never renders colored placeholders.
{
  const file = 'src/components/GameCanvasKayKit3D.tsx';
  let source = read(file);
  source = replaceOnce(
    source,
    "    const enemyVisuals = new Map<string, KayKitEnemyVisual>();\n    const enemyFallbacks = new Map<string, any>();\n    const enemySafetyShells = new Map<string, any>();\n    const enemyLoading = new Set<string>();\n",
    "    const enemyVisuals = new Map<string, KayKitEnemyVisual>();\n    const enemyLoading = new Set<string>();\n",
    'remove enemy placeholder maps',
  );
  source = removeBetween(
    source,
    "    const createEnemyFallback = (enemy: GameState['enemies'][number]) => {\n",
    "    const disposeObject = (object: any) => object?.traverse?.((node: any) => {\n",
    'remove colored enemy placeholder builders',
  );
  source = replaceOnce(
    source,
    "    const disposeObject = (object: any) => object?.traverse?.((node: any) => {\n      node.geometry?.dispose?.();\n      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());\n      else node.material?.dispose?.();\n    });\n\n    const buildRoom = (state: GameState) => {\n      const key = `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;\n",
    "    const disposeObject = (object: any) => object?.traverse?.((node: any) => {\n      node.geometry?.dispose?.();\n      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());\n      else node.material?.dispose?.();\n    });\n\n    const roomKeyFor = (state: GameState) => `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;\n    const waitForEnemyRetry = (milliseconds: number) => new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));\n\n    const prepareRoomEnemyVisuals = async (state: GameState, key: string, generation: number) => {\n      const snapshots = state.enemies.map(enemy => ({ ...enemy }));\n      const prepared = await Promise.all(snapshots.map(async enemy => {\n        enemyLoading.add(enemy.id);\n        try {\n          while (!disposed && generation === roomGeneration) {\n            const live = stateRef.current;\n            if (roomKeyFor(live) !== key || !live.enemies.some(current => current.id === enemy.id)) return null;\n            try {\n              const visual = await createKayKitEnemyVisual(THREE, enemy);\n              if (visual) return [enemy.id, visual] as const;\n            } catch (error) {\n              console.warn(`Exact enemy model retry scheduled: ${enemy.enemyType}`, error);\n            }\n            await waitForEnemyRetry(240);\n          }\n          return null;\n        } finally {\n          enemyLoading.delete(enemy.id);\n        }\n      }));\n      return prepared.filter((entry): entry is readonly [string, KayKitEnemyVisual] => Boolean(entry));\n    };\n\n    const buildRoom = (state: GameState) => {\n      const key = roomKeyFor(state);\n",
    'prepare exact room enemy visuals',
  );
  source = replaceOnce(
    source,
    "      window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { key, floor: state.floor } }));\n",
    "      window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { key, floor: state.floor, critical: true } }));\n",
    'critical room model preparation event',
  );
  source = replaceOnce(
    source,
    "      root.userData.theme = theme;\n\n      Promise.all([room.userData?.ready ?? Promise.resolve(), theme.userData?.ready ?? Promise.resolve()]).then(() => {\n        const live = stateRef.current;\n        const liveKey = `${live.chapter}:${live.floor}:${live.map.width}x${live.map.height}`;\n        if (disposed || generation !== roomGeneration || liveKey !== key) {\n          room.userData?.dispose?.();\n          theme.userData?.dispose?.();\n          disposeObject(root);\n          return;\n        }\n",
    "      root.userData.theme = theme;\n      const enemyReady = prepareRoomEnemyVisuals(state, key, generation);\n\n      Promise.all([room.userData?.ready ?? Promise.resolve(), theme.userData?.ready ?? Promise.resolve(), enemyReady]).then(([, , preparedEnemies]) => {\n        const live = stateRef.current;\n        const liveKey = roomKeyFor(live);\n        if (disposed || generation !== roomGeneration || liveKey !== key) {\n          room.userData?.dispose?.();\n          theme.userData?.dispose?.();\n          preparedEnemies.forEach(([, visual]) => disposeObject(visual.root));\n          disposeObject(root);\n          return;\n        }\n",
    'wait for exact enemy models before room reveal',
  );
  source = replaceOnce(
    source,
    "        scene.add(root);\n        lastRoomKey = key;\n        pendingRoomKey = '';\n\n        if (previous) {\n",
    "        scene.add(root);\n        for (const [id, visual] of preparedEnemies) {\n          if (!live.enemies.some(enemy => enemy.id === id)) {\n            disposeObject(visual.root);\n            continue;\n          }\n          const previousVisual = enemyVisuals.get(id);\n          if (previousVisual && previousVisual !== visual) {\n            scene.remove(previousVisual.root);\n            previousVisual.mixer?.stopAllAction?.();\n            disposeObject(previousVisual.root);\n          }\n          enemyVisuals.set(id, visual);\n          scene.add(visual.root);\n        }\n        lastRoomKey = key;\n        pendingRoomKey = '';\n\n        if (previous) {\n",
    'install prepared enemy visuals atomically',
  );
  source = replaceOnce(
    source,
    "      for (const [id, fallback] of enemyFallbacks) {\n        if (active.has(id)) continue;\n        scene.remove(fallback);\n        disposeObject(fallback);\n        enemyFallbacks.delete(id);\n      }\n      for (const [id, shell] of enemySafetyShells) {\n        if (active.has(id)) continue;\n        scene.remove(shell);\n        disposeObject(shell);\n        enemySafetyShells.delete(id);\n      }\n\n",
    '',
    'remove placeholder cleanup',
  );
  const safetyStart = "        const requiresPermanentSafety = state.floor >= 13 && !enemy.isDead;\n";
  const safetyEnd = "        let visual = enemyVisuals.get(enemy.id);\n";
  source = removeBetween(source, safetyStart, safetyEnd, 'remove permanent colored safety shells');
  source = replaceOnce(
    source,
    "        let visual = enemyVisuals.get(enemy.id);\n        if (!visual) {\n          let fallback = enemyFallbacks.get(enemy.id);\n          if (!fallback) {\n            fallback = createEnemyFallback(enemy);\n            enemyFallbacks.set(enemy.id, fallback);\n            scene.add(fallback);\n          }\n          fallback.position.set(nextX, 0, nextZ);\n          fallback.rotation.y = gameNow * 0.0015 + enemy.id.length;\n          if (fallback.userData.ring?.material) {\n            fallback.userData.ring.material.opacity = 0.46 + Math.sin(gameNow * 0.008 + enemy.id.length) * 0.16;\n          }\n        }\n",
    "        let visual = enemyVisuals.get(enemy.id);\n",
    'remove runtime colored fallback creation',
  );
  source = replaceOnce(
    source,
    "            const fallback = enemyFallbacks.get(enemy.id);\n            if (fallback) {\n              scene.remove(fallback);\n              disposeObject(fallback);\n              enemyFallbacks.delete(enemy.id);\n            }\n            enemyVisuals.set(enemy.id, created);\n",
    "            enemyVisuals.set(enemy.id, created);\n",
    'remove fallback replacement cleanup',
  );
  source = replaceOnce(
    source,
    "            // Keep the visible fallback in the scene. A failed model may never\n            // turn a living, attacking enemy into an invisible target.\n            console.error('KayKit enemy failed; keeping visibility fallback', error);\n",
    "            console.error('KayKit exact enemy model failed; retrying without a placeholder', error);\n",
    'retry exact model without placeholder',
  );
  source = replaceOnce(
    source,
    "        const fallback = enemyFallbacks.get(enemy.id);\n        if (fallback) {\n          scene.remove(fallback);\n          disposeObject(fallback);\n          enemyFallbacks.delete(enemy.id);\n        }\n",
    '',
    'remove final fallback cleanup',
  );
  source = replaceOnce(
    source,
    "        updateKayKitEnemyVisual(visual, enemy, delta, gameNow);\n      }\n    };\n",
    "        updateKayKitEnemyVisual(visual, enemy, delta, gameNow);\n      }\n\n      const importedTypes = new Set(['slime', 'goblin', 'spider', 'vampire', 'demon']);\n      const living = state.enemies.filter(enemy => !enemy.isDead);\n      (globalThis as any).__dungeonVeilEnemyVisualDiagnostics = {\n        floor: state.floor,\n        active: living.length,\n        loaded: living.filter(enemy => enemyVisuals.has(enemy.id)).length,\n        pending: living.filter(enemy => !enemyVisuals.has(enemy.id)).map(enemy => enemy.enemyType),\n        fallbackCount: 0,\n        exactImported: living.filter(enemy => importedTypes.has(enemy.enemyType)).every(enemy => enemyVisuals.get(enemy.id)?.imported === true),\n      };\n    };\n",
    'enemy model diagnostics',
  );
  source = replaceOnce(
    source,
    "      renderer?.domElement?.remove?.();\n",
    "      renderer?.domElement?.remove?.();\n      delete (globalThis as any).__dungeonVeilEnemyVisualDiagnostics;\n",
    'clear enemy diagnostics',
  );
  write(file, source);
}

// Critical room transitions stay covered until their required enemy models are ready.
{
  const file = 'src/components/GlobalLoadingLayer.tsx';
  let source = read(file);
  source = replaceOnce(
    source,
    "type RoomTransition = { key: string; floor: number; startedAt: number };\n",
    "type RoomTransition = { key: string; floor: number; startedAt: number; critical: boolean };\n",
    'critical room transition type',
  );
  source = replaceOnce(
    source,
    "      const detail = (event as CustomEvent<{ key?: string; floor?: number }>).detail ?? {};\n",
    "      const detail = (event as CustomEvent<{ key?: string; floor?: number; critical?: boolean }>).detail ?? {};\n",
    'critical room event detail',
  );
  source = replaceOnce(
    source,
    "      const next = { key, floor: detail.floor ?? 1, startedAt: performance.now() };\n",
    "      const next = { key, floor: detail.floor ?? 1, startedAt: performance.now(), critical: detail.critical === true };\n",
    'critical room state',
  );
  source = replaceOnce(
    source,
    "      safetyTimerRef.current = window.setTimeout(() => finish(key), ROOM_LOADING_MAX_MS);\n",
    "      if (!next.critical) safetyTimerRef.current = window.setTimeout(() => finish(key), ROOM_LOADING_MAX_MS);\n",
    'do not reveal room before critical monster models',
  );
  write(file, source);
}

// Permanent static guard against reintroducing colored placeholders or generic imported replacements.
write('scripts/validate-exact-monster-models.mjs', `import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canvas = fs.readFileSync(path.join(root, 'src/components/GameCanvasKayKit3D.tsx'), 'utf8');
const enemy = fs.readFileSync(path.join(root, 'src/components/kaykitEnemy3D.ts'), 'utf8');
const base = fs.readFileSync(path.join(root, 'src/components/kaykitEnemyBase3D.ts'), 'utf8');
const loading = fs.readFileSync(path.join(root, 'src/components/GlobalLoadingLayer.tsx'), 'utf8');

for (const forbidden of ['EnemyVisibilityFallback_', 'EnemyVisibilitySafety_', 'enemyFallbacks', 'enemySafetyShells', 'createEnemyFallback', 'createEnemySafetyShell']) {
  if (canvas.includes(forbidden)) throw new Error(\`Colored enemy placeholder remains in run renderer: \${forbidden}\`);
}
if (!canvas.includes('prepareRoomEnemyVisuals')) throw new Error('Rooms do not prepare their exact enemy visuals');
if (!canvas.includes('Promise.all([room.userData?.ready ?? Promise.resolve(), theme.userData?.ready ?? Promise.resolve(), enemyReady])')) throw new Error('Room reveal does not wait for enemy models');
if (!canvas.includes('fallbackCount: 0')) throw new Error('Enemy diagnostics do not guarantee zero placeholders');
if (!enemy.includes('return null;') || !enemy.includes('retrying before room reveal')) throw new Error('Imported monsters may still return a generic replacement');
if (!base.includes('importedPromises.delete(type)')) throw new Error('Failed imported monster loads are not retryable');
if (!base.includes('libraryPromise = null')) throw new Error('Failed enemy library loads are not retryable');
if (!loading.includes('if (!next.critical)')) throw new Error('Critical monster loading can still be hidden by the room timeout');

console.log('Exact monster models verified: room-gated loading, retryable assets and zero colored placeholders.');
`);

// Browser proof: abort the former Three.js CDN and require all room monsters to be real visuals.
write('tests/exact-monster-models.spec.mjs', `import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function clickAnimatedUi(locator) {
  await expect(locator).toBeVisible();
  await locator.click({ force: true, noWaitAfter: true });
}

test('room opens only with exact monster visuals and no colored placeholders', async ({ page }) => {
  test.setTimeout(120_000);
  let remoteThreeRequests = 0;
  page.on('request', request => {
    if (request.url().startsWith('https://cdn.jsdelivr.net/npm/three@0.180.0/')) remoteThreeRequests += 1;
  });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.180.0/**', route => route.abort('blockedbyclient'));
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-language', 'de'));

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await clickAnimatedUi(page.getByRole('button', { name: /Neuer Run|New Run/i }));
  await page.getByRole('textbox').first().fill('Monster Wächter');
  await clickAnimatedUi(page.getByRole('button', { name: /Run starten|Start Game/i }).first());

  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('run-room-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => globalThis.__dungeonVeilEnemyVisualDiagnostics ?? null), { timeout: 30_000 }).toMatchObject({
    fallbackCount: 0,
    exactImported: true,
  });
  const diagnostics = await page.evaluate(() => globalThis.__dungeonVeilEnemyVisualDiagnostics);
  expect(diagnostics.active).toBeGreaterThan(0);
  expect(diagnostics.loaded).toBe(diagnostics.active);
  expect(diagnostics.pending).toEqual([]);
  expect(remoteThreeRequests).toBe(0);
});
`);

// Wire the permanent audit and browser proof into the existing suites.
{
  const packagePath = path.join(root, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.scripts['audit:monster-models'] = 'node scripts/validate-exact-monster-models.mjs';
  packageJson.scripts['audit:assets'] = packageJson.scripts['audit:assets'].includes('validate-exact-monster-models')
    ? packageJson.scripts['audit:assets']
    : `node scripts/validate-exact-monster-models.mjs && ${packageJson.scripts['audit:assets']}`;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
}

{
  const file = 'playwright.regression.config.mjs';
  let source = read(file);
  source = replaceOnce(
    source,
    '/(?:full-game-smoke|account-profile-smoke|armor-balance-smoke|new-run-preload-deadline)\\.spec\\.mjs/',
    '/(?:full-game-smoke|account-profile-smoke|armor-balance-smoke|new-run-preload-deadline|exact-monster-models)\\.spec\\.mjs/',
    'monster model browser test scope',
  );
  write(file, source);
}

console.log('Exact monster model patch applied.');
