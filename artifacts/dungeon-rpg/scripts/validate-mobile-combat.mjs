import { readFile } from 'node:fs/promises';

const files = {
  hud: await readFile(new URL('../src/components/HUD.tsx', import.meta.url), 'utf8'),
  reward: await readFile(new URL('../src/components/MetaRewardBanner.tsx', import.meta.url), 'utf8'),
  canvas: await readFile(new URL('../src/components/GameCanvasKayKit3D.tsx', import.meta.url), 'utf8'),
  canvasHost: await readFile(new URL('../src/components/GameCanvas.tsx', import.meta.url), 'utf8'),
  combatStage: await readFile(new URL('../src/components/CombatStage.tsx', import.meta.url), 'utf8'),
  camera: await readFile(new URL('../src/components/RunCameraRig.ts', import.meta.url), 'utf8'),
  enemy: await readFile(new URL('../src/components/kaykitEnemy3D.ts', import.meta.url), 'utf8'),
  engine: await readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
  portalExit: await readFile(new URL('../src/game/portalExitPolicy.ts', import.meta.url), 'utf8'),
  main: await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
  props: await readFile(new URL('../src/game/propPresentation3D.ts', import.meta.url), 'utf8'),
  effects: await readFile(new URL('../src/game/runEffectSystems.ts', import.meta.url), 'utf8'),
  boss: await readFile(new URL('../src/components/WorldBossBattleScreen.tsx', import.meta.url), 'utf8'),
  bossStageProxy: await readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  bossBand: await readFile(new URL('../src/components/WorldBossCombatBandStage.tsx', import.meta.url), 'utf8'),
  bossCohesive: await readFile(new URL('../src/components/WorldBossCohesiveStage.tsx', import.meta.url), 'utf8'),
  bossController: await readFile(new URL('../src/components/WorldBossAggressiveStage.tsx', import.meta.url), 'utf8'),
  bossStage: await readFile(new URL('../src/components/WorldBossPerspectiveStage.tsx', import.meta.url), 'utf8'),
  bossRig: await readFile(new URL('../src/components/worldBossMobileVisual3D.ts', import.meta.url), 'utf8'),
};

