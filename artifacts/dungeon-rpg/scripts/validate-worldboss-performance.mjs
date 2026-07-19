import { readFile } from 'node:fs/promises';

const files = {
  entry: await readFile(new URL('../src/components/WorldBossBattleScreen.tsx', import.meta.url), 'utf8'),
  battle: await readFile(new URL('../src/components/WorldBossBattleScreenV4.tsx', import.meta.url), 'utf8'),
  balance: await readFile(new URL('../src/game/buildBalanceV4.ts', import.meta.url), 'utf8'),
  proxyStage: await readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  combatBand: await readFile(new URL('../src/components/WorldBossCombatBandStage.tsx', import.meta.url), 'utf8'),
  arenaGuard: await readFile(new URL('../src/components/WorldBossMobileArenaGuard.tsx', import.meta.url), 'utf8'),
  cohesiveStage: await readFile(new URL('../src/components/WorldBossCohesiveStage.tsx', import.meta.url), 'utf8'),
  aggressiveStage: await readFile(new URL('../src/components/WorldBossAggressiveStage.tsx', import.meta.url), 'utf8'),
  stage: await readFile(new URL('../src/components/WorldBossPerspectiveStage.tsx', import.meta.url), 'utf8'),
  bossRig: await readFile(new URL('../src/components/worldBossMobileVisual3D.ts', import.meta.url), 'utf8'),
  fallbackDragon: await readFile(new URL('../src/components/worldBossFallbackDragon3D.ts', import.meta.url), 'utf8'),
  engine: await readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
};

