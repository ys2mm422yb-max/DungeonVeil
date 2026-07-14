import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [village, showcase, weapons, manifest, meta] = await Promise.all([
  read('../src/components/ModernVillageSquareScene.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/components/kaykitManifest3D.ts'),
  read('../src/game/metaProgression.ts'),
]);

const checks = [
  [village.includes("import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';") && village.includes('loadKayKitVillageArcher(THREE, GLTFLoader)'), 'main menu is not routed through the dedicated village archer loader'],
  [village.includes('rig.root.rotation.y = -0.42') && village.includes('rig.root.scale.setScalar(0.5)'), 'main-menu archer framing is not the corrected three-quarter showcase'],
  [showcase.includes('Rogue_Hooded.glb') && showcase.includes("clipKey(clip) === 'idle_b'"), 'hooded archer clothing or calm Idle_B is missing'],
  [showcase.includes("root.userData.presentation = 'village-showcase-v3-pages-safe'") && showcase.includes('root.userData.assetRoot = manifest.root'), 'menu showcase is not marked as the Pages-safe V3 renderer'],
  [showcase.includes('loadKayKitManifest') && showcase.includes('modelUrl(manifest, VILLAGE_ARCHER_MODEL)') && showcase.includes('modelUrl(manifest, GENERAL_ANIMATION_MODEL)'), 'character or animation bypasses the app base path'],
  [showcase.includes('modelUrl(manifest, quiverDefinition.assetPath)') && showcase.includes('modelUrl(manifest, talismanDefinition.assetPath)'), 'quiver or talisman bypasses the app base path'],
  [showcase.includes('VillageVisibleBow_${bowId}') && showcase.includes('VillageVisibleQuiver_${quiverId}') && showcase.includes('VillageVisibleTalisman_${talismanId}'), 'equipped gear does not have isolated visible showcase anchors'],
  [showcase.includes('root.userData.equippedLoadout = { bow: bowId, quiver: quiverId, talisman: talismanId }'), 'village showcase does not preserve the current equipped loadout'],
  [showcase.includes('buildProceduralBow') && showcase.includes('buildProceduralQuiver'), 'visible bow or quiver fallback is missing'],
  [showcase.includes('holder.position.set(crossbow ? 0.66 : 0.72') && showcase.includes('holder.position.set(-0.67, 1.05, 0.42)'), 'bow or quiver is still positioned behind the character'],
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

console.log('Main-menu equipped ranger audit passed: Pages-safe character and equipment URLs plus visible bow/quiver fallbacks are active.');
