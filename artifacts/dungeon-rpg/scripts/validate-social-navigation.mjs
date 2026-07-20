import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, villageHub, menuSceneProxy, menuHeroFocus, villageScene, villagePlayer, mailbox, inviteCard, guildClient, guildMigration, friendsPanel, friendClient, friendMigration, friendHardening, main, emailRedirect, stageWrapper, aggressiveStage, perspectiveStage, earlyAtmosphere, roomThemes, band] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/MainMenuHeroFocusBridge.tsx'),
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/MailboxPanel.tsx'),
  read('../src/components/GuildInviteLinkCard.tsx'),
  read('../src/game/guildMailboxOnline.ts'),
  read('../../../supabase/migrations/20260713020000_guild_invite_links_and_player_mailbox.sql'),
  read('../src/components/FriendsPanel.tsx'),
  read('../src/game/friendOnline.ts'),
  read('../../../supabase/migrations/20260713023000_add_friends_system.sql'),
  read('../../../supabase/migrations/20260713023500_harden_friend_pair_uniqueness.sql'),
  read('../src/main.tsx'),
  read('../src/game/emailConfirmationRedirect.ts'),
  read('../src/components/WorldBossCohesiveStage.tsx'),
  read('../src/components/WorldBossAggressiveStage.tsx'),
  read('../src/components/WorldBossPerspectiveStage.tsx'),
  read('../src/components/earlyVeilRoomAtmosphere3D.ts'),
  read('../src/components/kaykitRoomThemes3D.ts'),
  read('../src/components/WorldBossCombatBandStage.tsx'),
]);

const renderStart = villageScene.lastIndexOf('raf = requestAnimationFrame(loop);');
const assetStart = villageScene.indexOf('void loadVillageAssets(');
const playOverlayStart = menu.indexOf("{overlay === 'play'");
const moreOverlayStart = menu.indexOf("{overlay === 'more'");
const overlayCloseStart = menu.indexOf("{overlay !== 'guild'");
const playOverlay = playOverlayStart >= 0 && moreOverlayStart > playOverlayStart ? menu.slice(playOverlayStart, moreOverlayStart) : '';
const moreOverlay = moreOverlayStart >= 0 && overlayCloseStart > moreOverlayStart ? menu.slice(moreOverlayStart, overlayCloseStart) : '';
const saveEmphasisUsesProps = menu.includes("props.saveData ? 'gold' : 'dark'") && menu.includes("props.saveData ? 'dark' : 'gold'");
const saveEmphasisUsesRefreshedSave = menu.includes("currentSaveData ? 'gold' : 'dark'") && menu.includes("currentSaveData ? 'dark' : 'gold'");
const actionBandSeparated = menu.includes('grid-cols-2')
  && (menu.includes('min-h-[250px] flex-1')
    || (menu.includes('min-h-[220px] flex-1') && menu.includes('main-menu-companion-navigation'))
    || (menu.includes('data-testid="main-menu-scene-focus"') && menu.includes('min-h-[300px] flex-1') && menu.includes('data-testid="main-menu-control-stack"')))
  && !menu.includes('h-[41vh]');
