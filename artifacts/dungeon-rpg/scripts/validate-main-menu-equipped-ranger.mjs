import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [village, showcase, weapons, meta] = await Promise.all([
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/game/metaProgression.ts'),
]);

const checks = [
  [village.includes("import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';") && village.includes('loadKayKitVillageArcher(THREE, GLTFLoader)'), 'main menu is not routed through the dedicated village archer loader'],
  [village.includes('rig.root.rotation.y = -0.42') && village.includes('rig.root.scale.setScalar(0.5)'), 'main-menu archer framing is not the corrected three-quarter showcase'],
  [showcase.includes('Rogue_Hooded.glb') && showcase.includes("clipKey(clip) === 'idle_b'"), 'hooded archer clothing or calm Idle_B is missing'],
  [showcase.includes('VillageVisibleBow_${bowId}') && showcase.includes('VillageVisibleQuiver_${quiverId}') && showcase.includes('VillageVisibleTalisman_${talismanId}'), 'equipped gear does not have isolated visible showcase anchors'],
  [showcase.includes('root.userData.equippedLoadout = { bow: bowId, quiver: quiverId, talisman: talismanId }'), 'village showcase does not preserve the current equipped loadout'],
  [showcase.includes('buildProceduralQuiver') && showcase.includes('quiverDefinition.assetPath'), 'all equipped quiver variants are not represented visibly'],
  [showcase.includes('holder.position.set(crossbow ? 0.62 : 0.68') && showcase.includes('holder.position.set(-0.62, 1.02, 0.28)'), 'bow or quiver is still positioned behind the character'],
  [weapons.includes('const cacheKey = equipped?.bowId') && weapons.includes("definition?.slot === 'bow'"), 'equipped bow selection is not wired to the model loader'],
  [meta.includes("equipped: Record<EquipmentSlot, EquipmentId>") && meta.includes("equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key' }"), 'equipment slots are not represented in saved meta progression'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Main-menu equipped ranger audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Main-menu equipped ranger audit passed: the dedicated hooded archer uses Idle_B and presents the selected bow, quiver and talisman in front-visible anchors.');
