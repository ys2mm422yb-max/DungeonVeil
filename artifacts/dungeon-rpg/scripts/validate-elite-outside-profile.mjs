import { readFile } from 'node:fs/promises';

const [profile, profileAudit] = await Promise.all([
  readFile(new URL('../src/components/PlayerProfilePanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('./validate-player-profile.mjs', import.meta.url), 'utf8'),
]);

const forbidden = [
  "'weekly'",
  'weeklyElite',
  'WÖCHENTLICHE ELITE-AUFTRÄGE',
  'WEEKLY ELITE CONTRACTS',
  'Elite-Marken',
  'Elite Marks',
];

const failures = forbidden.filter(token => profile.includes(token));
if (failures.length) {
  console.error(`Elite/profile separation failed: profile still contains ${failures.join(', ')}`);
  process.exit(1);
}

if (!profile.includes("type Tab = 'overview' | 'stats' | 'titles' | 'cards' | 'avatars'")) {
  console.error('Elite/profile separation failed: profile tab scope is no longer explicit.');
  process.exit(1);
}
if (!profileAudit.includes('full profile menu')) {
  console.error('Elite/profile separation failed: the profile regression audit is missing.');
  process.exit(1);
}

console.log('Elite/profile separation passed: the player profile contains identity and statistics only, with no elite-task surface.');
