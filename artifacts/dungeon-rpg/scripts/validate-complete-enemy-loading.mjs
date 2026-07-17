import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];

const enemyLoader = read('src/components/kaykitEnemy3D.ts');
const canvas = read('src/components/GameCanvas.tsx');

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
  ['await Promise.all(IMPORTED_ENEMY_TYPES.map(preloadLocalEnemyAsset));', 'local enemy files are not loaded before model creation'],
  ['const bytes = await response.arrayBuffer();', 'enemy files are not fully read before the room is released'],
  ['throw new Error(`Dedicated enemy model did not become ready:', 'dedicated creature failures still allow a generic model'],
  ['await startEnemyPreload();', 'enemy preload is not a hard wait'],
  ['enemyPreloadPromise = null;', 'a failed preload cannot be retried'],
];
for (const [needle, label] of requiredLoaderContracts) {
  if (!enemyLoader.includes(needle)) failures.push(label);
}

if (enemyLoader.includes('ENEMY_PRELOAD_MAX_BLOCK_MS')) failures.push('old 3.5 second preload escape still exists');
if (enemyLoader.includes('Promise.race([preload')) failures.push('enemy preload can still release the room early');
if (enemyLoader.includes('runtime loading remains available')) failures.push('preload failures are still swallowed');

const requiredCanvasContracts = [
  ['useState<GameState | null>(null)', 'run canvas is still visible before enemy preload finishes'],
  ['preloadKayKitEnemyVisuals(),', 'room staging does not wait for enemy visuals'],
  ['retrying before reveal', 'room staging does not retry before revealing the run'],
  ['renderState ? <GameCanvasKayKit3D', '3D run mounts before staging succeeds'],
];
for (const [needle, label] of requiredCanvasContracts) {
  if (!canvas.includes(needle)) failures.push(label);
}

if (canvas.includes("detail: { key: liveRoomKey, floor: latest.floor, failed: true }")) {
  failures.push('failed room staging can still reveal unfinished enemies');
}

if (failures.length) {
  console.error('Complete enemy loading validation failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Complete enemy preload and hidden-until-ready room gate verified.');
