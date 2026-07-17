import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];

const enemyLoader = read('src/components/kaykitEnemy3D.ts');
const canvas = read('src/components/GameCanvas.tsx');
const game = read('src/pages/game.tsx');
const vite = read('vite.config.ts');

for (const asset of ['Slime.glb', 'Rat.glb', 'Spider.glb', 'Bat.glb', 'Snake_angry.glb']) {
  const target = path.join(root, 'public/assets/imported/enemies', asset);
  if (!fs.existsSync(target) || fs.statSync(target).size < 512) failures.push(`missing or truncated enemy model: ${asset}`);
  if (!enemyLoader.includes(asset)) failures.push(`enemy preload manifest does not include ${asset}`);
}

const requiredLoaderContracts = [
  ['requestedImportedTypes(enemyTypes)', 'preload does not filter requested room types'],
  ['types.map(preloadLocalEnemyAsset)', 'requested GLBs are not fully fetched before model creation'],
  ['const bytes = await response.arrayBuffer();', 'enemy GLBs are not fully read'],
  ['throw new Error(`Dedicated enemy model did not become ready:', 'a dedicated creature can still settle on a generic model'],
  ['const enemyPreloadPromises = new Map<string, Promise<void>>();', 'room-type preload results are not cached'],
  ['enemyPreloadPromises.delete(key);', 'failed room-type preload cannot be retried'],
  ["export async function preloadKayKitEnemyVisuals(enemyTypes: readonly Enemy['enemyType'][] = [])", 'preloader does not accept exact room enemy types'],
];
for (const [needle, message] of requiredLoaderContracts) if (!enemyLoader.includes(needle)) failures.push(message);
if (enemyLoader.includes('ENEMY_PRELOAD_MAX_BLOCK_MS')) failures.push('old 3.5 second early release still exists');
if (enemyLoader.includes('Promise.race([preload')) failures.push('required enemy preload can still release early');
if (enemyLoader.includes('IMPORTED_ENEMY_TYPES.map(preloadLocalEnemyAsset)')) failures.push('all five creatures are still forced before every room');

const requiredEntryContracts = [
  ['preloadRequiredRunRoom(sessionSave.floor)', 'automatic saved-session resume does not preload its exact room'],
  ['await preloadRequiredRunRoom(1);', 'new run does not preload room 1 before entering the game'],
  ['await preloadRequiredRunRoom(save.floor);', 'continue flow does not preload the saved room'],
  ['preloadKayKitEnemyVisuals(enemyTypes)', 'run entry does not pass exact planned enemy types'],
  ["setUiState('game');", 'run entry no longer enters the game after preload'],
];
for (const [needle, message] of requiredEntryContracts) if (!game.includes(needle)) failures.push(message);
if (game.indexOf('await preloadRequiredRunRoom(1);') > game.indexOf("setUiState('game');")) failures.push('new run can enter the game before room 1 models are ready');

const requiredCanvasContracts = [
  ['const [renderState, setRenderState] = useState(gameState);', 'canvas no longer keeps a complete visible room during staging'],
  ['currentRoomEnemyTypes(gameState)', 'current room types are not derived from actual enemies'],
  ['preloadKayKitEnemyVisuals(requiredEnemyTypes)', 'room transition does not stage its exact enemy models'],
  ['preloadKayKitEnemyVisuals(plannedRoomEnemyTypes(nextFloor))', 'next room background preload is not type-specific'],
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

console.log('Exact room enemy preload, always-mounted canvas and no-blob production build verified.');
