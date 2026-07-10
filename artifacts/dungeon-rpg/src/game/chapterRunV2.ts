import { DungeonMap, TileType } from './dungeon';

const fill = <T,>(height: number, width: number, value: T): T[][] =>
  Array.from({ length: height }, () => Array<T>(width).fill(value));

export const CHAPTER_ROOMS = 20;
export const MID_CHAPTER_BOSS_ROOM = 10;
export const FINAL_BOSS_ROOM = 20;

export function isBossRoom(room: number): boolean {
  return room === MID_CHAPTER_BOSS_ROOM || room === FINAL_BOSS_ROOM;
}

type RoomDimensions = { width: number; height: number };

const ROOM_DIMENSIONS: Record<number, RoomDimensions> = {
  1: { width: 20, height: 22 },
  2: { width: 20, height: 22 },
  3: { width: 20, height: 25 },
  4: { width: 22, height: 23 },
  5: { width: 20, height: 22 },
  6: { width: 20, height: 23 },
  7: { width: 22, height: 23 },
  8: { width: 22, height: 25 },
  9: { width: 20, height: 24 },
  10: { width: 22, height: 26 },
  11: { width: 22, height: 24 },
  12: { width: 22, height: 23 },
  13: { width: 20, height: 23 },
  14: { width: 22, height: 25 },
  15: { width: 20, height: 24 },
  16: { width: 22, height: 24 },
  17: { width: 20, height: 25 },
  18: { width: 22, height: 24 },
  19: { width: 20, height: 24 },
  20: { width: 22, height: 27 },
};

export function roomDimensions(room: number): RoomDimensions {
  return ROOM_DIMENSIONS[Math.max(1, Math.min(CHAPTER_ROOMS, room))] ?? { width: 22, height: 24 };
}

export function generateRunRoom(room: number): DungeonMap {
  const { width, height } = roomDimensions(room);
  const tiles = fill<TileType>(height, width, TileType.WALL);
  const explored = fill<boolean>(height, width, true);
  const wallVariant = fill<number>(height, width, 0);
  const floorVariant = fill<number>(height, width, 0);
  const wallTint = fill<string>(height, width, 'default');

  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      tiles[y][x] = TileType.FLOOR;
      floorVariant[y][x] = (x * 7 + y * 11 + room * 13) % 4;
    }
  }

  const exitX = Math.floor(width / 2);
  for (let x = exitX - 2; x <= exitX + 2; x++) tiles[1][x] = TileType.FLOOR;
  tiles[1][exitX] = TileType.STAIRS_DOWN;

  for (let y = Math.max(2, height - 7); y < height - 2; y++) {
    for (let x = exitX - 3; x <= exitX + 3; x++) tiles[y][x] = TileType.FLOOR;
  }
  for (let y = 1; y <= Math.min(6, height - 3); y++) {
    for (let x = exitX - 2; x <= exitX + 2; x++) tiles[y][x] = TileType.FLOOR;
  }
  tiles[1][exitX] = TileType.STAIRS_DOWN;

  return {
    width,
    height,
    tiles,
    wallVariant,
    floorVariant,
    wallTint,
    explored,
    reachable: fill<boolean>(height, width, true),
    rooms: [{
      x: 2,
      y: 2,
      w: width - 4,
      h: height - 4,
      roomType: isBossRoom(room) ? 'boss_arena' : 'barracks',
    }],
    startX: exitX,
    startY: height - 4,
    chests: [],
    decorations: [],
    torches: [],
  };
}
