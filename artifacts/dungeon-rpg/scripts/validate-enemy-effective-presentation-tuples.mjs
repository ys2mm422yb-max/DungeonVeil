import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [registry, regional] = await Promise.all([
  read('../src/game/enemyRegistry.ts'),
  read('../src/game/enemyRegionalIdentity.ts'),
]);

const failures = [];
const runtimeTypeByFamily = new Map(
  [...registry.matchAll(/family\(\s*'([^']+)'\s*,\s*'([^']+)'/g)].map(match => [match[1], match[2]]),
);

const block = regional.match(/export const ENEMY_FAMILY_PRESENTATIONS = \{([\s\S]*?)\n\} satisfies Record<NormalEnemyFamilyId, EnemyVisualProfile>;/)?.[1] ?? '';
if (!block) failures.push('canonical ENEMY_FAMILY_PRESENTATIONS block was not found');

const sourceLines = block
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('//'));

const entries = [];
for (const line of sourceLines) {
  let match = line.match(/^(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*familyCreature\('([^']+)',\s*'([^']+)',\s*'([^']+)'(?:,\s*([0-9.]+))?\),?$/);
  if (match) {
    const familyId = match[1] || match[2];
    entries.push({
      familyId,
      helperFamilyId: match[3],
      tuple: {
        visualFamily: 'creature',
        bodyModel: `imported:${runtimeTypeByFamily.get(familyId) ?? 'missing-runtime-type'}`,
        role: match[4],
        attackProfile: match[5],
        weaponProfile: 'natural',
        scaleMultiplier: Number(match[6] ?? 1),
      },
    });
    continue;
  }

  match = line.match(/^(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*familySkeleton\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'(?:,\s*([0-9.]+))?\),?$/);
  if (match) {
    const familyId = match[1] || match[2];
    entries.push({
      familyId,
      helperFamilyId: match[3],
      tuple: {
        visualFamily: 'skeleton',
        bodyModel: `skeleton-extra:${match[5]}`,
        role: match[4],
        attackProfile: match[6],
        weaponProfile: match[7],
        scaleMultiplier: Number(match[8] ?? 1),
      },
    });
    continue;
  }

  match = line.match(/^(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*familyAdventurer\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'(?:,\s*([0-9.]+))?\),?$/);
  if (match) {
    const familyId = match[1] || match[2];
    entries.push({
      familyId,
      helperFamilyId: match[3],
      tuple: {
        visualFamily: 'adventurer',
        bodyModel: `adventurer:${match[5]}`,
        role: match[4],
        attackProfile: match[6],
        weaponProfile: match[7],
        scaleMultiplier: Number(match[8] ?? 1),
      },
    });
    continue;
  }

  match = line.match(/^(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*familyRealMage\('([^']+)',\s*'([^']+)'(?:,\s*([0-9.]+))?\),?$/);
  if (match) {
    const familyId = match[1] || match[2];
    entries.push({
      familyId,
      helperFamilyId: match[3],
      tuple: {
        visualFamily: 'adventurer',
        bodyModel: 'adventurer:mage',
        role: 'mage',
        attackProfile: match[4],
        weaponProfile: 'staff',
        scaleMultiplier: Number(match[5] ?? 1),
      },
    });
    continue;
  }

  failures.push(`unparsed family presentation line: ${line}`);
}

const expectedFamilyIds = [...runtimeTypeByFamily.keys()];
const entryByFamily = new Map(entries.map(entry => [entry.familyId, entry]));
if (entries.length !== expectedFamilyIds.length) failures.push(`parsed ${entries.length} effective presentation tuples for ${expectedFamilyIds.length} normal families`);
if (entryByFamily.size !== entries.length) failures.push('effective presentation tuple audit contains duplicate family ids');

for (const familyId of expectedFamilyIds) {
  const entry = entryByFamily.get(familyId);
  if (!entry) failures.push(`${familyId} has no effective presentation tuple`);
  else if (entry.helperFamilyId !== familyId) failures.push(`${familyId} is bound to helper family ${entry.helperFamilyId}`);
}

const tupleOwners = new Map();
for (const entry of entries) {
  const tupleKey = JSON.stringify(entry.tuple);
  const owners = tupleOwners.get(tupleKey) ?? [];
  owners.push(entry.familyId);
  tupleOwners.set(tupleKey, owners);
}

for (const [tupleKey, owners] of tupleOwners) {
  if (owners.length > 1) failures.push(`effective runtime presentation is duplicated by ${owners.join(', ')}: ${tupleKey}`);
}

for (const entry of entries) {
  if ('familyId' in entry.tuple || 'presentationKey' in entry.tuple || 'name' in entry.tuple || 'tint' in entry.tuple) {
    failures.push(`${entry.familyId} effective tuple uses a forbidden identity-only field`);
  }
}
if (regional.includes('tint') && sourceLines.some(line => /family(?:Creature|Skeleton|Adventurer|RealMage)\([^)]*tint/i.test(line))) {
  failures.push('family uniqueness depends on tint, which is not an accepted standalone identity dimension');
}

const requiredDimensions = ['visualFamily', 'bodyModel', 'role', 'attackProfile', 'weaponProfile', 'scaleMultiplier'];
for (const entry of entries) {
  for (const dimension of requiredDimensions) {
    if (entry.tuple[dimension] === undefined || entry.tuple[dimension] === '') failures.push(`${entry.familyId} is missing tuple dimension ${dimension}`);
  }
}

if (failures.length) {
  console.error(`Effective enemy presentation tuple audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

const report = entries.map(entry => ({ familyId: entry.familyId, ...entry.tuple }));
console.log(JSON.stringify({ familyCount: entries.length, uniqueTupleCount: tupleOwners.size, presentations: report }, null, 2));
console.log(`Effective enemy presentation tuple audit passed: ${entries.length} canonical families resolve to ${tupleOwners.size} unique body/equipment/motion tuples without using names, presentation keys or tint as identity.`);
