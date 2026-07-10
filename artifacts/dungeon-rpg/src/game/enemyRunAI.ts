import type { Enemy, EnemyType, Player } from './entities';
import { collidesWithRoomProp, shotBlockedByRoomProp } from './roomCollision3D';
import { chapterAttackDelayFactor, chapterMovePressure } from './runBalance';

export type EnemyArchetype = 'skeleton' | 'skirmisher' | 'guardian' | 'dragon';

export function enemyArchetype(type: EnemyType): EnemyArchetype {
  if (type === 'boss') return 'dragon';
  if (type === 'spider' || type === 'vampire') return 'skirmisher';
  if (type === 'demon' || type === 'golem' || type === 'orc') return 'guardian';
  return 'skeleton';
}

export type EnemyMovePlan = { dx: number; dy: number; attackRange: number; attackDelay: number };

type EnemyRunContext = Enemy & {
  runChapter?: number;
  runRoom?: number;
  runMapWidth?: number;
  runMapHeight?: number;
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
  const match = enemy.id.match(/^\d+-(\d+)-\d+/);
  const parsed = Number(match?.[1]);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 1;
}

function chapterFromEnemy(enemy: Enemy) {
  return Math.max(1, Math.round((enemy as EnemyRunContext).runChapter ?? 1));
}

function laneBias(enemy: Enemy, time: number) {
  const variant = enemy.huntVisualVariant ?? Number(enemy.id.slice(-1).replace(/\D/g, '') || 0);
  return (variant + Math.floor((time - enemy.spawnTime) / 1900)) % 2 === 0 ? 1 : -1;
}

function hasCollisionContext(enemy: EnemyRunContext): enemy is EnemyRunContext & Required<Pick<EnemyRunContext, 'runRoom' | 'runMapWidth' | 'runMapHeight'>> {
  return Number.isFinite(enemy.runRoom) && Number.isFinite(enemy.runMapWidth) && Number.isFinite(enemy.runMapHeight);
}

function candidateBlocked(enemy: EnemyRunContext, dx: number, dy: number) {
  if (!hasCollisionContext(enemy)) return false;
  return collidesWithRoomProp(
    enemy.runRoom,
    enemy.runMapWidth,
    enemy.runMapHeight,
    enemy.x + dx,
    enemy.y + dy,
    enemy.width,
    enemy.height,
    0.18,
  );
}

function lineToPlayerBlocked(enemy: EnemyRunContext, player: Player) {
  if (!hasCollisionContext(enemy)) return false;
  return shotBlockedByRoomProp(
    enemy.runRoom,
    enemy.runMapWidth,
    enemy.runMapHeight,
    enemy.x + enemy.width / 2,
    enemy.y + enemy.height / 2,
    player.x + player.width / 2,
    player.y + player.height / 2,
    0.1,
  );
}

function steerAroundProps(enemy: EnemyRunContext, dx: number, dy: number, time: number) {
  if (!candidateBlocked(enemy, dx, dy)) return { dx, dy };

  const length = Math.max(0.001, Math.hypot(dx, dy));
  const ux = dx / length;
  const uy = dy / length;
  const side = laneBias(enemy, time);
  const candidates = [
    normalizedMove(-uy * side + ux * 0.18, ux * side + uy * 0.18),
    normalizedMove(uy * side + ux * 0.18, -ux * side + uy * 0.18),
    normalizedMove(-uy * side - ux * 0.12, ux * side - uy * 0.12),
    normalizedMove(uy * side - ux * 0.12, -ux * side - uy * 0.12),
  ];

  for (const candidate of candidates) {
    const nextDx = candidate.x * length * 1.08;
    const nextDy = candidate.y * length * 1.08;
    if (!candidateBlocked(enemy, nextDx, nextDy)) return { dx: nextDx, dy: nextDy };
  }
  return { dx: 0, dy: 0 };
}