const checks = [
  [files.entry.includes("export { WorldBossBattleScreen } from './WorldBossBattleScreenV4';"), 'public battle entry is not routed through the canonical V4 controller'],
  [files.battle.includes("import { WorldBossLiteStage }") && files.battle.includes('<WorldBossLiteStage'), 'V4 battle screen is not using the dedicated world-boss stage'],
  [files.battle.includes('WORLD_BOSS_BALANCE_V4.timeLimitSeconds * 1000') && files.balance.includes('timeLimitSeconds: 150'), '150-second V4 attempt contract is missing'],
  [files.battle.includes('boss.maxHp = WORLD_BOSS_BALANCE_V4.health') && files.balance.includes('health: 118000'), '118,000 HP V4 boss contract is missing'],
  [files.battle.includes('createEquipmentRuntimeBalanceState') && files.battle.includes('updateEquipmentRuntimeBalance(engine, equipmentRuntime)'), 'world boss does not apply current equipment, critical, speed and defense runtime'],
  [files.battle.includes('Math.round(localDamage)') && !files.battle.includes('localDamage * 6'), 'world-boss submission still distorts confirmed local damage'],
  [files.battle.includes('WORLD_BOSS_BALANCE_V4.balanceSeason') && files.balance.includes("balanceSeason: 'equipment-v4-s1'"), 'world-boss balance season is not visible/versioned'],
  [files.proxyStage.includes('WorldBossCombatBandStage as WorldBossLiteStage') && files.combatBand.includes('<WorldBossCohesiveStage') && files.combatBand.includes('<WorldBossMobileArenaGuard'), 'world-boss stage routing or phone arena guard is broken'],
  [files.arenaGuard.includes('PHONE_ARENA_HALF_WIDTH_TILES = 5.25') && files.arenaGuard.includes('PHONE_ARENA_HALF_HEIGHT_TILES = 7.65') && files.arenaGuard.includes('enforceWorldBossVisibleArena') && files.arenaGuard.includes('clampEntity(player') && files.arenaGuard.includes('clampEntity(boss'), 'phone fighters can still escape beyond the visible world-boss arena'],
  [files.cohesiveStage.includes('WorldBossAggressiveStage as WorldBossCohesiveStage') && files.aggressiveStage.includes('<WorldBossPerspectiveStage'), 'cohesive stage does not route through the aggressive controller'],
  [files.aggressiveStage.includes('const RELEASE_DELAY_MS = 320;') && files.aggressiveStage.includes("type AttackKind = 'breath' | 'claw' | 'slam'") && files.aggressiveStage.includes('const BREATH_HIT_RADIUS = 76;') && files.aggressiveStage.includes('const CLAW_RANGE = 158;') && files.aggressiveStage.includes('const SLAM_RANGE = 205;') && files.aggressiveStage.includes('boss-shot-breath-') && files.aggressiveStage.includes('boss-claw-impact-') && files.aggressiveStage.includes('boss-slam-impact-'), 'world-boss three-attack controller is missing or shares one generic hit profile'],
  [!files.stage.includes('buildKayKitDungeonRoom') && !files.stage.includes('buildKayKitRoomTheme') && !files.stage.includes('floor_tile_large.gltf'), 'generic high-call dungeon shell or repeated floor models remain'],
  [files.stage.includes("root.name = 'AshKingLowCostKayKitHall'") && files.stage.includes("lower.name = 'AshKingRaisedDais'") && files.stage.includes("'VeilGateArch'"), 'curated KayKit hall is missing'],
  [files.stage.includes('new THREE.CanvasTexture(canvas)') && files.stage.includes('new THREE.PlaneGeometry(24, 32, 1, 1)') && files.stage.includes("floor.name = 'AshKingDetailedSingleFloor'"), 'single detailed stone floor is missing'],
  [files.stage.includes("for (const x of [-8, -4, 0, 4, 8])") && files.stage.includes("rail.name = `BossSideBoundary_${side}`"), 'bounded low-call hall architecture is missing'],
  [!files.stage.includes('models.barrier') && !files.stage.includes('models.banner') && !files.stage.includes('models.shrine'), 'excess arena models remain'],
  [files.stage.includes('const MAX_PROJECTILES = IS_MOBILE ? 3 : 8;') && files.stage.includes('const EMBER_COUNT = IS_MOBILE ? 6 : 20;'), 'mobile effect budgets are too high'],
  [files.stage.includes('qualityLevel === 0) return 0') && files.stage.includes("return Math.min(ratio, IS_ANDROID ? 0.76 : 0.9)"), 'mobile frame pacing or resolution is not performance safe'],
  [files.stage.includes('fps < 24 ? 2 : fps < 44') && files.stage.includes('IS_MOBILE ? 60 : 0'), 'adaptive 60-fps-first ladder is missing'],
  [files.stage.includes('camera.fov = phonePortrait ? 58') && files.stage.includes('cameraDistance = phonePortrait ? 23.6') && files.stage.includes('playerX * (phonePortrait ? 0.045 : 0.12)') && files.stage.includes('data-camera="calm-perspective-camera"'), 'calm phone-safe camera is missing'],
  [files.stage.includes('new THREE.CircleGeometry(1, 24)') && !files.stage.includes('new THREE.RingGeometry'), 'neon ring telegraphs remain'],
  [files.bossRig.includes("const DRAGON_ASSET_PATH = 'assets/3d/Dragon.fbx'") && files.bossRig.includes("root.name = 'VeilDragonWorldBoss'") && files.bossRig.includes("visual.name = 'DungeonVeilDragon'"), 'imported dragon world-boss model is missing'],
  [files.bossRig.includes("cache: 'no-store'") && files.bossRig.includes('validatedFbxBuffer') && files.bossRig.includes('new FBXLoader().parse(buffer, basePath)') && files.bossRig.includes('DRAGON_ASSET_REVISION'), 'dragon asset loading is not protected from stale PWA cache, HTML fallbacks or wrong paths'],
  [files.bossRig.includes('attempt <= attempts') && files.bossRig.includes('dragonUrlCandidates()') && files.bossRig.includes('for (const url of urls)'), 'dragon model loading lacks bounded retries across safe URL candidates'],
  [files.bossRig.includes("import { createWorldBossFallbackDragonRig }") && files.bossRig.includes("dungeonVeilBossVisual = 'procedural-dragon-fallback'") && files.bossRig.includes('return fallback;'), 'FBX failure does not resolve to the procedural dragon rig'],
  [files.fallbackDragon.includes("root.name = 'VeilDragonFallbackWorldBoss'") && files.fallbackDragon.includes("visual.name = 'ProceduralAshDragon'") && files.fallbackDragon.includes('FallbackDragonLeftWing') && files.fallbackDragon.includes('FallbackDragonRightWing'), 'fallback world boss lacks a clear dragon body and wings'],
  [files.fallbackDragon.includes('FallbackDragonNeck') && files.fallbackDragon.includes('FallbackDragonSnout') && files.fallbackDragon.includes('FallbackDragonHorn_') && files.fallbackDragon.includes('FallbackDragonTailSegment_'), 'fallback world boss lacks dragon head, horns, neck or segmented tail'],
  [files.fallbackDragon.includes('triggerAttack()') && files.fallbackDragon.includes('attackWave') && files.fallbackDragon.includes('leftWing.rotation.z') && files.fallbackDragon.includes('tailSegments.forEach'), 'fallback dragon is not visibly animated'],
  [files.bossRig.includes('leftWing') && files.bossRig.includes('rightWing') && files.bossRig.includes('tailNodes') && files.bossRig.includes('attackRemaining'), 'imported dragon procedural motion is incomplete'],
  [!files.bossRig.includes('AshShoulderBar') && !files.bossRig.includes('SimplifiedAshCrown') && !files.bossRig.includes('AshWardenSkeleton'), 'legacy humanoid Ash King visual remains active'],
  [files.stage.includes("shadow.name = 'AshKingGroundShadow'") && files.stage.includes('bossRig.root.scale.setScalar(2.0'), 'dominant boss presentation is missing'],
  [files.stage.includes('antialias: !IS_MOBILE') && files.stage.includes('renderer.shadowMap.enabled = !IS_MOBILE'), 'mobile-safe renderer policy is missing'],
  [files.stage.includes("arena: 'single-floor-low-call-kaykit-hall'") && files.stage.includes("camera: 'calm-perspective-camera'") && files.stage.includes('phoneSafeFraming'), 'performance telemetry identity is missing'],
  [files.battle.includes('const TIMER_PAINT_MS = 250;') && files.battle.includes('if (!readyRef.current)'), 'timer throttling or ready gate is missing'],
  [files.battle.includes('function prepareArena') && files.battle.includes('edge ? TileType.WALL : TileType.FLOOR') && files.battle.includes('engine.ignoreRoomPropCollisions = true;'), 'world-boss arena still uses invisible room-50 collision props'],
  [files.battle.includes('const move = useCallback') && files.battle.includes('}, [phase, ready]);'), 'world-boss joystick callback is unstable across HUD rerenders'],
  [files.engine.includes('ignoreRoomPropCollisions = false;') && files.engine.includes('!this.ignoreRoomPropCollisions && shotBlockedByRoomProp') && files.engine.includes('return !this.ignoreRoomPropCollisions && collidesWithRoomProp'), 'engine collision bypass is missing or affects normal rooms'],
  [files.stage.includes("slot.material.color.set('#d8b77a')") && files.stage.includes('const breathGeometry') && files.stage.includes("const breathShot = effect.id.startsWith('boss-shot-breath-')") && files.stage.includes('slot.breath.visible = true') && files.stage.includes('slot.breath.scale.set(1.18 * pulse, 1.55, 1.18 * pulse)'), 'dedicated directional dragon breath or neutral player arrows are missing'],
  [files.stage.includes('ownedTextures.forEach') && files.stage.includes('renderer?.forceContextLoss?.()'), 'renderer or texture cleanup is incomplete'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`World-boss performance audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('World-boss V4 audit passed: canonical 150-second equipment-aware combat, seasonal damage accounting and mobile-safe dragon presentation are protected.');
