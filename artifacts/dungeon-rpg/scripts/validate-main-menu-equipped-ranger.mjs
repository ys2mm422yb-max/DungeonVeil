import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, menuScene, liveScene, villageHub, villagePlayer, player, weapons, manifest, metaStore, redesign, collection] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/LiveHybridMainMenuScene.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/kaykitPlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/components/kaykitManifest3D.ts'),
  read('../src/game/metaStoreV4.ts'),
  read('../src/game/equipmentRedesign.ts'),
  read('../src/game/companionCollectionV5.ts'),
]);

const checks = [
  [menuScene.includes('data-composition="live-hybrid-scene"') && menuScene.includes('data-static-role="portal-atmosphere-only"'), 'live hybrid menu composition markers are missing'],
  [menuScene.includes('data-static-hero-embedded="false"') && menuScene.includes('main-menu-ambient-portal-art'), 'static embedded hero group was not retired from the visible menu composition'],
  [menuScene.includes('import.meta.env.BASE_URL') && menuScene.includes('assets/hall/veil-hall-hero.webp'), 'ambient portal art is not resolved safely against the GitHub Pages base'],
  [menuScene.includes('LiveHybridMainMenuScene') && liveScene.includes('loadKayKitVillageArcher'), 'the equipped live Ranger renderer is not mounted'],
  [liveScene.includes('data-testid="live-hybrid-main-menu-scene"') && liveScene.includes('data-renderer="single-live-menu-canvas"'), 'single live menu renderer diagnostics are missing'],
  [liveScene.includes('data-animation-frames') && liveScene.includes('playerRig?.update(delta)') && liveScene.includes('requestAnimationFrame(loop)'), 'continuous Ranger idle animation proof is missing'],
  [liveScene.includes('activeCompanionV5') && liveScene.includes('COMPANION_COLLECTION_EVENT') && liveScene.includes("host.dataset.companionSpecies = 'none'"), 'V5 companion state or no-companion start contract is not respected'],
  [liveScene.includes("'veil-lynx'") && liveScene.includes("'ember-raven'") && liveScene.includes("'rune-sentinel'") && liveScene.includes("'lantern-wisp'") && liveScene.includes('MenuDuskDrake'), 'five distinct menu companion silhouettes are incomplete'],
  [liveScene.includes('MainMenuPlayerContactShadow') && liveScene.includes('PointLight') && liveScene.includes('MainMenuLiveVeilParticles'), 'contact, shared lighting or atmosphere integration is missing'],
  [menuScene.includes('SPECTATOR_RENDERER_EVENT') && menuScene.includes('if (suspended) return null'), 'exclusive spectator handoff is missing'],
  [menu.includes('<VillageNpcHub') && villageHub.includes('grid grid-cols-4') && !villageHub.includes('Wähle einen Ort') && !villageHub.includes('Choose a place'), 'compact social navigation is missing or contains the retired prompt'],
  [menu.includes('main-menu-equipment-navigation') && menu.includes('props.onVeilChamber') && menu.includes("language === 'de' ? 'Ausrüstung' : 'Equipment'"), 'equipment remains inaccessible from the live menu'],
  [menu.includes('data-testid="main-menu-control-stack"') && menu.includes('grid-cols-2') && menu.includes('action(t.continueGame') && menu.includes("'Spielen' : 'Play'") && menu.includes("'Kodex' : 'Codex'"), 'four-action mobile control stack is incomplete'],
  [villagePlayer.includes('loadMetaProgression') && villagePlayer.includes('meta.equipped.bow') && villagePlayer.includes('meta.equipped.quiver') && villagePlayer.includes('meta.equipped.armor'), 'menu Ranger does not expose the current equipped loadout'],
  [villagePlayer.includes('idleAction.reset().play()') && villagePlayer.includes('mixer.update(delta)'), 'menu Ranger idle animation is missing'],
  [player.includes('KAYKIT_PLAYER_ASSETS.ranger') && player.includes('Ranger.glb'), 'the shared in-run Ranger body is no longer available'],
  [weapons.includes('const cacheKey = equipped?.bowId') && weapons.includes("definition?.slot === 'bow'"), 'equipped bow selection is not wired to the run model loader'],
  [weapons.includes('loader.loadAsync(modelUrl(manifest, bowPath))') && weapons.includes('loader.loadAsync(modelUrl(manifest, arrowPath))'), 'equipped weapon loader is not using manifest URLs'],
  [manifest.includes('import.meta.env.BASE_URL') && manifest.includes('appAssetUrl'), 'Pages-safe application asset resolver is missing'],
  [collection.includes('activeId: null') && collection.includes('unlockChapter: 2') && collection.includes('COMPANION_COLLECTION_EVENT'), 'companion V5 unlock and start-state contract is missing'],
  [redesign.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']") && metaStore.includes('const RETIRED_TALISMAN_COMPAT = undefined as unknown as EquipmentId') && !metaStore.includes("talisman: 'veil-key'"), 'current three-slot equipment defaults or safe Talisman retirement are missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Live hybrid main-menu audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Live hybrid main-menu audit passed: animated equipped Ranger, V5 companion state, one canvas, portal atmosphere and full equipment access remain intact.');