const checks = [
  [menu.includes('<VillageNpcHub') && villageHub.includes("testId: 'npc-postmaster'") && villageHub.includes('action: onMailbox') && menu.includes('<MailboxPanel'), 'village-routed main-menu mailbox entry is missing'],
  [menu.includes("setOverlay('play')") && playOverlay.includes('Solo-Run') && playOverlay.includes('Duo-Run') && playOverlay.includes('Weltboss') && playOverlay.includes("setOverlay('coop')") && playOverlay.includes("setOverlay('worldBoss')"), 'play mode chooser does not group solo, duo and world boss'],
  [moreOverlay.length > 0 && !moreOverlay.includes('Duo-Run') && !moreOverlay.includes('Duo Run'), 'duo run is still hidden in more options'],
  [!menu.includes('WeeklyRiftPanel') && !menu.includes("overlay === 'rift'") && !menu.includes("setOverlay('rift')"), 'weekly-rift shortcut or panel is still mounted in the main menu'],
  [!menu.includes('<GuildInviteLinkCard') && menu.includes('onClose={() => setOverlay(null)}') && inviteCard.includes('createGuildInviteLinkOnline') && inviteCard.includes('navigator.share'), 'guild invite link is not isolated inside the closable guild panel'],
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
  [main.includes("from './game/emailConfirmationRedirect'") && main.includes('installEmailConfirmationRedirect();'), 'email confirmation redirect guard is not installed before app startup'],
  [emailRedirect.includes("url.pathname === '/auth/v1/signup'") && emailRedirect.includes("url.searchParams.set('redirect_to', appReturnUrl())"), 'signup request does not receive an explicit confirmation redirect'],
  [emailRedirect.includes('import.meta.env.BASE_URL') && emailRedirect.includes('window.location.origin') && !emailRedirect.includes("new URL('/', window.location.origin)"), 'email confirmation redirect can fall back to the GitHub Pages domain root'],
  [emailRedirect.includes('url.origin === supabaseOrigin()') && emailRedirect.includes('PATCH_MARKER'), 'email redirect guard is not narrowly scoped or idempotent'],
  [main.includes("qaMode === 'worldboss'") && main.includes('<WorldBossVisualQa'), 'world-boss visual QA route is missing'],
  [main.includes("qaMode === 'menu'") && main.includes('<MainMenuVisualQa'), 'Veil village visual QA route is missing'],
  [menuSceneProxy.includes('assets/hall/veil-hall-hero.webp') && menuSceneProxy.includes('import.meta.env.BASE_URL') && !menuSceneProxy.includes('ModernVillageSquareScene') && !menuSceneProxy.includes('MainMenuHeroFocusBridge'), 'main menu does not use the approved direct WebP key art as its single hero source'],
  [menuSceneProxy.includes('data-composition="hd-key-art-overlay"') && menuSceneProxy.includes('data-hero-pair="ranger-and-veil-wolf"') && menuSceneProxy.includes('data-key-art="approved-gothic-portal-v1"'), 'approved Ranger, wolf and gothic portal composition markers are missing'],
  [menuSceneProxy.includes('data-image-loaded') && menuSceneProxy.includes('data-image-failed') && menuSceneProxy.includes('naturalWidth > 0'), 'HD menu art does not prove that real pixels loaded'],
  [menuSceneProxy.includes('SPECTATOR_RENDERER_EVENT') && menuSceneProxy.includes('setSuspended') && menuSceneProxy.includes('if (suspended) return null'), 'HD menu art does not preserve the exclusive spectator handoff'],
  [menuSceneProxy.includes('object-[center_43%]') && menuSceneProxy.includes('md:object-contain') && menuSceneProxy.includes('blur-2xl saturate-150'), 'HD menu art lacks responsive crop or wide-screen depth treatment'],
  [!menuSceneProxy.includes('loadMetaProgression') && !menuSceneProxy.includes('loadKayKit') && !menuSceneProxy.includes('<canvas'), 'main menu still mounts a duplicate live Ranger or renderer over baked key art'],
  [earlyAtmosphere.includes('first: 1, last: 9') && earlyAtmosphere.includes('background: 0x08050e') && earlyAtmosphere.includes('fog: 0x140b21') && earlyAtmosphere.includes("group.userData.noCollision = true"), 'rooms 1-9 do not have a bounded collision-free Veil environment contract'],
  [earlyAtmosphere.includes("name = 'EarlyVeilFloorRune'") && earlyAtmosphere.includes("name = 'EarlyVeilWarmTorchLight'") && earlyAtmosphere.includes("name = 'EarlyVeilCentralLight'") && earlyAtmosphere.includes('THREE.Fog(EARLY_VEIL_ENVIRONMENT.fog, 23, 54)'), 'early rooms are missing readable runes, warm contrast lights or atmospheric depth'],
  [roomThemes.includes("from './earlyVeilRoomAtmosphere3D'") && roomThemes.includes('buildEarlyVeilRoomAtmosphere(THREE, root, room)') && roomThemes.includes('if (earlyVeilAtmosphere) additions.push(earlyVeilAtmosphere)'), 'early Veil atmosphere is not integrated through the existing room-theme lifecycle'],
  [villageScene.includes("villageRoot.name = 'ModernKayKitVillageSquare'") && villageScene.includes('loadKayKitVillageArcher') && villagePlayer.includes("root.name = 'VillageEquippedPlayer'") && villagePlayer.includes('KAYKIT_PLAYER_ASSETS.ranger') && villagePlayer.includes('village-showcase-v14-player-focus') && villagePlayer.includes("equipmentRoot.name = 'VillageReadableLoadout'") && villagePlayer.includes('root.scale.setScalar(0.72)') && !villageScene.includes('AelricWorldKeeper'), 'standalone village renderer does not retain one focused equipped Ranger body'],
  [villageScene.includes('async function loadVillageAssets(') && renderStart >= 0 && assetStart > renderStart, 'village renderer does not start before asynchronous asset loading'],
  [villageScene.includes('Promise.allSettled') && villageScene.includes("result.status === 'rejected'") && villageScene.includes('Village asset failed to load'), 'individual village asset failures are not isolated'],
  [villageScene.includes('new ResizeObserver(resize)') && villageScene.includes("window.visualViewport?.addEventListener('resize', resize)") && villageScene.includes("renderer.domElement.style.width = '100%'") && villageScene.includes("renderer.domElement.style.height = '100%'"), 'mobile village viewport or canvas sizing is missing'],
  [villageHub.includes('grid grid-cols-4') && villageHub.includes('min-h-[48px]') && !villageHub.includes("testId: 'npc-worldkeeper'") && !villageHub.includes('onWorldBoss') && !villageHub.includes('Wähle einen Ort') && !villageHub.includes('Choose a place') && !villageHub.includes('absolute z-20 flex'), 'village place dock is not compact or still mixes gameplay modes into social routes'],
  [actionBandSeparated, 'main-menu action layout is not separated from the village scene'],
  [saveEmphasisUsesProps || saveEmphasisUsesRefreshedSave, 'continue and play do not switch primary emphasis with save availability'],
  [!menuSceneProxy.includes('VeilWorldOrb') && !villageScene.includes('VeilWorldGlobe'), 'legacy world-globe menu markers returned'],
  [stageWrapper.includes('WorldBossAggressiveStage as WorldBossCohesiveStage') && aggressiveStage.includes('<WorldBossPerspectiveStage') && perspectiveStage.includes("root.name = 'AshKingLowCostKayKitHall'") && perspectiveStage.includes("floor.name = 'AshKingDetailedSingleFloor'") && !perspectiveStage.includes('buildKayKitDungeonRoom'), 'single-floor low-call Ash King hall or aggressive controller is missing'],
  [band.includes('data-testid="worldboss-combat-band"') && band.includes('ritual-arena-meaning') && band.includes('<WorldBossCohesiveStage'), 'world-boss combat band QA markers or stage route is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Social/navigation audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Social/navigation audit passed: directly loaded HD key art, compact routes and the rooms 1-9 Veil atmosphere remain active without duplicate renderers.');
