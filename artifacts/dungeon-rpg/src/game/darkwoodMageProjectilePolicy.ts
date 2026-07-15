import { makeHitSpark } from './combat';
import type { Enemy } from './entities';
import { enemyVisualProfile } from './enemyRegionalIdentity';
import { GameEngine } from './runEngine';
import { skillRank } from './runSkills';

const DARKWOOD_MIN_ROOM = 11;
const DARKWOOD_MAX_ROOM = 20;
const DARKWOOD_RANGE = 104;
const DARKWOOD_WINDUP_MS = 520;
const DARKWOOD_ATTACK_CYCLE_MS = 1900;
const DARKWOOD_DAMAGE_SCALE = 0.58;
const DARKWOOD_PROJECTILE_MIN_MS = 420;
const DARKWOOD_PROJECTILE_MAX_MS = 680;
const DARKWOOD_PROJECTILE_SPEED = 0.19;
const DARKWOOD_IMPACT_RADIUS = 22;
const ARCANE_COLOR = '#b487ff';
const ARCANE_CORE = '#f0ddff';

type RuntimeWindup = {
  hitAt: number;
  range: number;
  archetype: string;
  index: number;
};

type PendingProjectile = {
  id: string;
  enemyId: string;
  room: number;
  impactAt: number;
  targetX: number;
  targetY: number;
  damage: number;
  index: number;
};

type RuntimeEngine = any;

