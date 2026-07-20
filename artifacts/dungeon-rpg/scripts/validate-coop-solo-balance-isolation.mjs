import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// The ten-item/relic redesign intentionally changes equipment and relic balance.
// This audit protects the unrelated solo combat core that must remain isolated
// from Duo networking changes while canonical balance audits govern approved edits.
const protectedSoloFiles = new Map([
  ['../src/game/equipmentCollection.ts', '15a264a750fed631a71d9de0ef5406342c5c03c3'],
  // Block 5 intentionally canonicalizes relic triggers in runRetention.ts.
  // validate-relic-runtime-ui-v4.mjs verifies its exact caps, trigger isolation and resume safety.
  ['../src/game/runRetention.ts', '19e9a88963f9ce306df3c305725a5c1898cd9c3d'],
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
  [runMode.includes('mode: typeof SOLO_RUN_MODE') && runMode.includes('mode: typeof DUO_RUN_MODE'), 'solo and duo contexts are not discriminated'],
];
for (const [ok, message] of contractChecks) if (!ok) failures.push(message);

if (failures.length) {
  console.error(`Co-op solo-balance isolation failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Co-op isolation passed: ${protectedSoloFiles.size} solo-core files match their approved hashes, while equipment and relic behavior is governed by the canonical redesign audits.`);
