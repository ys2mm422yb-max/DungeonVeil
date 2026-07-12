import { readFile } from 'node:fs/promises';

const files = {
  battle: await readFile(new URL('../src/components/WorldBossBattleScreen.tsx', import.meta.url), 'utf8'),
  proxyStage: await readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  dedicatedStage: await readFile(new URL('../src/components/WorldBossDedicatedStage.tsx', import.meta.url), 'utf8'),
  mobileBoss: await readFile(new URL('../src/components/worldBossMobileVisual3D.ts', import.meta.url), 'utf8'),
  menu: await readFile(new URL('../src/components/screens/MainMenuScreen.tsx', import.meta.url), 'utf8'),
};

const checks = [
  [files.battle.includes("import { WorldBossLiteStage }") && files.battle.includes('<WorldBossLiteStage'), 'WorldBossBattleScreen is not using the lightweight stage'],
  [!files.battle.includes('CombatStage') && !files.battle.includes('GameCanvas') && !files.battle.includes('CombatFeedbackOverlay'), 'world boss still references the normal dungeon renderer'],
  [files.proxyStage.includes('WorldBossDedicatedStage as WorldBossLiteStage'), 'WorldBossLiteStage does not route to the dedicated renderer'],
  [files.dedicatedStage.includes("root.name = 'WorldBossDedicatedArena'") && !files.dedicatedStage.includes('buildKayKitDungeonRoom'), 'dedicated arena is missing or full dungeon staging is still used'],
  [files.dedicatedStage.includes('new THREE.OrthographicCamera') && !files.dedicatedStage.includes('PerspectiveCamera'), 'world-boss camera is not the fixed orthographic arena camera'],
  [files.dedicatedStage.includes('window.visualViewport') && files.dedicatedStage.includes("renderer.domElement.style.width = '100%'") && files.dedicatedStage.includes("renderer.domElement.style.height = '100%'"), 'world-boss canvas is not bound to the full visual viewport'],
  [files.battle.includes('function findRaidSpawn') && files.battle.includes('desiredYRatio: 0.76') && files.battle.includes('desiredYRatio: 0.24'), 'player and boss do not have separated fixed raid starts'],
  [files.battle.includes('const BOSS_START_DELAY_MS = 700;') && files.battle.includes('bossReleaseAtRef.current = now + BOSS_START_DELAY_MS'), 'boss start delay is missing'],
  [files.dedicatedStage.includes('const MAX_PROJECTILES = IS_MOBILE ? 4 : 7;'), 'world-boss projectile budget is not bounded'],
  [files.dedicatedStage.includes('return 33;') && files.dedicatedStage.includes('return 42;') && files.dedicatedStage.includes('return 50;'), '30/24/20 FPS limits are missing'],
  [files.dedicatedStage.includes('fps < 19 ? 2 : fps < 27') && files.dedicatedStage.includes('qualityLevel = nextLevel'), 'adaptive FPS reduction is missing'],
  [files.dedicatedStage.includes('IS_ANDROID ? 0.62 : 0.68') && files.dedicatedStage.includes('IS_ANDROID ? 0.72 : 0.8') && files.dedicatedStage.includes('IS_ANDROID ? 0.85 : 1'), 'quality-preserving mobile pixel ratio ladder is missing'],
  [files.dedicatedStage.includes('antialias: true'), 'mobile antialiasing is disabled'],
  [files.dedicatedStage.includes('renderer.shadowMap.enabled = false') && files.dedicatedStage.includes('keyLight.castShadow = false') && files.dedicatedStage.includes('fillLight.castShadow = false'), 'world-boss shadows are not fully disabled'],
  [!files.dedicatedStage.includes('PointLight') && !files.dedicatedStage.includes('postprocessing'), 'dynamic point lights or postprocessing remain in the dedicated stage'],
  [files.dedicatedStage.includes('loadWorldBossMobileRig') && files.mobileBoss.includes("root.name = 'AshKingMobileKayKit'") && files.mobileBoss.includes('Knight.glb'), 'lightweight real KayKit Ash King rig is missing'],
  [files.dedicatedStage.includes('buildFallbackMobileBoss()'), 'procedural Ash King fallback is missing'],
  [files.battle.includes('const TIMER_PAINT_MS = 250;') && files.battle.includes('setGameState(snapshotRaidState(engine.state))'), 'React HUD updates are not limited to roughly four per second'],
  [files.battle.includes('if (!arenaReadyRef.current)') && files.battle.includes('if (!startTimeRef.current) startTimeRef.current = time;'), 'attempt timer is not gated by renderer readiness'],
  [files.dedicatedStage.includes('renderer.render(scene, camera);') && files.dedicatedStage.includes('readyRaf = requestAnimationFrame') && files.dedicatedStage.includes('readyRef.current()'), 'ready callback is not deferred until after a rendered frame'],
  [files.dedicatedStage.includes('cancelAnimationFrame(raf)') && files.dedicatedStage.includes('cancelAnimationFrame(readyRaf)'), 'world-boss RAF loops are not cancelled'],
  [files.dedicatedStage.includes('playerRig?.stop()') && files.dedicatedStage.includes('mobileBossRig?.stop()') && files.dedicatedStage.includes('stopAllAction'), 'animation mixers are not stopped on cleanup'],
  [files.dedicatedStage.includes('renderer?.renderLists?.dispose?.()') && files.dedicatedStage.includes('renderer?.dispose?.()') && files.dedicatedStage.includes('renderer?.forceContextLoss?.()'), 'WebGL resources are not completely released'],
  [files.menu.includes("overlay !== 'worldBoss' && <MainMenuDungeonScene />"), 'main-menu WebGL scene remains mounted behind the world boss'],
  [!files.dedicatedStage.includes('MutationObserver') && !files.battle.includes('MutationObserver'), 'world boss uses a document-wide MutationObserver'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`World-boss performance audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('World-boss performance audit passed: full visual viewport, readable resolution, antialiasing, lightweight KayKit Ash King, separated starts, adaptive mobile budgets and full cleanup are active.');
