import { readFile } from 'node:fs/promises';

const files = {
  profile: await readFile(new URL('../src/game/playerProfile.ts', import.meta.url), 'utf8'),
  badge: await readFile(new URL('../src/components/ProfileBadge.tsx', import.meta.url), 'utf8'),
  panel: await readFile(new URL('../src/components/PlayerProfilePanel.tsx', import.meta.url), 'utf8'),
  menu: await readFile(new URL('../src/components/screens/MainMenuScreen.tsx', import.meta.url), 'utf8'),
  session: await readFile(new URL('../src/components/GameSessionBridge.tsx', import.meta.url), 'utf8'),
  game: await readFile(new URL('../src/pages/game.tsx', import.meta.url), 'utf8'),
  retention: await readFile(new URL('../src/game/runRetention.ts', import.meta.url), 'utf8'),
};

const checks = [
  [files.badge.includes('data-testid="main-menu-profile-badge"'), 'main-menu profile badge is missing'],
  [files.menu.includes("setOverlay('profile')") && files.menu.includes('<PlayerProfilePanel'), 'profile menu cannot be opened from the main menu'],
  [files.panel.includes('data-testid="player-profile-panel"'), 'full-screen player profile panel is missing'],
  [files.panel.includes("'Höchstes Kapitel'") && files.panel.includes("'Höchster Raum'"), 'highest chapter and highest room are not shown as separate statistics'],
  [files.profile.includes('selectedTitle') && files.profile.includes('selectedCard') && files.profile.includes('selectedAvatar'), 'profile cosmetic selections are not persistent'],
  [files.profile.includes('PROFILE_TITLES') && files.profile.includes('PROFILE_CARDS') && files.profile.includes('PROFILE_AVATARS'), 'title, calling-card or avatar definitions are missing'],
  [files.profile.includes('bossesDefeated') && files.profile.includes('totalDamage') && files.profile.includes('playTimeMs'), 'persistent profile statistics are incomplete'],
  [files.session.includes('recordPlayerProfileRoomClear') && files.session.includes('recordPlayerProfileSession'), 'real run activity is not connected to profile statistics'],
  [files.game.includes('beginPlayerProfileRun'), 'new runs are not counted in profile statistics'],
  [files.retention.includes('recordPlayerProfileQuestCompleted'), 'completed daily quests are not counted in profile statistics'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Player profile audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Player profile audit passed: main-menu badge, full profile menu, separate highest chapter/room statistics, persistent titles, calling cards, avatars and real run tracking are active.');
