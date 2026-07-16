import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [
  main, game, save, portal, guildPanel, guildSocial, publicProfile, friends, presence, presenceRuntime,
  profilePanel, quests, inventory, markers, unlockLayer, settings, joystick, hud, actions,
  accessibility, readability, storageIntegrity, storageSettings, worldBossBattle, worldBossPanel, regressionWorkflow,
] = await Promise.all([
  read('../src/main.tsx'),
  read('../src/pages/game.tsx'),
  read('../src/game/saveManager.ts'),
  read('../src/game/portalExitPolicy.ts'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('../src/components/GuildSocialPanel.tsx'),
  read('../src/components/PlayerProfileCard.tsx'),
  read('../src/components/FriendsPanel.tsx'),
  read('../src/game/onlinePresence.ts'),
  read('../src/game/onlinePresenceRuntime.ts'),
  read('../src/components/PlayerProfilePanel.tsx'),
  read('../src/components/DailyQuestPanel.tsx'),
  read('../src/components/screens/VeilChamberScreen.tsx'),
  read('../src/game/newContentMarkers.ts'),
  read('../src/components/UnlockPresentationLayer.tsx'),
  read('../src/components/screens/SettingsScreen.tsx'),
  read('../src/components/VirtualJoystick.tsx'),
  read('../src/components/HUD.tsx'),
  read('../src/components/ActionButtons.tsx'),
  read('../src/game/accessibilitySettings.ts'),
  read('../src/readability.css'),
  read('../src/game/profileStorageIntegrity.ts'),
  read('../src/components/ProfileStorageSettings.tsx'),
  read('../src/components/WorldBossBattleScreen.tsx'),
  read('../src/components/WorldBossPanel.tsx'),
  read('../../../.github/workflows/full-game-regression.yml'),
]);

const checks = [
  [guildPanel.includes('guild-members-tab') && guildPanel.includes('guild-member-profile-button') && guildSocial.includes('onOpenMemberProfile={setSelectedProfileId}') && !guildSocial.includes('guild-profile-list-button'), 'Block 4 guild profiles are not contained in the Members tab'],
  [publicProfile.includes('public-player-profile-dialog') && publicProfile.includes('public-player-profile-loading') && publicProfile.includes('public-player-profile-error') && publicProfile.includes('public-player-profile-empty'), 'Block 5 public profile states are incomplete'],
  [friends.includes('<SocialIdentityCard') && friends.includes('setSelectedProfileId(request.user_id)') && friends.includes('incoming-friend-request-actions') && friends.includes('outgoing-friend-request-card'), 'Block 6 friend requests are not connected safely to cosmetic public profiles'],
  [presence.includes('publishOnlinePresence') && presenceRuntime.includes('ONLINE_PRESENCE_POLL_MS') && guildPanel.includes('guild-member-presence'), 'Block 7 online presence is not active across runtime and guild UI'],
  [!profilePanel.includes('weeklyElite') && !profilePanel.includes('WÖCHENTLICHE ELITE-AUFTRÄGE') && profilePanel.includes("type Tab = 'overview' | 'stats' | 'titles' | 'cards' | 'avatars'"), 'Block 8 elite content returned to the profile'],
  [quests.includes('quest-board-summary') && quests.includes('quest-active-section') && quests.includes('quest-completed-section'), 'Block 9 quest structure is missing'],
  [markers.includes('initializeSeenUnlocks') && inventory.includes('inventory-tab-new-badge') && inventory.includes('inventory-item-new-badge'), 'Block 10 persistent NEW markers are missing'],
  [unlockLayer.includes('unlock-presentation-layer') && main.includes('<UnlockPresentationLayer />') && !unlockLayer.includes('markEquipmentSeen('), 'Block 11 unlock presentation is missing or consumes NEW state'],
  [settings.includes('joystick-mode-fixed') && settings.includes('joystick-mode-floating') && joystick.includes('run-joystick-floating-zone') && joystick.includes('data-joystick-mode'), 'Block 12 joystick modes are not integrated'],
  [hud.includes('run-health-panel') && hud.includes('run-pause-control') && hud.includes('run-enemy-status') && actions.includes('run-dash-state'), 'Block 13 HUD and mobile controls are incomplete'],
  [accessibility.includes('saveAccessibilitySettings') && main.includes('installAccessibilitySettings();') && readability.includes("html[data-contrast='high']") && settings.includes('text-size-large'), 'Block 14 contrast and readability controls are not integrated'],
  [storageIntegrity.includes('repairProfileStorage') && storageIntegrity.includes('restoreProfileStorageBackup') && storageSettings.includes('profile-storage-settings') && main.includes('installProfileStorageIntegrity();'), 'Block 15 statistics storage integrity is incomplete'],
  [game.includes('saveEngineSession') && game.includes('handleContinue') && game.includes('beginPlayerProfileRun') && save.includes('loadGame'), 'critical new-run, continue or save paths are missing'],
  [portal.includes('this.livingEnemies().length === 0') && portal.includes('this.nextRoom()'), 'critical room-exit behavior is missing'],
  [worldBossBattle.includes('WorldBossLiteStage') && worldBossPanel.includes('startWorldBossAttempt') && worldBossPanel.includes('getWorldBossAttemptStatus'), 'critical world-boss entry or stage is missing'],
  [regressionWorkflow.includes('Build current branch for browser regression') && regressionWorkflow.includes('http://127.0.0.1:4173/DungeonVeil/'), 'full regression no longer tests the current branch build'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Blocks 4–15 integration audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

await import('./validate-final-device-gate.mjs');
console.log('Blocks 4–17 integration audit passed: all functional blocks and the final automated device gate coexist in one build.');
