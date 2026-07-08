import type { Enemy, EnemyType, Player } from './entities';

export type EnemyArchetype = 'skeleton' | 'dragon';

export function enemyArchetype(type: EnemyType): EnemyArchetype {
  return type === 'boss' ? 'dragon' : 'skeleton';
}

export type EnemyMovePlan = {
  dx: number;
  dy: number;
  attackRange: number;
  attackDelay: number;
};

function normalizedDirection(enemy: Enemy, player: Player) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  return { dist, nx: dx / dist, ny: dy / dist };
}

export function planEnemyMove(enemy: Enemy, player: Player, dt: number, time: number): EnemyMovePlan {
  const archetype = enemyArchetype(enemy.enemyType);
  const { dist, nx, ny } = normalizedDirection(enemy, player);

  if (archetype === 'dragon') {
    const phase = ((time - enemy.spawnTime) % 7200 + 7200) % 7200;
    const desiredRange = phase < 2400 ? 220 : phase < 4800 ? 145 : 95;
    const direction = dist > desiredRange + 24 ? 1 : dist < desiredRange - 26 ? -0.65 : 0;
    const strafeDirection = Math.floor((time - enemy.spawnTime) / 2400) % 2 === 0 ? 1 : -1;
    const strafeStrength = phase > 4800 ? 0.18 : 0.62;
    const speedMultiplier = phase > 4800 ? 1.45 : 0.9;
    const speed = enemy.speed * speedMultiplier * dt / 1000;
    const sideX = -ny * strafeDirection;
    const sideY = nx * strafeDirection;

    return {
      dx: (nx * direction + sideX * strafeStrength) * speed,
      dy: (ny * direction + sideY * strafeStrength) * speed,
      attackRange: phase > 4800 ? 118 : 235,
      attackDelay: phase > 4800 ? 620 : 980,
    };
  }

  const speed = enemy.speed * dt / 1000;
  return {
    dx: nx * speed,
    dy: ny * speed,
    attackRange: 42 + enemy.width / 2,
    attackDelay: 1050,
  };
}
