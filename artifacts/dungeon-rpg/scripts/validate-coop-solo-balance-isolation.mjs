import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const protectedSoloFiles = new Map([
  ['../src/game/equipmentChapterGates.ts', 'e49bc8eb1b177b8737116f4325c0970862b5450e'],
  ['../src/game/equipmentTargeting.ts', 'd992de5dda24fc6c4536be0d9a8213115ad7be7d'],
  ['../src/game/equipmentCollection.ts', '15a264a750fed631a71d9de0ef5406342c5c03c3'],
  ['../src/game/equipmentRuntimeBalance.ts', 'd3305bb8ec036000a7b03c095fb0ef49eab6c883'],
  ['../src/game/veilRelics.ts', '564905c8b63c75c3faebd1f962297cec0875c466'],
  ['../src/game/runRetention.ts', '366aa7c4600c1f56daa61ecfdd20912d7ac5c2aa'],
  ['../src/game/runBalance.ts', 'fcd61f6e0061b03d8343f6a2d86459336b053182'],
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

const runMode = await readFile(new URL('../src/game/coopRunMode.ts', import.meta.url), 'utf8');
const contractChecks = [
  [runMode.includes("export type RunMode = 'solo' | 'duo'"), 'run modes are not explicitly separated'],
  [runMode.includes("SOLO_BALANCE_POLICY = 'immutable'"), 'solo balance is not marked immutable'],
  [runMode.includes('COOP_PLAYER_LIMIT = 2'), 'duo player limit is not fixed at two'],
  [runMode.includes("mode: 'solo'") && runMode.includes("mode: 'duo'"), 'solo and duo contexts are not discriminated'],
];
for (const [ok, message] of contractChecks) if (!ok) failures.push(message);

if (failures.length) {
  console.error(`Co-op solo-balance isolation failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Co-op isolation passed: ${protectedSoloFiles.size} solo balance files remain byte-identical to merge commit 3abeef13, and duo uses a separate run context.`);
