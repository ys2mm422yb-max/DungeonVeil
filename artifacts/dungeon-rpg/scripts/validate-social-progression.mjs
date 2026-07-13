import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [migration, noticesMigration, rewardSweepMigration, profileExtensionMigration, socialClient, friendClient, friendsPanel, guildSocial, profileCard, onlinePanel, bossPanel, mailbox, rewardLocal, tutorial, tutorialState, bridge, menu, villageHub, menuSceneProxy, villageScene, main] = await Promise.all([
  read('../../../supabase/migrations/20260713033000_add_social_profiles_worldboss_rewards.sql'),
  read('../../../supabase/migrations/20260713034500_social_acceptance_mailbox_notices.sql'),
  read('../../../supabase/migrations/20260713035500_prepare_recent_world_boss_rewards.sql'),
  read('../../../supabase/migrations/20260713041500_extend_social_profile_cards.sql'),
  read('../src/game/socialProgressOnline.ts'),
  read('../src/game/friendOnline.ts'),
  read('../src/components/FriendsPanel.tsx'),
  read('../src/components/GuildSocialPanel.tsx'),
  read('../src/components/PlayerProfileCard.tsx'),
  read('../src/components/OnlinePanel.tsx'),
  read('../src/components/WorldBossPanel.tsx'),
  read('../src/components/MailboxPanel.tsx'),
  read('../src/game/worldBossRewardLocal.ts'),
  read('../src/components/TutorialOverlay.tsx'),
  read('../src/game/tutorialState.ts'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/main.tsx'),
]);

const checks = [
  [migration.includes('friend_code text') && migration.includes('profiles_friend_code_upper_uidx') && migration.includes('generate_friend_code'), 'stable unique friend-code schema is missing'],
  [migration.includes('send_friend_request_by_query') && migration.includes('list_friends_v2') && migration.includes('get_social_profile_card'), 'friend-code and profile-card RPCs are missing'],
  [migration.includes('get_world_boss_social_dashboard') && migration.includes('prepare_my_world_boss_reward') && migration.includes('claim_world_boss_reward'), 'world-boss dashboard or reward RPCs are missing'],
  [migration.includes('revoke all on function public.claim_world_boss_reward') && migration.includes('grant execute on function public.claim_world_boss_reward') && migration.includes('if v_damage <= 0 then return null'), 'weekly rewards are not participation-gated or securely permissioned'],
  [rewardSweepMigration.includes('prepare_recent_world_boss_rewards') && rewardSweepMigration.includes('limit 8') && rewardSweepMigration.includes('grant execute'), 'missed weekly reward recovery is missing'],
  [noticesMigration.includes('queue_friend_acceptance_notice') && noticesMigration.includes('queue_guild_acceptance_notice') && noticesMigration.includes('player_mailbox'), 'social acceptance mailbox notices are missing'],
  [profileExtensionMigration.includes('lifetime_world_boss_damage') && profileExtensionMigration.includes('achievement_keys') && profileExtensionMigration.includes('friend_count') && profileExtensionMigration.includes('revoke all on function public.get_social_profile_card'), 'extended profile statistics or permissions are missing'],
  [socialClient.includes('syncSocialProfileProgress') && socialClient.includes('getCurrentOrRecentWorldBoss') && socialClient.includes('getWorldBossSocialDashboard') && socialClient.includes('prepareRecentWorldBossRewards') && socialClient.includes('claimWorldBossReward'), 'social progression client is incomplete'],
  [socialClient.includes('lifetime_world_boss_damage') && socialClient.includes('account_level') && socialClient.includes('achievement_keys'), 'extended profile client types are missing'],
  [friendClient.includes("'list_friends_v2'") && friendClient.includes("'send_friend_request_by_query'") && friendClient.includes('friend_code'), 'friend client is not using codes and extended profiles'],
  [friendsPanel.includes('DEIN PROFIL & FREUNDESCODE') && friendsPanel.includes('PlayerProfileCard') && friendsPanel.includes('inviteGuildMember'), 'friends UI lacks self profile, profile cards or direct guild invitations'],
  [friendsPanel.includes('FAVORITES_KEY') && friendsPanel.includes('ONLINE_WINDOW_MS') && friendsPanel.includes('formatLastSeen') && friendsPanel.includes('toggleFavorite'), 'friend presence or favorites are missing'],
  [guildSocial.includes('guild-profile-list-button') && guildSocial.includes('PlayerProfileCard') && menu.includes('<GuildSocialPanel'), 'guild member profile cards are missing'],
  [profileCard.includes('data-testid="player-profile-card"') && profileCard.includes('lifetime_world_boss_damage') && profileCard.includes('achievement_keys') && profileCard.includes('account_level'), 'social profile card is incomplete'],
  [onlinePanel.includes('social-profile-summary') && onlinePanel.includes('friend_code') && onlinePanel.includes('current_rank'), 'online profile does not expose friend code and progress'],
  [bossPanel.includes('worldboss-social-panel') && bossPanel.includes('getWorldBossSocialDashboard') && (bossPanel.includes('dashboard.friends') || bossPanel.includes('dashboard?.friends')) && bossPanel.includes('dashboard.guilds') && bossPanel.includes('dashboard.myGuild'), 'world-boss friend and guild rankings are missing'],
  [mailbox.includes('prepareRecentWorldBossRewards') && mailbox.includes('claimWorldBossReward') && mailbox.includes('applyWorldBossRewardLocally') && mailbox.includes('BELOHNUNG ABHOLEN'), 'mailbox weekly reward recovery and claim flow is incomplete'],
  [mailbox.includes('type MailFilter') && mailbox.includes('claimAllRewards') && mailbox.includes('markAllRead') && mailbox.includes('matchesFilter'), 'mailbox filters or bulk actions are missing'],
  [rewardLocal.includes('worldboss:') && rewardLocal.includes('rewardLedger') && rewardLocal.includes('xpForNextRank'), 'local weekly reward application is not idempotent'],
  [tutorial.includes('data-testid="tutorial-overlay"') && tutorial.includes('lastDodgeTime') && tutorial.includes('Math.hypot(player.x') && tutorial.includes('KAPITEL 7 · WELTENHÜTER'), 'seven-part interactive tutorial is incomplete'],
  [tutorialState.includes('requestTutorialReplay') && tutorialState.includes('completeTutorial') && bridge.includes('<TutorialOverlay'), 'tutorial persistence or gameplay bridge is missing'],
  [menu.includes('Tutorial wiederholen') && menu.includes('requestTutorialReplay') && menu.includes('syncSocialProfileProgress'), 'main-menu tutorial replay or social progress sync is missing'],
  [villageHub.includes('veil-village-npc-hub') && villageHub.includes('npc-postmaster') && villageHub.includes('npc-guildmaster') && villageHub.includes('npc-worldkeeper'), 'interactive village navigation is missing'],
  [menu.includes('<VillageNpcHub') && menuSceneProxy.includes('ModernVillageSquareScene as MainMenuDungeonScene') && villageScene.includes("villageRoot.name = 'ModernKayKitVillageSquare'") && villageScene.includes("'MiraQuestKeeper'") && villageScene.includes("'OrinPostKeeper'") && villageScene.includes("'TalaScoutKeeper'") && villageScene.includes("'BromGuildKeeper'") && villageScene.includes("'AelricWorldKeeper'"), 'village navigation is not backed by visible KayKit characters and locations'],
  [main.includes("qaMode === 'tutorial'") && main.includes('<TutorialVisualQa'), 'tutorial visual QA route is missing'],
  [main.includes("qaMode === 'menu'") && main.includes('<MainMenuVisualQa'), 'village menu visual QA route is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Social progression audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Social progression audit passed: social systems, rewards, tutorial flow and the modern visible KayKit village-square navigation are wired.');
