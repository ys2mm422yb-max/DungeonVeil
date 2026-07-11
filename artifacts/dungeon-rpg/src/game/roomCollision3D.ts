import { logicalRoomSetpieces } from './logicalRoomSetpieces';
import { roomBibleSpec } from './roomBible';

const COLLIDER_INSET = 0.9;
const PORTAL_CLEARANCE = 3.1;

export type RoomPropCollider = { x: number; z: number; halfW: number; halfH: number };
export type RoomDetourWaypoint = { x: number; y: number };

function entityCenterToScene(value: number, size: number, mapTiles: number) {
  return (value + size / 2) / 40 - mapTiles / 2 + 0.5;
}

function sceneCenterToEntityOrigin(value: number, size: number, mapTiles: number) {
  return (value + mapTiles / 2 - 0.5) * 40 - size / 2;
}

function portalStagePoint(room: number) {
  const authored = roomBibleSpec(room).portal;
  return {
    x: authored.x,
    z: authored.z < -8 ? -8.5 : authored.z,
  };
}

function collidersForRoom(room: number): RoomPropCollider[] {
  const portal = portalStagePoint(room);
  return logicalRoomSetpieces(room)
    .filter(piece => piece.collider)
    .filter(piece => Math.hypot(piece.x - portal.x, piece.z - portal.z) > PORTAL_CLEARANCE)
    .map(piece => {
      const base = piece.collider!;
      const scale = (piece.scale ?? 1) * COLLIDER_INSET;
      const localWidth = base[0] * scale;
      const localHeight = base[1] * scale;
      const angle = piece.rotation ?? 0;
      const cos = Math.abs(Math.cos(angle));
      const sin = Math.abs(Math.sin(angle));
      const width = localWidth * cos + localHeight * sin;
      const height = localWidth * sin + localHeight * cos;
      return { x: piece.x, z: piece.z, halfW: width / 2, halfH: height / 2 };
    });
}

const ROOM_COLLIDERS = new Map<number, RoomPropCollider[]>();

export function roomPropColliders(room: number): readonly RoomPropCollider[] {
  const key = Math.max(1, Math.min(20, room));
  if (!ROOM_COLLIDERS.has(key)) ROOM_COLLIDERS.set(key, collidersForRoom(key));
  return ROOM_COLLIDERS.get(key)!;
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
  const centerX = entityCenterToScene(x, width, mapWidth);
  const centerZ = entityCenterToScene(y, height, mapHeight);
  const halfW = width / 80 + padding;
  const halfH = height / 80 + padding;
  return roomPropColliders(room).some(collider =>
    Math.abs(centerX - collider.x) < halfW + collider.halfW
    && Math.abs(centerZ - collider.z) < halfH + collider.halfH,
  );
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

function entitySegment(
  mapWidth: number,
  mapHeight: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number,
  height: number,
) {
  return {
    x1: entityCenterToScene(fromX, width, mapWidth),
    z1: entityCenterToScene(fromY, height, mapHeight),
    x2: entityCenterToScene(toX, width, mapWidth),
    z2: entityCenterToScene(toY, height, mapHeight),
  };
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
  const { x1, z1, x2, z2 } = entitySegment(mapWidth, mapHeight, fromX, fromY, toX, toY, width, height);
  const entityHalfW = width / 80 + padding;
  const entityHalfH = height / 80 + padding;
  return roomPropColliders(room).some(collider => segmentHitsAabb(
    x1,
    z1,
    x2,
    z2,
    collider.x,
    collider.z,
    collider.halfW + entityHalfW,
    collider.halfH + entityHalfH,
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
  const { x1, z1, x2, z2 } = entitySegment(mapWidth, mapHeight, fromX, fromY, toX, toY, width, height);
  const entityHalfW = width / 80;
  const entityHalfH = height / 80;
  const blockers = roomPropColliders(room)
    .filter(collider => segmentHitsAabb(
      x1,
      z1,
      x2,
      z2,
      collider.x,
      collider.z,
      collider.halfW + entityHalfW + 0.1,
      collider.halfH + entityHalfH + 0.1,
    ))
    .sort((a, b) => Math.hypot(a.x - x1, a.z - z1) - Math.hypot(b.x - x1, b.z - z1));

  const blocker = blockers[0];
  if (!blocker) return [];

  const marginX = blocker.halfW + entityHalfW + 0.5;
  const marginZ = blocker.halfH + entityHalfH + 0.5;
  const minSceneX = -mapWidth / 2 + 1.15;
  const maxSceneX = mapWidth / 2 - 1.15;
  const minSceneZ = -mapHeight / 2 + 1.15;
  const maxSceneZ = mapHeight / 2 - 1.15;
  const sceneCorners = [
    [blocker.x - marginX, blocker.z - marginZ],
    [blocker.x + marginX, blocker.z - marginZ],
    [blocker.x - marginX, blocker.z + marginZ],
    [blocker.x + marginX, blocker.z + marginZ],
  ] as const;

  return sceneCorners.map(([sceneX, sceneZ]) => ({
    x: sceneCenterToEntityOrigin(Math.max(minSceneX, Math.min(maxSceneX, sceneX)), width, mapWidth),
    y: sceneCenterToEntityOrigin(Math.max(minSceneZ, Math.min(maxSceneZ, sceneZ)), height, mapHeight),
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
  const x1 = fromX / 40 - mapWidth / 2 + 0.5;
  const z1 = fromY / 40 - mapHeight / 2 + 0.5;
  const x2 = toX / 40 - mapWidth / 2 + 0.5;
  const z2 = toY / 40 - mapHeight / 2 + 0.5;
  return roomPropColliders(room).some(collider => segmentHitsAabb(
    x1,
    z1,
    x2,
    z2,
    collider.x,
    collider.z,
    collider.halfW + padding,
    collider.halfH + padding,
  ));
}
