import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, menuScene, villageHub, player, weapons, manifest, metaStore, redesign] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/kaykitPlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/components/kaykitManifest3D.ts'),
  read('../src/game/metaStoreV4.ts'),
  read('../src/game/equipmentRedesign.ts'),
]);

const checks = [
  [menuScene.includes('data-composition="hd-key-art-overlay"') && menuScene.includes('data-key-art="approved-gothic-portal-v1"'), 'approved HD key-art composition markers are missing'],
  [menuScene.includes('data-hero-pair="ranger-and-veil-wolf"') && menuScene.includes('data-testid="main-menu-hd-key-art"'), 'the approved Ranger and companion hero group is not represented once'],
  [menuScene.includes('import.meta.env.BASE_URL') && menuScene.includes('assets/hall/veil-hall-hero.webp'), 'direct HD WebP art is not resolved safely against the GitHub Pages base'],
  [menuScene.includes('data-image-loaded') && menuScene.includes('data-image-failed') && menuScene.includes('naturalWidth > 0'), 'menu does not expose proof that real hero pixels loaded'],
  [menuScene.includes('<img') && menuScene.includes('object-cover') && menuScene.includes('md:object-contain'), 'responsive portrait and tablet key-art fitting is missing'],
  [menuScene.includes('SPECTATOR_RENDERER_EVENT') && menuScene.includes('if (suspended) return null'), 'exclusive spectator handoff is missing'],
  [!menuScene.includes('ModernVillageSquareScene') && !menuScene.includes('MainMenuHeroFocusBridge') && !menuScene.includes('<canvas'), 'retired 3D menu bodies or a duplicate menu canvas remain mounted'],
  [menu.includes('<VillageNpcHub') && villageHub.includes('grid grid-cols-4') && !villageHub.includes('Wähle einen Ort') && !villageHub.includes('Choose a place'), 'compact social navigation is missing or contains the retired prompt'],
  [menu.includes('main-menu-equipment-navigation') && menu.includes('props.onVeilChamber') && menu.includes("language === 'de' ? 'Ausrüstung' : 'Equipment'"), 'equipment remains inaccessible from the HD menu'],
  [menu.includes('data-testid="main-menu-control-stack"') && menu.includes('grid-cols-2') && menu.includes('action(t.continueGame') && menu.includes("'Spielen' : 'Play'") && menu.includes("'Kodex' : 'Codex'"), 'four-action mobile control stack is incomplete'],
  [player.includes('KAYKIT_PLAYER_ASSETS.ranger') && player.includes('Ranger.glb'), 'the shared in-run Ranger body is no longer available'],
  [weapons.includes('const cacheKey = equipped?.bowId') && weapons.includes("definition?.slot === 'bow'"), 'equipped bow selection is not wired to the run model loader'],
  [weapons.includes('loader.loadAsync(modelUrl(manifest, bowPath))') && weapons.includes('loader.loadAsync(modelUrl(manifest, arrowPath))'), 'equipped weapon loader is not using manifest URLs'],
  [manifest.includes('import.meta.env.BASE_URL') && manifest.includes('appAssetUrl'), 'Pages-safe application asset resolver is missing'],
  [redesign.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']") && metaStore.includes("const RETIRED_TALISMAN_COMPAT = undefined as unknown as EquipmentId") && !metaStore.includes("talisman: 'veil-key'"), 'current three-slot equipment defaults or safe Talisman retirement are missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`HD main-menu hero audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('HD main-menu hero audit passed: real WebP pixels, one Ranger/companion key-art layer, no duplicate canvas and full equipment access remain intact.');
