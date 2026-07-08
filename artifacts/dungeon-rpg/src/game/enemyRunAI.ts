import type { Enemy, EnemyType, Player } from './entities';

export type EnemyArchetype = 'skeleton' | 'guardian';

export function enemyArchetype(type: EnemyType): EnemyArchetype {
  return type === 'boss' ? 'guardian' : 'skeleton';
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

  if (archetype === 'guardian') {
    const phase = ((time - enemy.spawnTime) % 7800 + 7800) % 7800;
    const speed = enemy.speed * dt / 1000;

    // Der Wächter bewegt sich bewusst schwer und lesbar:
    // erst annähern, dann kurze seitliche Neuorientierung, dann Druckphase.
    if (phase < 3100) {
      const advance = dist > 150 ? 0.78 : dist < 118 ? -0.22 : 0;
      return {
        dx: nx * advance * speed,
        dy: ny * advance * speed,
        attackRange: 155,
        attackDelay: 1180,
      };
    }

    if (phase < 5000) {
      const strafeDirection = Math.floor((time - enemy.spawnTime) / 1900) % 2 === 0 ? 1 : -1;
      const sideX = -ny * strafeDirection;
      const sideY = nx * strafeDirection;
      const toward = dist > 150 ? 0.28 : dist < 112 ? -0.18 : 0;
      const move = normalizedMove(nx * toward + sideX * 0.42, ny * toward + sideY * 0.42);
      return {
        dx: move.x * speed * 0.58,
        dy: move.y * speed * 0.58,
        attackRange: 165,
        attackDelay: 1260,
      };
    }

    const pressure = dist > 100 ? 0.92 : dist < 72 ? -0.12 : 0;
    return {
      dx: nx * pressure * speed * 0.9,
      dy: ny * pressure * speed * 0.9,
      attackRange: 112,
      attackDelay: 880,
    };
  }

  const speed = enemy.speed * dt / 1000;
  return {
    dx: nx * speed,
    dy: ny * speed,
    attackRange: 42 + enemy.width / 2,
    attackDelay: 1250,
  };
}
