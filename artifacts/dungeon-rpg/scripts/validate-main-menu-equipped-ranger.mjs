import { readFile } from 'node:fs/promises';

// Guards the final reviewed mobile composition against white lamp props, crowded NPCs,
// redundant labels and unnatural equipment placement after the live V15 deployment.
const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [village, villageHub, showcase, player, weapons, manifest, metaStore, redesign] = await Promise.all([
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/kaykitPlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/components/kaykitManifest3D.ts'),
  read('../src/game/metaStoreV4.ts'),
  read('../src/game/equipmentRedesign.ts'),
]);

const checks = [
  [village.includes("import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';") && village.includes('loadKayKitVillageArcher(THREE, GLTFLoader)'), 'main menu is not routed through the village player adapter'],
  [showcase.includes("root.userData.presentation = 'village-showcase-v14-player-focus'") && showcase.includes("root.userData.showcasePose = 'v14-idle-b-readable-loadout'"), 'focused Ranger presentation mode is missing'],
  [showcase.includes("root.userData.equipmentPose = 'left-hand-bow-right-shoulder-quiver'"), 'natural bow and quiver presentation pose is missing'],
  [showcase.includes('KAYKIT_PLAYER_ASSETS.ranger') && showcase.includes("visual.name = 'VillageRunRangerBody'"), 'menu does not use the same Ranger body as a run'],
  [showcase.includes("clipKey(clip).includes('idle_b')") && showcase.includes('new THREE.AnimationMixer(visual)'), 'calm Ranger Idle_B is not driving the menu body'],
  [showcase.includes("equipmentRoot.name = 'VillageReadableLoadout'") && !showcase.includes('loadKayKitRanger(THREE'), 'menu still reuses duplicate combat attachments'],
  [showcase.includes('material.depthTest = true') && showcase.includes('material.depthWrite = true') && !showcase.includes('material.depthTest = false'), 'menu equipment can still draw through the Ranger body'],
  [showcase.includes("'VillageVisibleEquippedBow'") && showcase.includes("'VillageVisibleEquippedQuiver'") && !showcase.includes('VillageVisibleEquippedTalisman'), 'clean visible current-equipment anchors are incomplete or the retired Talisman remains'],
  [showcase.includes('[-0.54, 0.78, 0.2]') && showcase.includes('[Math.PI / 2, -0.05, -0.38]'), 'bow is not positioned beside the left hand'],
  [showcase.includes('[0.46, 1.3, -0.1]') && showcase.includes('[0.06, 0.48, 0.14]'), 'quiver is not positioned behind the right shoulder'],
  [showcase.includes('bow: meta.equipped.bow') && showcase.includes('quiver: meta.equipped.quiver') && showcase.includes('armor: meta.equipped.armor') && !showcase.includes('talisman: meta.equipped.talisman'), 'village showcase does not preserve only the current three-slot loadout'],
  [showcase.includes('for (let index = 0; index < 3; index++)') && showcase.includes('VillageVisibleQuiverArrow'), 'quiver arrows are not visibly represented'],
  [showcase.includes('root.position.z = -1.82') && showcase.includes('root.scale.setScalar(0.72)'), 'player is not large and forward enough to dominate the menu composition'],
  [villageHub.includes('grid grid-cols-4') && !villageHub.includes('Wähle einen Ort') && !villageHub.includes('Choose a place'), 'redundant village place prompt remains or social routes are not compact'],
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
  [redesign.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']") && metaStore.includes("const RETIRED_TALISMAN_COMPAT = undefined as unknown as EquipmentId") && metaStore.includes("talisman: RETIRED_TALISMAN_COMPAT") && !metaStore.includes("talisman: 'veil-key'") && metaStore.includes("hasOwnProperty.call(parsed?.equipped ?? {}, 'talisman')"), 'current three-slot defaults, omitted compatibility value or safe legacy-Talisman rewrite are not represented in saved meta progression'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Main-menu equipped ranger audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Main-menu equipped ranger audit passed: the prompt is gone, current bow/quiver/armor data stays coherent and the retired Talisman is absent from menu presentation and serialized saves.');
