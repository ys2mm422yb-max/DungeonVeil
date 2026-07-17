import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const readBuffer = relative => readFile(new URL(relative, import.meta.url));

function gitBlobSha(content) {
  const header = Buffer.from(`blob ${content.length}\0`);
  return createHash('sha1').update(header).update(content).digest('hex');
}

const [visual, baseVisual, regional, encounters, runEngine, manifest] = await Promise.all([
  read('../src/components/kaykitEnemy3D.ts'),
  read('../src/components/kaykitEnemyBase3D.ts'),
  read('../src/game/enemyRegionalIdentity.ts'),
  read('../src/game/encounterPlan.ts'),
  read('../src/game/runEngine.ts'),
  read('../public/assets/kaykit/manifest.json'),
]);

const protectedFiles = new Map([
  ['../src/game/runEngine.ts', '064d97fc6a3e10358aeabcc765f95bf980d68f60'],
  ['../src/game/encounterPlan.ts', '63066775a9db406f5693b8e998b7864487e3c62a'],
  ['../src/components/kaykitEnemyBase3D.ts', 'ad3dd5041eaf56bcefe0e4385b338c1079171ce5'],
]);

const failures = [];
for (const [relative, expected] of protectedFiles) {
  const actual = gitBlobSha(await readBuffer(relative));
  if (actual !== expected) failures.push(`${relative.replace('../', '')} changed (${actual}, expected ${expected})`);
}

const enemyTypes = ['slime', 'goblin', 'skeleton', 'orc', 'spider', 'vampire', 'demon', 'golem'];
for (const type of enemyTypes) {
  if (!runEngine.includes(`${type}: {`)) failures.push(`enemy stats missing for ${type}`);
  if (!encounters.includes(`'${type}'`)) failures.push(`encounter plans no longer use ${type}`);
}

const checks = [
  [visual.includes("new Set<Enemy['enemyType']>(['slime', 'goblin', 'spider', 'vampire', 'demon'])"), 'imported creature set is incomplete'],
  [visual.includes('IMPORTED_VISUAL_RETRY_DELAYS_MS') && visual.includes('if (visual?.imported) break'), 'slow-device imported model retry is missing'],
  [visual.includes('createReliableEnemyVisual') && visual.includes('humanoid fallback'), 'visual creation can still permanently collapse creatures into humanoid fallbacks'],
  [visual.includes('EnemyMageIdentity_') && visual.includes("requestedVisualRole(enemy) !== 'mage'") && visual.includes("visual.role = 'mage'"), 'mage identity is not enforced'],
  [regional.includes("skeleton('mage', 'mage')") && regional.includes("adventurer('mage', 'mage')"), 'regional mage profiles are missing'],
  [manifest.includes('Characters/gltf/Mage.glb'), 'Mage.glb is missing from the shipped manifest'],
  [baseVisual.includes("slime: { path: '/assets/imported/enemies/Slime.glb'") && baseVisual.includes("goblin: { path: '/assets/imported/enemies/Rat.glb'") && baseVisual.includes("spider: { path: '/assets/imported/enemies/Spider.glb'") && baseVisual.includes("vampire: { path: '/assets/imported/enemies/Bat.glb'") && baseVisual.includes("demon: { path: '/assets/imported/enemies/Snake_angry.glb'"), 'distinct imported creature assets are incomplete'],
];
for (const [ok, message] of checks) if (!ok) failures.push(message);

if (failures.length) {
  console.error(`Enemy visual variety audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Enemy visual variety audit passed: eight normal enemy types remain in the unchanged solo encounter system, imported creatures retry on slow devices, and humanoid mages have a strict visual identity.');
