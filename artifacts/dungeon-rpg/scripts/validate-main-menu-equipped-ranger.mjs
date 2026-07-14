import { readFile } from 'node:fs/promises';

// Guards the final V14 mobile composition against white lamp props, crowded NPCs and unreadable equipment.
// The live Pages proof additionally rejects lamp-table requests and requires three visible quiver arrows.
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
  [showcase.includes("root.userData.presentation = 'village-showcase-v14-player-focus'") && showcase.includes("root.userData.showcasePose = 'v14-idle-b-readable-loadout'"), 'focused V14 Ranger presentation mode is missing'],
  [showcase.includes('KAYKIT_PLAYER_ASSETS.ranger') && showcase.includes("visual.name = 'VillageRunRangerBody'"), 'menu does not use the same Ranger body as a run'],
  [showcase.includes("clipKey(clip).includes('idle_b')") && showcase.includes('new THREE.AnimationMixer(visual)'), 'calm Ranger Idle_B is not driving the menu body'],
  [showcase.includes("equipmentRoot.name = 'VillageReadableLoadout'") && !showcase.includes('loadKayKitRanger(THREE'), 'menu still reuses duplicate combat attachments'],
  [showcase.includes('material.depthTest = true') && showcase.includes('material.depthWrite = true') && !showcase.includes('material.depthTest = false'), 'menu equipment can still draw through the Ranger body'],
  [showcase.includes("'VillageVisibleEquippedBow'") && showcase.includes("'VillageVisibleEquippedQuiver'") && showcase.includes("'VillageVisibleEquippedTalisman'"), 'clean visible equipment anchors are incomplete'],
  [showcase.includes('bow: meta.equipped.bow') && showcase.includes('quiver: meta.equipped.quiver') && showcase.includes('talisman: meta.equipped.talisman'), 'village showcase does not preserve the current equipped loadout'],
  [showcase.includes('for (let index = 0; index < 3; index++)') && showcase.includes('VillageVisibleQuiverArrow'), 'quiver arrows are not visibly represented'],
  [showcase.includes('root.position.z = -1.82') && showcase.includes('root.scale.setScalar(0.72)'), 'player is not large and forward enough to dominate the menu composition'],
  [village.includes('villageRoot.userData.clearPlayerSilhouette = true') && village.includes('skinnedKeepersUseOriginalScenes = true'), 'village NPCs can still overlap the central player silhouette'],
  [!village.includes("{ key: 'table'") && !village.includes('QuestTable') && !village.includes('PostTable'), 'lamp-table assets can still appear as white cones in front of the NPCs'],
  [village.includes("mira: [[-4.05") && village.includes("orin: [[4.05") && village.includes("tala: [[-4.28") && village.includes("brom: [[4.28"), 'village keepers are not pushed to the side lanes'],
  [village.includes('camera.position.set(0, 5.35, 13.2)') && village.includes('camera.fov = camera.aspect < 0.72 ? 41 : 36'), 'mobile camera does not prioritize the player'],
  [village.includes('const playerKey = new THREE.PointLight') && village.includes('const playerRim = new THREE.PointLight'), 'player-focused key and rim lighting are missing'],
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

console.log('Main-menu equipped ranger audit passed: lamps are gone, NPCs stay in side lanes and one enlarged Ranger clearly shows the current bow, quiver, arrows and talisman.');
