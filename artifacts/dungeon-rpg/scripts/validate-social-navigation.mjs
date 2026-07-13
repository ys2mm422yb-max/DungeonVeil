import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, villageHub, menuScene, mailbox, inviteCard, guildClient, guildMigration, friendsPanel, friendClient, friendMigration, friendHardening, main, stageWrapper, perspectiveStage, band] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/MailboxPanel.tsx'),
  read('../src/components/GuildInviteLinkCard.tsx'),
  read('../src/game/guildMailboxOnline.ts'),
  read('../../../supabase/migrations/20260713020000_guild_invite_links_and_player_mailbox.sql'),
  read('../src/components/FriendsPanel.tsx'),
  read('../src/game/friendOnline.ts'),
  read('../../../supabase/migrations/20260713023000_add_friends_system.sql'),
  read('../../../supabase/migrations/20260713023500_harden_friend_pair_uniqueness.sql'),
  read('../src/main.tsx'),
  read('../src/components/WorldBossCohesiveStage.tsx'),
  read('../src/components/WorldBossPerspectiveStage.tsx'),
  read('../src/components/WorldBossCombatBandStage.tsx'),
]);

const checks = [
  [menu.includes('<VillageNpcHub') && villageHub.includes('testId="npc-postmaster"') && villageHub.includes('onClick={onMailbox}') && menu.includes('<MailboxPanel'), 'NPC-routed main-menu mailbox entry is missing'],
  [!menu.includes('WeeklyRiftPanel') && !menu.includes("overlay === 'rift'") && !menu.includes("setOverlay('rift')"), 'weekly-rift shortcut or panel is still mounted in the main menu'],
  [menu.includes('<GuildInviteLinkCard') && inviteCard.includes('createGuildInviteLinkOnline') && inviteCard.includes('navigator.share'), 'shareable guild invite link UI is missing'],
  [guildClient.includes('captureGuildInviteTokenFromUrl') && guildClient.includes('claimPendingGuildInviteLink') && guildClient.includes('rpc/claim_guild_invite_link'), 'guild invitation link claim flow is incomplete'],
  [mailbox.includes('acceptGuildInvite') && mailbox.includes('declineGuildInvite') && mailbox.includes('markMailboxActioned'), 'mailbox guild invitation actions are incomplete'],
  [guildMigration.includes('create table if not exists public.guild_invite_links') && guildMigration.includes('create table if not exists public.player_mailbox'), 'guild invite link or mailbox table migration is missing'],
  [guildMigration.includes('enable row level security') && guildMigration.includes('security definer') && guildMigration.includes('extensions.digest'), 'mailbox and guild link security controls are incomplete'],
  [menu.includes('<VillageNpcHub') && villageHub.includes('testId="npc-scout"') && villageHub.includes('onClick={onFriends}') && menu.includes('<FriendsPanel'), 'NPC-routed main-menu friends entry is missing'],
  [friendsPanel.includes('sendFriendRequestOnline') && friendsPanel.includes('acceptFriendRequestOnline') && friendsPanel.includes('cancelFriendRequestOnline') && friendsPanel.includes('removeFriendOnline'), 'friends panel actions are incomplete'],
  [friendClient.includes("rpc<OnlineFriend[]>('list_friends_v2')") && friendClient.includes("rpc<OnlineFriendRequest[]>('list_friend_requests')") && friendClient.includes("rpc<SentFriendRequest[]>('send_friend_request_by_query'"), 'authenticated friend-code client is incomplete'],
  [mailbox.includes("message.kind === 'friend_request'") && mailbox.includes('answerFriendRequest') && mailbox.includes('acceptFriendRequestOnline'), 'friend requests are not actionable from the mailbox'],
  [friendMigration.includes('create table if not exists public.friend_requests') && friendMigration.includes('create table if not exists public.friendships'), 'friends database tables are missing'],
  [friendMigration.includes('friend_requests_read_related') && friendMigration.includes('friendships_read_own') && friendMigration.includes('revoke execute') && friendMigration.includes('grant execute'), 'friends RLS or RPC permissions are incomplete'],
  [friendHardening.includes('friend_requests_pair_uidx') && friendHardening.includes('least(sender_id, receiver_id)') && friendHardening.includes('on conflict do nothing'), 'unordered friend-pair race protection is missing'],
  [main.includes("qaMode === 'worldboss'") && main.includes('<WorldBossVisualQa'), 'world-boss visual QA route is missing'],
  [main.includes("qaMode === 'menu'") && main.includes('<MainMenuVisualQa'), 'Veil village visual QA route is missing'],
  [menuScene.includes("root.name = 'VeilWorldOrb'") && menuScene.includes("globe.name = 'VeilWorldGlobe'") && menuScene.includes('buildVillageNpc') && menuScene.includes('buildVillageStall'), 'main menu lacks the central world orb or visible village staging'],
  [villageHub.includes('accent="world"') && villageHub.includes('top="47.5%"') && menu.includes('h-[41vh]'), 'NPC hub is not balanced around the world orb or remains overlapped by action cards'],
  [stageWrapper.includes('installWorldBossVisualRuntimePatch') && stageWrapper.includes('<WorldBossPerspectiveStage') && perspectiveStage.includes("root.name = 'AshKingPerspectiveSanctum'") && perspectiveStage.includes("lower.name = 'AshKingRaisedDais'") && perspectiveStage.includes("throne.name = 'BrokenAshThronePerspective'"), 'perspective semantic Ash King sanctum or runtime visual patch is missing'],
  [band.includes('data-testid="worldboss-combat-band"') && band.includes('ritual-arena-meaning') && band.includes('<WorldBossCohesiveStage'), 'world-boss combat band QA markers or cohesive stage route are missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Social/navigation audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Social/navigation audit passed: village, mailbox, friends and guild routes remain intact, and the patched perspective Ash King sanctum is QA-addressable.');
