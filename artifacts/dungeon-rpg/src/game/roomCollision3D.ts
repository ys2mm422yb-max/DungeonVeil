import { logicalRoomSetpieces } from './logicalRoomSetpieces';
import { roomBibleSpec } from './roomBible';

const COLLIDER_INSET = 0.9;
const PORTAL_CLEARANCE = 2.75;

function entityCenterToScene(value: number, size: number, mapTiles: number) {
  return (value + size / 2) / 40 - mapTiles / 2 + 0.5;
}

function portalStagePoint(room: number) {
  const authored = roomBibleSpec(room).portal;
  return {
    x: authored.x,
    z: authored.z < -8 ? -10.5 : authored.z,
  };
}

function collidersForRoom(room: number) {
  const portal = portalStagePoint(room);
  return logicalRoomSetpieces(room)
    .filter(piece => piece.collider)
    // The visible and physical portal staging share the same safe inner-room point.
    // Nothing massive may create a hidden blocker around the exit circle.
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

const ROOM_COLLIDERS = new Map<number, ReturnType<typeof collidersForRoom>>();

function roomColliders(room: number) {
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
  return roomColliders(room).some(collider =>
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
  return roomColliders(room).some(collider => segmentHitsAabb(
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
