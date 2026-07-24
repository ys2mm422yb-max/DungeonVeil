import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, menuScene, liveScene, hallArt, indexCss, villageHub, villagePlayer, player, weapons, manifest, metaStore, redesign, collection, equipmentVisuals, weaponVisuals, chamber] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/LiveHybridMainMenuScene.tsx'),
  read('../public/assets/hall/veil-hall-hero.svg'),
  read('../src/index.css'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/kaykitPlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/components/kaykitManifest3D.ts'),
  read('../src/game/metaStoreV4.ts'),
  read('../src/game/equipmentRedesign.ts'),
  read('../src/game/companionCollectionV5.ts'),
  read('../src/game/equipmentVisuals.ts'),
  read('../src/game/equipmentVisualsWeaponsV4.ts'),
  read('../src/components/screens/VeilChamberScreenV4.tsx'),
]);

const quiverDefinitionRows = [...weaponVisuals.matchAll(/'(?:ranger|black|rune|frost|splinter|warden)-quiver':\s*\{[^\n]+/g)].map(match => match[0]);
const allQuiverDefinitionsUseQuivers = quiverDefinitionRows.length === 6
  && quiverDefinitionRows.every(row => /assetPath:\s*`\$\{[^}]+\}\/[^`]*quiver[^`]*`/i.test(row));
const quiverPreviewsUseNarrowArrows = equipmentVisuals.includes('arrow_bow.gltf')
  && equipmentVisuals.includes('arrow_crossbow.gltf')
  && equipmentVisuals.includes('skeletonQuiverArrowAccessory')
  && !equipmentVisuals.includes('arrow_bow_bundle.gltf')
  && !equipmentVisuals.includes('arrow_crossbow_bundle.gltf');

const checks = [
  [menuScene.includes('data-composition="live-hybrid-scene"') && menuScene.includes('data-static-role="portal-atmosphere-only"'), 'live hybrid menu composition markers are missing'],
  [menuScene.includes('data-static-hero-embedded="false"') && menuScene.includes('main-menu-ambient-portal-art'), 'static embedded hero group was not retired from the visible menu composition'],
  [menuScene.includes('import.meta.env.BASE_URL') && menuScene.includes('assets/hall/veil-hall-hero.svg') && !menuScene.includes('assets/hall/veil-hall-hero.webp'), 'character-free ambient hall art is not resolved safely against the GitHub Pages base'],
  [hallArt.includes('data-static-role="portal-atmosphere-only"') && hallArt.includes('data-static-hero-embedded="false"') && !hallArt.includes('<image'), 'hall artwork contains an embedded image or does not prove that it is character-free'],
  [menuScene.includes('LiveHybridMainMenuScene') && liveScene.includes('loadKayKitVillageArcher'), 'the equipped live Ranger renderer is not mounted'],
  [liveScene.includes('data-testid="live-hybrid-main-menu-scene"') && liveScene.includes('data-renderer="single-live-menu-canvas"'), 'single live menu renderer diagnostics are missing'],
  [indexCss.includes("[data-testid='live-hybrid-main-menu-scene'] canvas") && indexCss.includes('image-rendering: auto') && liveScene.includes("renderer.domElement.style.imageRendering = 'auto'"), 'live menu canvas still inherits the gameplay pixel-art filter'],
  [liveScene.includes('data-animation-frames') && liveScene.includes('playerRig?.update(delta)') && liveScene.includes('requestAnimationFrame(loop)'), 'continuous Ranger idle animation proof is missing'],
  [liveScene.includes('activeCompanionV5') && liveScene.includes('COMPANION_COLLECTION_EVENT') && liveScene.includes("host.dataset.companionSpecies = 'none'"), 'V5 companion state or no-companion start contract is not respected'],
  [liveScene.includes("'veil-lynx'") && liveScene.includes("'ember-raven'") && liveScene.includes("'rune-sentinel'") && liveScene.includes("'lantern-wisp'") && liveScene.includes('MenuDuskDrake'), 'five distinct menu companion silhouettes are incomplete'],
  [liveScene.includes('MainMenuPlayerContactShadow') && liveScene.includes('MainMenuLiveCharacterFloor') && liveScene.includes('MainMenuLiveGroundHaze') && liveScene.includes('PointLight') && liveScene.includes('MainMenuLiveVeilParticles'), 'contact, shared lighting or atmosphere integration is missing'],
  [!liveScene.includes('MainMenuLivePortalGlow') && !liveScene.includes('MainMenuLivePortalCore'), 'live character layer reintroduced a duplicate 3D portal'],
  [menuScene.includes('SPECTATOR_RENDERER_EVENT') && menuScene.includes('if (suspended) return null'), 'exclusive spectator handoff is missing'],
  [menu.includes('<VillageNpcHub') && villageHub.includes('grid grid-cols-4') && !villageHub.includes('Wähle einen Ort') && !villageHub.includes('Choose a place'), 'compact social navigation is missing or contains the retired prompt'],
  [villageHub.includes('onClick={event => { event.preventDefault(); event.stopPropagation(); place.action(); }}') && !villageHub.includes('onPointerDown='), 'village actions still navigate on pointer-down instead of a completed isolated tap'],
  [menu.includes('main-menu-equipment-navigation') && menu.includes('props.onVeilChamber') && menu.includes("language === 'de' ? 'Ausrüstung' : 'Equipment'"), 'equipment remains inaccessible from the live menu'],
  [menu.includes('data-testid="main-menu-control-stack"') && menu.includes('grid-cols-2') && menu.includes('action(t.continueGame') && menu.includes("'Spielen' : 'Play'") && menu.includes("'Kodex' : 'Codex'"), 'four-action mobile control stack is incomplete'],
  [villagePlayer.includes('loadMetaProgression') && villagePlayer.includes('meta.equipped.bow') && villagePlayer.includes('meta.equipped.quiver') && villagePlayer.includes('meta.equipped.armor'), 'menu Ranger does not expose the current equipped loadout'],
  [villagePlayer.includes('idleAction.reset().play()') && villagePlayer.includes('mixer.update(delta)'), 'menu Ranger idle animation is missing'],
  [player.includes('KAYKIT_PLAYER_ASSETS.ranger') && player.includes('Ranger.glb'), 'the shared in-run Ranger body is no longer available'],
  [weapons.includes('const cacheKey = equipped?.bowId') && weapons.includes("definition?.slot === 'bow'"), 'equipped bow selection is not wired to the run model loader'],
  [weapons.includes('loader.loadAsync(modelUrl(manifest, bowPath))') && weapons.includes('loader.loadAsync(modelUrl(manifest, arrowPath))'), 'equipped weapon loader is not using manifest URLs'],
  [weapons.includes("const ashBowNeedsFlip = bowId === 'ash-bow'") && weapons.includes('ashBowNeedsFlip ? Math.PI') && weapons.includes('dungeonVeilBowAshFlip: ashBowNeedsFlip'), 'the Ash Bow does not have its dedicated 180-degree hand correction'],
  [menu.includes('data-testid="main-menu-shop-panel"')
    && menu.includes('data-testid="main-menu-options-panel"')
    && menu.includes('data-testid="main-menu-settings-button"')
    && menu.includes("current === 'shop' ? null : 'shop'")
    && menu.includes("current === 'options' ? null : 'options'")
    && menu.includes('props.onVeilChamber();')
    && menu.includes('Online & Cloud')
    && menu.includes('Tutorial wiederholen')
    && !menu.includes("current === 'more' ? null : 'more'")
    && !menu.includes('main-menu-resource-popover')
    && !menu.includes('main-menu-dust-button" type="button" onPointerDown'), 'shop and options routing is not isolated from the retired gold menu or unsafe pointer-down navigation'],
  [chamber.includes('onPointerUp={event => { event.preventDefault(); event.stopPropagation(); window.setTimeout(upgrade, 0); }}') && chamber.includes('onClick={event => { event.preventDefault(); event.stopPropagation(); }}') && chamber.includes('equipment-upgrade-button') && !chamber.includes('armMobilePointerSafety'), 'equipment upgrade is not locally isolated from mobile follow-up clicks'],
  [equipmentVisuals.includes('const xAxisBowPose') && equipmentVisuals.includes('const zAxisBowPose') && !equipmentVisuals.includes('/assets/imported/medieval-weapons'), 'equipment previews still use legacy imported bows or lack authored-axis poses'],
  [equipmentVisuals.includes('PlantWarrior_Bow_withString.gltf') && equipmentVisuals.includes('bow_C_withString.gltf'), 'new KayKit bow previews are not wired'],
  [weaponVisuals.includes('PlantWarrior_Bow_withString.gltf') && weaponVisuals.includes('bow_C_withString.gltf'), 'new KayKit bows are not wired to the equipped gameplay definitions'],
  [allQuiverDefinitionsUseQuivers, 'one or more equipment definitions use an arrow asset instead of a real quiver model'],
  [equipmentVisuals.includes('Skeleton_Quiver.gltf') && weaponVisuals.includes('Skeleton_Quiver.gltf') && quiverPreviewsUseNarrowArrows, 'Skeleton quiver or its narrow arrow/bolt preview is not wired consistently'],
  [player.includes('attachEquippedQuiver') && player.includes('const quiverDefinition = quiverEquipped ? EQUIPMENT[quiverId] : null') && !player.includes('quiverVariantGltf') && !player.includes('attachQuiverVariant'), 'gameplay still loads or attaches duplicate quiver variants'],
  [manifest.includes('import.meta.env.BASE_URL') && manifest.includes('appAssetUrl'), 'Pages-safe application asset resolver is missing'],
  [collection.includes('activeId: null') && collection.includes('unlockChapter: 2') && collection.includes('COMPANION_COLLECTION_EVENT'), 'V5 companion unlock and start-state contract is not respected'],
  [redesign.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']") && metaStore.includes('const RETIRED_TALISMAN_COMPAT = undefined as unknown as EquipmentId') && !metaStore.includes("talisman: 'veil-key'"), 'current three-slot equipment defaults or safe Talisman retirement are missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Live hybrid main-menu audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Live hybrid main-menu audit passed: character-free hall, animated equipped Ranger, isolated Shop and Options routing, normalized bow orientation, real single-attached quivers with clear arrow previews, expanded KayKit equipment, V5 companion state, smooth 3D filtering, one live canvas and full equipment access remain intact.');
