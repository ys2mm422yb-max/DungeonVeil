import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [main, packageJson, roomSuite, progression, navigation, portal, villageProxy, hall, villagePlayer, guild, roomAudit, roomComposition, bossClient] = await Promise.all([
  read('../src/main.tsx'),
  read('../package.json'),
  read('./run-room-audit-suite.mjs'),
  read('./validate-social-progression.mjs'),
  read('./validate-social-navigation.mjs'),
  read('../src/game/portalExitPolicy.ts'),
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/components/HallOfVeilScene.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('./validate-room-quality-6-50.mjs'),
  read('./validate-rooms-4-5-composition.mjs'),
  read('../src/game/worldBossAttemptOnline.ts'),
]);

const checks = [
  [main.includes("import './game/portalExitPolicy';") && main.includes('installEmailConfirmationRedirect();'), 'auth redirect and portal policy are not both installed'],
  [packageJson.includes('node scripts/run-room-audit-suite.mjs') && roomSuite.includes('validate-rooms-4-5-composition.mjs') && roomSuite.includes('validate-room-quality-6-50.mjs') && roomSuite.includes('validate-guild-mobile-layout.mjs'), 'consolidated room and guild audit coverage is missing'],
  [progression.includes('attemptMigration') && progression.includes('hallScene') && progression.includes('GuildPanelMobile'), 'social progression audit lost a block during integration'],
  [navigation.includes('ModernVillageSquareScene') && navigation.includes('HallOfVeilScene') && navigation.includes("!menu.includes('<GuildInviteLinkCard')"), 'social navigation audit lost Hall or guild routing'],
  [portal.includes('this.livingEnemies().length === 0') && portal.includes('const exitRadius = TILE_SIZE * 1.05'), 'loot-independent portal behavior is missing'],
  [villageProxy.includes('HallOfVeilScene') && hall.includes('loadKayKitVillageArcher') && hall.includes("hallRoot.userData.sceneContract = 'hall-of-the-veil-v4'") && hall.includes('marketStalls: 0') && hall.includes('decorativeNpcs: 0') && villagePlayer.includes("root.name = 'VillageEquippedPlayer'") && villagePlayer.includes('KAYKIT_PLAYER_ASSETS.ranger') && villagePlayer.includes('village-showcase-v14-player-focus') && villagePlayer.includes("equipmentRoot.name = 'VillageReadableLoadout'") && villagePlayer.includes('root.scale.setScalar(0.72)'), 'focused equipped Ranger is missing from the Hall of the Veil'],
  [guild.includes('guild-close-button') && guild.includes('GuildInviteLinkCard'), 'fixed guild close or invite-tab content is missing'],
  [roomAudit.includes('all 45 rooms from 6–50') && roomComposition.includes('Rooms 4–5 composition audit passed'), 'room quality coverage is incomplete'],
  [bossClient.includes('getWorldBossAttemptStatus') && bossClient.includes('startWorldBossAttempt'), 'five-minute world-boss resume client is missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  failures.forEach(message => console.error(`BLOCK 8 INTEGRATION FAIL: ${message}`));
  process.exit(1);
}

await import('./validate-blocks-4-15-integration.mjs');
console.log('Combined integration audit passed: legacy Blocks 1–8 and current Blocks 4–17 remain compatible with the Hall of the Veil in one build.');
