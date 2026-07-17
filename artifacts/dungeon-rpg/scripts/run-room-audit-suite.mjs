import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scripts = [
  'validate-all-rooms.mjs',
  'validate-production-rooms.mjs',
  'validate-spawn-hitboxes.mjs',
  'validate-normal-enemy-telegraphs-and-prop-hitboxes.mjs',
  'validate-enemy-visibility.mjs',
  'validate-mobile-combat.mjs',
  'validate-combat-telegraphs-late-balance.mjs',
  'validate-mobile-zoom-guard.mjs',
  'validate-ipad-run-layout.mjs',
  'validate-worldboss-performance.mjs',
  'validate-social-navigation.mjs',
  'validate-social-progression.mjs',
  'validate-run-identity-social-spectator.mjs',
  'validate-gift-fusions.mjs',
  'validate-dust-avatar-overhaul.mjs',
  'validate-rooms-4-5-composition.mjs',
  'validate-room-quality-6-50.mjs',
  'validate-guild-mobile-layout.mjs',
  'validate-blocks-1-8-integration.mjs',
  'validate-main-menu-equipped-ranger.mjs',
  'validate-inventory-guild-chat-chapters.mjs',
  'validate-player-profile.mjs',
  'validate-public-player-profile.mjs',
  'validate-friends-public-profiles.mjs',
  'validate-online-presence.mjs',
  'validate-elite-outside-profile.mjs',
  'validate-menu-copy-relic-progression.mjs',
  'validate-profile-badge-compact.mjs',
  'validate-upgrade-economy.mjs',
  'validate-armor-progression.mjs',
  'validate-chapter-reward-contract.mjs',
  'validate-final-balance-integration.mjs',
  'validate-final-balance-curve.mjs',
];

for (const script of scripts) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    console.error(`ROOM AUDIT COULD NOT START: ${script}`);
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`ROOM AUDIT FAILED: ${script}`);
    if (result.stdout?.trim()) console.error(result.stdout.trim());
    if (result.stderr?.trim()) console.error(result.stderr.trim());
    process.exit(result.status ?? 1);
  }
  console.log(`✓ ${script}`);
}

console.log(`Room audit suite passed: ${scripts.length} focused checks completed.`);
