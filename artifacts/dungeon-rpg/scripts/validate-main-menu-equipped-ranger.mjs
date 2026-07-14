import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [village, rig, weapons, meta] = await Promise.all([
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/components/kaykitPlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/game/metaProgression.ts'),
]);

const checks = [
  [village.includes("loadKayKitRanger(THREE, GLTFLoader, { presentation: 'village' })"), 'main menu does not request the clean village presentation'],
  [village.includes("rig.root.name = 'VillageEquippedPlayer'") && village.includes('rig.root.rotation.y = -0.28') && village.includes('rig.root.scale.setScalar(0.45)'), 'main-menu ranger framing is not the corrected three-quarter showcase'],
  [rig.includes("export type KayKitRangerPresentation = 'combat' | 'village'"), 'ranger rig has no separate village presentation mode'],
  [rig.includes('VillageEquippedBow_${id}') && rig.includes('VillageEquippedQuiver_${id}') && rig.includes('VillageEquippedTalisman_${id}'), 'equipped village gear does not have isolated presentation anchors'],
  [rig.includes('root.userData.equippedLoadout = { bow: bowId, quiver: quiverId, talisman: talismanId }'), 'village rig does not preserve the current equipped loadout'],
  [rig.includes("const selectedQuiver = quiverId === 'ranger-quiver' ? quiverGltf.scene : quiverVariantGltf?.scene ?? quiverGltf.scene"), 'selected quiver is not used as the single village quiver visual'],
  [rig.includes("if (presentation === 'village')") && rig.includes('attachVillageBow(THREE, root, weapons.bow, bowId)'), 'village still uses the combat hand-bow rig'],
  [weapons.includes('const cacheKey = equipped?.bowId') && weapons.includes('definition?.slot === \'bow\''), 'equipped bow selection is not wired to the model loader'],
  [meta.includes("equipped: Record<EquipmentSlot, EquipmentId>") && meta.includes("equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key' }"), 'equipment slots are not represented in saved meta progression'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Main-menu equipped ranger audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Main-menu equipped ranger audit passed: the clean base outfit, selected bow, selected quiver and talisman are isolated in the village showcase.');
