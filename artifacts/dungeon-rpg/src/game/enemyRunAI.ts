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
  return (variant + Math.floor((time - enemy.spawnTime) / 2800)) % 2 === 0 ? 1 : -1;
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

function steeringHoldMs(enemy: Enemy) {
  const archetype = enemyArchetype(enemy.enemyType);
  if (archetype === 'skirmisher') return 300;
  if (archetype === 'guardian' || archetype === 'dragon') return 520;
  return 420;
}

function clearSteering(enemy: Enemy) {
  enemy.steerX = undefined;
  enemy.steerY = undefined;
  enemy.steerUntil = undefined;
}

function steerAroundProps(enemy: EnemyRunContext, dx: number, dy: number, time: number) {
  const length = Math.max(0.001, Math.hypot(dx, dy));

  if ((enemy.steerUntil ?? 0) > time && Number.isFinite(enemy.steerX) && Number.isFinite(enemy.steerY)) {
    const held = normalizedMove(enemy.steerX ?? 0, enemy.steerY ?? 0);
    const heldDx = held.x * length;
    const heldDy = held.y * length;
    if (!candidateBlocked(enemy, heldDx, heldDy)) return { dx: heldDx, dy: heldDy };
    clearSteering(enemy);
  }

  if (!candidateBlocked(enemy, dx, dy)) {
    clearSteering(enemy);
    return { dx, dy };
  }

  const ux = dx / length;
  const uy = dy / length;
  const side = laneBias(enemy, time);
  const candidates = [
    normalizedMove(-uy * side + ux * 0.22, ux * side + uy * 0.22),
    normalizedMove(-uy * side + ux * 0.48, ux * side + uy * 0.48),
    normalizedMove(uy * side + ux * 0.18, -ux * side + uy * 0.18),
    normalizedMove(-ux * 0.22 - uy * side, -uy * 0.22 + ux * side),
  ];

  for (const candidate of candidates) {
    const nextDx = candidate.x * length;
    const nextDy = candidate.y * length;
    if (candidateBlocked(enemy, nextDx, nextDy)) continue;
    enemy.steerX = candidate.x;
    enemy.steerY = candidate.y;
    enemy.steerUntil = time + steeringHoldMs(enemy);
    return { dx: nextDx, dy: nextDy };
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

  if (!enemy.stuckSince && stalledFor >= 240 && progress < 2.2) {
    enemy.stuckSince = time;
    const side = laneBias(enemy, time);
    enemy.targetX = -ny * side;
    enemy.targetY = nx * side;
    clearSteering(enemy);
  }

  if (!enemy.stuckSince) return null;
  const age = time - enemy.stuckSince;
  if (progress >= 6.5 || age >= 1500) {
    enemy.stuckSince = undefined;
    enemy.lastProgressX = enemy.x;
    enemy.lastProgressY = enemy.y;
    enemy.lastProgressTime = time;
    clearSteering(enemy);
    return null;
  }

  enemy.lastProgressTime = time;
  const storedSideX = enemy.targetX || -ny;
  const storedSideY = enemy.targetY || nx;
  let moveX: number;
  let moveY: number;

  if (age < 620) {
    moveX = storedSideX * 1.4 + nx * 0.12;
    moveY = storedSideY * 1.4 + ny * 0.12;
  } else if (age < 1120) {
    moveX = -storedSideX * 1.18 + nx * 0.22;
    moveY = -storedSideY * 1.18 + ny * 0.22;
  } else {
    moveX = -nx * 0.4 - storedSideX * 0.9;
    moveY = -ny * 0.4 - storedSideY * 0.9;
  }

  const move = normalizedMove(moveX, moveY);
  const steered = steerAroundProps(enemy, move.x * speed * 1.12, move.y * speed * 1.12, time);
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
    const cycle = ((time - enemy.spawnTime) % 3600 + 3600) % 3600;
    const sideDirection = laneBias(enemy, time);
    const sideX = -ny * sideDirection;
    const sideY = nx * sideDirection;
    if (cycle < 1600) {
      const toward = dist > 145 ? 0.95 : dist < 82 ? -0.1 : 0.42;
      const move = normalizedMove(nx * toward + sideX * 0.36, ny * toward + sideY * 0.36);
      return plan(move.x * speed, move.y * speed, 48 + enemy.width / 2, 880);
    }
    if (cycle < 2500) {
      const pressure = dist > 50 ? 1.48 : 0.28;
      return plan(nx * pressure * speed, ny * pressure * speed, 50 + enemy.width / 2, 720);
    }
    const retreat = dist < 102 ? -0.25 : 0.48;
    const move = normalizedMove(nx * retreat + sideX * 0.3, ny * retreat + sideY * 0.3);
    return plan(move.x * speed * 0.9, move.y * speed * 0.9, 48 + enemy.width / 2, 840);
  }

  if (archetype === 'guardian' || archetype === 'dragon') {
    const basePhaseLength = archetype === 'dragon' ? 4600 : 4200;
    const phaseLength = Math.max(2800, Math.round(basePhaseLength * Math.max(0.68, chapterAttackDelayFactor(chapter) + 0.12)));
    const phase = ((time - enemy.spawnTime) % phaseLength + phaseLength) % phaseLength;
    if (phase < phaseLength * 0.5) {
      const ideal = archetype === 'dragon' ? 126 : 66;
      const advance = dist > ideal ? 1.18 : dist < ideal * 0.62 ? -0.06 : 0.44;
      return plan(nx * advance * speed, ny * advance * speed, archetype === 'dragon' ? 150 : 58 + enemy.width / 2, archetype === 'dragon' ? 850 : 900);
    }
    if (phase < phaseLength * 0.72) {
      const side = laneBias(enemy, time);
      const move = normalizedMove(nx * (dist > 78 ? 0.72 : 0.34) + -ny * side * 0.26, ny * (dist > 78 ? 0.72 : 0.34) + nx * side * 0.26);
      return plan(move.x * speed * 0.9, move.y * speed * 0.9, archetype === 'dragon' ? 162 : 60 + enemy.width / 2, archetype === 'dragon' ? 930 : 960);
    }
    const pressure = dist > (archetype === 'dragon' ? 82 : 54) ? 1.42 : 0.24;
    return plan(nx * pressure * speed, ny * pressure * speed, archetype === 'dragon' ? 112 : 60 + enemy.width / 2, archetype === 'dragon' ? 650 : 720);
  }

  const weave = Math.sin((time - enemy.spawnTime) * 0.00135 + enemy.x * 0.008) * 0.075;
  const move = normalizedMove(nx - ny * weave, ny + nx * weave);
  return plan(move.x * speed * 1.04, move.y * speed * 1.04, 42 + enemy.width / 2, 920);
}
