import { readFile } from 'node:fs/promises';

const files = {
  profile: await readFile(new URL('../src/game/playerProfile.ts', import.meta.url), 'utf8'),
  integrity: await readFile(new URL('../src/game/profileStorageIntegrity.ts', import.meta.url), 'utf8'),
  storageSettings: await readFile(new URL('../src/components/ProfileStorageSettings.tsx', import.meta.url), 'utf8'),
  badge: await readFile(new URL('../src/components/ProfileBadge.tsx', import.meta.url), 'utf8'),
  panel: await readFile(new URL('../src/components/PlayerProfilePanel.tsx', import.meta.url), 'utf8'),
  online: await readFile(new URL('../src/components/OnlinePanel.tsx', import.meta.url), 'utf8'),
  nameChange: await readFile(new URL('../src/game/playerNameChange.ts', import.meta.url), 'utf8'),
  nameOnline: await readFile(new URL('../src/game/playerNameOnline.ts', import.meta.url), 'utf8'),
  nameMigration: await readFile(new URL('../../../supabase/migrations/20260718222000_add_confirmed_player_names.sql', import.meta.url), 'utf8'),
  nameHardening: await readFile(new URL('../../../supabase/migrations/20260719153000_harden_player_name_confirmation_v2.sql', import.meta.url), 'utf8'),
  saveManager: await readFile(new URL('../src/game/saveManager.ts', import.meta.url), 'utf8'),
  runIdentity: await readFile(new URL('../src/game/runIdentity.ts', import.meta.url), 'utf8'),
  cloud: await readFile(new URL('../src/game/cloudSave.ts', import.meta.url), 'utf8'),
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
  [files.nameChange.includes('PLAYER_NAME_CHANGE_GOLD_COST = 5_000') && files.nameChange.includes('completedChanges === 0 ? 0'), 'first player-name change is not free or later changes do not cost the fixed gold price'],
  [files.nameChange.includes('commitServerPlayerNameChange') && files.nameChange.includes('currentCompleted >= targetCompleted'), 'server/local player-name charge is not idempotent'],
  [files.nameChange.includes('users: Record<string, PlayerNameChangeEntry>') && files.nameChange.includes('state.users[id]'), 'player-name change allowance is not isolated per online account'],
  [files.nameChange.includes("STORAGE_KEY = 'dungeon-veil-player-name-change-v1'") && files.cloud.includes('exportSaveBundle()'), 'player-name change allowance is not cloud-save compatible'],
  [files.nameOnline.includes("'rpc/get_my_player_name_state'") && files.nameOnline.includes("'rpc/set_my_player_name'"), 'player-name UI does not use authoritative RPCs'],
  [files.nameOnline.includes('normalized.length < 3 || normalized.length > 20') && files.nameOnline.includes('RESERVED_PLAYER_NAMES') && files.nameOnline.includes('ÄÖÜäöüß _-'), 'client name validation does not match server length, characters or reserved-name policy'],
  [files.nameMigration.includes('profiles_confirmed_display_name_lower_uidx') && files.nameMigration.includes('private.validate_player_name'), 'confirmed player names are not unique and server validated'],
  [files.nameMigration.includes('profiles_guard_confirmed_player_name') && files.nameMigration.includes('player_name_changes_read_own'), 'direct profile changes or name history are not protected'],
  [files.nameMigration.includes('pg_advisory_xact_lock') && files.nameMigration.includes('p_change_id'), 'name changes are not race-safe and idempotent'],
  [files.nameHardening.includes('v_previous_name := coalesce(v_profile.display_name') && files.nameHardening.includes('v_previous_name, v_name, v_charge'), 'player-name history does not retain the previous name'],
  [files.online.includes('data-testid="player-name-confirmation-required"') && files.online.includes('Der Google-Anzeigename wird nicht automatisch übernommen'), 'Google and legacy accounts are not explicitly prompted to confirm a player name'],
  [files.online.includes('setMyPlayerNameOnline') && files.online.includes('commitServerPlayerNameChange') && !files.online.includes('updateOnlineProfile(nextName)'), 'confirmed player-name changes still bypass the server contract'],
  [files.online.includes('rememberRunName(result.display_name)') || files.online.includes('applyConfirmedNameLocally(result.display_name)'), 'confirmed name is not propagated to future runs'],
  [files.online.includes('renameSavedPlayerName(name)') && files.online.includes('void pushCloudSave()'), 'confirmed name is not propagated to the existing save and cloud'],
  [files.online.includes('playerNameState?.confirmed && <section data-testid="social-profile-summary"') && files.online.includes('playerNameState?.confirmed && <section data-testid="spectating-privacy-setting"'), 'unconfirmed placeholder names can leak into social surfaces'],
  [!files.online.includes('window.setTimeout(() => {\n      setProfileSaveState') && !files.online.includes('type ProfileSaveState ='), 'player name still changes automatically while typing'],
  [files.menu.includes('PLAYER_NAME_CHANGE_EVENT') && files.menu.includes('const currentSaveData = loadGame() ?? props.saveData'), 'main-menu badge and profile do not refresh immediately after a name change'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Player profile audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Player profile audit passed: identity, registration, Google confirmation, unique server validation, local/cloud propagation and gold-bound idempotent changes share one contract.');
