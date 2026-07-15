import { makeHitSpark } from './combat';
import type { Enemy } from './entities';
import { enemyVisualProfile } from './enemyRegionalIdentity';
import { GameEngine } from './runEngine';
import { skillRank } from './runSkills';

const DARKWOOD_MIN_ROOM = 11;
const DARKWOOD_MAX_ROOM = 20;
const DARKWOOD_RANGE = 50;
const DARKWOOD_WINDUP_MS = 420;
const DARKWOOD_ATTACK_CYCLE_MS = 1540;
const DARKWOOD_DAMAGE_SCALE = 0.62;
const ARCANE_COLOR = '#9f72ff';

type RuntimeWindup = {
  hitAt: number;
  range: number;
  archetype: string;
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

function installDarkwoodMageCombatPolicy(): void {
  const prototype = GameEngine.prototype as RuntimeEngine;
  if (prototype.__darkwoodMagePolicyInstalled) return;
  prototype.__darkwoodMagePolicyInstalled = true;

  const originalUpdateEnemies = prototype.updateEnemies;
  const originalResolveEnemyAttack = prototype.resolveEnemyAttack;

  prototype.updateEnemies = function updateEnemiesWithReadableDarkwoodMages(this: RuntimeEngine, dt: number, time: number): void {
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
        maxRadius: 34,
        color: ARCANE_COLOR,
        lifeTime: 0,
        maxLifeTime: DARKWOOD_WINDUP_MS,
        type: 'circle',
        element: 'arcane',
      });
    }
  };

  prototype.resolveEnemyAttack = function resolveReadableDarkwoodMageAttack(this: RuntimeEngine, enemy: Enemy, windup: RuntimeWindup, time: number): void {
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

    if (distance > DARKWOOD_RANGE * 1.04) return;
    if (this.shotPathBlocked(fromX, fromY, targetX, targetY, 0.08)) return;

    const angle = Math.atan2(targetY - fromY, targetX - fromX);
    this.addShotEffect(
      `darkwood-mage-shot-${time}-${windup.index}`,
      fromX,
      fromY,
      targetX,
      targetY,
      angle,
      ARCANE_COLOR,
      'arcane',
      6,
      enemy.id,
    );
    this.state.particles.push(...makeHitSpark(targetX, targetY, ARCANE_COLOR, 9));

    if (time <= player.invincibleUntil) return;

    const rawDamage = enemy.attack - player.defense + Math.floor(Math.random() * 3);
    const damage = Math.max(1, Math.round(rawDamage * DARKWOOD_DAMAGE_SCALE));
    player.hp -= damage;
    player.lastHitTime = time;
    if (skillRank(this.state.runSkills, 'defense') > 0) player.lastGuardTime = time;

    this.state.damageNumbers.push({
      id: `hit-${time}-${windup.index}`,
      x: player.x + 16 + (Math.random() - 0.5) * 14,
      y: player.y - 8,
      value: `-${damage}`,
      color: ARCANE_COLOR,
      lifeTime: 0,
      maxLifeTime: 800,
      scale: 1.15,
    });
  };
}

installDarkwoodMageCombatPolicy();

export const DARKWOOD_MAGE_COMBAT_POLICY = Object.freeze({
  roomRange: [DARKWOOD_MIN_ROOM, DARKWOOD_MAX_ROOM] as const,
  attackRange: DARKWOOD_RANGE,
  windupMs: DARKWOOD_WINDUP_MS,
  attackCycleMs: DARKWOOD_ATTACK_CYCLE_MS,
  damageScale: DARKWOOD_DAMAGE_SCALE,
});
