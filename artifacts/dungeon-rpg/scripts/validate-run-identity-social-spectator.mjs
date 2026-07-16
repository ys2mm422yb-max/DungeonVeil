import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [
  game,
  runIdentity,
  namePrompt,
  newRunConfirm,
  friends,
  spectatorScreen,
  spectatorClient,
  bridge,
  onlinePanel,
  guildPanel,
  identityCard,
  profileCard,
  socialClient,
  migration,
  denyMigration,
] = await Promise.all([
  read('../src/pages/game.tsx'),
  read('../src/game/runIdentity.ts'),
  read('../src/components/screens/RunNamePromptScreen.tsx'),
  read('../src/components/NewRunConfirmDialog.tsx'),
  read('../src/components/FriendsPanel.tsx'),
  read('../src/components/SpectatorScreen.tsx'),
  read('../src/game/socialSpectatorOnline.ts'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/components/OnlinePanel.tsx'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('../src/components/SocialIdentityCard.tsx'),
  read('../src/components/PlayerProfileCard.tsx'),
  read('../src/game/socialProgressOnline.ts'),
  read('../../../supabase/migrations/20260716001000_add_friend_spectating_and_public_career_stats.sql'),
  read('../../../supabase/migrations/20260716002000_deny_direct_spectator_snapshot_access.sql'),
]);

const checks = [
  [game.includes('resolvePreferredRunName') && game.includes('<RunNamePromptScreen') && !game.includes('CharacterCreationScreen'), 'new runs still route through the duplicate character/name screen'],
  [game.includes('<NewRunConfirmDialog') && !game.includes('window.confirm') && game.includes('beginFreshRun') && game.includes('new-run-loading-screen'), 'new-run replacement still uses a native dialog or misses the direct loading route'],
  [newRunConfirm.includes('new-run-confirm-dialog') && newRunConfirm.includes('new-run-confirm-accept') && newRunConfirm.includes('AKTUELLER RUN') && newRunConfirm.includes('BLEIBT ERHALTEN'), 'styled new-run confirmation does not clearly show affected and permanent progress'],
  [runIdentity.includes('getOnlineProfile') && runIdentity.includes('saveData?.playerName') && runIdentity.includes('LOCAL_RUN_NAME_KEY'), 'account, save and offline run-name fallback order is incomplete'],
  [namePrompt.includes('nur beim ersten Offline-Run') && namePrompt.includes('run-name-confirm'), 'first-offline-only name prompt is not explicit or testable'],

  [friends.includes('friend-spectate-button') && friends.includes('<SpectatorScreen') && !friends.includes('inviteGuildMember') && !friends.includes('In Gilde einladen'), 'friend cards still contain guild invitations or lack live spectating'],
  [friends.includes('<SocialIdentityCard') && friends.includes('avatar_key') && friends.includes('highest_chapter') && friends.includes('highest_room'), 'friend cards do not show equipped cosmetics and best progress'],
  [identityCard.includes('resolveOnlineAvatar') && identityCard.includes('resolveOnlineTitle') && identityCard.includes('resolveOnlineCard'), 'shared social identity card does not resolve all equipped cosmetics'],
  [guildPanel.includes('<SocialIdentityCard') && guildPanel.includes('member.profile?.avatar_key') && guildPanel.includes('guild-member-profile-button'), 'guild members do not show their equipped avatar, title and calling card'],
  [spectatorScreen.includes('<CombatStage') && !spectatorScreen.includes('VirtualJoystick') && !spectatorScreen.includes('ActionButtons'), 'spectator screen is not a read-only combat view'],
  [spectatorClient.includes('SPECTATOR_REFRESH_MS = 850') && spectatorClient.includes('SPECTATOR_STALE_MS = 8_000') && spectatorClient.includes("playerName: ''") && spectatorClient.includes('effects.slice(-48)'), 'spectator feed is not bounded, short-lived and identity-sanitized'],
  [bridge.includes('publishSpectatorState') && bridge.includes('publishMenuActivity') && bridge.includes('syncPublicProfileStats'), 'run bridge does not broadcast activity and public career progress'],
  [onlinePanel.includes('spectating-privacy-setting') && onlinePanel.includes('setSpectatingAllowed'), 'spectating privacy control is missing from Online & Cloud'],
  [migration.includes('spectator_snapshots') && migration.includes("interval '8 seconds'") && migration.includes('octet_length(p_snapshot::text) > 300000'), 'spectator snapshots are not size-limited and short-lived'],
  [migration.includes('friendship required') && migration.includes('spectating_allowed') && migration.includes('revoke all on public.spectator_snapshots'), 'spectator access is not restricted to confirmed friends and RPCs'],
  [denyMigration.includes('spectator_snapshots_deny_direct_access') && denyMigration.includes('using (false)') && denyMigration.includes('with check (false)'), 'spectator snapshot table lacks an explicit deny-all direct access policy'],

  [profileCard.includes('public-player-profile-best-progress') && profileCard.includes('public-player-profile-career-stats') && !profileCard.includes('public-player-profile-progress'), 'friend public profile still uses the duplicate Level/Rank/Chapter layout'],
  [profileCard.includes('rooms_cleared') && profileCard.includes('enemies_defeated') && profileCard.includes('bosses_defeated') && profileCard.includes('quests_completed') && profileCard.includes('play_time_ms'), 'meaningful public career statistics are incomplete'],
  [profileCard.includes('public-player-profile-cosmetics') && profileCard.includes('PROFIL-AUSSTATTUNG') && profileCard.includes('public-player-profile-title-cosmetic') && profileCard.includes('public-player-profile-calling-card-cosmetic') && !profileCard.includes('public-player-profile-avatar-cosmetic') && !profileCard.includes('AUSGEWÄHLTE SAMMLUNG') && profileCard.includes('rarityLabel') && profileCard.includes('public-player-profile-worldboss'), 'friend profile must show only selectable title/calling-card cosmetics and keep rarity/world-boss details'],
  [socialClient.includes('syncPublicProfileStats') && socialClient.includes('highest_chapter') && socialClient.includes('highest_room') && socialClient.includes('rooms_cleared'), 'public career profile client fields are incomplete'],
  [migration.includes('greatest(coalesce((current_stats') && migration.includes("'highestChapter'") && migration.includes("'playTimeMs'"), 'server-side public career values are not protected against stale-device rollback'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Run identity/social spectator audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Run identity/social spectator audit passed: account names, styled run replacement, cosmetic social cards, friend-only live viewing and meaningful public career profiles are integrated.');
