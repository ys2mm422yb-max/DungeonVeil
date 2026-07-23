import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const player = read('src/components/kaykitPlayer3D.ts');
const canvas = read('src/components/GameCanvasKayKit3D.tsx');
const bridge = read('src/components/GameSessionBridge.tsx');
const bowSync = read('src/game/playerBowAttackSync.ts');
const enemy = read('src/components/kaykitEnemyBase3D.ts');
const normalAttacks = read('src/game/normalEnemyAttackTelegraphs.ts');
const manifest = read('src/components/kaykitManifest3D.ts');
const regional = read('src/game/enemyRegionalIdentity.ts');

const enemyLoadsMelee = enemy.includes('/rig_medium_combatmelee\\.glb$/i');
const enemyLoadsRanged = enemy.includes('/rig_medium_combatranged\\.glb$/i');
const enemyLoadsAdvancedMovement = enemy.includes('/rig_medium_movementadvanced\\.glb$/i');
const enemyLoadsSpecial = enemy.includes('/rig_medium_special\\.glb$/i');
const selectedExtras = [
  'Necromancer',
  'Skeleton_Golem',
  'Skeleton_Mage',
  'Skeleton_Minion',
  'Skeleton_Rogue',
  'Skeleton_Warrior',
];
const allExtrasInManifest = selectedExtras.every(name => manifest.includes(`'${name}'`));
const noRoleAliasModels = !manifest.includes('Skeleton_Mage_Necromancer') && !manifest.includes('Skeleton_Warrior_Golem');
const preservedMiddleChapters = regional.includes('if (safeRoom <= 30)')
  && regional.includes("return adventurer('ranger', 'ranger')")
  && regional.includes('if (safeRoom <= 40)')
  && regional.includes("return index % 2 === 0 ? realMage() : skeleton('rogue', 'rogue')");
const duplicateRoleSelector = path.join(root, 'src/components/kaykitEnemyAnimationRoles3D.ts');

