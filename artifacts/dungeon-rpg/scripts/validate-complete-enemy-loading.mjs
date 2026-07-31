import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];

const enemyLoader = read('src/components/kaykitEnemy3D.ts');
const spectator = read('src/components/SpectatorPerformanceQa.tsx');
const spectatorTest = read('tests/spectator-performance.spec.mjs');
const canvas = read('src/components/GameCanvas.tsx');
const game = read('src/pages/game.tsx');
const vite = read('vite.config.ts');

for (const asset of ['Slime.glb', 'Rat.glb', 'Spider.glb', 'Bat.glb', 'Snake_angry.glb']) {
  const target = path.join(root, 'public/assets/imported/enemies', asset);
  if (!fs.existsSync(target) || fs.statSync(target).size < 512) failures.push(`missing or truncated enemy model: ${asset}`);
  if (!enemyLoader.includes(asset)) failures.push(`enemy preload manifest does not include ${asset}`);
}

const requiredLoaderContracts = [
  ['requestedImportedTypes(requestedTypes, requestedFamilies)', 'preload does not filter exact requested family profiles'],
  ['runtimeEnemyTypeForFamily(familyId)', 'family preload does not resolve the canonical runtime carrier'],
  ['enemyVisualProfile(1, runtimeType, 0, familyId).useImported', 'family preload does not honor the actual presentation profile'],
  ['enemyFamilyIds.some(familyId => {', 'base-library preload is not derived from exact family profiles'],
  ['enemyTypes.some(type => !enemyVisualProfile(1, type, 0).useImported)', 'legacy preload does not derive its base-library need from the actual visual profile'],
  ['types.map(readLocalEnemyAsset)', 'requested GLBs are not fully fetched before model creation'],
  ['types.map(loadImportedPrototype)', 'requested GLBs are not parsed before room entry'],
  ['const bytes = await response.arrayBuffer();', 'enemy GLBs are not fully read'],
  ['new GLTFLoader().parseAsync(bytes, enemyAssetBaseUrl(type))', 'cached GLB bytes are not parsed without a second network request'],
  ['const importedAssetPromises = new Map<', 'enemy GLB byte reads are not cached by imported type'],
  ['createDedicatedImportedVisual', 'imported creatures do not have a direct visual construction path'],
  ['throw new Error(`Dedicated enemy model did not become ready:', 'a dedicated creature can still settle on a generic model'],
  ['const enemyPreloadPromises = new Map<string, Promise<void>>();', 'room-family preload results are not cached'],
  ["requestedFamilies.join('|') || 'legacy'", 'preload cache key does not distinguish exact family sets'],
  ['enemyPreloadPromises.delete(key);', 'failed room-family preload cannot be retried'],
  ['enemyFamilyIds: readonly EnemyFamilyId[] = []', 'preloader does not accept exact room family ids'],
  ['await startEnemyPreload(enemyTypes, enemyFamilyIds)', 'preloader drops exact room family ids'],
];
for (const [needle, message] of requiredLoaderContracts) if (!enemyLoader.includes(needle)) failures.push(message);
if (enemyLoader.includes('const needsBaseLibrary = true')) failures.push('base humanoid library is still forced for every family preload');
if (enemyLoader.includes('ENEMY_PRELOAD_MAX_BLOCK_MS')) failures.push('old 3.5 second early release still exists');
if (enemyLoader.includes('Promise.race([preload')) failures.push('required enemy preload can still release early');
if (enemyLoader.includes('IMPORTED_ENEMY_TYPES.map(readLocalEnemyAsset)')) failures.push('all five creatures are still forced before every room');
if (enemyLoader.includes('new GLTFLoader().loadAsync(enemyAssetUrl(type))')) failures.push('imported model parsing still performs a second network request');

