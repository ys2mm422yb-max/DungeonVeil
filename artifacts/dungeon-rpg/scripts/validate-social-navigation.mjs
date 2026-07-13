import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, villageHub, menuSceneProxy, villageScene, mailbox, inviteCard, guildClient, guildMigration, friendsPanel, friendClient, friendMigration, friendHardening, main, stage, band] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/ModernVillageSquareScene.tsx'),
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
  read('../src/components/WorldBossCombatBandStage.tsx'),
]);

const checks = [
  [menu.includes('<VillageNpcHub') && villageHub.includes("testId: 'npc-postmaster'") && villageHub.includes('action: onMailbox') && menu.includes('<MailboxPanel'), 'village-routed main-menu mailbox entry is missing'],
  [!menu.includes('WeeklyRiftPanel') && !menu.includes("overlay === 'rift'") && !menu.includes("setOverlay('rift')"), 'weekly-rift shortcut or panel is still mounted in the main menu'],
  [menu.includes('<GuildInviteLinkCard') && inviteCard.includes('createGuildInviteLinkOnline') && inviteCard.includes('navigator.share'), 'shareable guild invite link UI is missing'],
  [guildClient.includes('captureGuildInviteTokenFromUrl') && guildClient.includes('claimPendingGuildInviteLink') && guildClient.includes('rpc/claim_guild_invite_link'), 'guild invitation link claim flow is incomplete'],
  [mailbox.includes('acceptGuildInvite') && mailbox.includes('declineGuildInvite') && mailbox.includes('markMailboxActioned'), 'mailbox guild invitation actions are incomplete'],
  [guildMigration.includes('create table if not exists public.guild_invite_links') && guildMigration.includes('create table if not exists public.player_mailbox'), 'guild invite link or mailbox table migration is missing'],
  [guildMigration.includes('enable row level security') && guildMigration.includes('security definer') && guildMigration.includes('extensions.digest'), 'mailbox and guild link security controls are incomplete'],
  [menu.includes('<VillageNpcHub') && villageHub.includes("testId: 'npc-scout'") && villageHub.includes('action: onFriends') && menu.includes('<FriendsPanel'), 'village-routed main-menu friends entry is missing'],
  [friendsPanel.includes('sendFriendRequestOnline') && friendsPanel.includes('acceptFriendRequestOnline') && friendsPanel.includes('cancelFriendRequestOnline') && friendsPanel.includes('removeFriendOnline'), 'friends panel actions are incomplete'],
  [friendClient.includes("rpc<OnlineFriend[]>('list_friends_v2')") && friendClient.includes("rpc<OnlineFriendRequest[]>('list_friend_requests')") && friendClient.includes("rpc<SentFriendRequest[]>('send_friend_request_by_query'"), 'authenticated friend-code client is incomplete'],
  [mailbox.includes("message.kind === 'friend_request'") && mailbox.includes('answerFriendRequest') && mailbox.includes('acceptFriendRequestOnline'), 'friend requests are not actionable from the mailbox'],
  [friendMigration.includes('create table if not exists public.friend_requests') && friendMigration.includes('create table if not exists public.friendships'), 'friends database tables are missing'],
  [friendMigration.includes('friend_requests_read_related') && friendMigration.includes('friendships_read_own') && friendMigration.includes('revoke execute') && friendMigration.includes('grant execute'), 'friends RLS or RPC permissions are incomplete'],
  [friendHardening.includes('friend_requests_pair_uidx') && friendHardening.includes('least(sender_id, receiver_id)') && friendHardening.includes('on conflict do nothing'), 'unordered friend-pair race protection is missing'],
  [main.includes("qaMode === 'worldboss'") && main.includes('<WorldBossVisualQa'), 'world-boss visual QA route is missing'],
  [main.includes("qaMode === 'menu'") && main.includes('<MainMenuVisualQa'), 'Veil village visual QA route is missing'],
  [menuSceneProxy.includes('ModernVillageSquareScene as MainMenuDungeonScene'), 'main menu scene proxy is not routed to the modern village renderer'],
  [villageScene.includes("villageRoot.name = 'ModernKayKitVillageSquare'") && villageScene.includes("'VillageGate'") && villageScene.includes("'VillageSquareShrine'") && villageScene.includes('VILLAGE_ASSETS'), 'modern KayKit village-square staging is missing'],
  [villageScene.includes('async function loadVillageAssetsProgressively') && villageScene.includes('void loadVillageAssetsProgressively') && villageScene.includes('raf = requestAnimationFrame(loop)'), 'progressive village rendering is missing'],
  [villageScene.includes('for (const rule of VILLAGE_ASSETS)') && villageScene.includes('catch (error)') && villageScene.includes('failed to load'), 'individual village asset failures are not isolated'],
  [villageHub.includes('grid grid-cols-5') && villageHub.includes('Choose a place') && !villageHub.includes('absolute z-20 flex'), 'village place dock is missing or floating labels remain'],
  [menu.includes('grid-cols-2') && menu.includes('min-h-[250px] flex-1') && !menu.includes('h-[41vh]'), 'main-menu action layout is not separated from the village scene'],
  [stage.includes("root.name = 'AshKingRitualHall'") && stage.includes("slabA.name = 'StoneFloorSlabs'") && stage.includes("part.name = 'BrokenAshThrone'") && stage.includes("threshold.name = 'VeilGateThreshold'"), 'cohesive semantic Ash King ritual hall is missing'],
  [band.includes('data-testid="worldboss-combat-band"') && band.includes('ritual-arena-meaning') && band.includes('<WorldBossCohesiveStage'), 'world-boss combat band QA markers or cohesive stage route are missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Social/navigation audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Social/navigation audit passed: progressive KayKit village rendering, compact place dock, stable social routes and world-boss navigation remain active.');
