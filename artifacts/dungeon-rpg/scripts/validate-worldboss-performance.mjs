import { readFile } from 'node:fs/promises';

const files = {
  battle: await readFile(new URL('../src/components/WorldBossBattleScreen.tsx', import.meta.url), 'utf8'),
  proxyStage: await readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  combatBand: await readFile(new URL('../src/components/WorldBossCombatBandStage.tsx', import.meta.url), 'utf8'),
  cohesiveStage: await readFile(new URL('../src/components/WorldBossCohesiveStage.tsx', import.meta.url), 'utf8'),
  mobileBoss: await readFile(new URL('../src/components/worldBossMobileVisual3D.ts', import.meta.url), 'utf8'),
  menu: await readFile(new URL('../src/components/screens/MainMenuScreen.tsx', import.meta.url), 'utf8'),
};

const checks = [
  [files.battle.includes("import { WorldBossLiteStage }") && files.battle.includes('<WorldBossLiteStage'), 'WorldBossBattleScreen is not using the lightweight stage'],
  [!files.battle.includes('CombatStage') && !files.battle.includes('GameCanvas') && !files.battle.includes('CombatFeedbackOverlay'), 'world boss still references the normal dungeon renderer'],
  [files.proxyStage.includes('WorldBossCombatBandStage as WorldBossLiteStage') && files.combatBand.includes('<WorldBossCohesiveStage'), 'WorldBossLiteStage does not route to the cohesive renderer'],
  [files.cohesiveStage.includes("root.name = 'AshKingRitualHall'") && files.cohesiveStage.includes("slabA.name = 'StoneFloorSlabs'") && !files.cohesiveStage.includes('GridHelper'), 'cohesive stone ritual hall is missing or still looks like a grid board'],
  [files.cohesiveStage.includes("part.name = 'BrokenAshThrone'") && files.cohesiveStage.includes("arc.name = 'BrokenAshSeal'") && files.cohesiveStage.includes("threshold.name = 'VeilGateThreshold'"), 'semantic Ash King throne, seal or gate is missing'],
  [files.cohesiveStage.includes('new THREE.OrthographicCamera') && !files.cohesiveStage.includes('PerspectiveCamera'), 'world-boss camera is not the fixed orthographic arena camera'],
  [files.cohesiveStage.includes('window.visualViewport') && files.cohesiveStage.includes("renderer.domElement.style.width = '100%'") && files.cohesiveStage.includes("renderer.domElement.style.height = '100%'"), 'world-boss canvas is not bound to the full visual viewport'],
  [files.battle.includes('function findRaidSpawn') && files.battle.includes('desiredYRatio: 0.76') && files.battle.includes('desiredYRatio: 0.24'), 'player and boss do not have separated fixed raid starts'],
  [files.battle.includes('const BOSS_START_DELAY_MS = 700;') && files.battle.includes('bossReleaseAtRef.current = now + BOSS_START_DELAY_MS'), 'boss start delay is missing'],
  [files.cohesiveStage.includes('const MAX_PROJECTILES = IS_MOBILE ? 4 : 7;'), 'world-boss projectile budget is not bounded'],
  [files.cohesiveStage.includes('return 33;') && files.cohesiveStage.includes('return 42;') && files.cohesiveStage.includes('return 50;'), '30/24/20 FPS limits are missing'],
  [files.cohesiveStage.includes('fps < 19 ? 2 : fps < 27') && files.cohesiveStage.includes('qualityLevel = nextLevel'), 'adaptive FPS reduction is missing'],
  [files.cohesiveStage.includes('IS_ANDROID ? 0.62 : 0.68') && files.cohesiveStage.includes('IS_ANDROID ? 0.72 : 0.8') && files.cohesiveStage.includes('IS_ANDROID ? 0.85 : 1'), 'quality-preserving mobile pixel ratio ladder is missing'],
  [files.cohesiveStage.includes('antialias: true'), 'mobile antialiasing is disabled'],
  [files.cohesiveStage.includes('renderer.shadowMap.enabled = false') && files.cohesiveStage.includes('keyLight.castShadow = false') && files.cohesiveStage.includes('fillLight.castShadow = false'), 'world-boss shadows are not fully disabled'],
  [!files.cohesiveStage.includes('PointLight') && !files.cohesiveStage.includes('postprocessing'), 'dynamic point lights or postprocessing remain in the cohesive stage'],
  [files.cohesiveStage.includes('loadWorldBossMobileRig') && files.mobileBoss.includes("root.name = 'AshKingVeilWarden'") && files.mobileBoss.includes("visual.name = 'AshWardenSkeleton'") && !files.mobileBoss.includes('Knight.glb'), 'cohesive Ash Warden skeleton rig is missing or the generic knight remains'],
  [files.cohesiveStage.includes('buildFallbackBoss()'), 'Ash Warden fallback is missing'],
  [files.battle.includes('const TIMER_PAINT_MS = 250;') && files.battle.includes('setGameState(snapshotRaidState(engine.state))'), 'React HUD updates are not limited to roughly four per second'],
  [files.battle.includes('if (!arenaReadyRef.current)') && files.battle.includes('if (!startTimeRef.current) startTimeRef.current = time;'), 'attempt timer is not gated by renderer readiness'],
  [files.cohesiveStage.includes('renderer.render(scene, camera);') && files.cohesiveStage.includes('readyRaf = requestAnimationFrame') && files.cohesiveStage.includes('readyRef.current()'), 'ready callback is not deferred until after a rendered frame'],
  [files.cohesiveStage.includes('cancelAnimationFrame(raf)') && files.cohesiveStage.includes('cancelAnimationFrame(readyRaf)'), 'world-boss RAF loops are not cancelled'],
  [files.cohesiveStage.includes('playerRig?.stop()') && files.cohesiveStage.includes('bossRig?.stop()'), 'animation mixers are not stopped on cleanup'],
  [files.cohesiveStage.includes('renderer?.renderLists?.dispose?.()') && files.cohesiveStage.includes('renderer?.dispose?.()') && files.cohesiveStage.includes('renderer?.forceContextLoss?.()'), 'WebGL resources are not completely released'],
  [files.menu.includes("overlay !== 'worldBoss' && <MainMenuDungeonScene />"), 'main-menu WebGL scene remains mounted behind the world boss'],
  [!files.cohesiveStage.includes('MutationObserver') && !files.battle.includes('MutationObserver'), 'world boss uses a document-wide MutationObserver'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`World-boss performance audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('World-boss performance audit passed: cohesive stone ritual hall, Ash Warden skeleton, full visual viewport, adaptive mobile budgets and complete cleanup are active.');