const requiredSpectatorContracts = [
  ["import { preloadKayKitEnemyVisuals } from './kaykitEnemy3D';", 'spectator QA does not use the production family preloader'],
  ["enemyFamilyId: 'goblin'", 'spectator QA enemy is not bound to its canonical family'],
  ["preloadKayKitEnemyVisuals(['goblin'], ['goblin'])", 'spectator QA does not preload its exact family before rendering'],
  ['const [assetsReady, setAssetsReady] = useState(false);', 'spectator QA has no explicit asset-ready gate'],
  ['if (!assetsReady) return;', 'spectator packet and measurement loop can start before preload completion'],
  ["data-assets-ready={assetsReady ? 'true' : 'false'}", 'spectator QA does not expose preload readiness'],
  ['{assetsReady && <SpectatorPlaybackStage stableState={stableState} />}', 'spectator renderer can mount before exact assets are ready'],
];
for (const [needle, message] of requiredSpectatorContracts) if (!spectator.includes(needle)) failures.push(message);
if (!spectatorTest.includes("toHaveAttribute('data-assets-ready', 'true')")) failures.push('spectator regression test does not wait for exact family preload before renderer measurement');

const requiredEntryContracts = [
  ['preloadRequiredRunRoom(sessionSave.floor)', 'automatic saved-session resume does not preload its exact room'],
  ['await preloadRequiredRunRoom(1);', 'new run does not preload room 1 before entering the game'],
  ['await preloadRequiredRunRoom(save.floor);', 'continue flow does not preload the saved room'],
  ['const enemyFamilyIds = plannedRoomEnemyFamilyIds(safeFloor);', 'run entry does not derive exact planned enemy families'],
  ['preloadKayKitEnemyVisuals(enemyTypes, enemyFamilyIds)', 'run entry does not pass exact planned enemy types and families'],
  ["setUiState('game');", 'run entry no longer enters the game after preload'],
];
for (const [needle, message] of requiredEntryContracts) if (!game.includes(needle)) failures.push(message);
const freshRunStart = game.indexOf('const beginFreshRun = useCallback');
const freshRunPreload = game.indexOf('await preloadRequiredRunRoom(1);', freshRunStart);
const freshRunEnter = game.indexOf("setUiState('game');", freshRunPreload);
if (freshRunStart < 0 || freshRunPreload < 0 || freshRunEnter < 0 || freshRunPreload > freshRunEnter) {
  failures.push('new run can enter the game before room 1 models are ready');
}

const requiredCanvasContracts = [
  ['const [renderState, setRenderState] = useState(gameState);', 'canvas no longer keeps a complete visible room during staging'],
  ['currentRoomEnemyTypes(gameState)', 'current room types are not derived from actual enemies'],
  ['currentRoomEnemyFamilyIds(gameState)', 'current room families are not derived from actual enemies'],
  ['preloadKayKitEnemyVisuals(requiredEnemyTypes, requiredEnemyFamilyIds)', 'room transition does not stage its exact enemy family models'],
  ['preloadKayKitEnemyVisuals(plannedRoomEnemyTypes(nextFloor), plannedRoomEnemyFamilyIds(nextFloor))', 'next room background preload is not family-specific'],
  ['keeping previous room visible', 'room transition no longer retries while preserving the previous room'],
  ['<GameCanvasKayKit3D key={rendererGeneration} gameState={renderState} />', '3D canvas is conditionally removed during model staging'],
];
for (const [needle, message] of requiredCanvasContracts) if (!canvas.includes(needle)) failures.push(message);
if (canvas.includes('useState<GameState | null>(null)')) failures.push('whole canvas is hidden while enemy models load');
if (canvas.includes('failed: true')) failures.push('failed staging can reveal an unfinished next room');

const requiredBuildContracts = [
  ["name: 'dungeon-veil-dedicated-enemy-models-only'", 'production build lacks dedicated-model-only transform'],
  [".replace(safetyNeedle, '        const requiresPermanentSafety = false;')", 'generic permanent safety bodies remain enabled'],
  ['.replace(ENEMY_FALLBACK_BLOCK, ENEMY_DEDICATED_MODEL_BLOCK)', 'colored enemy loading bodies remain in production output'],
  ["throw new Error('Enemy fallback creation contract changed; refusing to build generic enemy bodies')", 'build does not fail closed if fallback source changes'],
];
for (const [needle, message] of requiredBuildContracts) if (!vite.includes(needle)) failures.push(message);

if (failures.length) {
  console.error('Enemy loading validation failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Exact family-aware room and spectator preload, cached imported GLB parsing, always-mounted canvas and no-blob production build verified.');
