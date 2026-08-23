import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [
  menuScene,
  liveScene,
  villagePlayer,
  weapons,
  menuScreen,
  menuCss,
  focusedSpec,
  regressionConfig,
  workflow,
  productWorkflow,
] = await Promise.all([
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/LiveHybridMainMenuScene.tsx'),
  read('../src/components/kaykitVillagePlayer3D.ts'),
  read('../src/components/kaykitWeapons3D.ts'),
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/mainMenuPresentation.css'),
  read('../tests/block-20-main-menu.spec.mjs'),
  read('../playwright.regression.config.mjs'),
  read('../../../.github/workflows/main-menu-visual-regression.yml'),
  read('../../../.github/workflows/product-autopilot-qa.yml'),
]);

const checks = [
  [menuScene.includes("addEventListener('webglcontextlost'") && menuScene.includes("addEventListener('webglcontextrestored'") && menuScene.includes('event.preventDefault()'), 'WebGL loss and restoration are not captured with preventDefault'],
  [menuScene.includes('setRendererGeneration(value => value + 1)') && menuScene.includes('key={`live-menu-renderer-${rendererGeneration}`}'), 'WebGL recovery does not remount exactly one renderer generation'],
  [menuScene.includes('data-webgl-context-contract="captured-loss-remount-recovery"') && menuScene.includes('data-webgl-recoveries={webglRecoveries}') && menuScene.includes('data-renderer-generation={rendererGeneration}'), 'WebGL recovery diagnostics are incomplete'],
  [menuScene.includes('main-menu-webgl-recovery-fallback') && menuScene.includes("webglState !== 'ready'"), 'static portal recovery fallback is missing while WebGL restarts'],
  [menuScene.includes('data-reduced-motion-contract="static-ranger-and-portal-fallback"') && menuScene.includes('main-menu-reduced-motion-fallback') && menuScene.includes("setWebglState('reduced-motion')"), 'Reduced Motion does not retain a static Ranger and portal composition'],
  [liveScene.includes('data-renderer="single-live-menu-canvas"') && liveScene.includes("renderer.domElement.dataset.testid = 'live-hybrid-main-menu-canvas'") && liveScene.includes('requestAnimationFrame(loop)'), 'single continuously animated live-menu canvas contract is missing'],
  [liveScene.includes('activeCompanionV5()') && liveScene.includes('COMPANION_COLLECTION_EVENT') && liveScene.includes("host.dataset.companionSpecies = 'none'"), 'active and no-companion V5 states are not synchronized'],
  [villagePlayer.includes('loadMetaProgression()') && villagePlayer.includes("isOptionalEquipmentSlotEquipped('quiver')") && villagePlayer.includes('__DUNGEON_VEIL_MENU_RANGER__') && villagePlayer.includes('visibleEquipment'), 'equipped bow, quiver and armor diagnostics are not synchronized'],
  [villagePlayer.includes("showcasePose = 'v16-sampled-idle-a-root-motion-loadout'") && villagePlayer.indexOf("clipKey(clip).includes('idle_a')") >= 0 && villagePlayer.indexOf("!key.includes('idle_b')") > villagePlayer.indexOf("clipKey(clip).includes('idle_a')"), 'village Ranger does not fail closed on the stable Idle_A showcase pose'],
  [villagePlayer.includes("idleAction.paused = true") && villagePlayer.includes("animationDriver: 'stable-root-idle-v1'") && villagePlayer.includes("skeletalPlayback: 'frozen-after-pose-sample'") && !villagePlayer.includes('mixer.update(delta);'), 'village Ranger still performs per-frame skeletal playback instead of stable root motion'],
  [villagePlayer.includes('function bakeStablePose(') && villagePlayer.includes('node.getVertexPosition(index, vertex)') && villagePlayer.includes("meshPipeline: 'baked-static-pose-v1'") && villagePlayer.includes('skinnedMeshCount !== 0'), 'village Ranger pose is not baked out of the unstable mobile WebKit SkinnedMesh path'],
  [weapons.includes("assets/vendor/three/examples/jsm/loaders/GLTFLoader.js") && weapons.includes('import.meta.env.BASE_URL') && !/https?:\/\/cdn\./i.test(weapons), 'Ranger weapon loading still depends on an external CDN instead of the local Three.js runtime'],
  [liveScene.includes("assets/vendor/three/build/three.module.js") && liveScene.includes("assets/vendor/three/examples/jsm/loaders/GLTFLoader.js") && !/https?:\/\/cdn\./i.test(liveScene), 'live menu renderer is not fully local'],
  [menuCss.includes('@keyframes dv-menu-portal-breathe') && menuCss.includes('radial-gradient(circle at 18% 36%') && menuCss.includes('radial-gradient(circle at 82% 36%') && menuCss.includes('drop-shadow(0 0 22px'), 'portal depth, paired torch light or restrained glow treatment is missing'],
  [menuCss.includes("[data-testid='main-menu-dust-button']::after") && menuCss.includes('top: -14px') && menuCss.includes("[data-testid='main-menu-gold-button']::after") && menuCss.includes('bottom: -14px') && menuCss.includes("[data-testid='main-menu-settings-button']::after") && menuCss.includes('touch-action: manipulation') && !menuCss.includes('inset: -'), 'compact resource controls do not expose effective 44 px touch hit areas without breaking the bounded-character inset contract'],
  [menuScreen.includes('event.preventDefault(); event.stopPropagation();') && menuScreen.includes('main-menu-top-overlay-backdrop') && !menuScreen.includes('onPointerDown'), 'main-menu navigation no longer guarantees click/tap routing without pointer-down shortcuts'],
  [focusedSpec.includes('.tap()') && !focusedSpec.includes('.click({ force: true') && focusedSpec.includes('touch taps open and close only the intended menu surface'), 'focused Block 20 suite does not use genuine touch taps'],
  [focusedSpec.includes('STANDARD_LOADOUT') && focusedSpec.includes('ALTERNATE_LOADOUT') && focusedSpec.includes('alternate-loadout-with-quiver') && focusedSpec.includes('alternate-loadout-without-quiver'), 'focused suite does not prove multiple equipment combinations'],
  [focusedSpec.includes('expectStableRangerIdle') && focusedSpec.includes("animationDriver).toBe('stable-root-idle-v1')") && focusedSpec.includes("stablePoseSource).toBe('Idle_A')") && focusedSpec.includes("skeletalPlayback).toBe('frozen-after-pose-sample')") && focusedSpec.includes("meshPipeline).toBe('baked-static-pose-v1')") && focusedSpec.includes('bakedMeshCount).toBeGreaterThan(0)') && focusedSpec.includes('skinnedMeshCount).toBe(0)') && focusedSpec.match(/expectStableRangerIdle\(/g)?.length === 4, 'focused suite does not enforce baked stable root motion for every Ranger loadout state'],
  [focusedSpec.includes('no-companion-standard-loadout') && focusedSpec.includes('active-companion-ember-raven') && focusedSpec.includes('animation-frame-a') && focusedSpec.includes('animation-frame-b') && focusedSpec.includes('const companionFrames') && focusedSpec.includes("waitForPaintedCanvas(page, page.getByTestId('live-hybrid-main-menu-canvas')"), 'focused suite lacks painted companion and multi-frame visual evidence'],
  [focusedSpec.includes("new Event('webglcontextlost'") && focusedSpec.includes("new Event('webglcontextrestored'") && focusedSpec.includes("reducedMotion: 'reduce'") && focusedSpec.includes("reducedMotion: 'no-preference'"), 'focused suite lacks WebGL recovery or Reduced Motion coverage'],
  [regressionConfig.includes('block-20-main-menu') && regressionConfig.includes('retries: 0') && regressionConfig.includes("name: 'iphone-webkit'") && regressionConfig.includes("name: 'android-chromium'") && regressionConfig.includes("name: 'ipad-portrait-webkit'") && regressionConfig.includes("name: 'android-tablet-chromium'"), 'Playwright regression config does not include Block 20 on all four portrait devices with zero retries'],
  [workflow.includes('validate-block-20-main-menu.mjs') && workflow.includes('block-20-main-menu.spec.mjs') && workflow.includes('matrix:') && workflow.includes('iphone-webkit') && workflow.includes('android-chromium') && workflow.includes('ipad-portrait-webkit') && workflow.includes('android-tablet-chromium'), 'Main Menu Visual Regression does not run the focused validator and four-device matrix'],
  [workflow.includes('actions/upload-artifact@v4') && workflow.includes('actions/download-artifact@v4') && workflow.includes('block20-*-${{ matrix.project }}.png'), 'four-device Block 20 evidence is not preserved as reviewable artifacts'],
  [productWorkflow.includes("group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}-${{ github.run_attempt }}") && productWorkflow.includes('cancel-in-progress: true'), 'Product Autopilot reruns can still cancel the exact-head PR evidence attempt'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Block 20 main-menu audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Block 20 main-menu audit passed: one local animated renderer, resilient WebGL recovery, synchronized equipment and companions, genuine taps, Reduced Motion, isolated Product Autopilot reruns and four-device portrait evidence remain enforced.');
