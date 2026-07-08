type RoomCollider = {
  x: number;
  z: number;
  halfW: number;
  halfH: number;
};

const C = (x: number, z: number, halfW: number, halfH: number): RoomCollider => ({ x, z, halfW, halfH });

const ROOM_COLLIDERS: Record<number, RoomCollider[]> = {
  1: [
    C(5.6, -5.5, 1.25, 0.9), C(4.6, -2.2, 0.65, 0.65), C(5.8, 1.0, 1.35, 0.75),
    C(4.2, 3.2, 0.7, 0.6), C(5.4, 5.3, 0.75, 0.75), C(-5.2, -5.0, 0.8, 0.8),
    C(-4.8, -2.0, 0.75, 1.35), C(-4.8, 1.1, 0.9, 1.25), C(-5.3, 5.0, 0.9, 0.7),
  ],
  2: [
    C(-5.4, -5.3, 0.75, 1.45), C(-5.4, -1.9, 0.75, 1.45), C(5.4, -5.1, 0.75, 1.35),
    C(5.4, -1.8, 0.75, 1.2), C(-4.3, 3.5, 0.85, 0.85), C(4.7, 3.8, 1.05, 1.05),
    C(0, -4.3, 0.65, 0.65),
  ],
  3: [
    C(0, -5.4, 0.8, 0.8), C(0, -7.8, 1.25, 1.4), C(-5.6, -9.2, 1.5, 0.65),
    C(5.6, -9.2, 1.5, 0.65), C(0, 6.4, 0.95, 0.75),
  ],
  4: [
    C(-3.4, -2.1, 1.05, 1.05), C(3.4, -2.1, 1.05, 1.05), C(0, 2.2, 1.05, 1.05),
    C(0, 6.2, 1.1, 1.1), C(-5.1, 5.1, 0.7, 0.7), C(5.1, 5.1, 0.7, 0.7),
  ],
  5: [
    C(-4.7, -4.5, 1.05, 1.05), C(4.7, -4.5, 1.05, 1.05), C(0, -7.2, 1.8, 0.55),
    C(-4.5, 2.8, 0.75, 1.35), C(4.5, 2.8, 0.75, 1.35), C(-5.1, 5.3, 0.7, 0.7),
    C(5.1, 5.1, 0.7, 0.7),
  ],
  6: [
    C(0, -3.4, 1.5, 1.1), C(-4.8, -5.0, 1.2, 0.85), C(4.8, -5.0, 1.2, 0.85),
    C(-4.2, 3.6, 0.75, 1.35), C(4.2, 3.6, 0.75, 1.35), C(0, 6.0, 0.9, 0.7),
  ],
  7: [
    C(0, -4.8, 0.8, 0.8), C(0, -1.4, 0.9, 0.9), C(0, 6.2, 1.0, 0.8),
  ],
  8: [
    C(-5.0, -4.6, 0.75, 0.75), C(-4.1, -3.8, 0.7, 0.7), C(-5.0, -2.8, 0.7, 0.7),
    C(5.0, -4.6, 0.75, 0.75), C(4.1, -3.8, 0.7, 0.7), C(5.0, -2.7, 0.9, 0.7),
    C(-4.8, 3.2, 0.85, 1.4), C(4.8, 3.2, 0.8, 1.25),
  ],
  9: [
    C(0, -5.3, 0.8, 0.8), C(-3.2, -1.0, 1.35, 0.75), C(3.2, -1.0, 1.35, 0.75),
    C(-3.2, 2.3, 1.35, 0.75), C(3.2, 2.3, 1.35, 0.75),
  ],
  10: [
    C(-5.2, -5.8, 0.9, 0.9), C(5.2, -5.8, 0.9, 0.9), C(-5.2, 4.0, 0.9, 0.9),
    C(5.2, 4.0, 0.9, 0.9), C(-5.8, 7.2, 1.25, 1.35), C(5.8, 7.2, 1.25, 1.35),
    C(0, 8.0, 1.0, 0.8), C(-3.0, -7.2, 0.8, 0.8), C(3.0, -7.2, 0.8, 0.8),
  ],
};

function entityCenterToScene(value: number, size: number, mapTiles: number) {
  return (value + size / 2) / 40 - mapTiles / 2 + 0.5;
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

  return (ROOM_COLLIDERS[Math.max(1, Math.min(10, room))] ?? []).some(collider =>
    Math.abs(centerX - collider.x) < halfW + collider.halfW
    && Math.abs(centerZ - collider.z) < halfH + collider.halfH,
  );
}
