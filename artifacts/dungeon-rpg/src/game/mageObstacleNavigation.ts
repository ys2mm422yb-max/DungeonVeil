import type { Enemy } from './entities';

export const MAGE_OBSTACLE_LOOKAHEAD = 76;
export const MAGE_DETOUR_DURATION_MS = 1_600;
export const MAGE_STUCK_THRESHOLD_MS = 360;

export type MageNavigationState = {
  waypointX?: number;
  waypointY?: number;
  waypointUntil?: number;
  progressX: number;
  progressY: number;
  progressAt: number;
  forcedAlternateUntil?: number;
};

type Direction = { x: number; y: number };
type Waypoint = { x: number; y: number };

type NavigationContext = {
  enemy: Pick<Enemy, 'x' | 'y' | 'width' | 'height'>;
  playerX: number;
  playerY: number;
  desired: Direction;
  alternate: Direction;
  side: number;
  time: number;
  pathBlocked: (fromX: number, fromY: number, toX: number, toY: number, padding?: number) => boolean;
  detourWaypoints: (fromX: number, fromY: number, toX: number, toY: number) => Waypoint[];
  collides: (x: number, y: number, padding?: number) => boolean;
};

function normalize(x: number, y: number): Direction {
  const length = Math.hypot(x, y);
  if (length < 0.001) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

function rotate(direction: Direction, angle: number): Direction {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return normalize(direction.x * cos - direction.y * sin, direction.x * sin + direction.y * cos);
}

function clearWaypoint(state: MageNavigationState): void {
  state.waypointX = undefined;
  state.waypointY = undefined;
  state.waypointUntil = undefined;
}

export function createMageNavigationState(x: number, y: number, time: number): MageNavigationState {
  return { progressX: x, progressY: y, progressAt: time };
}

function updateProgress(context: NavigationContext, state: MageNavigationState): void {
  const moved = Math.hypot(context.enemy.x - state.progressX, context.enemy.y - state.progressY);
  if (moved >= 1.25) {
    state.progressX = context.enemy.x;
    state.progressY = context.enemy.y;
    state.progressAt = context.time;
    return;
  }
  if (context.time - state.progressAt < MAGE_STUCK_THRESHOLD_MS) return;
  state.progressX = context.enemy.x;
  state.progressY = context.enemy.y;
  state.progressAt = context.time;
  state.forcedAlternateUntil = context.time + 950;
  clearWaypoint(state);
}

function waypointDirection(context: NavigationContext, state: MageNavigationState): Direction | null {
  if (state.waypointX === undefined || state.waypointY === undefined || !state.waypointUntil) return null;
  if (context.time >= state.waypointUntil) {
    clearWaypoint(state);
    return null;
  }
  const dx = state.waypointX - context.enemy.x;
  const dy = state.waypointY - context.enemy.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= Math.max(15, context.enemy.width * 0.55)) {
    clearWaypoint(state);
    return null;
  }
  if (context.pathBlocked(context.enemy.x, context.enemy.y, state.waypointX, state.waypointY, 0.055)) {
    clearWaypoint(state);
    return null;
  }
  return normalize(dx, dy);
}

