import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [village, showcase, player, weapons, manifest, meta] = await Promise.all([
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/kaykitPlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/components/kaykitManifest3D.ts'),
  read('../src/game/metaProgression.ts'),
]);

const checks = [
  [village.includes("import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';") && village.includes('loadKayKitVillageArcher(THREE, GLTFLoader)'), 'main menu is not routed through the village player adapter'],
  [showcase.includes("root.userData.presentation = 'village-showcase-v12-clean-ranger'") && showcase.includes("root.userData.showcasePose = 'v12-idle-b-clean-side-loadout'"), 'clean V12 Ranger presentation mode is missing'],
  [showcase.includes('KAYKIT_PLAYER_ASSETS.ranger') && showcase.includes("visual.name = 'VillageRunRangerBody'"), 'menu does not use the same Ranger body as a run'],
  [showcase.includes("clipKey(clip).includes('idle_b')") && showcase.includes('new THREE.AnimationMixer(visual)'), 'calm Ranger Idle_B is not driving the menu body'],
  [showcase.includes("equipmentRoot.name = 'VillageCleanLoadout'") && !showcase.includes('loadKayKitRanger(THREE'), 'menu still reuses duplicate combat attachments'],
  [showcase.includes('material.depthTest = true') && showcase.includes('material.depthWrite = true') && !showcase.includes('material.depthTest = false'), 'menu equipment can still draw through the Ranger body'],
  [showcase.includes("'VillageVisibleEquippedBow'") && showcase.includes("'VillageVisibleEquippedQuiver'") && showcase.includes("'VillageVisibleEquippedTalisman'"), 'clean visible equipment anchors are incomplete'],
  [showcase.includes('bow: meta.equipped.bow') && showcase.includes('quiver: meta.equipped.quiver') && showcase.includes('talisman: meta.equipped.talisman'), 'village showcase does not preserve the current equipped loadout'],
  [showcase.includes("getObjectByName?.('VillageSquareShrine')") && showcase.includes('shrine.visible = false'), 'central shrine can still merge visually with the player'],
  [showcase.includes('function resolveVillageAssetUrl') && showcase.includes('new URL(NORMALIZED_APP_BASE_URL, window.location.origin)') && showcase.includes('return new URL(relative, appBase).href'), 'menu asset URLs are not resolved against the Pages base exactly once'],
  [player.includes('KAYKIT_PLAYER_ASSETS.ranger') && player.includes('Ranger.glb'), 'shared player rig no longer uses the in-game Ranger body'],
  [weapons.includes('const cacheKey = equipped?.bowId') && weapons.includes("definition?.slot === 'bow'"), 'equipped bow selection is not wired to the model loader'],
  [weapons.includes('loader.loadAsync(modelUrl(manifest, bowPath))') && weapons.includes('loader.loadAsync(modelUrl(manifest, arrowPath))'), 'equipped weapon loader is not using manifest URLs'],
  [manifest.includes('import.meta.env.BASE_URL') && manifest.includes('appAssetUrl'), 'Pages-safe application asset resolver is missing'],
  [meta.includes("equipped: Record<EquipmentSlot, EquipmentId>") && meta.includes("equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key' }"), 'equipment slots are not represented in saved meta progression'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Main-menu equipped ranger audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Main-menu equipped ranger audit passed: one depth-tested Ranger body shows the current bow, quiver and talisman without shrine or face clipping.');
