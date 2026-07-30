import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const readBuffer = relative => readFile(new URL(relative, import.meta.url));

const [registry, visual, baseVisual, regional, encounters, runEngine, codex, retention, persistentSave, manifest] = await Promise.all([
  read('../src/game/enemyRegistry.ts'),
  read('../src/components/kaykitEnemy3D.ts'),
  read('../src/components/kaykitEnemyBase3D.ts'),
  read('../src/game/enemyRegionalIdentity.ts'),
  read('../src/game/encounterPlan.ts'),
  read('../src/game/runEngine.ts'),
  read('../src/game/codexDefinitions.ts'),
  read('../src/game/runRetention.ts'),
  read('../src/game/persistentSaveBundle.ts'),
  read('../public/assets/kaykit/manifest.json'),
]);

const failures = [];
const familyMatches = [...registry.matchAll(/family\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'[\s\S]*?spawn\((\d+)\s*,\s*(\d+)/g)];
const families = familyMatches.map(match => ({ id: match[1], runtimeType: match[2], silhouette: match[3], minRoom: Number(match[4]), maxRoom: Number(match[5]) }));
const familyIds = families.map(family => family.id);
const uniqueFamilyIds = new Set(familyIds);
const uniqueSilhouettes = new Set(families.map(family => family.silhouette));

if (families.length < 24) failures.push(`only ${families.length} normal enemy families are registered; expected at least 24`);
if (uniqueFamilyIds.size !== families.length) failures.push('enemy family ids are not unique');
if (uniqueSilhouettes.size < 24) failures.push(`only ${uniqueSilhouettes.size} unique silhouette contracts are registered; expected at least 24`);
if (!registry.includes("boss: {") || !registry.includes("id: 'boss'")) failures.push('canonical boss family is missing');
if (!registry.includes('provenance:')) failures.push('registry provenance metadata is missing');

for (const family of families) {
  if (family.minRoom < 1 || family.maxRoom > 100 || family.maxRoom < family.minRoom) failures.push(`${family.id} has an invalid room range ${family.minRoom}-${family.maxRoom}`);
  const familyStart = registry.indexOf(`family('${family.id}'`);
  const familyEnd = registry.indexOf('\n  ', familyStart + 20);
  const fragment = registry.slice(familyStart, familyEnd > familyStart ? familyEnd : familyStart + 1_800);
  if (!fragment.includes("text('") && !fragment.includes('text("')) failures.push(`${family.id} lacks bilingual text`);
}

for (let start = 1; start <= 91; start += 10) {
  const end = start + 9;
  const eligible = families.filter(family => family.minRoom <= end && family.maxRoom >= start);
  if (eligible.length < 3) failures.push(`room band ${start}-${end} has only ${eligible.length} eligible families`);
}

for (const required of ['getEncounterFamilyPlan', 'deterministicEnemyFamilyForRoom', 'enemyFamilyForSpawn', 'runtimeEnemyTypeForFamily']) {
  if (!encounters.includes(required)) failures.push(`encounter plan is missing ${required}`);
}
if (!codex.includes('NORMAL_ENEMY_FAMILY_IDS.map')) failures.push('beast Codex is not derived from the canonical registry');
if (!codex.includes('familyId: id') || !codex.includes('mechanicDe')) failures.push('beast Codex lacks family identity or mechanic copy');
if (!retention.includes('enemyKills: Partial<Record<EnemyFamilyId, number>>')) failures.push('family kill counters are not persisted');
if (!retention.includes('getEncounterFamilyPlan(engine.state.floor)')) failures.push('room discoveries are not driven by the family plan');
if (!retention.includes('profile.codex.enemyKills[familyId]')) failures.push('enemy deaths do not increment family counters');
if (!persistentSave.includes("'dungeon-veil-retention-v2'")) failures.push('retention/Codex state is not included in cloud save bundles');
if (!regional.includes('enemyFamilyForSpawn(safeRoom, index, type)')) failures.push('visible enemy roles are not resolved from family identity');
if (!regional.includes('definition.role')) failures.push('family combat roles do not drive visual roles');

const runtimeTypes = ['slime', 'goblin', 'skeleton', 'orc', 'spider', 'vampire', 'demon', 'golem'];
for (const type of runtimeTypes) {
  if (!registry.includes(`'${type}'`)) failures.push(`runtime type ${type} is missing from the registry`);
  if (!encounters.includes(`'${type}'`)) failures.push(`authored encounter compatibility no longer uses ${type}`);
}

const shippedModels = [
  ['slime', '../public/assets/imported/enemies/Slime.glb'],
  ['goblin-rat', '../public/assets/imported/enemies/Rat.glb'],
  ['spider', '../public/assets/imported/enemies/Spider.glb'],
  ['vampire-bat', '../public/assets/imported/enemies/Bat.glb'],
  ['demon-snake', '../public/assets/imported/enemies/Snake_angry.glb'],
  ['real-mage', '../public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb'],
  ['skeleton-necromancer', '../public/assets/kaykit/extras/KayKit_Skeletons_1.1_EXTRA/characters/gltf/Necromancer.glb'],
  ['skeleton-golem', '../public/assets/kaykit/extras/KayKit_Skeletons_1.1_EXTRA/characters/gltf/Skeleton_Golem.glb'],
];
for (const [name, relative] of shippedModels) {
  const model = await readBuffer(relative);
  if (model.length < 1024) failures.push(`${name} model is missing or unexpectedly small`);
  if (model.subarray(0, 4).toString('ascii') !== 'glTF') failures.push(`${name} is not a binary GLB model`);
}

const checks = [
  [visual.includes("['slime', 'goblin', 'spider', 'vampire', 'demon']") && visual.includes('preloadRealCreatureModels'), 'distinct imported creature models are no longer registered'],
  [visual.includes('requestedImportedTypes(requestedTypes)') && visual.includes('loadEnemyAssetsWithRetries(requestedTypes, importedTypes)'), 'creature loading is not scoped to requested room types'],
  [visual.includes('createDedicatedImportedVisual') && visual.includes('return createBaseKayKitEnemyVisual(THREE, enemy);'), 'imported and humanoid construction paths are no longer separated'],
  [regional.includes("const realMage = (): EnemyVisualProfile => adventurer('mage', '/characters/gltf/mage.glb')"), 'the exact real Mage.glb profile is missing'],
  [regional.includes("extraSkeleton('mage', 'necromancer')") && regional.includes("extraSkeleton('warrior', 'golem')"), 'selected Skeleton Extra roles are missing'],
  [manifest.includes('Characters/gltf/Mage.glb'), 'Mage.glb is missing from the manifest'],
  [baseVisual.includes("slime: { path: '/assets/imported/enemies/Slime.glb'") && baseVisual.includes("demon: { path: '/assets/imported/enemies/Snake_angry.glb'"), 'distinct creature asset mapping is incomplete'],
  [baseVisual.includes('loadKayKitEnemyBow') && baseVisual.includes('attachBowToRanger'), 'ranger visual roles no longer use the dedicated bow'],
  [runEngine.includes('getEncounterPlan(room)'), 'runtime no longer consumes the encounter plan'],
];
for (const [ok, message] of checks) if (!ok) failures.push(message);

if (failures.length) {
  console.error(`Enemy registry and visual variety audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Enemy registry audit passed: ${families.length} normal families, ${uniqueSilhouettes.size} silhouettes, rooms 1-100, Codex counters, persistence and licensed presentation paths are verified semantically.`);