function spawnIndex(enemy: Enemy): number {
  const parsed = Number(enemy.id.split('-').at(-1));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDarkwoodMage(engine: GameEngine, enemy: Enemy): boolean {
  if (enemy.enemyType === 'boss') return false;
  if (engine.state.floor < DARKWOOD_MIN_ROOM || engine.state.floor > DARKWOOD_MAX_ROOM) return false;
  return enemyVisualProfile(engine.state.floor, enemy.enemyType, spawnIndex(enemy)).role === 'mage';
}

function projectileStore(engine: RuntimeEngine): Map<string, PendingProjectile> {
  if (!engine.__darkwoodMageProjectiles) engine.__darkwoodMageProjectiles = new Map<string, PendingProjectile>();
  return engine.__darkwoodMageProjectiles;
}

function resolveProjectileImpact(engine: RuntimeEngine, projectile: PendingProjectile, time: number): void {
  const player = engine.state.player;
  const playerX = player.x + 16;
  const playerY = player.y + 16;
  const missDistance = Math.hypot(playerX - projectile.targetX, playerY - projectile.targetY);

  engine.state.effects.push({
    id: `darkwood-mage-impact-${projectile.id}`,
    x: projectile.targetX,
    y: projectile.targetY,
    radius: 0,
    maxRadius: 34,
    color: ARCANE_CORE,
    lifeTime: 0,
    maxLifeTime: 260,
    type: 'circle',
    element: 'arcane',
  });
  engine.state.particles.push(...makeHitSpark(projectile.targetX, projectile.targetY, ARCANE_COLOR, 14));

  if (missDistance > DARKWOOD_IMPACT_RADIUS) return;
  if (time <= player.invincibleUntil) return;

  player.hp -= projectile.damage;
  player.lastHitTime = time;
  if (skillRank(engine.state.runSkills, 'defense') > 0) player.lastGuardTime = time;
  engine.state.damageNumbers.push({
    id: `hit-${time}-${projectile.index}`,
    x: player.x + 16 + (Math.random() - 0.5) * 14,
    y: player.y - 8,
    value: `-${projectile.damage}`,
    color: ARCANE_COLOR,
    lifeTime: 0,
    maxLifeTime: 800,
    scale: 1.18,
  });
}

function installDarkwoodMageProjectilePolicy(): void {
  const prototype = GameEngine.prototype as RuntimeEngine;
  if (prototype.__darkwoodMageProjectilePolicyInstalled) return;
  prototype.__darkwoodMageProjectilePolicyInstalled = true;

  const originalUpdateEnemies = prototype.updateEnemies;
  const originalResolveEnemyAttack = prototype.resolveEnemyAttack;

  prototype.updateEnemies = function updateEnemiesWithVisibleDarkwoodProjectiles(this: RuntimeEngine, dt: number, time: number): void {
    const projectiles = projectileStore(this);
    for (const [id, projectile] of projectiles) {
      if (projectile.room !== this.state.floor) {
        projectiles.delete(id);
        continue;
      }
      if (time >= projectile.impactAt) {
        projectiles.delete(id);
        resolveProjectileImpact(this, projectile, time);
      }
    }

    const previousAttackTimes = new Map<string, number>();
    for (const enemy of this.state.enemies as Enemy[]) {
      if (isDarkwoodMage(this, enemy)) previousAttackTimes.set(enemy.id, enemy.lastAttackTime);
    }

    originalUpdateEnemies.call(this, dt, time);

    const playerX = this.state.player.x + 16;
    const playerY = this.state.player.y + 16;

    for (const enemy of this.state.enemies as Enemy[]) {
      if (enemy.isDead || !isDarkwoodMage(this, enemy)) continue;

      const enemyX = enemy.x + enemy.width / 2;
      const enemyY = enemy.y + enemy.height / 2;
      const dx = playerX - enemyX;
      const dy = playerY - enemyY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const windup = this.enemyWindups.get(enemy.id) as RuntimeWindup | undefined;

      if (distance > DARKWOOD_RANGE) {
        if (windup) this.enemyWindups.delete(enemy.id);
        enemy.state = 'chase';
        const frostFactor = enemy.frostUntil && time < enemy.frostUntil ? 1 - (enemy.frostSlow ?? 0) : 1;
        const step = Math.max(0, enemy.speed * frostFactor * Math.min(100, dt) / 1000);
        this.moveEntity(enemy, dx / distance * step, dy / distance * step);
        enemy.nextAttackTime = Math.max(enemy.nextAttackTime, time + 220);
        continue;
      }

      const previousAttackTime = previousAttackTimes.get(enemy.id) ?? enemy.lastAttackTime;
      if (!windup || enemy.lastAttackTime <= previousAttackTime) continue;

      windup.range = DARKWOOD_RANGE;
      windup.hitAt = Math.max(windup.hitAt, enemy.lastAttackTime + DARKWOOD_WINDUP_MS);
      enemy.nextAttackTime = Math.max(enemy.nextAttackTime, enemy.lastAttackTime + DARKWOOD_ATTACK_CYCLE_MS);

      this.state.effects.push({
        id: `darkwood-mage-warning-${time}-${enemy.id}`,
        x: enemyX,
        y: enemyY,
        radius: 0,
        maxRadius: 38,
        color: ARCANE_COLOR,
        lifeTime: 0,
        maxLifeTime: DARKWOOD_WINDUP_MS,
        type: 'circle',
        element: 'arcane',
      });
      this.state.effects.push({
        id: `darkwood-mage-target-${time}-${enemy.id}`,
        x: playerX,
        y: playerY,
        radius: 0,
        maxRadius: DARKWOOD_IMPACT_RADIUS,
        color: ARCANE_CORE,
        lifeTime: 0,
        maxLifeTime: DARKWOOD_WINDUP_MS,
        type: 'circle',
        element: 'arcane',
      });
    }
  };

  prototype.resolveEnemyAttack = function resolveVisibleDarkwoodMageAttack(this: RuntimeEngine, enemy: Enemy, windup: RuntimeWindup, time: number): void {
    if (!isDarkwoodMage(this, enemy)) {
      originalResolveEnemyAttack.call(this, enemy, windup, time);
      return;
    }

    const player = this.state.player;
    const fromX = enemy.x + enemy.width / 2;
    const fromY = enemy.y + enemy.height / 2;
    const targetX = player.x + 16;
    const targetY = player.y + 16;
    const distance = Math.hypot(targetX - fromX, targetY - fromY);

    if (distance > DARKWOOD_RANGE * 1.05) return;
    if (this.shotPathBlocked(fromX, fromY, targetX, targetY, 0.08)) return;

    const rawDamage = enemy.attack - player.defense + Math.floor(Math.random() * 3);
    const damage = Math.max(1, Math.round(rawDamage * DARKWOOD_DAMAGE_SCALE));
    const travelMs = Math.max(DARKWOOD_PROJECTILE_MIN_MS, Math.min(DARKWOOD_PROJECTILE_MAX_MS, Math.round(distance / DARKWOOD_PROJECTILE_SPEED)));
    const angle = Math.atan2(targetY - fromY, targetX - fromX);
    const projectileId = `${time}-${enemy.id}-${windup.index}`;

    this.state.effects.push({
      id: `darkwood-mage-projectile-${projectileId}`,
      x: fromX,
      y: fromY,
      radius: 0,
      maxRadius: distance,
      color: ARCANE_COLOR,
      lifeTime: 0,
      maxLifeTime: travelMs,
      type: 'beam',
      angle,
      width: 12,
      element: 'arcane',
      fromEnemyId: enemy.id,
    });
    this.state.effects.push({
      id: `darkwood-mage-projectile-core-${projectileId}`,
      x: fromX,
      y: fromY,
      radius: 0,
      maxRadius: distance,
      color: ARCANE_CORE,
      lifeTime: 0,
      maxLifeTime: travelMs,
      type: 'beam',
      angle,
      width: 5,
      element: 'arcane',
      fromEnemyId: enemy.id,
    });
    this.state.particles.push(...makeHitSpark(fromX, fromY, ARCANE_COLOR, 10));

    projectileStore(this).set(projectileId, {
      id: projectileId,
      enemyId: enemy.id,
      room: this.state.floor,
      impactAt: time + travelMs,
      targetX,
      targetY,
      damage,
      index: windup.index,
    });
  };
}

installDarkwoodMageProjectilePolicy();

export const DARKWOOD_MAGE_PROJECTILE_POLICY = Object.freeze({
  roomRange: [DARKWOOD_MIN_ROOM, DARKWOOD_MAX_ROOM] as const,
  attackRange: DARKWOOD_RANGE,
  windupMs: DARKWOOD_WINDUP_MS,
  attackCycleMs: DARKWOOD_ATTACK_CYCLE_MS,
  damageScale: DARKWOOD_DAMAGE_SCALE,
  projectileTravelMs: [DARKWOOD_PROJECTILE_MIN_MS, DARKWOOD_PROJECTILE_MAX_MS] as const,
  impactRadius: DARKWOOD_IMPACT_RADIUS,
});