function chooseWaypoint(context: NavigationContext, state: MageNavigationState, desired: Direction): Direction | null {
  const destinationX = context.enemy.x + desired.x * 112;
  const destinationY = context.enemy.y + desired.y * 112;
  const candidates = context.detourWaypoints(context.enemy.x, context.enemy.y, destinationX, destinationY)
    .filter(candidate => !context.collides(candidate.x, candidate.y, 0.08))
    .filter(candidate => !context.pathBlocked(context.enemy.x, context.enemy.y, candidate.x, candidate.y, 0.045));
  if (!candidates.length) return null;

  const enemyCenterX = context.enemy.x + context.enemy.width / 2;
  const enemyCenterY = context.enemy.y + context.enemy.height / 2;
  const radialX = context.playerX - enemyCenterX;
  const radialY = context.playerY - enemyCenterY;
  const preferredSide = context.forcedAlternateUntil && context.time < context.forcedAlternateUntil ? -context.side : context.side;
  let best: { waypoint: Waypoint; score: number } | null = null;

  for (const waypoint of candidates) {
    const waypointCenterX = waypoint.x + context.enemy.width / 2;
    const waypointCenterY = waypoint.y + context.enemy.height / 2;
    const distanceToPlayer = Math.hypot(context.playerX - waypointCenterX, context.playerY - waypointCenterY);
    const routeLength = Math.hypot(waypoint.x - context.enemy.x, waypoint.y - context.enemy.y);
    const destinationError = Math.hypot(destinationX - waypoint.x, destinationY - waypoint.y);
    const cross = radialX * (waypointCenterY - enemyCenterY) - radialY * (waypointCenterX - enemyCenterX);
    const sidePenalty = Math.sign(cross || preferredSide) === preferredSide ? 0 : 72;
    const rangePenalty = Math.abs(distanceToPlayer - 168) * 0.34;
    const score = routeLength + destinationError * 0.48 + rangePenalty + sidePenalty;
    if (!best || score < best.score) best = { waypoint, score };
  }

  if (!best) return null;
  state.waypointX = best.waypoint.x;
  state.waypointY = best.waypoint.y;
  state.waypointUntil = context.time + MAGE_DETOUR_DURATION_MS;
  return normalize(best.waypoint.x - context.enemy.x, best.waypoint.y - context.enemy.y);
}

function angularFallback(context: NavigationContext, desired: Direction): Direction {
  const preferred = context.forcedAlternateUntil && context.time < context.forcedAlternateUntil ? -context.side : context.side;
  const angles = [48, -48, 82, -82, 118, -118, 152, -152]
    .map(degrees => degrees * Math.PI / 180)
    .sort((a, b) => Math.abs(a - preferred * Math.PI / 2) - Math.abs(b - preferred * Math.PI / 2));

  for (const angle of angles) {
    const candidate = rotate(desired, angle);
    const targetX = context.enemy.x + candidate.x * MAGE_OBSTACLE_LOOKAHEAD;
    const targetY = context.enemy.y + candidate.y * MAGE_OBSTACLE_LOOKAHEAD;
    if (context.collides(targetX, targetY, 0.08)) continue;
    if (context.pathBlocked(context.enemy.x, context.enemy.y, targetX, targetY, 0.07)) continue;
    return candidate;
  }

  const alternateX = context.enemy.x + context.alternate.x * MAGE_OBSTACLE_LOOKAHEAD;
  const alternateY = context.enemy.y + context.alternate.y * MAGE_OBSTACLE_LOOKAHEAD;
  if (!context.collides(alternateX, alternateY, 0.08)
    && !context.pathBlocked(context.enemy.x, context.enemy.y, alternateX, alternateY, 0.07)) return context.alternate;
  return { x: 0, y: 0 };
}

export function resolveMageObstacleDirection(context: NavigationContext, state: MageNavigationState): Direction {
  updateProgress(context, state);
  const activeWaypoint = waypointDirection(context, state);
  if (activeWaypoint) return activeWaypoint;

  const desired = context.forcedAlternateUntil && context.time < context.forcedAlternateUntil
    ? context.alternate
    : context.desired;
  const lookaheadX = context.enemy.x + desired.x * MAGE_OBSTACLE_LOOKAHEAD;
  const lookaheadY = context.enemy.y + desired.y * MAGE_OBSTACLE_LOOKAHEAD;
  const blocked = context.collides(lookaheadX, lookaheadY, 0.08)
    || context.pathBlocked(context.enemy.x, context.enemy.y, lookaheadX, lookaheadY, 0.07);
  if (!blocked) return desired;

  const detour = chooseWaypoint(context, state, desired);
  if (detour) return detour;
  return angularFallback(context, desired);
}
