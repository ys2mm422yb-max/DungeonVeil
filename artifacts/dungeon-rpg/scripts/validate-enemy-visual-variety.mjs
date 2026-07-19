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
  [visual.includes("['slime', 'goblin', 'spider', 'vampire', 'demon']") && visual.includes('preloadRealCreatureModels'), 'the complete set of distinct real creature models is no longer registered'],
  [visual.includes('requestedImportedTypes(requestedTypes)') && visual.includes('loadEnemyAssetsWithRetries(requestedTypes, importedTypes)') && visual.includes('preloadRealCreatureModels(importedTypes)'), 'creature loading is not scoped to requested room types'],
  [visual.includes('types.map(preloadLocalEnemyAsset)') && visual.includes('types.map(loadImportedPrototype)'), 'requested models are not fully fetched and parsed'],
  [!visual.includes('IMPORTED_ENEMY_TYPES.map(preloadLocalEnemyAsset)'), 'all five creatures are still forced before every room'],
  [visual.includes('createDedicatedImportedVisual') && visual.includes('if (importedEnemyType(enemy.enemyType))') && visual.includes('return createBaseKayKitEnemyVisual(THREE, enemy);'), 'imported creatures do not have a direct construction path separate from humanoid models'],
  [visual.includes("const needsBaseLibrary = enemyTypes.length === 0 || enemyTypes.some(type => !importedEnemyType(type));") && visual.includes('needsBaseLibrary ? preloadBaseKayKitEnemyVisuals() : Promise.resolve()'), 'imported-only rooms still wait for the full humanoid library'],
  [visual.includes('throw new Error(`Dedicated enemy model did not become ready:') && visual.includes('enemyPreloadPromises.delete(key)') && visual.includes('importedPrototypePromises.delete(type)'), 'dedicated model failures are not retried safely'],
  [visual.includes('prepareImportedModel(scene)') && visual.includes('node.frustumCulled = false;'), 'direct imported creatures are not prepared for reliable mobile rendering'],
  [!visual.includes('EnemyMageIdentity_') && !visual.includes('robeMaterial'), 'the fake mage costume overlay still exists'],
  [regional.includes("const realMage = (): EnemyVisualProfile => adventurer('mage', '/characters/gltf/mage.glb')"), 'the exact real Mage.glb profile is missing'],
  [regional.includes("if (room === 20) return { ...realMage(), bossVariant: 'veil-necromancer' }"), 'room 20 caster does not use Mage.glb'],
  [!regional.includes("skeleton('mage'") && regional.includes('return index % 2 === 0 ? realMage()'), 'humanoid mage roles can still select the wrong body'],
  [manifest.includes('Characters/gltf/Mage.glb'), 'Mage.glb is missing from the manifest'],
  [baseVisual.includes("slime: { path: '/assets/imported/enemies/Slime.glb'") && baseVisual.includes("goblin: { path: '/assets/imported/enemies/Rat.glb'") && baseVisual.includes("spider: { path: '/assets/imported/enemies/Spider.glb'") && baseVisual.includes("vampire: { path: '/assets/imported/enemies/Bat.glb'") && baseVisual.includes("demon: { path: '/assets/imported/enemies/Snake_angry.glb'"), 'distinct creature asset mapping is incomplete'],
  [regional.includes('attackRange: 178, attackDelay: 1040, moveScale: 0.9') && regional.includes('attackRange: 190, attackDelay: 820, moveScale: 1.12'), 'boss combat values changed during the visual fix'],
  [encounters.includes('getChapterEncounterPlan') && encounters.includes('ensureLateRoomRolePressure') && encounters.includes("plan[0] = 'golem'"), 'audited V4 chapter or late-room encounter contract is missing'],
];
for (const [ok, message] of checks) if (!ok) failures.push(message);

if (failures.length) {
  console.error(`Enemy visual variety audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Enemy visual variety audit passed: distinct GLBs use a direct imported path, imported-only rooms skip the humanoid library, and V4 encounter changes preserve the protected engine and visual base.');
