import type { Enemy, EnemyType, Player } from './entities';

export type EnemyArchetype = 'skeleton' | 'skirmisher' | 'guardian' | 'dragon';

export function enemyArchetype(type: EnemyType): EnemyArchetype {
  if (type === 'boss') return 'dragon';
  if (type === 'spider' || type === 'vampire') return 'skirmisher';
  if (type === 'demon' || type === 'golem' || type === 'orc') return 'guardian';
  return 'skeleton';
}

export type EnemyMovePlan = { dx: number; dy: number; attackRange: number; attackDelay: number };

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
  const match = enemy.id.match(/^\d+-(\d+)-\d+/);
  const parsed = Number(match?.[1]);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 1;
}

function laneBias(enemy: Enemy, time: number) {
  const variant = enemy.huntVisualVariant ?? Number(enemy.id.slice(-1).replace(/\D/g, '') || 0);
  return (variant + Math.floor((time - enemy.spawnTime) / 1900)) % 2 === 0 ? 1 : -1;
}

function recoveryMove(enemy: Enemy, player: Player, speed: number, time: number, attackRange: number, attackDelay: number): EnemyMovePlan | null {
  const { dist, nx, ny } = normalizedDirection(enemy, player);
  if (dist <= attackRange + 18) {
    enemy.stuckSince = undefined;
    return null;
  }

  const progress = Math.hypot(enemy.x - (enemy.lastProgressX ?? enemy.x), enemy.y - (enemy.lastProgressY ?? enemy.y));
  const stalledFor = time - (enemy.lastProgressTime ?? time);

  // Props are now real colliders. React quickly instead of visibly jogging into one for half a second.
  if (!enemy.stuckSince && stalledFor >= 240 && progress < 2.2) {
    enemy.stuckSince = time;
    const side = laneBias(enemy, time);
    enemy.targetX = -ny * side;
    enemy.targetY = nx * side;
  }

  if (!enemy.stuckSince) return null;
  const age = time - enemy.stuckSince;
  if (progress >= 6.5 || age >= 1550) {
    enemy.stuckSince = undefined;
    enemy.lastProgressX = enemy.x;
    enemy.lastProgressY = enemy.y;
    enemy.lastProgressTime = time;
    return null;
  }

  // Suppress the old long emergency relocation while actively routing around the prop.
  enemy.lastProgressTime = time;
  const storedSideX = enemy.targetX || -ny;
  const storedSideY = enemy.targetY || nx;
  let moveX: number;
  let moveY: number;

  if (age < 650) {
    // First attempt: a nearly pure 90-degree sidestep to clear the collider edge.
    moveX = storedSideX * 1.55 + nx * 0.08;
    moveY = storedSideY * 1.55 + ny * 0.08;
  } else if (age < 1100) {
    // Second attempt: switch sides rather than repeating the blocked direction.
    moveX = -storedSideX * 1.45 + nx * 0.18;
    moveY = -storedSideY * 1.45 + ny * 0.18;
  } else {
    // Final local attempt: back off diagonally, then normal chase can re-acquire a new line.
    moveX = -nx * 0.45 - storedSideX * 0.95;
    moveY = -ny * 0.45 - storedSideY * 0.95;
  }

  const move = normalizedMove(moveX, moveY);
  return { dx: move.x * speed * 1.2, dy: move.y * speed * 1.2, attackRange, attackDelay };
}

export function planEnemyMove(enemy: Enemy, player: Player, dt: number, time: number): EnemyMovePlan {
  const archetype = enemyArchetype(enemy.enemyType);
  const { dist, nx, ny } = normalizedDirection(enemy, player);
  const room = roomFromEnemyId(enemy);
  const movePressure = 1 + Math.min(0.34, (room - 1) * 0.019);
  const attackPressure = 1 - Math.min(0.24, (room - 1) * 0.013);
  const huntPressure = enemy.isHuntTarget ? 1.1 : 1;
  const speed = enemy.speed * movePressure * huntPressure * dt / 1000;
  const plan = (dx: number, dy: number, attackRange: number, attackDelay: number): EnemyMovePlan => ({ dx, dy, attackRange, attackDelay: Math.max(520, Math.round(attackDelay * attackPressure)) });

  const baseAttackRange = archetype === 'dragon' ? 150 : archetype === 'guardian' ? 58 + enemy.width / 2 : archetype === 'skirmisher' ? 48 + enemy.width / 2 : 42 + enemy.width / 2;
  const baseAttackDelay = Math.max(520, Math.round((archetype === 'dragon' ? 850 : archetype === 'guardian' ? 900 : archetype === 'skirmisher' ? 840 : 920) * attackPressure));
  const recovery = recoveryMove(enemy, player, speed, time, baseAttackRange, baseAttackDelay);
  if (recovery) return recovery;

  if (archetype === 'skirmisher') {
    const cycle = ((time - enemy.spawnTime) % 3300 + 3300) % 3300;
    const sideDirection = laneBias(enemy, time);
    const sideX = -ny * sideDirection;
    const sideY = nx * sideDirection;
    if (cycle < 1450) {
      const toward = dist > 145 ? 0.95 : dist < 82 ? -0.1 : 0.42;
      const move = normalizedMove(nx * toward + sideX * 0.42, ny * toward + sideY * 0.42);
      return plan(move.x * speed, move.y * speed, 48 + enemy.width / 2, 880);
    }
    if (cycle < 2350) {
      const pressure = dist > 50 ? 1.55 : 0.28;
      return plan(nx * pressure * speed, ny * pressure * speed, 50 + enemy.width / 2, 720);
    }
    const retreat = dist < 102 ? -0.25 : 0.48;
    const move = normalizedMove(nx * retreat + sideX * 0.34, ny * retreat + sideY * 0.34);
    return plan(move.x * speed * 0.9, move.y * speed * 0.9, 48 + enemy.width / 2, 840);
  }

  if (archetype === 'guardian' || archetype === 'dragon') {
    const phaseLength = archetype === 'dragon' ? 4600 : 4000;
    const phase = ((time - enemy.spawnTime) % phaseLength + phaseLength) % phaseLength;
    if (phase < phaseLength * 0.48) {
      const ideal = archetype === 'dragon' ? 126 : 66;
      const advance = dist > ideal ? 1.28 : dist < ideal * 0.62 ? -0.08 : 0.48;
      return plan(nx * advance * speed, ny * advance * speed, archetype === 'dragon' ? 150 : 58 + enemy.width / 2, archetype === 'dragon' ? 850 : 900);
    }
    if (phase < phaseLength * 0.7) {
      const side = laneBias(enemy, time);
      const move = normalizedMove(nx * (dist > 78 ? 0.72 : 0.34) + -ny * side * 0.34, ny * (dist > 78 ? 0.72 : 0.34) + nx * side * 0.34);
      return plan(move.x * speed * 0.92, move.y * speed * 0.92, archetype === 'dragon' ? 162 : 60 + enemy.width / 2, archetype === 'dragon' ? 930 : 960);
    }
    const pressure = dist > (archetype === 'dragon' ? 82 : 54) ? 1.52 : 0.24;
    return plan(nx * pressure * speed, ny * pressure * speed, archetype === 'dragon' ? 112 : 60 + enemy.width / 2, archetype === 'dragon' ? 650 : 720);
  }

  const weave = Math.sin((time - enemy.spawnTime) * 0.0017 + enemy.x * 0.008) * 0.1;
  const move = normalizedMove(nx - ny * weave, ny + nx * weave);
  return plan(move.x * speed * 1.08, move.y * speed * 1.08, 42 + enemy.width / 2, 920);
}
