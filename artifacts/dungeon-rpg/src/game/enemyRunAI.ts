import type { Enemy, EnemyType, Player } from './entities';
import { collidesWithRoomProp } from './roomCollision3D';

export type EnemyArchetype = 'skeleton' | 'skirmisher' | 'guardian' | 'dragon';

const MAP_WIDTH = 24;
const MAP_HEIGHT = 32;

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

function rotate(x: number, y: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

function blockedAhead(room: number, enemy: Enemy, dirX: number, dirY: number, distance: number) {
  return collidesWithRoomProp(
    room,
    MAP_WIDTH,
    MAP_HEIGHT,
    enemy.x + dirX * distance,
    enemy.y + dirY * distance,
    enemy.width,
    enemy.height,
    0.12,
  );
}

function obstacleAwareMove(enemy: Enemy, player: Player, room: number, time: number, movePlan: EnemyMovePlan): EnemyMovePlan {
  const magnitude = Math.hypot(movePlan.dx, movePlan.dy);
  if (magnitude < 0.001) return movePlan;

  const desired = normalizedMove(movePlan.dx, movePlan.dy);
  const lookAhead = Math.max(30, Math.min(58, enemy.width * 1.35 + magnitude * 7));
  const immediate = Math.max(8, Math.min(18, magnitude * 2.2));
  const directBlocked = blockedAhead(room, enemy, desired.x, desired.y, lookAhead)
    || blockedAhead(room, enemy, desired.x, desired.y, immediate);

  if (!directBlocked && (!enemy.avoidUntil || time >= enemy.avoidUntil)) {
    enemy.avoidDirX = undefined;
    enemy.avoidDirY = undefined;
    enemy.avoidUntil = undefined;
    return movePlan;
  }

  if (enemy.avoidUntil && time < enemy.avoidUntil && enemy.avoidDirX !== undefined && enemy.avoidDirY !== undefined) {
    const persistent = normalizedMove(enemy.avoidDirX, enemy.avoidDirY);
    if (!blockedAhead(room, enemy, persistent.x, persistent.y, lookAhead)
      && !blockedAhead(room, enemy, persistent.x, persistent.y, immediate)) {
      return { ...movePlan, dx: persistent.x * magnitude, dy: persistent.y * magnitude };
    }
  }

  if (!directBlocked) {
    enemy.avoidUntil = undefined;
    enemy.avoidDirX = undefined;
    enemy.avoidDirY = undefined;
    return movePlan;
  }

  const preferredSide = laneBias(enemy, time);
  const angles = [45, -45, 72, -72, 105, -105].map(degrees => degrees * preferredSide * Math.PI / 180);
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  let best: { x: number; y: number; score: number } | null = null;

  for (const angle of angles) {
    const candidate = rotate(desired.x, desired.y, angle);
    if (blockedAhead(room, enemy, candidate.x, candidate.y, immediate)) continue;
    if (blockedAhead(room, enemy, candidate.x, candidate.y, lookAhead)) continue;

    const nextX = enemy.x + enemy.width / 2 + candidate.x * lookAhead;
    const nextY = enemy.y + enemy.height / 2 + candidate.y * lookAhead;
    const progressScore = Math.hypot(px - nextX, py - nextY);
    const turnPenalty = Math.abs(angle) * 8;
    const score = progressScore + turnPenalty;
    if (!best || score < best.score) best = { x: candidate.x, y: candidate.y, score };
  }

  if (!best) return movePlan;

  enemy.avoidDirX = best.x;
  enemy.avoidDirY = best.y;
  enemy.avoidUntil = time + 720;
  return { ...movePlan, dx: best.x * magnitude, dy: best.y * magnitude };
}

function recoveryMove(enemy: Enemy, player: Player, speed: number, time: number, attackRange: number, attackDelay: number): EnemyMovePlan | null {
  if (enemy.avoidUntil && time < enemy.avoidUntil) return null;
  const { dist, nx, ny } = normalizedDirection(enemy, player);
  if (dist <= attackRange + 18) {
    enemy.stuckSince = undefined;
    return null;
  }

  const progress = Math.hypot(enemy.x - (enemy.lastProgressX ?? enemy.x), enemy.y - (enemy.lastProgressY ?? enemy.y));
  const stalledFor = time - (enemy.lastProgressTime ?? time);

  // Local look-ahead handles normal props. This remains only as a slower fallback
  // for rare corner cases where every short detour is temporarily occupied.
  if (!enemy.stuckSince && stalledFor >= 700 && progress < 2.2) {
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

  enemy.lastProgressTime = time;
  const storedSideX = enemy.targetX || -ny;
  const storedSideY = enemy.targetY || nx;
  let moveX: number;
  let moveY: number;

  if (age < 650) {
    moveX = storedSideX * 1.55 + nx * 0.08;
    moveY = storedSideY * 1.55 + ny * 0.08;
  } else if (age < 1100) {
    moveX = -storedSideX * 1.45 + nx * 0.18;
    moveY = -storedSideY * 1.45 + ny * 0.18;
  } else {
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
  const finish = (value: EnemyMovePlan) => obstacleAwareMove(enemy, player, room, time, value);

  const baseAttackRange = archetype === 'dragon' ? 150 : archetype === 'guardian' ? 58 + enemy.width / 2 : archetype === 'skirmisher' ? 48 + enemy.width / 2 : 42 + enemy.width / 2;
  const baseAttackDelay = Math.max(520, Math.round((archetype === 'dragon' ? 850 : archetype === 'guardian' ? 900 : archetype === 'skirmisher' ? 840 : 920) * attackPressure));
  const recovery = recoveryMove(enemy, player, speed, time, baseAttackRange, baseAttackDelay);
  if (recovery) return finish(recovery);

  if (archetype === 'skirmisher') {
    const cycle = ((time - enemy.spawnTime) % 3300 + 3300) % 3300;
    const sideDirection = laneBias(enemy, time);
    const sideX = -ny * sideDirection;
    const sideY = nx * sideDirection;
    if (cycle < 1450) {
      const toward = dist > 145 ? 0.95 : dist < 82 ? -0.1 : 0.42;
      const move = normalizedMove(nx * toward + sideX * 0.42, ny * toward + sideY * 0.42);
      return finish(plan(move.x * speed, move.y * speed, 48 + enemy.width / 2, 880));
    }
    if (cycle < 2350) {
      const pressure = dist > 50 ? 1.55 : 0.28;
      return finish(plan(nx * pressure * speed, ny * pressure * speed, 50 + enemy.width / 2, 720));
    }
    const retreat = dist < 102 ? -0.25 : 0.48;
    const move = normalizedMove(nx * retreat + sideX * 0.34, ny * retreat + sideY * 0.34);
    return finish(plan(move.x * speed * 0.9, move.y * speed * 0.9, 48 + enemy.width / 2, 840));
  }

  if (archetype === 'guardian' || archetype === 'dragon') {
    const phaseLength = archetype === 'dragon' ? 4600 : 4000;
    const phase = ((time - enemy.spawnTime) % phaseLength + phaseLength) % phaseLength;
    if (phase < phaseLength * 0.48) {
      const ideal = archetype === 'dragon' ? 126 : 66;
      const advance = dist > ideal ? 1.28 : dist < ideal * 0.62 ? -0.08 : 0.48;
      return finish(plan(nx * advance * speed, ny * advance * speed, archetype === 'dragon' ? 150 : 58 + enemy.width / 2, archetype === 'dragon' ? 850 : 900));
    }
    if (phase < phaseLength * 0.7) {
      const side = laneBias(enemy, time);
      const move = normalizedMove(nx * (dist > 78 ? 0.72 : 0.34) + -ny * side * 0.34, ny * (dist > 78 ? 0.72 : 0.34) + nx * side * 0.34);
      return finish(plan(move.x * speed * 0.92, move.y * speed * 0.92, archetype === 'dragon' ? 162 : 60 + enemy.width / 2, archetype === 'dragon' ? 930 : 960));
    }
    const pressure = dist > (archetype === 'dragon' ? 82 : 54) ? 1.52 : 0.24;
    return finish(plan(nx * pressure * speed, ny * pressure * speed, archetype === 'dragon' ? 112 : 60 + enemy.width / 2, archetype === 'dragon' ? 650 : 720));
  }

  const weave = Math.sin((time - enemy.spawnTime) * 0.0017 + enemy.x * 0.008) * 0.1;
  const move = normalizedMove(nx - ny * weave, ny + nx * weave);
  return finish(plan(move.x * speed * 1.08, move.y * speed * 1.08, 42 + enemy.width / 2, 920));
}
