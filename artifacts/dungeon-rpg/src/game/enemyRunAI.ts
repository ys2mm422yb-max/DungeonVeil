import type { Enemy, EnemyType, Player } from './entities';

export type EnemyArchetype = 'skeleton' | 'guardian' | 'dragon';

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

function normalizedMove(x: number, y: number) {
  const length = Math.max(1, Math.hypot(x, y));
  return { x: x / length, y: y / length };
}

export function planEnemyMove(enemy: Enemy, player: Player, dt: number, time: number): EnemyMovePlan {
  const archetype = enemyArchetype(enemy.enemyType);
  const { dist, nx, ny } = normalizedDirection(enemy, player);

  if (archetype === 'guardian' || archetype === 'dragon') {
    const phase = ((time - enemy.spawnTime) % 6200 + 6200) % 6200;
    const speed = enemy.speed * dt / 1000;

    if (phase < 2300) {
      const advance = dist > 145 ? 1 : dist < 108 ? -0.18 : 0.18;
      return {
        dx: nx * advance * speed,
        dy: ny * advance * speed,
        attackRange: 150,
        attackDelay: 1050,
      };
    }

    if (phase < 3800) {
      const strafeDirection = Math.floor((time - enemy.spawnTime) / 1500) % 2 === 0 ? 1 : -1;
      const sideX = -ny * strafeDirection;
      const sideY = nx * strafeDirection;
      const toward = dist > 145 ? 0.38 : dist < 105 ? -0.14 : 0;
      const move = normalizedMove(nx * toward + sideX * 0.54, ny * toward + sideY * 0.54);
      return {
        dx: move.x * speed * 0.72,
        dy: move.y * speed * 0.72,
        attackRange: 160,
        attackDelay: 1160,
      };
    }

    const pressure = dist > 94 ? 1.08 : dist < 68 ? -0.08 : 0.22;
    return {
      dx: nx * pressure * speed,
      dy: ny * pressure * speed,
      attackRange: 108,
      attackDelay: 820,
    };
  }

  const speed = enemy.speed * dt / 1000;
  return {
    dx: nx * speed,
    dy: ny * speed,
    attackRange: 42 + enemy.width / 2,
    attackDelay: 1180,
  };
}
