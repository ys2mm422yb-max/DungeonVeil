export type RoomSpawnPoint = { x: number; z: number };

const DEFAULT_POINTS: RoomSpawnPoint[] = [
  { x: -4.6, z: -5.8 },
  { x: 0, z: -6.8 },
  { x: 4.6, z: -5.8 },
  { x: -3.6, z: -1.8 },
  { x: 3.6, z: -1.8 },
  { x: -4.7, z: 2.7 },
  { x: 4.7, z: 2.7 },
  { x: 0, z: 4.3 },
];

const ROOM_POINTS: Record<number, RoomSpawnPoint[]> = {
  1: [
    { x: -1.8, z: -6.0 }, { x: 1.8, z: -5.4 }, { x: 0, z: -1.5 },
    { x: -1.7, z: 2.6 }, { x: 1.8, z: 3.2 },
  ],
  2: [
    { x: -2.2, z: -6.4 }, { x: 2.2, z: -5.7 }, { x: -1.6, z: -1.2 },
    { x: 1.8, z: 1.6 }, { x: 0, z: 5.0 },
  ],
  3: [
    { x: -3.2, z: -3.3 }, { x: 3.2, z: -3.3 }, { x: 0, z: -1.2 },
    { x: -2.8, z: 2.7 }, { x: 2.8, z: 2.7 },
  ],
  4: [
    { x: -5.2, z: -5.2 }, { x: 0, z: -5.4 }, { x: 5.2, z: -5.2 },
    { x: -5.0, z: 0.8 }, { x: 5.0, z: 0.8 }, { x: 0, z: 4.6 },
  ],
  5: [
    { x: -2.2, z: -5.0 }, { x: 2.2, z: -5.0 }, { x: 0, z: -1.2 },
    { x: -2.5, z: 3.2 }, { x: 2.5, z: 3.2 }, { x: 0, z: 6.0 },
  ],
  6: [
    { x: -5.0, z: -7.0 }, { x: 5.0, z: -7.0 }, { x: -3.1, z: 0.0 },
    { x: 3.1, z: 0.0 }, { x: -2.5, z: 5.0 }, { x: 2.5, z: 5.0 },
  ],
  7: [
    { x: -4.2, z: -5.8 }, { x: 4.2, z: -5.8 }, { x: -4.0, z: -0.5 },
    { x: 4.0, z: -0.5 }, { x: -2.8, z: 4.4 }, { x: 2.8, z: 4.4 },
  ],
  8: [
    { x: -1.8, z: -5.8 }, { x: 1.8, z: -5.8 }, { x: -2.5, z: -0.5 },
    { x: 2.5, z: -0.5 }, { x: -2.0, z: 4.7 }, { x: 2.0, z: 4.7 },
  ],
  9: [
    { x: -5.0, z: -5.8 }, { x: 5.0, z: -5.8 }, { x: 0, z: -3.2 },
    { x: -5.0, z: 4.8 }, { x: 5.0, z: 4.8 }, { x: 0, z: 6.0 },
  ],
  10: [{ x: 0, z: -3.0 }],
};

export function getRoomSpawnPoints(room: number) {
  return ROOM_POINTS[Math.max(1, Math.min(10, room))] ?? DEFAULT_POINTS;
}

export function sceneSpawnToGame(point: RoomSpawnPoint, mapWidth: number, mapHeight: number, size: number) {
  return {
    x: (point.x + mapWidth / 2 - 0.5) * 40 - size / 2,
    y: (point.z + mapHeight / 2 - 0.5) * 40 - size / 2,
  };
}