const checks = [
  [files.hud.includes('absolute right-3 top-'), 'HUD status is not in the right-side lane'],
  [files.reward.includes('right-[max(12px,env(safe-area-inset-right))]'), 'reward toast still covers the HUD'],
  [files.canvas.includes('MAX_ARROW_VISUALS') && files.canvas.includes('MAX_DAMAGE_VISUALS'), 'mobile visual budgets are missing'],
  [files.canvas.includes("canvas.style.width = '100%'") && files.canvas.includes("canvas.style.height = '100%'") && files.canvas.includes('renderer.setSize(width, height, false)'), 'run canvas CSS size is still coupled to reduced render pixel ratio'],
  [files.canvas.includes('new ResizeObserver(resize)') && files.canvas.includes("window.visualViewport?.addEventListener('resize', resize)") && files.canvas.includes("window.visualViewport?.addEventListener('scroll', resize)"), 'run renderer does not track the real visual viewport and host size'],
  [files.canvasHost.includes('data-testid="run-canvas-host"') && files.canvasHost.includes('overflow-hidden'), 'run canvas host is not a clipped full-size render surface'],
  [files.combatStage.includes('data-testid="run-visual-viewport"') && files.combatStage.includes('visualViewport'), 'combat stage is not bound to the visible mobile viewport'],
  [files.camera.includes('responsiveFrame') && files.camera.includes('camera.aspect'), 'run camera does not use renderer aspect for portrait framing'],
  [files.enemy.includes('glow.visible = burning') && files.enemy.includes("tintMode: 'normal'"), 'inactive status meshes or tint traversal guard missing'],
  [files.engine.includes('const targets = visible.slice') && files.engine.includes('Math.atan2(endY - py, endX - px)'), 'arrows are not directly aimed at selected targets'],
  [files.main.includes("import './game/portalExitPolicy';"), 'portal exit policy is not installed before the app starts'],
  [files.portalExit.includes('originalUpdateRoomFlow.call(this, time)') && files.portalExit.includes('this.livingEnemies().length === 0') && files.portalExit.includes('this.state.roomClearReady'), 'portal exit policy does not preserve room flow while ignoring dead fade objects'],
  [files.portalExit.includes('const exitRadius = TILE_SIZE * 1.05') && files.portalExit.includes('Math.hypot(centerX - exitX, centerY - exitY) <= exitRadius'), 'portal trigger still requires an exact exit tile hit'],
  [!files.portalExit.includes('this.state.items') && !files.portalExit.includes('this.state.chests'), 'loot or chest state can still block room exit'],
  [files.portalExit.includes('living === 0 && !this.roomAnnouncedClear') && files.portalExit.includes('this.nextRoom()'), 'dead-enemy cleanup still delays portal activation'],
  [files.props.includes('function inferredCollider') && files.props.includes("key.includes('/chair')"), 'automatic solid-prop colliders are missing'],
  [files.effects.includes('if (IS_MOBILE) return;'), 'mobile duplicate telegraphs are still enabled'],
  [files.boss.includes('const TIMER_PAINT_MS = 250;'), 'world-boss timer is repainting too often'],
  [files.boss.includes("import { WorldBossLiteStage }") && !files.boss.includes("import { CombatStage }"), 'world boss still uses the full run renderer'],
  [files.boss.includes('engine.onStateChange = () => {}') && files.boss.includes('setGameState(snapshotRaidState(engine.state))'), 'world boss React updates are not throttled'],
  [files.bossStageProxy.includes('WorldBossCombatBandStage as WorldBossLiteStage') && files.bossBand.includes('<WorldBossCohesiveStage'), 'world-boss stage proxy routing is broken'],
  [files.bossCohesive.includes('WorldBossAggressiveStage as WorldBossCohesiveStage') && files.bossController.includes('<WorldBossPerspectiveStage'), 'world-boss aggressive controller routing is missing'],
  [files.bossController.includes('const PURSUIT_SPEED = 82;') && files.bossController.includes("type AttackKind = 'breath' | 'claw' | 'slam'") && files.bossController.includes('boss-shot-breath-') && files.bossController.includes('boss-claw-impact-') && files.bossController.includes('boss-slam-impact-'), 'world-boss three-attack kit is missing'],
  [!files.bossStage.includes('buildKayKitDungeonRoom') && files.bossStage.includes('new THREE.CanvasTexture(canvas)') && files.bossStage.includes('new THREE.PlaneGeometry(24, 32, 1, 1)'), 'high-call room shell or repeated floor geometry remains'],
  [files.bossStage.includes('const MAX_PROJECTILES = IS_MOBILE ? 3 : 8;') && files.bossStage.includes('const EMBER_COUNT = IS_MOBILE ? 6 : 20;'), 'world-boss effects are not bounded tightly enough'],
  [files.bossStage.includes('qualityLevel === 0) return 0') && files.bossStage.includes("return Math.min(ratio, IS_ANDROID ? 0.76 : 0.9)"), 'mobile renderer is capped or oversampled at default quality'],
  [files.bossStage.includes('playerX * 0.12') && files.bossStage.includes('damp(camera.position.x, cameraGoal.x, 1.5'), 'world-boss camera is still following too aggressively'],
  [files.bossStage.includes('new THREE.CircleGeometry(1, 24)') && !files.bossStage.includes('new THREE.RingGeometry'), 'world-boss neon rings remain'],
  [files.bossRig.includes('Dragon.fbx') && files.bossRig.includes("root.name = 'VeilDragonWorldBoss'") && files.bossRig.includes('leftWing') && files.bossRig.includes('tailNodes'), 'dragon boss rig or procedural motion is missing'],
  [files.bossStage.includes('antialias: !IS_MOBILE') && files.bossStage.includes('renderer.shadowMap.enabled = !IS_MOBILE'), 'mobile renderer policy is too expensive'],
  [files.bossStage.includes("arena: 'single-floor-low-call-kaykit-hall'"), 'single-floor arena telemetry is missing'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`Mobile combat audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Mobile combat audit passed: full-size run canvas, loot-independent portal exits, responsive camera, three-attack dragon controller and bounded mobile effects are active.');
