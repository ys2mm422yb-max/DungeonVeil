import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Protect the unchanged solo combat core byte-for-byte. Retention is validated
// semantically below because Block 21 intentionally adds family Codex state and
// counters without changing solo or Duo combat scaling.
const protectedSoloFiles = new Map([
  ['../src/game/equipmentCollection.ts', '15a264a750fed631a71d9de0ef5406342c5c03c3'],
  ['../src/game/runBalanceLegacy.ts', '4f4c4aa6ee9186c7a637a44c3e9aff122680eb31'],
  ['../src/game/runEffectSystems.ts', 'fb2059b66558b1d27810cf533172adf492e05d49'],
]);

function gitBlobSha(content) {
  const header = Buffer.from(`blob ${content.length}\0`);
  return createHash('sha1').update(header).update(content).digest('hex');
}

const failures = [];
for (const [relative, expected] of protectedSoloFiles) {
  const content = await readFile(new URL(relative, import.meta.url));
  const actual = gitBlobSha(content);
  if (actual !== expected) failures.push(`${relative.replace('../src/', 'src/')} changed (${actual}, expected ${expected})`);
}

const [runBalance, runMode, retention, familyRuntime, persistentSave] = await Promise.all([
  readFile(new URL('../src/game/runBalance.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/coopRunMode.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/runRetention.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/enemyFamilyRuntime.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/persistentSaveBundle.ts', import.meta.url), 'utf8'),
]);
const contractChecks = [
  [runBalance.includes("from './runBalanceLegacy'") && runBalance.includes('updateLegacyRunBalance(engine, state);'), 'active run balance no longer delegates to the protected solo balance implementation'],
  [runBalance.includes('updateShatteredObservatoryMechanics(engine);'), 'Observatory mechanics are not isolated after the protected balance update'],
  [runMode.includes("export type RunMode = 'solo' | 'duo'"), 'run modes are not explicitly separated'],
  [runMode.includes("SOLO_BALANCE_POLICY = 'immutable'"), 'solo balance is not marked immutable'],
  [runMode.includes('COOP_PLAYER_LIMIT = 2'), 'duo player limit is not fixed at two'],
  [runMode.includes('mode: typeof SOLO_RUN_MODE') && runMode.includes('mode: typeof DUO_RUN_MODE'), 'solo and duo contexts are not discriminated'],
  [retention.includes('enemyKills: Partial<Record<EnemyFamilyId, number>>') && retention.includes('profile.codex.enemyKills[familyId]'), 'family Codex counters are not isolated inside retention state'],
  [retention.includes('bindCanonicalEnemyFamilies(engine)') && familyRuntime.includes('bindCanonicalEnemyFamilies'), 'family runtime binding is missing from the shared room-entry path'],
  [!retention.includes('COOP_') && !retention.includes('DUO_') && !retention.includes('coopRunMode'), 'retention now depends on Duo-mode balance state'],
  [persistentSave.includes("'dungeon-veil-retention-v2'"), 'family Codex retention is no longer included in the existing cloud-save bundle'],
];
for (const [ok, message] of contractChecks) if (!ok) failures.push(message);

if (failures.length) {
  console.error(`Co-op solo-balance isolation failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Co-op isolation passed: ${protectedSoloFiles.size} immutable solo-core files match their approved hashes; family Codex retention and runtime binding remain mode-neutral and cloud-persisted.`);
