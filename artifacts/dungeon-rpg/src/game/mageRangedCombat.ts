import type { Enemy } from './entities';
import type { GameEngine } from './runEngine';
import { makeHitSpark } from './combat';
import { enemyVisualProfile } from './enemyRegionalIdentity';
import { collidesWithRoomProp, movementPathBlockedByRoomProp, roomPropDetourWaypoints } from './roomCollision3D';
import { createMageNavigationState, resolveMageObstacleDirection, type MageNavigationState } from './mageObstacleNavigation';

export const MAGE_ATTACK_RANGE = 214;
export const MAGE_RETREAT_RANGE = 122;
export const MAGE_CAST_MS = 420;
export const MAGE_ATTACK_DELAY_MS = 1280;
export const MAGE_PROJECTILE_SPEED = 245;
export const MAGE_PROJECTILE_RADIUS = 11;

const MAGE_PROJECTILE_COLOR = '#b995ff';

type EnemyWindup = {
  hitAt: number;
  range: number;
  archetype: string;
  index: number;
};

type PatchedEngine = {
  updateEnemies: (dt: number, time: number) => void;
  enemyWindups: Map<string, EnemyWindup>;
  moveEntity: (entity: Enemy, dx: number, dy: number) => void;
  shotPathBlocked: (fromX: number, fromY: number, toX: number, toY: number, padding?: number) => boolean;
};

type MageCast = {
  startedAt: number;
  hitAt: number;
};

type MageState = {
  nextCastAt: number;
  cast: MageCast | null;
  navigation: MageNavigationState;
};

type MageProjectile = {
  id: string;
  effectId: string;
  sourceEnemyId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  attack: number;
  expiresAt: number;
};

