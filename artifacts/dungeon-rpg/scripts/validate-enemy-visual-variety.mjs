import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const readBuffer = relative => readFile(new URL(relative, import.meta.url));

const [registry, presentationContract, visual, baseVisual, regional, encounters, runEngine, codex, retention, familyRuntime, telegraphs, entities, persistentSave, manifest] = await Promise.all([
  read('../src/game/enemyRegistry.ts'), read('../src/game/enemyPresentationContract.ts'), read('../src/components/kaykitEnemy3D.ts'), read('../src/components/kaykitEnemyBase3D.ts'),
  read('../src/game/enemyRegionalIdentity.ts'), read('../src/game/encounterPlan.ts'), read('../src/game/runEngine.ts'),
  read('../src/game/codexDefinitions.ts'), read('../src/game/runRetention.ts'), read('../src/game/enemyFamilyRuntime.ts'),
  read('../src/game/normalEnemyAttackTelegraphs.ts'), read('../src/game/entities.ts'), read('../src/game/persistentSaveBundle.ts'),
  read('../public/assets/kaykit/manifest.json'),
]);

const failures = [];
const familyMatches = [...registry.matchAll(/family\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'[\s\S]*?spawn\((\d+)\s*,\s*(\d+)/g)];
const families = familyMatches.map(match => ({ id: match[1], runtimeType: match[2], silhouette: match[3], minRoom: Number(match[4]), maxRoom: Number(match[5]) }));
const uniqueFamilyIds = new Set(families.map(family => family.id));
const uniqueSilhouettes = new Set(families.map(family => family.silhouette));
const familyLines = new Map(
  registry.split('\n').filter(line => line.includes(': family(')).map(line => {
    const id = line.match(/family\('([^']+)'/)?.[1] ?? '';
    return [id, line];
  }),
);

if (families.length < 35) failures.push(`only ${families.length} normal enemy families are registered; expected 35`);
if (uniqueFamilyIds.size !== families.length) failures.push('enemy family ids are not unique');
if (uniqueSilhouettes.size < 24) failures.push(`only ${uniqueSilhouettes.size} unique silhouette contracts are registered; expected at least 24`);
if (!registry.includes("boss: {") || !registry.includes("id: 'boss'")) failures.push('canonical boss family is missing');
if (!registry.includes('provenance:')) failures.push('registry provenance metadata is missing');

for (const family of families) {
  if (family.minRoom < 1 || family.maxRoom > 100 || family.maxRoom < family.minRoom) failures.push(`${family.id} has an invalid room range ${family.minRoom}-${family.maxRoom}`);
  const line = familyLines.get(family.id) ?? '';
  const localizedStrings = [...line.matchAll(/'([^']*)'/g)].map(match => match[1]);
  if (localizedStrings.length < 15) failures.push(`${family.id} does not provide the complete DE/EN name, kind, description, mechanic and hint builder arguments`);
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
if (!retention.includes('bindCanonicalEnemyFamilies(engine)')) failures.push('canonical family binding is not executed on room entry');
if (!retention.includes('profile.codex.enemyKills[familyId]')) failures.push('enemy deaths do not increment family counters');
if (!familyRuntime.includes('enemy.enemyFamilyId = familyId') || !familyRuntime.includes('definition.stats.hp') || !familyRuntime.includes('definition.attackPattern')) failures.push('spawned runtime enemies are not bound to family stats and mechanics');
if (!entities.includes('enemyCombatRole?: EnemyCombatRole') || !entities.includes('enemyTelegraph?: EnemyTelegraph')) failures.push('runtime enemies do not carry canonical family metadata');
if (!telegraphs.includes("telegraph === 'line'") || !telegraphs.includes("telegraph === 'cone'") || !telegraphs.includes("telegraph === 'body-flash'")) failures.push('canonical telegraph shapes are not rendered');
if (!persistentSave.includes("'dungeon-veil-retention-v2'")) failures.push('retention/Codex state is not included in cloud save bundles');

const contractBlock = presentationContract.match(/export const ENEMY_PRESENTATION_KEY_BY_FAMILY = \{([\s\S]*?)\n\} as const satisfies Record<EnemyFamilyId, string>;/)?.[1] ?? '';
const contractMatches = [...contractBlock.matchAll(/^\s{2}'([^']+)':\s*'([^']+)',?$/gm)];
const presentationByFamily = new Map(contractMatches.map(match => [match[1], match[2]]));
const allContractKeys = new Set(contractMatches.map(match => match[2]));
const normalPresentationKeys = families.map(family => presentationByFamily.get(family.id)).filter(Boolean);
const presentationKeys = new Set(normalPresentationKeys);

const presentationBlock = regional.match(/export const ENEMY_FAMILY_PRESENTATIONS = \{([\s\S]*?)\n\} satisfies Record<NormalEnemyFamilyId, EnemyVisualProfile>;/)?.[1] ?? '';
const presentationMatches = [...presentationBlock.matchAll(/^\s{2}(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*family(?:Creature|Skeleton|Adventurer|RealMage)\(\s*'([^']+)'/gm)];
const presentations = presentationMatches.map(match => ({
  familyId: match[1] || match[2],
  helperFamilyId: match[3],
  presentationKey: presentationByFamily.get(match[1] || match[2]),
}));
const presentationFamilies = new Set(presentations.map(entry => entry.familyId));

if (!presentationContract.includes("import type { EnemyFamilyId } from './enemyRegistry';")) failures.push('presentation contract is not typed against the canonical family registry');
if (contractMatches.length !== families.length + 1) failures.push(`presentation contract contains ${contractMatches.length} entries for ${families.length + 1} families including boss`);
if (presentationByFamily.size !== contractMatches.length) failures.push('presentation contract contains duplicate family ids');
if (allContractKeys.size !== contractMatches.length) failures.push(`presentation contract keys are not unique: ${allContractKeys.size}/${contractMatches.length}`);
if (presentationByFamily.get('boss') !== 'boss-family') failures.push('boss family lacks a canonical presentation identity');

for (const family of families) {
  const presentationKey = presentationByFamily.get(family.id);
  if (!presentationKey) failures.push(`${family.id} has no canonical presentation key`);
  if (presentationKey === family.runtimeType) failures.push(`${family.id} still falls back to runtime type ${family.runtimeType} as its presentation key`);
}

if (!registry.includes('presentationKey: EnemyPresentationKey;')) failures.push('EnemyFamilyDefinition.presentationKey is not separated from EnemyType');
if (registry.includes('presentationKey: runtimeType')) failures.push('registry still assigns presentation identity from runtimeType');
if (!registry.includes('presentationKey: enemyPresentationKeyForFamily(id)')) failures.push('normal registry families do not consume the canonical presentation contract');
if (!registry.includes("presentationKey: enemyPresentationKeyForFamily('boss')")) failures.push('boss registry family does not consume the canonical presentation contract');
if (!regional.includes("from './enemyPresentationContract'")) failures.push('renderer does not import the canonical presentation contract');
if (!regional.includes('enemyPresentationKeyForFamily(familyId)')) failures.push('renderer family builders do not resolve canonical presentation identity');

if (!regional.includes('ENEMY_FAMILY_PRESENTATIONS')) failures.push('canonical family presentation matrix is missing');
if (presentations.length !== families.length) failures.push(`presentation matrix contains ${presentations.length} entries for ${families.length} normal families`);
for (const entry of presentations) {
  if (entry.familyId !== entry.helperFamilyId) failures.push(`${entry.familyId} presentation helper is incorrectly bound to ${entry.helperFamilyId}`);
}
for (const family of families) {
  if (!presentationFamilies.has(family.id)) failures.push(`${family.id} has no explicit visual presentation profile`);
}
if (presentationKeys.size !== presentations.length) failures.push(`presentation keys are not unique: ${presentationKeys.size}/${presentations.length}`);
if (presentationKeys.size < 30) failures.push(`only ${presentationKeys.size} distinct presentation keys are registered; expected at least 30`);
if (/^\s{2}(?:'[^']+'|[a-z][a-z0-9-]*):\s*(?:creature|skeleton|adventurer|realMage)\(/m.test(presentationBlock)) failures.push('family matrix duplicates presentation-key literals instead of using the canonical contract');
if (!regional.includes('explicitFamilyId ?? enemyFamilyForSpawn')) failures.push('visual resolution does not prefer explicit canonical family identity');
if (regional.includes('if (safeRoom <= 10)') || regional.includes('function lateRegistryVisual')) failures.push('legacy room/type visual branching still bypasses the family presentation matrix');

for (const role of ['minion', 'rogue', 'mage', 'warrior', 'ranger', 'barbarian', 'knight']) {
  if (!presentationBlock.includes(`'${role}'`)) failures.push(`visual role ${role} is not represented in the family matrix`);
}
for (const attack of ['contact', 'lunge', 'projectile', 'slam', 'web', 'drain', 'fire', 'quake', 'burst', 'summon', 'tide', 'beam']) {
  if (!presentationBlock.includes(`'${attack}'`)) failures.push(`attack presentation ${attack} is missing from the family matrix`);
}
for (const weapon of ['natural', 'single-blade', 'dual-blade', 'bow', 'staff', 'axe-shield', 'heavy-axe']) {
  if (!regional.includes(`'${weapon}'`)) failures.push(`weapon presentation ${weapon} is not declared`);
}

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
  ['skeleton-mage', '../public/assets/kaykit/extras/KayKit_Skeletons_1.1_EXTRA/characters/gltf/Skeleton_Mage.glb'],
  ['skeleton-minion', '../public/assets/kaykit/extras/KayKit_Skeletons_1.1_EXTRA/characters/gltf/Skeleton_Minion.glb'],
  ['skeleton-rogue', '../public/assets/kaykit/extras/KayKit_Skeletons_1.1_EXTRA/characters/gltf/Skeleton_Rogue.glb'],
  ['skeleton-warrior', '../public/assets/kaykit/extras/KayKit_Skeletons_1.1_EXTRA/characters/gltf/Skeleton_Warrior.glb'],
];
for (const [name, relative] of shippedModels) {
  const model = await readBuffer(relative);
  if (model.length < 1024) failures.push(`${name} model is missing or unexpectedly small`);
  if (model.subarray(0, 4).toString('ascii') !== 'glTF') failures.push(`${name} is not a binary GLB model`);
}

const checks = [
  [visual.includes("['slime', 'goblin', 'spider', 'vampire', 'demon']") && visual.includes('preloadRealCreatureModels'), 'distinct imported creature models are no longer registered'],
  [visual.includes('const profile = requestedVisualProfile(enemy)') && visual.includes('importedEnemyType(enemy.enemyType) && profile.useImported'), 'imported creatures still bypass canonical family presentation profiles'],
  [visual.includes('enemy.enemyFamilyId') && visual.includes('presentationKey: profile.presentationKey') && visual.includes('weaponProfile: profile.weaponProfile'), 'runtime visual diagnostics do not expose family presentation identity'],
  [visual.includes('enemyFamilyIds.some(familyId => {') && visual.includes('!enemyVisualProfile(1, runtimeType, 0, familyId).useImported') && !visual.includes('const needsBaseLibrary = true'), 'humanoid family overrides are not included in deterministic preload'],
  [visual.includes('createDedicatedImportedVisual') && visual.includes('return createBaseKayKitEnemyVisual(THREE, enemy);'), 'imported and humanoid construction paths are no longer separated'],
  [regional.includes("modelToken: `${SKELETON_EXTRA_ROOT}/${SKELETON_EXTRA_MODEL[model]}.glb`"), 'specialized Skeleton Extra model selection is missing'],
  [manifest.includes('Characters/gltf/Mage.glb'), 'Mage.glb is missing from the manifest'],
  [baseVisual.includes("slime: { path: '/assets/imported/enemies/Slime.glb'") && baseVisual.includes("demon: { path: '/assets/imported/enemies/Snake_angry.glb'"), 'distinct creature asset mapping is incomplete'],
  [baseVisual.includes('loadKayKitEnemyBow') && baseVisual.includes('attachBowToRanger'), 'ranger visual roles no longer use the dedicated bow'],
  [baseVisual.includes("role === 'rogue'") && baseVisual.includes("role === 'barbarian'") && baseVisual.includes("role === 'mage'"), 'role-specific attack animation selection is incomplete'],
  [runEngine.includes('getEncounterPlan(room)'), 'runtime no longer consumes the encounter plan'],
];
for (const [ok, message] of checks) if (!ok) failures.push(message);

if (failures.length) {
  console.error(`Enemy registry and visual variety audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log(`Enemy registry audit passed: ${families.length} normal families, ${presentationKeys.size} unique presentation keys, ${uniqueSilhouettes.size} silhouette contracts, all combat roles and attack profiles, rooms 1-100, Codex persistence and licensed runtime models are verified.`);
