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
  joystick: await readFile(new URL('../src/components/VirtualJoystick.tsx', import.meta.url), 'utf8'),
  engine: await readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
  vite: await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8'),
  localThreeAudit: await readFile(new URL('./validate-local-three-runtime.mjs', import.meta.url), 'utf8'),
};
const dragon = await readFile(new URL('../public/assets/3d/Dragon.fbx', import.meta.url));
const dragonHeader = dragon.subarray(0, 64).toString('utf8');

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
  [files.stage.includes('const MAX_PROJECTILES = IS_MOBILE ? 3 : 8;') && files.stage.includes('const EMBER_COUNT = IS_MOBILE ? 6 : 20;'), 'mobile effect budgets are too high'],
  [files.stage.includes('qualityLevel === 0) return 0') && files.stage.includes("return Math.min(ratio, IS_ANDROID ? 0.76 : 0.9)"), 'mobile frame pacing or resolution is not performance safe'],
  [files.stage.includes('fps < 24 ? 2 : fps < 44') && files.stage.includes('IS_MOBILE ? 60 : 0'), 'adaptive 60-fps-first ladder is missing'],
  [files.stage.includes('camera.fov = phonePortrait ? 58') && files.stage.includes('cameraDistance = phonePortrait ? 23.6') && files.stage.includes('data-camera="calm-perspective-camera"'), 'calm phone-safe camera is missing'],
  [files.stage.includes('new THREE.CircleGeometry(1, 24)') && !files.stage.includes('new THREE.RingGeometry'), 'neon ring telegraphs remain'],
  [dragon.byteLength > 100_000 && dragonHeader.includes('Kaydara FBX Binary'), 'original Dragon.fbx is missing, incomplete or not a binary FBX'],
  [files.bossRig.includes("const DRAGON_ASSET_PATH = 'assets/3d/Dragon.fbx'") && files.bossRig.includes("root.name = 'VeilDragonWorldBoss'") && files.bossRig.includes("visual.name = 'DungeonVeilBlackDragon'") && files.bossRig.includes("dungeonVeilBossVisual = 'original-black-fbx-dragon'"), 'original black imported dragon identity is missing'],
  [files.bossRig.includes("cache: 'no-store'") && files.bossRig.includes('validatedFbxBuffer') && files.bossRig.includes('new FBXLoader().parse(buffer, basePath)') && files.bossRig.includes('DRAGON_ASSET_REVISION'), 'dragon asset loading is not protected from stale PWA cache, HTML fallbacks or wrong paths'],
  [files.bossRig.includes('attempt <= attempts') && files.bossRig.includes('dragonUrlCandidates()') && files.bossRig.includes('for (const url of urls)') && files.bossRig.includes('attempts = 3'), 'dragon model loading lacks bounded retries across safe URL candidates'],
  [!files.bossRig.includes('worldBossFallbackDragon3D') && !files.bossRig.includes('procedural-dragon-fallback') && !files.bossRig.includes('createWorldBossFallbackDragonRig'), 'red procedural dragon fallback remains active'],
  [!files.bossRig.includes('0x6f3b2c') && !files.bossRig.includes("emissive.set(0x120302)") && !files.bossRig.includes('.color.lerp('), 'original dragon materials are still being recolored red or brown'],
  [files.bossRig.includes('createNeutralLoadFailureRig') && files.bossRig.includes("dungeonVeilBossVisual = 'load-error-no-fallback'") && files.bossRig.includes('return createNeutralLoadFailureRig(THREE, error);'), 'permanent dragon loading failure still replaces the boss with another figure'],
  [files.battle.includes('worldboss-dragon-loading') && files.battle.includes('worldboss-dragon-load-error') && files.battle.includes('SICHER ZURÜCK') && files.combatBand.includes('getWorldBossLoadFailure'), 'neutral dragon loading and safe failure UI are missing'],
  [files.vite.includes("'examples/jsm/loaders/FBXLoader.js'") && files.vite.includes("'examples/jsm/libs/fflate.module.js'") && files.vite.includes("'examples/jsm/curves/NURBSCurve.js'") && files.vite.includes("'examples/jsm/curves/NURBSUtils.js'"), 'local Three.js runtime does not ship the FBX loader dependency graph'],
  [files.localThreeAudit.includes("'assets/vendor/three/examples/jsm/loaders/FBXLoader.js', 100_000") && files.localThreeAudit.includes("'assets/vendor/three/examples/jsm/libs/fflate.module.js', 20_000"), 'built FBX runtime files are not size-validated'],
  [files.bossRig.includes('leftWing') && files.bossRig.includes('rightWing') && files.bossRig.includes('tailNodes') && files.bossRig.includes('attackRemaining'), 'original dragon procedural motion is incomplete'],
  [files.stage.includes("shadow.name = 'AshKingGroundShadow'") && files.stage.includes('bossRig.root.scale.setScalar(2.0'), 'dominant boss presentation is missing'],
  [files.stage.includes('antialias: !IS_MOBILE') && files.stage.includes('renderer.shadowMap.enabled = !IS_MOBILE'), 'mobile-safe renderer policy is missing'],
  [files.battle.includes('const TIMER_PAINT_MS = 250;') && files.battle.includes('if (!readyRef.current || loadErrorRef.current)'), 'timer throttling or ready/load gate is missing'],
  [files.battle.includes('function prepareArena') && files.battle.includes('edge ? TileType.WALL : TileType.FLOOR') && files.battle.includes('engine.ignoreRoomPropCollisions = true;'), 'world-boss arena still uses invisible room-50 collision props'],
  [files.battle.includes("data-input-contract=\"stable-ref-v2\"") && files.battle.includes("phaseRef.current !== 'fighting'") && files.battle.includes("engine.state.status = 'playing';") && files.battle.includes('const move = useCallback') && files.battle.includes('}, []);'), 'world-boss input bridge still depends on stale React render state'],
  [files.joystick.includes('onPointerMove={floating ? undefined : moveCapturedPointer}') && files.joystick.includes('onPointerUp={floating ? undefined : endCapturedPointer}') && files.joystick.includes('onPointerCancel={floating ? undefined : endCapturedPointer}') && files.joystick.includes('data-pointer-contract="captured-local-and-window"'), 'joystick lacks direct captured pointer handling for iPad WebKit'],
  [files.joystick.includes('knobTransform(next.x, next.y)') && files.joystick.includes("touchAction: 'none'") && files.joystick.includes("overscrollBehavior: 'contain'"), 'joystick transform or touch-scroll isolation is not stable'],
  [files.engine.includes('ignoreRoomPropCollisions = false;') && files.engine.includes('!this.ignoreRoomPropCollisions && shotBlockedByRoomProp') && files.engine.includes('return !this.ignoreRoomPropCollisions && collidesWithRoomProp'), 'engine collision bypass is missing or affects normal rooms'],
  [files.stage.includes("slot.material.color.set('#d8b77a')") && files.stage.includes('const breathGeometry') && files.stage.includes("const breathShot = effect.id.startsWith('boss-shot-breath-')") && files.stage.includes('slot.breath.visible = true'), 'dedicated directional dragon breath or neutral player arrows are missing'],
  [files.stage.includes('ownedTextures.forEach') && files.stage.includes('renderer?.forceContextLoss?.()'), 'renderer or texture cleanup is incomplete'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`World-boss performance audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('World-boss V4 audit passed: stable iPad input, pinned local FBX loading, original black dragon-only rendering, bounded retries and safe failure UX are protected.');
