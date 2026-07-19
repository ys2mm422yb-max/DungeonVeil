import { spawnSync } from 'node:child_process';

const audits = [
  'validate-solo-combat-matrix-v4.mjs',
  'validate-room-1-50-balance-v4.mjs',
  'validate-chapter-balance-v4.mjs',
  'validate-coop-solo-balance-isolation.mjs',
  'validate-coop-lobby-foundation.mjs',
  'validate-coop-realtime-presence.mjs',
  'validate-coop-host-enemy-state.mjs',
  'validate-coop-downed-revive.mjs',
  'validate-coop-run-persistence.mjs',
  'validate-coop-shared-boss-loot.mjs',
  'validate-coop-duo-balance-rewards.mjs',
  'validate-coop-final-integration.mjs',
  'validate-mage-ranged-combat.mjs',
  'run-room-audit-suite.mjs',
  'validate-boss-room-telegraphs-and-meadow.mjs',
];

for (const audit of audits) {
  console.log(`\n::group::Room audit: ${audit}`);
  const result = spawnSync(process.execPath, [`scripts/${audit}`], {
    cwd: new URL('..', import.meta.url),
    stdio: 'inherit',
    env: process.env,
  });
  console.log('::endgroup::');
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`Room audit failed: ${audit} (exit ${result.status ?? 'unknown'})`);
    process.exit(result.status ?? 1);
  }
}

console.log(`All ${audits.length} labeled room audits passed.`);
