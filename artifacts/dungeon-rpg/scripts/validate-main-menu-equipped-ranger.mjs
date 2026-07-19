import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [wrapper, hall, mainMenu, villageHub, showcase, player, weapons, manifest, metaStore, redesign] = await Promise.all([
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/components/HallOfVeilScene.tsx'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/kaykitPlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/components/kaykitManifest3D.ts'),
  read('../src/game/metaStoreV4.ts'),
  read('../src/game/equipmentRedesign.ts'),
]);

const rendererCount = hall.match(/new THREE\.WebGLRenderer/g)?.length ?? 0;
const checks = [
  [wrapper.includes("import { HallOfVeilScene } from './HallOfVeilScene';") && wrapper.includes('<HallOfVeilScene />'), 'legacy menu wrapper is not routed exclusively through the Hall of the Veil'],
  [hall.includes("import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';") && hall.includes('loadKayKitVillageArcher(THREE, GLTFLoader)'), 'Hall of the Veil is not routed through the equipped player adapter'],
  [hall.includes("hallRoot.userData.sceneContract = 'hall-of-the-veil-v4'") && hall.includes('data-hall-of-the-veil="true"'), 'Hall of the Veil scene contract is missing'],
  [hall.includes('marketStalls: 0') && hall.includes('decorativeNpcs: 0') && hall.includes('data-market-stalls="0"') && hall.includes('data-decorative-npcs="0"'), 'market stalls or decorative NPCs can still be represented'],
  [!hall.includes('buildMarketStall') && !hall.includes('MiraQuestKeeper') && !hall.includes('OrinPostKeeper') && !hall.includes('TalaScoutKeeper') && !hall.includes('BromGuildKeeper'), 'legacy stalls or keeper NPCs remain in the Hall of the Veil'],
  [hall.includes("root.name = 'MonumentalVeilGate'") && hall.includes('gateRings') && hall.includes('vortexLayers') && hall.includes('runeDiamonds'), 'monumental layered veil gate is missing'],
  [hall.includes("{ key: 'pillar'") && hall.includes("{ key: 'banner'") && hall.includes("{ key: 'torch'"), 'pillars, banners or torch assets are missing'],
  [hall.includes('mistLayers') && hall.includes('HALL_PARTICLE_COUNT = IS_MOBILE ? 14 : 26') && hall.includes("particles.name = 'HallBoundedVeilParticles'"), 'bounded mobile mist and particle atmosphere is missing'],
  [rendererCount === 1 && hall.includes("renderer.domElement.setAttribute('data-menu-renderer', 'hall-of-the-veil')"), 'Hall menu does not own exactly one renderer'],
  [hall.includes('if (IS_MOBILE && now - lastFrame < 33) return') && hall.includes('renderer.setPixelRatio(Math.min'), 'mobile renderer throttling or pixel-ratio cap is missing'],
  [hall.includes('camera.position.set(0, 5.28, 13.35)') && hall.includes('camera.fov = camera.aspect < 0.72 ? 42 : 36'), 'portrait camera does not prioritize the centered character'],
  [hall.includes('const playerKey = new THREE.PointLight') && hall.includes('const playerRim = new THREE.PointLight') && hall.includes('const gateLight = new THREE.PointLight'), 'player and veil-gate lighting are incomplete'],
  [mainMenu.includes('`${equipped.bow}:${equipped.quiver}:${equipped.armor}`') && !mainMenu.includes('equipped.talisman'), 'menu scene key still depends on the retired Talisman instead of current armor'],
  [mainMenu.includes('SPECTATOR_RENDERER_EVENT') && mainMenu.includes('if (suspended) return null'), 'exclusive spectator renderer handoff is missing'],
  [showcase.includes("root.userData.presentation = 'village-showcase-v14-player-focus'") && showcase.includes("root.userData.showcasePose = 'v14-idle-b-readable-loadout'"), 'focused Ranger presentation mode is missing'],
  [showcase.includes("root.userData.equipmentPose = 'left-hand-bow-right-shoulder-quiver'"), 'natural bow and quiver presentation pose is missing'],
  [showcase.includes('KAYKIT_PLAYER_ASSETS.ranger') && showcase.includes("visual.name = 'VillageRunRangerBody'"), 'menu does not use the same Ranger body as a run'],
  [showcase.includes("clipKey(clip).includes('idle_b')") && showcase.includes('new THREE.AnimationMixer(visual)'), 'calm Ranger Idle_B is not driving the menu body'],
  [showcase.includes("equipmentRoot.name = 'VillageReadableLoadout'") && !showcase.includes('loadKayKitRanger(THREE'), 'menu still reuses duplicate combat attachments'],
  [showcase.includes('material.depthTest = true') && showcase.includes('material.depthWrite = true') && !showcase.includes('material.depthTest = false'), 'menu equipment can still draw through the Ranger body'],
  [showcase.includes("'VillageVisibleEquippedBow'") && showcase.includes("'VillageVisibleEquippedQuiver'") && !showcase.includes('VillageVisibleEquippedTalisman'), 'clean visible current-equipment anchors are incomplete or the retired Talisman remains'],
  [showcase.includes('bow: meta.equipped.bow') && showcase.includes('quiver: meta.equipped.quiver') && showcase.includes('armor: meta.equipped.armor') && !showcase.includes('talisman: meta.equipped.talisman'), 'menu showcase does not preserve only the current three-slot loadout'],
  [showcase.includes('root.position.z = -1.82') && showcase.includes('root.scale.setScalar(0.72)'), 'player is not large and forward enough to dominate the composition'],
  [villageHub.includes('grid grid-cols-4') && !villageHub.includes('Wähle einen Ort') && !villageHub.includes('Choose a place'), 'redundant place prompt remains or social routes are not compact'],
  [showcase.includes('function resolveVillageAssetUrl') && showcase.includes('new URL(NORMALIZED_APP_BASE_URL, window.location.origin)') && showcase.includes('return new URL(relative, appBase).href'), 'menu asset URLs are not resolved against the Pages base exactly once'],
  [player.includes('KAYKIT_PLAYER_ASSETS.ranger') && player.includes('Ranger.glb'), 'shared player rig no longer uses the in-game Ranger body'],
  [weapons.includes('const cacheKey = equipped?.bowId') && weapons.includes("definition?.slot === 'bow'"), 'equipped bow selection is not wired to the model loader'],
  [weapons.includes('loader.loadAsync(modelUrl(manifest, bowPath))') && weapons.includes('loader.loadAsync(modelUrl(manifest, arrowPath))'), 'equipped weapon loader is not using manifest URLs'],
  [manifest.includes('import.meta.env.BASE_URL') && manifest.includes('appAssetUrl'), 'Pages-safe application asset resolver is missing'],
  [redesign.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']") && metaStore.includes('const RETIRED_TALISMAN_COMPAT = undefined as unknown as EquipmentId') && metaStore.includes('talisman: RETIRED_TALISMAN_COMPAT') && !metaStore.includes("talisman: 'veil-key'") && metaStore.includes("hasOwnProperty.call(parsed?.equipped ?? {}, 'talisman')"), 'current three-slot defaults, omitted compatibility value or safe legacy-Talisman rewrite are not represented in saved meta progression'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Hall of the Veil menu audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Hall of the Veil menu audit passed: no market NPC clutter, one mobile renderer, centered equipped Ranger, current armor key and exclusive spectator handoff.');
