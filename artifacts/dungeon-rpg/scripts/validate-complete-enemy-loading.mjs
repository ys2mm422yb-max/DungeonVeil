import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];

const enemyLoader = read('src/components/kaykitEnemy3D.ts');
const canvas = read('src/components/GameCanvas.tsx');
const vite = read('vite.config.ts');

const requiredEnemyAssets = [
  'Slime.glb',
  'Rat.glb',
  'Spider.glb',
  'Bat.glb',
  'Snake_angry.glb',
];

for (const asset of requiredEnemyAssets) {
  const target = path.join(root, 'public/assets/imported/enemies', asset);
  if (!fs.existsSync(target) || fs.statSync(target).size < 512) {
    failures.push(`required enemy model is missing or truncated: ${asset}`);
  }
  if (!enemyLoader.includes(asset)) {
    failures.push(`enemy preload manifest does not include: ${asset}`);
  }
}

const requiredLoaderContracts = [
  ['requestedImportedTypes(enemyTypes)', 'enemy preload does not filter the requested room types'],
  ['types.map(preloadLocalEnemyAsset)', 'requested local enemy files are not loaded before model creation'],
  ['const bytes = await response.arrayBuffer();', 'enemy files are not fully read before the room is released'],
  ['throw new Error(`Dedicated enemy model did not become ready:', 'dedicated creature failures still allow a generic model'],
  ['const enemyPreloadPromises = new Map<string, Promise<void>>();', 'room-specific enemy preload results are not cached'],
  ['enemyPreloadPromises.delete(key);', 'a failed room preload cannot be retried'],
  ["export async function preloadKayKitEnemyVisuals(enemyTypes: readonly Enemy['enemyType'][] = [])", 'enemy preload does not accept room-specific enemy types'],
];
for (const [needle, label] of requiredLoaderContracts) {
  if (!enemyLoader.includes(needle)) failures.push(label);
}

if (enemyLoader.includes('await Promise.all(IMPORTED_ENEMY_TYPES.map(preloadLocalEnemyAsset));')) {
  failures.push('all imported creatures are still loaded before every room');
}
if (enemyLoader.includes('ENEMY_PRELOAD_MAX_BLOCK_MS')) failures.push('old 3.5 second preload escape still exists');
if (enemyLoader.includes('Promise.race([preload')) failures.push('enemy preload can still release the room early');
if (enemyLoader.includes('runtime loading remains available')) failures.push('preload failures are still swallowed');

const requiredCanvasContracts = [
  ['useState<GameState | null>(null)', 'run canvas is still visible before enemy preload finishes'],
  ['currentRoomEnemyTypes(gameState)', 'current room enemy types are not derived from the actual encounter'],
  ['preloadKayKitEnemyVisuals(requiredEnemyTypes)', 'room staging does not wait for its required enemy models'],
  ['plannedRoomEnemyTypes(nextFloor)', 'the next room does not preload only its planned enemy models'],
  ['retrying before reveal', 'room staging does not retry before revealing the run'],
  ['renderState ? <GameCanvasKayKit3D', '3D run mounts before staging succeeds'],
];
for (const [needle, label] of requiredCanvasContracts) {
  if (!canvas.includes(needle)) failures.push(label);
}

if (canvas.includes('preloadKayKitEnemyVisuals(),')) {
  failures.push('room staging still requests the complete enemy library without a room type list');
}
if (canvas.includes("detail: { key: liveRoomKey, floor: latest.floor, failed: true }")) {
  failures.push('failed room staging can still reveal unfinished enemies');
}

const requiredBuildContracts = [
  ["name: 'dungeon-veil-dedicated-enemy-models-only'", 'the production build does not install the dedicated-model-only transform'],
  [".replace(safetyNeedle, '        const requiresPermanentSafety = false;')", 'permanent generic safety bodies are still enabled in production'],
  ['.replace(ENEMY_FALLBACK_BLOCK, ENEMY_DEDICATED_MODEL_BLOCK)', 'colored enemy loading bodies are still emitted by the production build'],
  ["throw new Error('Enemy fallback creation contract changed; refusing to build generic enemy bodies')", 'the build does not fail closed when fallback code changes'],
  ["console.error('KayKit dedicated enemy visual failed after room preload', error);", 'runtime failures still describe or preserve a generic enemy body'],
];
for (const [needle, label] of requiredBuildContracts) {
  if (!vite.includes(needle)) failures.push(label);
}

if (failures.length) {
  console.error('Complete enemy loading validation failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Room-scoped enemy preload, hidden-until-ready reveal and dedicated-model-only build verified.');
