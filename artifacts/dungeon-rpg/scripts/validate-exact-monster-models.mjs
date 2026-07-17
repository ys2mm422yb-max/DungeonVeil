import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canvas = fs.readFileSync(path.join(root, 'src/components/GameCanvasKayKit3D.tsx'), 'utf8');
const enemy = fs.readFileSync(path.join(root, 'src/components/kaykitEnemy3D.ts'), 'utf8');
const base = fs.readFileSync(path.join(root, 'src/components/kaykitEnemyBase3D.ts'), 'utf8');
const loading = fs.readFileSync(path.join(root, 'src/components/GlobalLoadingLayer.tsx'), 'utf8');

for (const forbidden of ['EnemyVisibilityFallback_', 'EnemyVisibilitySafety_', 'enemyFallbacks', 'enemySafetyShells', 'createEnemyFallback', 'createEnemySafetyShell']) {
  if (canvas.includes(forbidden)) throw new Error(`Colored enemy placeholder remains in run renderer: ${forbidden}`);
}
if (!canvas.includes('prepareRoomEnemyVisuals')) throw new Error('Rooms do not prepare their exact enemy visuals');
if (!canvas.includes('Promise.all([room.userData?.ready ?? Promise.resolve(), theme.userData?.ready ?? Promise.resolve(), enemyReady])')) throw new Error('Room reveal does not wait for enemy models');
if (!canvas.includes('fallbackCount: 0')) throw new Error('Enemy diagnostics do not guarantee zero placeholders');
if (!enemy.includes('return null;') || !enemy.includes('retrying before room reveal')) throw new Error('Imported monsters may still return a generic replacement');
if (!base.includes('importedPromises.delete(type)')) throw new Error('Failed imported monster loads are not retryable');
if (!base.includes('libraryPromise = null')) throw new Error('Failed enemy library loads are not retryable');
if (!loading.includes('if (!next.critical)')) throw new Error('Critical monster loading can still be hidden by the room timeout');

console.log('Exact monster models verified: room-gated loading, retryable assets and zero colored placeholders.');
