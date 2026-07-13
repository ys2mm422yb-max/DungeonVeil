import { readFile } from 'node:fs/promises';

const files = {
  battle: await readFile(new URL('../src/components/WorldBossBattleScreen.tsx', import.meta.url), 'utf8'),
  proxyStage: await readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  combatBand: await readFile(new URL('../src/components/WorldBossCombatBandStage.tsx', import.meta.url), 'utf8'),
  cohesiveStage: await readFile(new URL('../src/components/WorldBossCohesiveStage.tsx', import.meta.url), 'utf8'),
  stage: await readFile(new URL('../src/components/WorldBossPerspectiveStage.tsx', import.meta.url), 'utf8'),
  bossRig: await readFile(new URL('../src/components/worldBossMobileVisual3D.ts', import.meta.url), 'utf8'),
};

const checks = [
  [files.battle.includes("import { WorldBossLiteStage }") && files.battle.includes('<WorldBossLiteStage'), 'battle screen is not using the dedicated world-boss stage'],
  [files.proxyStage.includes('WorldBossCombatBandStage as WorldBossLiteStage') && files.combatBand.includes('<WorldBossCohesiveStage'), 'world-boss stage routing is broken'],
  [files.cohesiveStage.includes('WorldBossPerspectiveStage as WorldBossCohesiveStage'), 'cohesive stage does not route directly to the performance renderer'],
  [!files.stage.includes('buildKayKitDungeonRoom') && !files.stage.includes('buildKayKitRoomTheme') && !files.stage.includes('floor_tile_large.gltf'), 'generic high-call dungeon shell or repeated floor models remain'],
  [files.stage.includes("root.name = 'AshKingLowCostKayKitHall'") && files.stage.includes("lower.name = 'AshKingRaisedDais'") && files.stage.includes("'VeilGateArch'"), 'curated KayKit hall is missing'],
  [files.stage.includes('new THREE.CanvasTexture(canvas)') && files.stage.includes('new THREE.PlaneGeometry(24, 32, 1, 1)') && files.stage.includes("floor.name = 'AshKingDetailedSingleFloor'"), 'single detailed stone floor is missing'],
  [files.stage.includes("for (const x of [-8, -4, 0, 4, 8])") && files.stage.includes("rail.name = `BossSideBoundary_${side}`"), 'bounded low-call hall architecture is missing'],
  [!files.stage.includes('models.barrier') && !files.stage.includes('models.banner') && !files.stage.includes('models.shrine'), 'excess arena models remain'],
  [files.stage.includes('const MAX_PROJECTILES = IS_MOBILE ? 3 : 8;') && files.stage.includes('const EMBER_COUNT = IS_MOBILE ? 6 : 20;'), 'mobile effect budgets are too high'],
  [files.stage.includes('qualityLevel === 0) return 0') && files.stage.includes("return Math.min(ratio, IS_ANDROID ? 0.76 : 0.9)"), 'mobile frame pacing or resolution is not performance safe'],
  [files.stage.includes('fps < 24 ? 2 : fps < 44') && files.stage.includes('IS_MOBILE ? 60 : 0'), 'adaptive 60-fps-first ladder is missing'],
  [files.stage.includes('playerX * 0.12') && files.stage.includes("data-camera=\"calm-perspective-camera\""), 'calm mobile camera is missing'],
  [files.stage.includes('new THREE.CircleGeometry(1, 24)') && !files.stage.includes('new THREE.RingGeometry'), 'neon ring telegraphs remain'],
  [files.bossRig.includes("shoulderBar.name = 'AshShoulderBar'") && files.bossRig.includes("crown.name = 'SimplifiedAshCrown'"), 'simplified boss silhouette is missing'],
  [!files.bossRig.includes('auraArcs') && !files.bossRig.includes('new THREE.RingGeometry') && !files.bossRig.includes('new THREE.CircleGeometry'), 'duplicate boss aura or shadow geometry remains'],
  [files.stage.includes("shadow.name = 'AshKingGroundShadow'") && files.stage.includes('bossRig.root.scale.setScalar(2.0'), 'dominant boss presentation is missing'],
  [files.stage.includes('antialias: !IS_MOBILE') && files.stage.includes('renderer.shadowMap.enabled = !IS_MOBILE'), 'mobile-safe renderer policy is missing'],
  [files.stage.includes("arena: 'single-floor-low-call-kaykit-hall'") && files.stage.includes("camera: 'calm-perspective-camera'"), 'performance telemetry identity is missing'],
  [files.battle.includes('const TIMER_PAINT_MS = 250;') && files.battle.includes('if (!arenaReadyRef.current)'), 'timer throttling or ready gate is missing'],
  [files.stage.includes('ownedTextures.forEach') && files.stage.includes('renderer?.forceContextLoss?.()'), 'renderer or texture cleanup is incomplete'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`World-boss performance audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('World-boss performance audit passed: single-floor KayKit hall, simplified Ash King and adaptive mobile rendering are active.');
