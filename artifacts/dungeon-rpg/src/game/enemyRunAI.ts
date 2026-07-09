import type { Enemy, EnemyType, Player } from './entities';

export type EnemyArchetype = 'skeleton' | 'skirmisher' | 'guardian' | 'dragon';

export function enemyArchetype(type: EnemyType): EnemyArchetype {
  if (type === 'boss') return 'dragon';
  if (type === 'spider' || type === 'vampire') return 'skirmisher';
  if (type === 'demon' || type === 'golem' || type === 'orc') return 'guardian';
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
  return { dist, nx: dx / dist, ny: dy / dist };
}

function normalizedMove(x: number, y: number) {
  const length = Math.max(1, Math.hypot(x, y));
  return { x: x / length, y: y / length };
}

function roomFromEnemyId(enemy: Enemy) {
  const parts = enemy.id.split('-');
  const parsed = Number(parts.at(-2));
  return Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 1;
}

export function planEnemyMove(enemy: Enemy, player: Player, dt: number, time: number): EnemyMovePlan {
  const archetype = enemyArchetype(enemy.enemyType);
  const { dist, nx, ny } = normalizedDirection(enemy, player);
  const room = roomFromEnemyId(enemy);
  const movePressure = 1 + Math.min(0.28, (room - 1) * 0.016);
  const attackPressure = 1 - Math.min(0.22, (room - 1) * 0.012);
  const speed = enemy.speed * movePressure * dt / 1000;
  const plan = (dx: number, dy: number, attackRange: number, attackDelay: number): EnemyMovePlan => ({
    dx,
    dy,
    attackRange,
    attackDelay: Math.max(560, Math.round(attackDelay * attackPressure)),
  });

  if (archetype === 'skirmisher') {
    const cycle = ((time - enemy.spawnTime) % 3600 + 3600) % 3600;
    const sideDirection = Math.floor((time - enemy.spawnTime) / 1800 + Number(enemy.id.slice(-1) || 0)) % 2 === 0 ? 1 : -1;
    const sideX = -ny * sideDirection;
    const sideY = nx * sideDirection;

    if (cycle < 1500) {
      const toward = dist > 155 ? 0.72 : dist < 95 ? -0.2 : 0.12;
      const move = normalizedMove(nx * toward + sideX * 0.8, ny * toward + sideY * 0.8);
      return plan(move.x * speed * 0.92, move.y * speed * 0.92, 48 + enemy.width / 2, 930);
    }

    if (cycle < 2350) {
      const pressure = dist > 52 ? 1.62 : 0.32;
      return plan(nx * pressure * speed, ny * pressure * speed, 50 + enemy.width / 2, 760);
    }

    const retreat = dist < 118 ? -0.55 : 0.08;
    const move = normalizedMove(nx * retreat + sideX * 0.64, ny * retreat + sideY * 0.64);
    return plan(move.x * speed * 0.78, move.y * speed * 0.78, 48 + enemy.width / 2, 900);
  }

  if (archetype === 'guardian' || archetype === 'dragon') {
    const phaseLength = archetype === 'dragon' ? 5000 : 4400;
    const phase = ((time - enemy.spawnTime) % phaseLength + phaseLength) % phaseLength;

    if (phase < phaseLength * 0.36) {
      const ideal = archetype === 'dragon' ? 132 : 72;
      const advance = dist > ideal ? 1.16 : dist < ideal * 0.66 ? -0.12 : 0.28;
      return plan(
        nx * advance * speed,
        ny * advance * speed,
        archetype === 'dragon' ? 150 : 58 + enemy.width / 2,
        archetype === 'dragon' ? 900 : 980,
      );
    }

    if (phase < phaseLength * 0.67) {
      const strafeDirection = Math.floor((time - enemy.spawnTime) / 1250) % 2 === 0 ? 1 : -1;
      const sideX = -ny * strafeDirection;
      const sideY = nx * strafeDirection;
      const toward = dist > (archetype === 'dragon' ? 138 : 84) ? 0.46 : dist < 62 ? -0.16 : 0.05;
      const move = normalizedMove(nx * toward + sideX * 0.72, ny * toward + sideY * 0.72);
      return plan(
        move.x * speed * 0.82,
        move.y * speed * 0.82,
        archetype === 'dragon' ? 162 : 60 + enemy.width / 2,
        archetype === 'dragon' ? 980 : 1040,
      );
    }

    const pressure = dist > (archetype === 'dragon' ? 86 : 56) ? 1.42 : 0.28;
    return plan(
      nx * pressure * speed,
      ny * pressure * speed,
      archetype === 'dragon' ? 112 : 60 + enemy.width / 2,
      archetype === 'dragon' ? 690 : 790,
    );
  }

  const weave = Math.sin((time - enemy.spawnTime) * 0.0021 + enemy.x * 0.01) * 0.22;
  const move = normalizedMove(nx - ny * weave, ny + nx * weave);
  return plan(move.x * speed, move.y * speed, 42 + enemy.width / 2, 1020);
}