const checks = [
  [player.includes('Rig_Medium_CombatRanged.glb'), 'Ranger does not load the KayKit ranged animation package'],
  [player.includes("['ranged', 'bow', 'aiming', 'idle']"), 'Ranger aiming idle is not selected from the KayKit ranged package'],
  [player.includes("['running', 'holding', 'bow']"), 'Ranger movement does not prefer the authored bow-running clip'],
  [player.includes("['ranged', 'bow', 'release']") && player.includes("['ranged', 'bow', 'draw']"), 'Ranger draw/release clips are not selected explicitly'],
  [player.includes("attackPhase: 'none' | 'draw' | 'hold' | 'release'") && player.includes("detail.phase === 'draw'") && player.includes("detail.phase === 'release'"), 'Ranger does not play Draw/Hold before the authored Release phase'],
  [player.includes('window.addEventListener(PLAYER_BOW_EVENT, handleBowEvent)') && player.includes('window.removeEventListener(PLAYER_BOW_EVENT, handleBowEvent)'), 'Ranger bow animation event lifecycle leaks or is not connected'],
  [!player.includes('if (attackRemaining === 0) beginDraw();'), 'Legacy Release-then-Draw animation order remains active'],
  [!player.includes("findBone(visual, ['upperarml'])") && !player.includes('lowerArmR.rotation'), 'Manual ranger arm-rotation fallback remains active'],
  [bridge.includes('installPlayerBowAttackSync(initialEngine)') && bridge.includes('disposePlayerBowSync()'), 'Game session does not install and dispose the synchronized bow runtime'],
  [bowSync.includes('ATTACK_COOLDOWN_FACTORS = [1, 0.84, 0.7, 0.58]') && bowSync.includes('CLASS_DEFS.archer.attackCooldownMs * cooldownFactor'), 'Ranger attack-speed balance changed during animation synchronization'],
  [bowSync.includes("phase: 'draw'") && bowSync.includes("phase: 'release'") && bowSync.includes('originalAutoShoot(time)') && bowSync.includes('runtime.emit()'), 'Projectile creation is not tied to the visible release event'],
  [bowSync.includes("cancelPending('dash')") && bowSync.includes("cancelPending('room-change')") && bowSync.includes("cancelPending('room-clear')"), 'Prepared ranger shots do not cancel safely across dash and room transitions'],
  [canvas.includes('playerRig.triggerAttack()') && canvas.includes('state.player.lastAttackTime > lastAttack'), 'Run renderer lost its idempotent authoritative release fallback'],

  [enemyLoadsMelee && enemyLoadsRanged && enemyLoadsAdvancedMovement && enemyLoadsSpecial, 'Enemy library does not load melee, ranged, advanced movement, and special animation packs'],
  [enemy.includes('loadKayKitEnemyBow') && enemy.includes('attachBowToRanger') && enemy.includes("['running', 'holding', 'bow']"), 'Enemy rangers do not carry a real bow with authored bow locomotion'],
  [!enemy.includes("role === 'rogue' || role === 'ranger'"), 'Enemy rangers are still grouped with blade-equipped rogues'],
  [enemy.includes("['ranged', 'bow', 'draw']") && enemy.includes("['ranged', 'bow', 'release']") && enemy.includes('attackResolveAt') && enemy.includes('awaitingRelease'), 'Enemy ranger Draw and Release are not synchronized to the authoritative resolve frame'],
  [enemy.includes("['ranged', 'magic', 'spellcasting'") && enemy.includes("['ranged', 'magic', 'shoot']") && enemy.includes("['ranged', 'magic', 'summon']"), 'Mage and Necromancer roles do not use authored magic preparation and release clips'],
  [enemy.includes("['melee', 'dualwield', 'attack', 'slice']") && enemy.includes("['melee', '2h', 'attack', 'chop']") && enemy.includes("['melee', '1h', 'attack', 'chop']"), 'Rogue and heavy melee roles do not use distinct authored attacks'],
  [enemy.includes("['skeletons', 'idle']") && enemy.includes("['skeletons', 'walking']") && enemy.includes("['skeletons', 'death']"), 'Skeleton roles do not use their authored idle, walk, and death clips'],
  [enemy.includes("const hitClip = chooseClip(prototype.clips, [['hit', 'a'], ['hit', 'b']") && enemy.includes("enemy.enemyType !== 'boss' && visual.hit && !attackBusy"), 'Hit_A/B reactions are missing or can interrupt bosses and active attacks'],
  [enemy.includes('visual.hitRemaining = 0;') && enemy.includes('visual.attackRemaining > 0 || Boolean(visual.awaitingRelease)'), 'Starting an attack does not cancel a prior hit reaction cleanly'],
  [normalAttacks.includes('shot-ranger-') && normalAttacks.includes('captureResolvingRangerShots') && normalAttacks.includes('shotPathBlocked'), 'Normal ranger projectiles are not created at the existing release frame with LOS checks'],
  [normalAttacks.includes('(enemy as AttackTimingEnemy).attackResolveAt = windup.hitAt'), 'Normal enemy visuals do not receive the authoritative damage-resolution time'],
  [enemy.includes('bossAttackContract(room)') && enemy.includes('visual.awaitingRelease && now >= (visual.attackResolveAt'), 'Enemy release animations are not synchronized to normal and boss windup contracts'],
  [!fs.existsSync(duplicateRoleSelector), 'A second competing enemy role selector remains in the runtime tree'],

  [regional.includes("if (room === 50) return { ...adventurer('knight', 'knight'), bossVariant: 'ember-warden' }"), 'Room 50 lost its dedicated heavy final-boss role'],
  [allExtrasInManifest && manifest.includes('includeSkeletonExtras'), 'Selected Skeletons Extra models are not exposed through the existing KayKit manifest loader'],
  [noRoleAliasModels && regional.includes('SKELETON_EXTRA_MODEL'), 'Skeleton Extra roles still rely on duplicate alias files instead of explicit metadata'],
  [regional.includes("extraSkeleton('mage', 'necromancer')"), 'Room 20 does not use the selected Necromancer with the mage animation role'],
  [regional.includes("extraSkeleton('warrior', 'golem')"), 'Tomb guardian/Golem does not use the selected heavy warrior role'],
  [regional.includes("extraSkeleton('rogue', 'rogue')") && regional.includes("extraSkeleton('minion', 'minion')"), 'Early skeleton variants are not mapped to distinct roles'],
  [preservedMiddleChapters, 'The already validated room 21–40 silhouette mapping was changed unexpectedly'],
  [regional.includes("if (type === 'skeleton') return extraSkeleton('warrior', 'warrior');"), 'Late fortress skeletons do not use the selected warrior model'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error('KayKit combat animation contract failed:');
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

const server = await createServer({ root, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const runtime = await server.ssrLoadModule('/src/game/runEngine.ts');
  const sync = await server.ssrLoadModule('/src/game/playerBowAttackSync.ts');
  const normal = await server.ssrLoadModule('/src/game/normalEnemyAttackTelegraphs.ts');

  const makeEnemy = (game, id, enemyType = 'slime') => {
    const playerState = game.state.player;
    return {
      id,
      type: 'enemy',
      enemyType,
      x: playerState.x + 28,
      y: playerState.y,
      width: 32,
      height: 32,
      vx: 0,
      vy: 0,
      hp: 120,
      maxHp: 120,
      attack: 4,
      defense: 0,
      speed: 42,
      color: '#43c968',
      state: 'chase',
      isDead: false,
      targetX: playerState.x,
      targetY: playerState.y,
      nextAttackTime: 0,
      flashUntil: 0,
      spawnTime: 0,
      lastAttackTime: 0,
      deathTime: 0,
    };
  };

  const game = new runtime.GameEngine();
  const internal = game;
  internal.shotPathBlocked = () => false;
  const target = makeEnemy(game, 'bow-sync-target');
  game.state.enemies = [target];
  const dispose = sync.installPlayerBowAttackSync(game);
  try {
    const hpBefore = target.hp;
    internal.updatePlayer(16, 1000);
    assert(target.hp === hpBefore && game.state.player.lastAttackTime === 0, 'Ranger damage occurred before the visible draw finished.');
    assert(Math.abs(game.state.player.attackCooldown - 270) < 0.001, 'Base ranger cooldown changed when the draw began.');

    internal.updatePlayer(100, 1100);
    assert(target.hp === hpBefore, 'Ranger damage occurred during the draw windup.');
    internal.updatePlayer(30, 1130);
    assert(target.hp < hpBefore, 'Ranger did not deal damage at the synchronized release.');
    assert(game.state.player.lastAttackTime === 1130, 'Authoritative shot timestamp does not match the release frame.');
    assert(game.state.effects.filter(effect => effect.id.startsWith('shot-')).length === 1, 'One release created more than one projectile effect.');
    assert(game.state.player.attackCooldown > 0 && game.state.player.attackCooldown < 270, 'Release restarted the cooldown instead of preserving the existing cadence.');

    game.state.runSkills.attackSpeed = 3;
    const fast = sync.playerBowAttackTiming(game);
    assert(Math.abs(fast.cooldownMs - 156.6) < 0.001, 'Attack-speed rank 3 no longer uses the existing 0.58 cooldown factor.');
    assert(fast.drawMs < fast.cooldownMs, 'Fast ranger draw exceeds the established attack cadence.');
  } finally {
    dispose();
  }

  const dashGame = new runtime.GameEngine();
  const dashInternal = dashGame;
  dashInternal.shotPathBlocked = () => false;
  const dashTarget = makeEnemy(dashGame, 'bow-dash-target');
  dashGame.state.enemies = [dashTarget];
  const disposeDash = sync.installPlayerBowAttackSync(dashGame);
  try {
    const hpBeforeDash = dashTarget.hp;
    dashInternal.updatePlayer(16, 2000);
    dashGame.input.dodge = true;
    dashInternal.updatePlayer(16, 2020);
    dashGame.input.dodge = false;
    dashInternal.updatePlayer(100, 2120);
    assert(dashTarget.hp === hpBeforeDash, 'A dash-cancelled draw produced a ghost shot.');
    assert(dashGame.state.player.lastAttackTime === 0, 'A dash-cancelled draw advanced the authoritative shot timestamp.');
  } finally {
    disposeDash();
  }

  const enemyRangerGame = new runtime.GameEngine();
  const enemyRangerInternal = enemyRangerGame;
  enemyRangerGame.state.floor = 25;
  enemyRangerGame.state.chapter = 3;
  enemyRangerGame.state.player.defense = 0;
  enemyRangerGame.state.player.invincibleUntil = 0;
  enemyRangerInternal.shotPathBlocked = () => false;
  const enemyRanger = makeEnemy(enemyRangerGame, '3-25-0', 'skeleton');
  enemyRangerGame.state.enemies = [enemyRanger];
  const disposeEnemyRanger = normal.installNormalEnemyAttackTelegraphs(enemyRangerGame);
  try {
    const hpBeforeEnemyShot = enemyRangerGame.state.player.hp;
    enemyRangerInternal.updateEnemies(16, 1000);
    assert(enemyRanger.lastAttackTime === 1000, 'Enemy ranger did not begin the existing windup.');
    assert(!enemyRangerGame.state.effects.some(effect => effect.id.startsWith('shot-ranger-')), 'Enemy ranger projectile appeared before release.');
    enemyRangerInternal.updateEnemies(200, 1200);
    assert(enemyRangerGame.state.player.hp < hpBeforeEnemyShot, 'Existing enemy ranger damage did not resolve.');
    assert(enemyRangerGame.state.effects.filter(effect => effect.id.startsWith('shot-ranger-')).length === 1, 'Enemy ranger release did not create exactly one visual projectile.');
  } finally {
    disposeEnemyRanger();
  }
} finally {
  await server.close();
}

console.log('KayKit combat animation contract passed: player and enemy Draw/Hold precede Release, projectiles appear once at release, hit reactions do not interrupt attacks or bosses, role clips are explicit, and balance is unchanged.');
