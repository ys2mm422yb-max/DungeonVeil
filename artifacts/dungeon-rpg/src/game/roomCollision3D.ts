import { roomArchitecturePieces } from './roomArchitectureLayout';
import { roomSetpieces } from './roomSetpieceLayout';

function entityCenterToScene(value: number, size: number, mapTiles: number) {
  return (value + size / 2) / 40 - mapTiles / 2 + 0.5;
}

function collidersForRoom(room: number) {
  return [...roomArchitecturePieces(room), ...roomSetpieces(room)]
    .filter(piece => piece.collider)
    .map(piece => {
      const base = piece.collider!;
      const scale = piece.scale ?? 1;
      const rotated = Math.abs(Math.sin(piece.rotation ?? 0)) > 0.7;
      const width = (rotated ? base[1] : base[0]) * scale;
      const height = (rotated ? base[0] : base[1]) * scale;
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
  padding = 0.08,
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

function segmentHitsAabb(x1: number, z1: number, x2: number, z2: number, cx: number, cz: number, halfW: number, halfH: number) {
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
  padding = 0.05,
) {
  const x1 = fromX / 40 - mapWidth / 2 + 0.5;
  const z1 = fromY / 40 - mapHeight / 2 + 0.5;
  const x2 = toX / 40 - mapWidth / 2 + 0.5;
  const z2 = toY / 40 - mapHeight / 2 + 0.5;
  return roomColliders(room).some(collider => segmentHitsAabb(
    x1, z1, x2, z2,
    collider.x, collider.z,
    collider.halfW + padding,
    collider.halfH + padding,
  ));
}
