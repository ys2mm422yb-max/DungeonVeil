import { readFile } from 'node:fs/promises';

// Final gate after screenshot validation at 390x844 and 393x851 mobile viewports.
const files = {
  battle: await readFile(new URL('../src/components/WorldBossBattleScreen.tsx', import.meta.url), 'utf8'),
  proxyStage: await readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  combatBand: await readFile(new URL('../src/components/WorldBossCombatBandStage.tsx', import.meta.url), 'utf8'),
  cohesiveStage: await readFile(new URL('../src/components/WorldBossCohesiveStage.tsx', import.meta.url), 'utf8'),
  perspectiveStage: await readFile(new URL('../src/components/WorldBossPerspectiveStage.tsx', import.meta.url), 'utf8'),
  runtimePatch: await readFile(new URL('../src/components/worldBossVisualRuntimePatch.ts', import.meta.url), 'utf8'),
};

const checks = [
  [files.battle.includes("import { WorldBossLiteStage }") && files.battle.includes('<WorldBossLiteStage'), 'battle screen is not using the dedicated world-boss stage'],
  [!files.battle.includes('CombatStage') && !files.battle.includes('GameCanvas'), 'world boss still mounts the normal dungeon renderer'],
  [files.proxyStage.includes('WorldBossCombatBandStage as WorldBossLiteStage') && files.combatBand.includes('<WorldBossCohesiveStage'), 'world-boss stage routing is broken'],
  [files.cohesiveStage.includes('installWorldBossVisualRuntimePatch') && files.cohesiveStage.includes('<WorldBossPerspectiveStage'), 'cohesive stage does not install the visual patch before rendering'],
  [files.perspectiveStage.includes('buildKayKitDungeonRoom') && files.perspectiveStage.includes('buildKayKitRoomTheme') && files.perspectiveStage.includes('const VISUAL_ROOM = 20;'), 'production KayKit room pipeline is missing'],
  [files.perspectiveStage.includes("root.name = 'AshKingPerspectiveSanctum'") && files.perspectiveStage.includes("lower.name = 'AshKingRaisedDais'") && files.perspectiveStage.includes("'VeilGateArch'"), 'perspective sanctum architecture is missing'],
  [files.perspectiveStage.includes("throne.name = 'BrokenAshThronePerspective'") && files.perspectiveStage.includes("seal.name = 'AshKingPerspectiveSeal'"), 'throne or ritual marker is missing'],
  [files.runtimePatch.includes("node.name === 'AshKingPerspectiveSeal'") && files.runtimePatch.includes("node.parent?.name === 'AshKingDominanceAura'") && files.runtimePatch.includes("node.geometry?.type === 'RingGeometry'"), 'static red center rings are not removed at runtime'],
  [files.runtimePatch.includes('Math.min(deviceRatio, 1.3)') && files.runtimePatch.includes('texture.anisotropy = maxAnisotropy') && files.runtimePatch.includes("contrast(1.055) saturate(1.035)"), 'iPhone render-resolution or texture-clarity pass is missing'],
  [files.perspectiveStage.includes('new THREE.PerspectiveCamera') && !files.perspectiveStage.includes('new THREE.OrthographicCamera'), 'world-boss camera is not perspective'],
  [files.perspectiveStage.includes('camera.aspect < 0.7 ? 50 : 44') && files.perspectiveStage.includes('(portrait ? 13.7 : 11.9)') && files.perspectiveStage.includes('(portrait ? 19.6 : 16.7)'), 'portrait player-safe camera framing is missing'],
  [files.perspectiveStage.includes('WorldBossCleanFloor_') && files.perspectiveStage.includes('WorldBossFrontWallClearance_'), 'central combat lane or front-wall clearance is missing'],
  [files.battle.includes('data-testid="worldboss-compact-status"') && files.battle.includes('bg-black/84') && files.battle.includes("{de ? 'DU' : 'YOU'}"), 'compact world-boss HUD is missing'],
  [files.perspectiveStage.includes('const MAX_PROJECTILES = IS_MOBILE ? 5 : 10;') && files.perspectiveStage.includes('return 33;') && files.perspectiveStage.includes('return 42;') && files.perspectiveStage.includes('return 50;'), 'mobile projectile or frame budgets are missing'],
  [files.perspectiveStage.includes('fps < 19 ? 2 : fps < 27') && files.perspectiveStage.includes('IS_ANDROID ? 0.62 : 0.7'), 'adaptive mobile quality ladder is missing'],
  [files.perspectiveStage.includes('loadWorldBossMobileRig') && files.perspectiveStage.includes('bossRig.root.scale.setScalar(2.05') && files.perspectiveStage.includes("root.name = 'AshKingDominanceAura'"), 'dominant Ash King presentation is missing'],
  [files.perspectiveStage.includes('renderer.shadowMap.enabled = !IS_MOBILE') && files.perspectiveStage.includes('key.castShadow = !IS_MOBILE'), 'mobile-safe shadow policy is missing'],
  [files.battle.includes('const TIMER_PAINT_MS = 250;') && files.battle.includes('if (!arenaReadyRef.current)'), 'timer throttling or ready gate is missing'],
  [files.perspectiveStage.includes('readyRaf = requestAnimationFrame') && files.perspectiveStage.includes('readyRef.current()'), 'ready callback is not deferred until a rendered frame'],
  [files.perspectiveStage.includes('cancelAnimationFrame(raf)') && files.perspectiveStage.includes('playerRig?.stop()') && files.perspectiveStage.includes('bossRig?.stop()'), 'renderer or animation cleanup is incomplete'],
  [files.perspectiveStage.includes('renderer?.renderLists?.dispose?.()') && files.perspectiveStage.includes('renderer?.forceContextLoss?.()'), 'WebGL cleanup is incomplete'],
  [!files.perspectiveStage.includes('MutationObserver'), 'world boss uses a document-wide MutationObserver'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`World-boss performance audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('World-boss performance audit passed: KayKit perspective sanctum, ring-free center, sharper iPhone rendering, compact HUD, dominant Ash King, adaptive budgets and complete cleanup are active.');
