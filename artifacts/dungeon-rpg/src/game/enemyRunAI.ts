import type { Enemy, EnemyType, Player } from './entities';

export type EnemyArchetype = 'skeleton' | 'bat' | 'dragon';

export function enemyArchetype(type: EnemyType): EnemyArchetype {
  if (type === 'boss') return 'dragon';
  if (type === 'spider' || type === 'vampire') return 'bat';
  return 'skeleton';
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
  return { dx, dy, dist, nx: dx / dist, ny: dy / dist };
}

export function planEnemyMove(enemy: Enemy, player: Player, dt: number, time: number): EnemyMovePlan {
  const archetype = enemyArchetype(enemy.enemyType);
  const { dist, nx, ny } = normalizedDirection(enemy, player);

  if (archetype === 'bat') {
    const age = Math.max(0, time - enemy.spawnTime);
    const cycle = (age + enemy.id.length * 173) % 2200;
    const diving = cycle > 850 && cycle < 1450;
    const retreating = cycle >= 1450 && cycle < 1850;
    const orbitDirection = enemy.id.charCodeAt(enemy.id.length - 1) % 2 === 0 ? 1 : -1;
    const sideX = -ny * orbitDirection;
    const sideY = nx * orbitDirection;
    const speed = enemy.speed * dt / 1000;

    if (diving) {
      return {
        dx: nx * speed * 1.75,
        dy: ny * speed * 1.75,
        attackRange: 34 + enemy.width / 2,
        attackDelay: 680,
      };
    }

    if (retreating && dist < 150) {
      return {
        dx: (-nx * 0.85 + sideX * 0.35) * speed,
        dy: (-ny * 0.85 + sideY * 0.35) * speed,
        attackRange: 30 + enemy.width / 2,
        attackDelay: 680,
      };
    }

    const orbitPull = dist > 170 ? 0.72 : dist < 105 ? -0.38 : 0.08;
    return {
      dx: (nx * orbitPull + sideX * 0.9) * speed,
      dy: (ny * orbitPull + sideY * 0.9) * speed,
      attackRange: 32 + enemy.width / 2,
      attackDelay: 680,
    };
  }

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
  const close = dist < 72;
  const strafe = close ? Math.sin((time + enemy.spawnTime) * 0.004) * 0.18 : 0;
  return {
    dx: (nx - ny * strafe) * speed,
    dy: (ny + nx * strafe) * speed,
    attackRange: 42 + enemy.width / 2,
    attackDelay: 1050,
  };
}
