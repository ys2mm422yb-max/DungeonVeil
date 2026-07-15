import * as base from './roomPropCollisionBase';

export type RoomPropCollider = base.RoomPropCollider;
export type RoomDetourWaypoint = base.RoomDetourWaypoint;

const ROOM_ONE_ARCHITECTURE: readonly RoomPropCollider[] = [
  { x: 0, z: -5.65, halfW: 0.72, halfH: 0.62 },
  { x: -4.25, z: -8.2, halfW: 0.78, halfH: 0.78 },
  { x: 4.25, z: -8.2, halfW: 0.78, halfH: 0.78 },
  { x: -2.7, z: -13.15, halfW: 1.35, halfH: 0.48 },
  { x: 2.7, z: -13.15, halfW: 1.35, halfH: 0.48 },
];

function extras(room: number): readonly RoomPropCollider[] {
  return room === 1 ? ROOM_ONE_ARCHITECTURE : [];
}

function entityCenterToScene(value: number, size: number, mapTiles: number) {
  return (value + size / 2) / 40 - mapTiles / 2 + 0.5;
}

function sceneCenterToEntityOrigin(value: number, size: number, mapTiles: number) {
  return (value + mapTiles / 2 - 0.5) * 40 - size / 2;
}

function segmentHitsAabb(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  cx: number,
  cz: number,
  halfW: number,
  halfH: number,
) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  let tMin = 0;
  let tMax = 1;
  const clip = (start: number, delta: number, min: number, max: number) => {
    if (Math.abs(delta) < 1e-6) return start >= min && start <= max;
    let t1 = (min - start) / delta;
    let t2 = (max - start) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    return tMin <= tMax;
  };
  return clip(x1, dx, cx - halfW, cx + halfW) && clip(z1, dz, cz - halfH, cz + halfH);
}

export function roomPropColliders(room: number): readonly RoomPropCollider[] {
  const additional = extras(room);
  return additional.length ? [...base.roomPropColliders(room), ...additional] : base.roomPropColliders(room);
}

export function collidesWithRoomProp(
  room: number,
  mapWidth: number,
  mapHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  padding = 0.025,
) {
  if (base.collidesWithRoomProp(room, mapWidth, mapHeight, x, y, width, height, padding)) return true;
  const centerX = entityCenterToScene(x, width, mapWidth);
  const centerZ = entityCenterToScene(y, height, mapHeight);
  const halfW = width / 80 + padding;
  const halfH = height / 80 + padding;
  return extras(room).some(collider =>
    Math.abs(centerX - collider.x) < halfW + collider.halfW
    && Math.abs(centerZ - collider.z) < halfH + collider.halfH,
  );
}

export function movementPathBlockedByRoomProp(
  room: number,
  mapWidth: number,
  mapHeight: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number,
  height: number,
  padding = 0.12,
) {
  if (base.movementPathBlockedByRoomProp(room, mapWidth, mapHeight, fromX, fromY, toX, toY, width, height, padding)) return true;
  const x1 = entityCenterToScene(fromX, width, mapWidth);
  const z1 = entityCenterToScene(fromY, height, mapHeight);
  const x2 = entityCenterToScene(toX, width, mapWidth);
  const z2 = entityCenterToScene(toY, height, mapHeight);
  const halfW = width / 80 + padding;
  const halfH = height / 80 + padding;
  return extras(room).some(collider => segmentHitsAabb(
    x1, z1, x2, z2, collider.x, collider.z, collider.halfW + halfW, collider.halfH + halfH,
  ));
}

export function roomPropDetourWaypoints(
  room: number,
  mapWidth: number,
  mapHeight: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number,
  height: number,
): RoomDetourWaypoint[] {
  const existing = base.roomPropDetourWaypoints(room, mapWidth, mapHeight, fromX, fromY, toX, toY, width, height);
  if (existing.length) return existing;
  const x1 = entityCenterToScene(fromX, width, mapWidth);
  const z1 = entityCenterToScene(fromY, height, mapHeight);
  const x2 = entityCenterToScene(toX, width, mapWidth);
  const z2 = entityCenterToScene(toY, height, mapHeight);
  const entityHalfW = width / 80;
  const entityHalfH = height / 80;
  const blocker = extras(room)
    .filter(collider => segmentHitsAabb(x1, z1, x2, z2, collider.x, collider.z, collider.halfW + entityHalfW + 0.1, collider.halfH + entityHalfH + 0.1))
    .sort((a, b) => Math.hypot(a.x - x1, a.z - z1) - Math.hypot(b.x - x1, b.z - z1))[0];
  if (!blocker) return [];
  const marginX = blocker.halfW + entityHalfW + 0.5;
  const marginZ = blocker.halfH + entityHalfH + 0.5;
  const minX = -mapWidth / 2 + 1.15;
  const maxX = mapWidth / 2 - 1.15;
  const minZ = -mapHeight / 2 + 1.15;
  const maxZ = mapHeight / 2 - 1.15;
  return [
    [blocker.x - marginX, blocker.z - marginZ],
    [blocker.x + marginX, blocker.z - marginZ],
    [blocker.x - marginX, blocker.z + marginZ],
    [blocker.x + marginX, blocker.z + marginZ],
  ].map(([sceneX, sceneZ]) => ({
    x: sceneCenterToEntityOrigin(Math.max(minX, Math.min(maxX, sceneX)), width, mapWidth),
    y: sceneCenterToEntityOrigin(Math.max(minZ, Math.min(maxZ, sceneZ)), height, mapHeight),
  }));
}

export function shotBlockedByRoomProp(
  room: number,
  mapWidth: number,
  mapHeight: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  padding = 0.02,
) {
  if (base.shotBlockedByRoomProp(room, mapWidth, mapHeight, fromX, fromY, toX, toY, padding)) return true;
  const x1 = fromX / 40 - mapWidth / 2 + 0.5;
  const z1 = fromY / 40 - mapHeight / 2 + 0.5;
  const x2 = toX / 40 - mapWidth / 2 + 0.5;
  const z2 = toY / 40 - mapHeight / 2 + 0.5;
  return extras(room).some(collider => segmentHitsAabb(
    x1, z1, x2, z2, collider.x, collider.z, collider.halfW + padding, collider.halfH + padding,
  ));
}
