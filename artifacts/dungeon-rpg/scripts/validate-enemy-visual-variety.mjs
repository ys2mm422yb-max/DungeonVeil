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

const shippedModels = [
  ['slime', '../public/assets/imported/enemies/Slime.glb'],
  ['goblin-rat', '../public/assets/imported/enemies/Rat.glb'],
  ['spider', '../public/assets/imported/enemies/Spider.glb'],
  ['vampire-bat', '../public/assets/imported/enemies/Bat.glb'],
  ['demon-snake', '../public/assets/imported/enemies/Snake_angry.glb'],
  ['real-mage', '../public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb'],
];
for (const [name, relative] of shippedModels) {
  const model = await readBuffer(relative);
  if (model.length < 1024) failures.push(`${name} model is missing or unexpectedly small`);
  if (model.subarray(0, 4).toString('ascii') !== 'glTF') failures.push(`${name} is not a binary GLB model`);
}

const checks = [
  [visual.includes("['slime', 'goblin', 'spider', 'vampire', 'demon']") && visual.includes('preloadRealCreatureModels'), 'all five real creature models are not preloaded before the menu'],
  [visual.includes('IMPORTED_VISUAL_MAX_WAIT_MS = 20_000') && visual.includes('if (visual?.imported) return visual'), 'real creature loading can still permanently settle on a humanoid fallback'],
  [visual.includes('await preloadRealCreatureModels();') && visual.includes('createReliableEnemyVisual(THREE, preloadEnemy(type, index))'), 'boot preload does not resolve every real creature model'],
  [!visual.includes('EnemyMageIdentity_') && !visual.includes('ConeGeometry') && !visual.includes('robeMaterial'), 'the fake mage costume overlay still exists'],
  [regional.includes("const realMage = (): EnemyVisualProfile => adventurer('mage', '/characters/gltf/mage.glb')"), 'the exact real Mage.glb profile is missing'],
  [regional.includes("if (room === 20) return { ...realMage(), bossVariant: 'veil-necromancer' }"), 'room 20 caster does not use the real Mage.glb character'],
  [!regional.includes("skeleton('mage'") && regional.includes('return index % 2 === 0 ? realMage()'), 'humanoid mage roles can still select a skeleton or warrior body'],
  [manifest.includes('Characters/gltf/Mage.glb'), 'Mage.glb is missing from the shipped manifest'],
  [baseVisual.includes("slime: { path: '/assets/imported/enemies/Slime.glb'") && baseVisual.includes("goblin: { path: '/assets/imported/enemies/Rat.glb'") && baseVisual.includes("spider: { path: '/assets/imported/enemies/Spider.glb'") && baseVisual.includes("vampire: { path: '/assets/imported/enemies/Bat.glb'") && baseVisual.includes("demon: { path: '/assets/imported/enemies/Snake_angry.glb'"), 'distinct imported creature asset mapping is incomplete'],
  [regional.includes('attackRange: 178, attackDelay: 1040, moveScale: 0.9') && regional.includes('attackRange: 190, attackDelay: 820, moveScale: 1.12'), 'boss combat balance values changed during the visual repair'],
];
for (const [ok, message] of checks) if (!ok) failures.push(message);

if (failures.length) {
  console.error(`Enemy visual variety audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Enemy visual variety audit passed: all real creature GLBs preload before play, every humanoid mage uses the actual Mage.glb character, and solo encounters and balance remain unchanged.');
