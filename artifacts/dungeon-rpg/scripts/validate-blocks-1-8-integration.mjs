import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [main, packageJson, progression, navigation, portal, village, villagePlayer, guild, roomAudit, roomComposition, bossClient] = await Promise.all([
  read('../src/main.tsx'),
  read('../package.json'),
  read('./validate-social-progression.mjs'),
  read('./validate-social-navigation.mjs'),
  read('../src/game/portalExitPolicy.ts'),
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('./validate-room-quality-6-50.mjs'),
  read('./validate-rooms-4-5-composition.mjs'),
  read('../src/game/worldBossAttemptOnline.ts'),
]);

const checks = [
  [main.includes("import './game/portalExitPolicy';") && main.includes('installEmailConfirmationRedirect();'), 'auth redirect and portal policy are not both installed'],
  [packageJson.includes('validate-rooms-4-5-composition.mjs') && packageJson.includes('validate-room-quality-6-50.mjs') && packageJson.includes('validate-guild-mobile-layout.mjs'), 'combined room and guild audits are missing'],
  [progression.includes('attemptMigration') && progression.includes('villageScene') && progression.includes('GuildPanelMobile'), 'social progression audit lost a block during integration'],
  [navigation.includes('ModernVillageSquareScene') && navigation.includes("!menu.includes('<GuildInviteLinkCard')"), 'social navigation audit lost village or guild routing'],
  [portal.includes('this.livingEnemies().length === 0') && portal.includes('const exitRadius = TILE_SIZE * 1.05'), 'loot-independent portal behavior is missing'],
  [village.includes('loadKayKitVillageArcher') && villagePlayer.includes("root.name = 'VillageEquippedPlayer'") && villagePlayer.includes('loadKayKitRanger') && villagePlayer.includes("village-showcase-v4-run-ranger"), 'real equipped run Ranger is missing from the village'],
  [guild.includes('guild-close-button') && guild.includes('GuildInviteLinkCard'), 'fixed guild close or invite-tab content is missing'],
  [roomAudit.includes('all 45 rooms from 6–50') && roomComposition.includes('Rooms 4–5 composition audit passed'), 'room quality coverage is incomplete'],
  [bossClient.includes('getWorldBossAttemptStatus') && bossClient.includes('startWorldBossAttempt'), 'five-minute world-boss resume client is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  failures.forEach(message => console.error(`BLOCK 8 INTEGRATION FAIL: ${message}`));
  process.exit(1);
}

console.log('Block 8 integration audit passed: the final Blocks 1–7 changes and the real equipped run Ranger coexist in one clean device-review snapshot.');