function enemySpawnIndex(enemy: Enemy): number {
  const parsed = Number(enemy.id.split('-').at(-1));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isHatMageEnemy(room: number, enemy: Pick<Enemy, 'enemyType' | 'id'>): boolean {
  if (enemy.enemyType === 'boss') return false;
  const profile = enemyVisualProfile(room, enemy.enemyType, enemySpawnIndex(enemy as Enemy));
  return profile.family === 'adventurer' && profile.role === 'mage';
}

export function mageAttackDelay(room: number): number {
  const pressure = 1 - Math.min(0.18, Math.max(0, room - 1) * 0.006);
  return Math.max(1040, Math.round(MAGE_ATTACK_DELAY_MS * pressure));
}

export function mageMovementVector(
  enemyX: number,
  enemyY: number,
  playerX: number,
  playerY: number,
  side: number,
): { x: number; y: number } {
  const dx = playerX - enemyX;
  const dy = playerY - enemyY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const nx = dx / distance;
  const ny = dy / distance;
  const toward = distance > MAGE_ATTACK_RANGE ? 0.88 : distance < MAGE_RETREAT_RANGE ? -0.84 : 0.02;
  const strafe = distance < 105 ? 0.16 : 0.46;
  const moveX = nx * toward - ny * side * strafe;
  const moveY = ny * toward + nx * side * strafe;
  const magnitude = Math.max(1, Math.hypot(moveX, moveY));
  return { x: moveX / magnitude, y: moveY / magnitude };
}

function mageSide(enemy: Enemy, time: number): number {
  const index = enemySpawnIndex(enemy);
  return (index + Math.floor((time - enemy.spawnTime) / 1900)) % 2 === 0 ? 1 : -1;
}

function enemyCenter(enemy: Enemy) {
  return { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 };
}

function playerCenter(engine: GameEngine) {
  const player = engine.state.player;
  return { x: player.x + player.width / 2, y: player.y + player.height / 2 };
}

function resetNavigationProgress(state: MageState, enemy: Enemy, time: number): void {
  state.navigation.progressX = enemy.x;
  state.navigation.progressY = enemy.y;
  state.navigation.progressAt = time;
}

export function installMageRangedCombat(engine: GameEngine): () => void {
  const runtime = engine as unknown as PatchedEngine;
  const originalUpdateEnemies = runtime.updateEnemies.bind(engine);
  const mageStates = new Map<string, MageState>();
  const projectiles: MageProjectile[] = [];
  let roomKey = `${engine.state.chapter}:${engine.state.floor}`;

  const removeEffect = (effectId: string) => {
    engine.state.effects = engine.state.effects.filter(effect => effect.id !== effectId);
  };

  const removeProjectile = (index: number, impactX?: number, impactY?: number) => {
    const [projectile] = projectiles.splice(index, 1);
    if (!projectile) return;
    removeEffect(projectile.effectId);
    if (impactX === undefined || impactY === undefined) return;
    engine.state.effects.push({
      id: `mage-impact-${projectile.id}`,
      x: impactX,
      y: impactY,
      radius: 4,
      maxRadius: 30,
      color: MAGE_PROJECTILE_COLOR,
      lifeTime: 0,
      maxLifeTime: 260,
      type: 'circle',
      element: 'arcane',
    });
    engine.state.particles.push(...makeHitSpark(impactX, impactY, MAGE_PROJECTILE_COLOR, 8));
  };

  const clearProjectiles = (sourceEnemyId?: string) => {
    for (let index = projectiles.length - 1; index >= 0; index--) {
      if (!sourceEnemyId || projectiles[index].sourceEnemyId === sourceEnemyId) removeProjectile(index);
    }
  };

  const clearAll = () => {
    mageStates.clear();
    clearProjectiles();
    engine.state.effects = engine.state.effects.filter(effect => !effect.id.startsWith('mage-cast-'));
  };

  const launchProjectile = (enemy: Enemy, time: number) => {
    const source = enemyCenter(enemy);
    const target = playerCenter(engine);
    if (runtime.shotPathBlocked(source.x, source.y, target.x, target.y, 0.08)) return;
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    const aimedDistance = Math.max(96, Math.hypot(target.x - source.x, target.y - source.y));
    const travel = Math.min(280, aimedDistance + 58);
    const duration = Math.max(420, Math.round(travel / MAGE_PROJECTILE_SPEED * 1000));
    const effectId = `shot-mage-${time}-${enemy.id}`;
    engine.state.effects.push({
      id: effectId,
      x: source.x,
      y: source.y,
      radius: MAGE_PROJECTILE_RADIUS,
      maxRadius: travel,
      color: MAGE_PROJECTILE_COLOR,
      lifeTime: 0,
      maxLifeTime: duration,
      type: 'beam',
      angle,
      width: 7,
      element: 'arcane',
      fromEnemyId: enemy.id,
    });
    projectiles.push({
      id: `mage-projectile-${time}-${enemy.id}`,
      effectId,
      sourceEnemyId: enemy.id,
      x: source.x,
      y: source.y,
      vx: Math.cos(angle) * MAGE_PROJECTILE_SPEED,
      vy: Math.sin(angle) * MAGE_PROJECTILE_SPEED,
      radius: MAGE_PROJECTILE_RADIUS,
      attack: enemy.attack,
      expiresAt: time + duration,
    });
  };

  const updateProjectiles = (dt: number, time: number) => {
    const player = engine.state.player;
    const target = playerCenter(engine);
    for (let index = projectiles.length - 1; index >= 0; index--) {
      const projectile = projectiles[index];
      const previousX = projectile.x;
      const previousY = projectile.y;
      projectile.x += projectile.vx * dt / 1000;
      projectile.y += projectile.vy * dt / 1000;

      if (runtime.shotPathBlocked(previousX, previousY, projectile.x, projectile.y, 0.025)) {
        removeProjectile(index, previousX, previousY);
        continue;
      }

      const hitRadius = projectile.radius + Math.min(player.width, player.height) * 0.38;
      if (Math.hypot(target.x - projectile.x, target.y - projectile.y) <= hitRadius) {
        if (time > player.invincibleUntil) {
          const raw = projectile.attack - player.defense + Math.floor(Math.random() * 3);
          const damage = Math.max(1, raw);
          player.hp -= damage;
          player.lastHitTime = time;
          if ((engine.state.runSkills.defense ?? 0) > 0) player.lastGuardTime = time;
          engine.state.damageNumbers.push({
            id: `mage-hit-${time}-${projectile.id}`,
            x: target.x + (Math.random() - 0.5) * 14,
            y: player.y - 8,
            value: `-${damage}`,
            color: '#c8a8ff',
            lifeTime: 0,
            maxLifeTime: 800,
            scale: 1.12,
          });
        }
        removeProjectile(index, projectile.x, projectile.y);
        continue;
      }

      if (time >= projectile.expiresAt) removeProjectile(index);
    }
  };

  runtime.updateEnemies = (dt, time) => {
    const nextRoomKey = `${engine.state.chapter}:${engine.state.floor}`;
    if (nextRoomKey !== roomKey) {
      clearAll();
      roomKey = nextRoomKey;
    }

    const controlled = new Map<string, { speed: number; nextAttackTime: number; customMovement: boolean }>();
    const target = playerCenter(engine);
    for (const enemy of engine.state.enemies) {
      if (!isHatMageEnemy(engine.state.floor, enemy) || enemy.isDead || enemy.hp <= 0) continue;
      const source = enemyCenter(enemy);
      const hasLineOfSight = !runtime.shotPathBlocked(source.x, source.y, target.x, target.y, 0.08);
      const casting = Boolean(mageStates.get(enemy.id)?.cast);
      controlled.set(enemy.id, { speed: enemy.speed, nextAttackTime: enemy.nextAttackTime, customMovement: hasLineOfSight || casting });
      enemy.nextAttackTime = Number.POSITIVE_INFINITY;
      runtime.enemyWindups.delete(enemy.id);
      if (hasLineOfSight || casting) enemy.speed = 0;
    }

    originalUpdateEnemies(dt, time);

    for (const [enemyId, snapshot] of controlled) {
      const enemy = engine.state.enemies.find(candidate => candidate.id === enemyId);
      if (!enemy || enemy.isDead || enemy.hp <= 0) {
        mageStates.delete(enemyId);
        clearProjectiles(enemyId);
        continue;
      }
      enemy.speed = snapshot.speed;
      enemy.nextAttackTime = snapshot.nextAttackTime;

      const state = mageStates.get(enemy.id) ?? {
        nextCastAt: time + 460,
        cast: null,
        navigation: createMageNavigationState(enemy.x, enemy.y, time),
      };
      mageStates.set(enemy.id, state);
      const source = enemyCenter(enemy);
      const currentTarget = playerCenter(engine);
      const distance = Math.hypot(currentTarget.x - source.x, currentTarget.y - source.y);
      const hasLineOfSight = !runtime.shotPathBlocked(source.x, source.y, currentTarget.x, currentTarget.y, 0.08);

      if (state.cast) {
        enemy.state = 'attack';
        enemy.vx = 0;
        enemy.vy = 0;
        resetNavigationProgress(state, enemy, time);
        if (time >= state.cast.hitAt) {
          launchProjectile(enemy, time);
          state.cast = null;
        }
        continue;
      }

      if (!hasLineOfSight) {
        enemy.state = 'chase';
        resetNavigationProgress(state, enemy, time);
        continue;
      }

      if (distance <= MAGE_ATTACK_RANGE && time >= state.nextCastAt && time - enemy.spawnTime >= 900) {
        state.cast = { startedAt: time, hitAt: time + MAGE_CAST_MS };
        state.nextCastAt = time + mageAttackDelay(engine.state.floor);
        enemy.lastAttackTime = time;
        enemy.state = 'attack';
        enemy.vx = 0;
        enemy.vy = 0;
        resetNavigationProgress(state, enemy, time);
        engine.state.effects.push({
          id: `mage-cast-${time}-${enemy.id}`,
          x: source.x,
          y: source.y,
          radius: 0,
          maxRadius: 38,
          color: MAGE_PROJECTILE_COLOR,
          lifeTime: 0,
          maxLifeTime: MAGE_CAST_MS,
          type: 'circle',
          element: 'arcane',
        });
        continue;
      }

      if (!snapshot.customMovement) continue;
      const side = mageSide(enemy, time);
      const desired = mageMovementVector(source.x, source.y, currentTarget.x, currentTarget.y, side);
      const alternate = mageMovementVector(source.x, source.y, currentTarget.x, currentTarget.y, -side);
      const direction = resolveMageObstacleDirection({
        enemy,
        playerX: currentTarget.x,
        playerY: currentTarget.y,
        desired,
        alternate,
        side,
        time,
        pathBlocked: (fromX, fromY, toX, toY, padding = 0.12) => movementPathBlockedByRoomProp(
          engine.state.floor,
          engine.state.map.width,
          engine.state.map.height,
          fromX,
          fromY,
          toX,
          toY,
          enemy.width,
          enemy.height,
          padding,
        ),
        detourWaypoints: (fromX, fromY, toX, toY) => roomPropDetourWaypoints(
          engine.state.floor,
          engine.state.map.width,
          engine.state.map.height,
          fromX,
          fromY,
          toX,
          toY,
          enemy.width,
          enemy.height,
        ),
        collides: (x, y, padding = 0.025) => collidesWithRoomProp(
          engine.state.floor,
          engine.state.map.width,
          engine.state.map.height,
          x,
          y,
          enemy.width,
          enemy.height,
          padding,
        ),
      }, state.navigation);
      const roomPressure = 1 + Math.min(0.28, Math.max(0, engine.state.floor - 1) * 0.014);
      const moveDistance = enemy.speed * roomPressure * 0.94 * dt / 1000;
      const beforeX = enemy.x;
      const beforeY = enemy.y;
      runtime.moveEntity(enemy, direction.x * moveDistance, direction.y * moveDistance);
      enemy.vx = enemy.x - beforeX;
      enemy.vy = enemy.y - beforeY;
      enemy.state = 'chase';
    }

    for (const [enemyId] of mageStates) {
      if (!engine.state.enemies.some(enemy => enemy.id === enemyId && !enemy.isDead && enemy.hp > 0)) {
        mageStates.delete(enemyId);
        clearProjectiles(enemyId);
      }
    }

    updateProjectiles(dt, time);
  };

  return () => {
    runtime.updateEnemies = originalUpdateEnemies;
    clearAll();
  };
}
