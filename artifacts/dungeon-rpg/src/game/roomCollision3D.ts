import { roomArchitecturePieces } from './roomArchitectureLayout';
import { roomSetpieces } from './roomSetpieceLayout';

function entityCenterToScene(value: number, size: number, mapTiles: number) {
  return (value + size / 2) / 40 - mapTiles / 2 + 0.5;
}

function inferredColliderForModel(model: string): readonly [number, number] | undefined {
  const name = model.toLowerCase();
  if (name.includes('floor_') || name.includes('/path_') || name.includes('rug_') || name.includes('stairs_') || name.includes('wall_arched')) return undefined;
  if (name.includes('table_medium_long')) return [3, 1.6];
  if (name.includes('table_medium')) return [2.2, 1.6];
  if (name.includes('table_low')) return [2.1, 1.5];
  if (name.includes('table_small')) return [1.5, 1.5];
  if (name.includes('shelf_')) return name.includes('small') ? [1.35, 1.8] : [1.4, 3];
  if (name.includes('cabinet_')) return name.includes('small') ? [1.25, 1.35] : [1.4, 1.75];
  if (name.includes('bed_')) return [1.8, 3.15];
  if (name.includes('bench')) return [1.45, 2.7];
  if (name.includes('crypt')) return [2.5, 2];
  if (name.includes('coffin')) return [1.9, 3.2];
  if (name.includes('grave_') || name.includes('gravestone')) return [1.5, 2];
  if (name.includes('shrine')) return [2.1, 2.1];
  if (name.includes('anvil')) return [1.6, 1.25];
  if (name.includes('grindstone')) return [1.9, 1.45];
  if (name.includes('pallet_wood')) return [2.25, 1.65];
  if (name.includes('bars_stack_large')) return [2.2, 1.6];
  if (name.includes('bars_stack_medium')) return [1.9, 1.3];
  if (name.includes('bars_stack_small')) return [1.45, 1.15];
  if (name.includes('tree_dead')) return [1.75, 1.75];
  if (name.includes('/bush_')) return [1.25, 1.25];
  if (name.includes('rubble_large')) return [2, 1.7];
  if (name.includes('pillar')) return [1.45, 1.45];
  if (name.includes('barrier_') || name.includes('fence_')) return [2.6, 1];
  return undefined;
}

function collidersForRoom(room: number) {
  return [...roomArchitecturePieces(room), ...roomSetpieces(room)]
    .map(piece => ({ piece, base: piece.collider ?? inferredColliderForModel(piece.model) }))
    .filter((entry): entry is { piece: (ReturnType<typeof roomArchitecturePieces>[number] | ReturnType<typeof roomSetpieces>[number]); base: readonly [number, number] } => Boolean(entry.base))
    .map(({ piece, base }) => {
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
  padding = 0.14,
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
