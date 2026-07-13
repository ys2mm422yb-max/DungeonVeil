import { readFile } from 'node:fs/promises';

const files = {
  battle: await readFile(new URL('../src/components/WorldBossBattleScreen.tsx', import.meta.url), 'utf8'),
  proxyStage: await readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  combatBand: await readFile(new URL('../src/components/WorldBossCombatBandStage.tsx', import.meta.url), 'utf8'),
  cohesiveStage: await readFile(new URL('../src/components/WorldBossCohesiveStage.tsx', import.meta.url), 'utf8'),
  perspectiveStage: await readFile(new URL('../src/components/WorldBossPerspectiveStage.tsx', import.meta.url), 'utf8'),
  mobileBoss: await readFile(new URL('../src/components/worldBossMobileVisual3D.ts', import.meta.url), 'utf8'),
  menu: await readFile(new URL('../src/components/screens/MainMenuScreen.tsx', import.meta.url), 'utf8'),
};

const checks = [
  [files.battle.includes("import { WorldBossLiteStage }") && files.battle.includes('<WorldBossLiteStage'), 'WorldBossBattleScreen is not using the dedicated world-boss stage'],
  [!files.battle.includes('CombatStage') && !files.battle.includes('GameCanvas') && !files.battle.includes('CombatFeedbackOverlay'), 'world boss still mounts a second normal dungeon renderer'],
  [files.proxyStage.includes('WorldBossCombatBandStage as WorldBossLiteStage') && files.combatBand.includes('<WorldBossCohesiveStage'), 'WorldBossLiteStage does not route to the world-boss renderer'],
  [files.cohesiveStage.includes('WorldBossPerspectiveStage as WorldBossCohesiveStage'), 'cohesive stage does not route to the perspective renderer'],
  [files.perspectiveStage.includes('buildKayKitDungeonRoom') && files.perspectiveStage.includes('buildKayKitRoomTheme') && files.perspectiveStage.includes('const VISUAL_ROOM = 20;'), 'world boss is not built from the production KayKit dungeon pipeline'],
  [files.perspectiveStage.includes("root.name = 'AshKingPerspectiveSanctum'") && files.perspectiveStage.includes("lower.name = 'AshKingRaisedDais'") && files.perspectiveStage.includes("'VeilGateArch'"), 'perspective sanctum architecture is missing'],
  [files.perspectiveStage.includes("throne.name = 'BrokenAshThronePerspective'") && files.perspectiveStage.includes("seal.name = 'AshKingPerspectiveSeal'"), 'Ash King throne or ritual seal is missing'],
  [files.perspectiveStage.includes('new THREE.PerspectiveCamera') && !files.perspectiveStage.includes('new THREE.OrthographicCamera'), 'world-boss camera is not a perspective run camera'],
  [files.perspectiveStage.includes('window.visualViewport') && files.perspectiveStage.includes("renderer.domElement.style.width = '100%'") && files.perspectiveStage.includes("renderer.domElement.style.height = '100%'"), 'world-boss canvas is not bound to the full visual viewport'],
  [files.battle.includes('function findRaidSpawn') && files.battle.includes('desiredYRatio: 0.76') && files.battle.includes('desiredYRatio: 0.24'), 'player and boss do not have separated raid starts'],
  [files.battle.includes('const BOSS_START_DELAY_MS = 700;') && files.battle.includes('bossReleaseAtRef.current = now + BOSS_START_DELAY_MS'), 'boss start delay is missing'],
  [files.perspectiveStage.includes('const MAX_PROJECTILES = IS_MOBILE ? 5 : 10;'), 'world-boss projectile budget is not bounded'],
  [files.perspectiveStage.includes('return 33;') && files.perspectiveStage.includes('return 42;') && files.perspectiveStage.includes('return 50;'), '30/24/20 FPS limits are missing'],
  [files.perspectiveStage.includes('fps < 19 ? 2 : fps < 27') && files.perspectiveStage.includes('qualityLevel = nextLevel'), 'adaptive FPS reduction is missing'],
  [files.perspectiveStage.includes('IS_ANDROID ? 0.62 : 0.7') && files.perspectiveStage.includes('IS_ANDROID ? 0.74 : 0.82') && files.perspectiveStage.includes('IS_ANDROID ? 0.9 : 1'), 'mobile pixel ratio ladder is missing'],
  [files.perspectiveStage.includes('renderer.shadowMap.enabled = !IS_MOBILE') && files.perspectiveStage.includes('key.castShadow = !IS_MOBILE'), 'mobile-safe shadow policy is missing'],
  [files.perspectiveStage.includes('loadWorldBossMobileRig') && files.mobileBoss.includes("root.name = 'AshKingVeilWarden'") && files.mobileBoss.includes("visual.name = 'AshWardenSkeleton'") && !files.mobileBoss.includes('Knight.glb'), 'Ash Warden skeleton rig is missing or the generic knight remains'],
  [files.perspectiveStage.includes('bossRig.root.scale.setScalar(1.72') && files.perspectiveStage.includes("root.name = 'AshKingDominanceAura'"), 'boss scale and dominance silhouette are not strong enough'],
  [files.perspectiveStage.includes('buildFallbackBoss()'), 'Ash King perspective fallback is missing'],
  [files.battle.includes('const TIMER_PAINT_MS = 250;') && files.battle.includes('setGameState(snapshotRaidState(engine.state))'), 'React HUD updates are not limited to roughly four per second'],
  [files.battle.includes('if (!arenaReadyRef.current)') && files.battle.includes('if (!startTimeRef.current) startTimeRef.current = time;'), 'attempt timer is not gated by renderer readiness'],
  [files.perspectiveStage.includes('renderer.render(scene, camera);') && files.perspectiveStage.includes('readyRaf = requestAnimationFrame') && files.perspectiveStage.includes('readyRef.current()'), 'ready callback is not deferred until after a rendered frame'],
  [files.perspectiveStage.includes('cancelAnimationFrame(raf)') && files.perspectiveStage.includes('cancelAnimationFrame(readyRaf)'), 'world-boss RAF loops are not cancelled'],
  [files.perspectiveStage.includes('playerRig?.stop()') && files.perspectiveStage.includes('bossRig?.stop()'), 'animation mixers are not stopped on cleanup'],
  [files.perspectiveStage.includes('renderer?.renderLists?.dispose?.()') && files.perspectiveStage.includes('renderer?.dispose?.()') && files.perspectiveStage.includes('renderer?.forceContextLoss?.()'), 'WebGL resources are not completely released'],
  [files.menu.includes("overlay !== 'worldBoss' && <MainMenuDungeonScene />"), 'main-menu WebGL scene remains mounted behind the world boss'],
  [!files.perspectiveStage.includes('MutationObserver') && !files.battle.includes('MutationObserver'), 'world boss uses a document-wide MutationObserver'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`World-boss performance audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('World-boss performance audit passed: KayKit perspective sanctum, production-style camera, dominant Ash King, adaptive mobile budgets and complete cleanup are active.');
