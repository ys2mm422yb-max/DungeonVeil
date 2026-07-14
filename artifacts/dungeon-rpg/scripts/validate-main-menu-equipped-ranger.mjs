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
  [village.includes('rig.root.position.set(0, -0.02, -2.85)') && village.includes('rig.root.rotation.y = 0.08') && village.includes('rig.root.scale.setScalar(0.52)'), 'main-menu Ranger is not separated from the shrine and framed from the front'],
  [village.includes("shrine: [[0, 0.02, -6.1") && village.includes("'VillageSquareShrine'"), 'village shrine can still visually merge with the player'],
  [showcase.includes("import { loadKayKitRanger") && showcase.includes('loadKayKitRanger(THREE, pagesSafeLoader(GLTFLoader))'), 'menu does not reuse the exact in-game Ranger rig'],
  [showcase.includes("root.userData.presentation = 'village-showcase-v4-run-ranger'") && showcase.includes('rig.setMoving(false)'), 'V4 run-Ranger presentation mode is missing'],
  [showcase.includes("url.startsWith('/assets/')") && showcase.includes('import.meta.env.BASE_URL'), 'shared run rig URLs are not rewritten below the Pages base path'],
  [showcase.includes('bow: meta.equipped.bow') && showcase.includes('quiver: meta.equipped.quiver') && showcase.includes('talisman: meta.equipped.talisman'), 'village showcase does not preserve the current equipped loadout'],
  [player.includes('attachBowToRanger') && player.includes('attachQuiver(spine') && player.includes('attachTalisman(THREE, chest'), 'shared in-game equipment attachments are incomplete'],
  [player.includes('KAYKIT_PLAYER_ASSETS.ranger') && player.includes('Ranger.glb'), 'shared player rig is not the in-game Ranger body'],
  [weapons.includes('const cacheKey = equipped?.bowId') && weapons.includes("definition?.slot === 'bow'"), 'equipped bow selection is not wired to the model loader'],
  [weapons.includes('loader.loadAsync(modelUrl(manifest, bowPath))') && weapons.includes('loader.loadAsync(modelUrl(manifest, arrowPath))') && !weapons.includes("const KAYKIT_ROOT = '/assets/kaykit'"), 'equipped weapon loader still uses domain-root asset URLs'],
  [manifest.includes('import.meta.env.BASE_URL') && manifest.includes('appAssetUrl'), 'Pages-safe application asset resolver is missing'],
  [meta.includes("equipped: Record<EquipmentSlot, EquipmentId>") && meta.includes("equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key' }"), 'equipment slots are not represented in saved meta progression'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Main-menu equipped ranger audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Main-menu equipped ranger audit passed: the village reuses the real run Ranger and equipment rig with Pages-safe URLs and clear shrine separation.');
