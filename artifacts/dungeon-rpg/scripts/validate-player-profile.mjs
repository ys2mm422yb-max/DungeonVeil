import { readFile } from 'node:fs/promises';

const files = {
  profile: await readFile(new URL('../src/game/playerProfile.ts', import.meta.url), 'utf8'),
  integrity: await readFile(new URL('../src/game/profileStorageIntegrity.ts', import.meta.url), 'utf8'),
  storageSettings: await readFile(new URL('../src/components/ProfileStorageSettings.tsx', import.meta.url), 'utf8'),
  badge: await readFile(new URL('../src/components/ProfileBadge.tsx', import.meta.url), 'utf8'),
  panel: await readFile(new URL('../src/components/PlayerProfilePanel.tsx', import.meta.url), 'utf8'),
  settings: await readFile(new URL('../src/components/screens/SettingsScreen.tsx', import.meta.url), 'utf8'),
  menu: await readFile(new URL('../src/components/screens/MainMenuScreen.tsx', import.meta.url), 'utf8'),
  main: await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
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
  [files.integrity.includes('BACKUP_KEY') && files.integrity.includes('repairProfileStorage') && files.integrity.includes('restoreProfileStorageBackup'), 'profile storage has no repair or rolling backup path'],
  [files.integrity.includes("status: 'ok' | 'repaired' | 'restored' | 'reset'") || files.integrity.includes("ProfileStorageStatus = 'ok' | 'repaired' | 'restored' | 'reset'"), 'profile storage health states are incomplete'],
  [files.integrity.includes('PLAYER_PROFILE_EVENT') && files.integrity.includes('previousRaw'), 'profile changes do not retain a previous valid snapshot'],
  [files.main.includes('installProfileStorageIntegrity();'), 'profile storage integrity is not installed at startup'],
  [files.storageSettings.includes('data-testid="profile-storage-settings"') && files.storageSettings.includes('data-testid="profile-backup-restore"'), 'statistics and backup health are not visible in settings'],
  [files.settings.includes('<ProfileStorageSettings language={language} />'), 'settings do not mount statistics and storage health'],
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

console.log('Player profile audit passed: complete statistics, rolling backup, startup repair, visible storage health and real run tracking are active.');