function recoveryMove(enemy: EnemyRunContext, player: Player, speed: number, time: number, attackRange: number, attackDelay: number): EnemyMovePlan | null {
  const { dist, nx, ny } = normalizedDirection(enemy, player);
  if (dist <= attackRange + 18 && !lineToPlayerBlocked(enemy, player)) {
    enemy.stuckSince = undefined;
    return null;
  }

  const progress = Math.hypot(enemy.x - (enemy.lastProgressX ?? enemy.x), enemy.y - (enemy.lastProgressY ?? enemy.y));
  const stalledFor = time - (enemy.lastProgressTime ?? time);

  if (!enemy.stuckSince && stalledFor >= 180 && progress < 2.2) {
    enemy.stuckSince = time;
    const side = laneBias(enemy, time);
    enemy.targetX = -ny * side;
    enemy.targetY = nx * side;
  }

  if (!enemy.stuckSince) return null;
  const age = time - enemy.stuckSince;
  if (progress >= 6.5 || age >= 1350) {
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

  if (age < 520) {
    moveX = storedSideX * 1.65 + nx * 0.04;
    moveY = storedSideY * 1.65 + ny * 0.04;
  } else if (age < 940) {
    moveX = -storedSideX * 1.55 + nx * 0.16;
    moveY = -storedSideY * 1.55 + ny * 0.16;
  } else {
    moveX = -nx * 0.52 - storedSideX * 1.05;
    moveY = -ny * 0.52 - storedSideY * 1.05;
  }

  const move = normalizedMove(moveX, moveY);
  const steered = steerAroundProps(enemy, move.x * speed * 1.24, move.y * speed * 1.24, time);
  return { dx: steered.dx, dy: steered.dy, attackRange, attackDelay };
}

export function planEnemyMove(enemy: Enemy, player: Player, dt: number, time: number): EnemyMovePlan {
  const runEnemy = enemy as EnemyRunContext;
  const archetype = enemyArchetype(enemy.enemyType);
  const { dist, nx, ny } = normalizedDirection(enemy, player);
  const room = runEnemy.runRoom ?? roomFromEnemyId(enemy);
  const chapter = chapterFromEnemy(enemy);
  const movePressure = (1 + Math.min(0.34, (room - 1) * 0.019)) * chapterMovePressure(chapter);
  const attackPressure = (1 - Math.min(0.24, (room - 1) * 0.013)) * chapterAttackDelayFactor(chapter);
  const huntPressure = enemy.isHuntTarget ? 1.1 : 1;
  const speed = enemy.speed * movePressure * huntPressure * dt / 1000;
  const minimumAttackDelay = Math.max(340, 520 - (chapter - 1) * 35);
  const blockedLine = lineToPlayerBlocked(runEnemy, player);
  const plan = (dx: number, dy: number, attackRange: number, attackDelay: number): EnemyMovePlan => {
    const steered = steerAroundProps(runEnemy, dx, dy, time);
    return {
      dx: steered.dx,
      dy: steered.dy,
      attackRange: blockedLine ? 0 : attackRange,
      attackDelay: Math.max(minimumAttackDelay, Math.round(attackDelay * attackPressure)),
    };
  };

  const baseAttackRange = archetype === 'dragon' ? 150 : archetype === 'guardian' ? 58 + enemy.width / 2 : archetype === 'skirmisher' ? 48 + enemy.width / 2 : 42 + enemy.width / 2;
  const baseAttackDelay = Math.max(minimumAttackDelay, Math.round((archetype === 'dragon' ? 850 : archetype === 'guardian' ? 900 : archetype === 'skirmisher' ? 840 : 920) * attackPressure));
  const recovery = recoveryMove(runEnemy, player, speed, time, blockedLine ? 0 : baseAttackRange, baseAttackDelay);
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
    const basePhaseLength = archetype === 'dragon' ? 4600 : 4000;
    const phaseLength = Math.max(2700, Math.round(basePhaseLength * Math.max(0.68, chapterAttackDelayFactor(chapter) + 0.12)));
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
