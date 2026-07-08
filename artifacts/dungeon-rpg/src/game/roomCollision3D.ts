import { KAYKIT_COLLISION_SIZE, KAYKIT_ROOM_PROPS } from './kaykitRoomLayout';

function entityCenterToScene(value: number, size: number, mapTiles: number) {
  return (value + size / 2) / 40 - mapTiles / 2 + 0.5;
}

function colliderSize(room: number) {
  return (KAYKIT_ROOM_PROPS[Math.max(1, Math.min(10, room))] ?? [])
    .map(placement => {
      const base = KAYKIT_COLLISION_SIZE[placement.asset];
      if (!base) return null;
      const scale = placement.scale ?? 1;
      const rotated = Math.abs(Math.sin(placement.rotation ?? 0)) > 0.7;
      const width = (rotated ? base[1] : base[0]) * scale;
      const height = (rotated ? base[0] : base[1]) * scale;
      return {
        x: placement.x,
        z: placement.z,
        halfW: width / 2,
        halfH: height / 2,
      };
    })
    .filter((value): value is { x: number; z: number; halfW: number; halfH: number } => Boolean(value));
}

const ROOM_COLLIDERS = new Map<number, ReturnType<typeof colliderSize>>();

function roomColliders(room: number) {
  const key = Math.max(1, Math.min(10, room));
  if (!ROOM_COLLIDERS.has(key)) ROOM_COLLIDERS.set(key, colliderSize(key));
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
