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

export function planEnemyMove(enemy: Enemy, player: Player, dt: number, time: number): EnemyMovePlan {
  const archetype = enemyArchetype(enemy.enemyType);
  const dx0 = player.x - enemy.x;
  const dy0 = player.y - enemy.y;
  const dist = Math.max(1, Math.hypot(dx0, dy0));
  const nx = dx0 / dist;
  const ny = dy0 / dist;

  if (archetype === 'bat') {
    const phase = (time * 0.006 + enemy.spawnTime * 0.001) % (Math.PI * 2);
    const weave = Math.sin(phase) * 0.72;
    const speed = enemy.speed * 1.08 * dt / 1000;
    return {
      dx: (nx - ny * weave) * speed,
      dy: (ny + nx * weave) * speed,
      attackRange: 34 + enemy.width / 2,
      attackDelay: 720,
    };
  }

  if (archetype === 'dragon') {
    const desired = 150;
    const direction = dist > desired + 22 ? 1 : dist < desired - 28 ? -0.55 : 0;
    const strafe = Math.sin(time * 0.0018) * 0.38;
    const speed = enemy.speed * dt / 1000;
    return {
      dx: (nx * direction - ny * strafe) * speed,
      dy: (ny * direction + nx * strafe) * speed,
      attackRange: 188,
      attackDelay: 900,
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
