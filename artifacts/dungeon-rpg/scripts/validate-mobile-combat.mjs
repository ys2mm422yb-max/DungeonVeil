import { readFile } from 'node:fs/promises';

const files = {
  hud: await readFile(new URL('../src/components/HUD.tsx', import.meta.url), 'utf8'),
  reward: await readFile(new URL('../src/components/MetaRewardBanner.tsx', import.meta.url), 'utf8'),
  canvas: await readFile(new URL('../src/components/GameCanvasKayKit3D.tsx', import.meta.url), 'utf8'),
  enemy: await readFile(new URL('../src/components/kaykitEnemy3D.ts', import.meta.url), 'utf8'),
  engine: await readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
  portalExit: await readFile(new URL('../src/game/portalExitPolicy.ts', import.meta.url), 'utf8'),
  main: await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
  props: await readFile(new URL('../src/game/propPresentation3D.ts', import.meta.url), 'utf8'),
  effects: await readFile(new URL('../src/game/runEffectSystems.ts', import.meta.url), 'utf8'),
  boss: await readFile(new URL('../src/components/WorldBossBattleScreen.tsx', import.meta.url), 'utf8'),
  bossStageProxy: await readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  bossBand: await readFile(new URL('../src/components/WorldBossCombatBandStage.tsx', import.meta.url), 'utf8'),
  bossStage: await readFile(new URL('../src/components/WorldBossCohesiveStage.tsx', import.meta.url), 'utf8'),
};

const checks = [
  [files.hud.includes('absolute right-3 top-'), 'HUD status is not in the right-side lane'],
  [files.reward.includes('right-[max(12px,env(safe-area-inset-right))]'), 'reward toast still covers the HUD'],
  [files.canvas.includes('MAX_ARROW_VISUALS') && files.canvas.includes('MAX_DAMAGE_VISUALS'), 'mobile visual budgets are missing'],
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
  [files.bossStageProxy.includes('WorldBossCombatBandStage as WorldBossLiteStage') && files.bossBand.includes('<WorldBossCohesiveStage'), 'world-boss stage proxy does not route to the cohesive renderer'],
  [files.bossStage.includes('pixelRatioForQuality') && files.bossStage.includes('frameIntervalForQuality'), 'adaptive world-boss quality is missing'],
  [files.bossStage.includes("root.name = 'AshKingRitualHall'") && !files.bossStage.includes('buildKayKitDungeonRoom'), 'world boss still builds the full room and theme'],
  [files.bossStage.includes('const MAX_PROJECTILES = IS_MOBILE ? 4 : 7;'), 'world-boss projectiles are not bounded'],
  [files.bossStage.includes('renderer.shadowMap.enabled = false') && !files.bossStage.includes('PointLight'), 'world-boss mobile lighting is still too expensive'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`Mobile combat audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Mobile combat audit passed: compact HUD, loot-independent portal exits, bounded effects, direct arrows, solid-prop collision guards and the cohesive adaptive world-boss renderer are active.');
