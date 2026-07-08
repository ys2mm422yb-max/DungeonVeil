import { DungeonMap, TileType } from './dungeon';

const fill = <T,>(height: number, width: number, value: T): T[][] =>
  Array.from({ length: height }, () => Array<T>(width).fill(value));

export const CHAPTER_ROOMS = 10;

export function generateRunRoom(room: number): DungeonMap {
  const width = 24;
  const height = 32;
  const tiles = fill(height, width, TileType.WALL);
  const explored = fill(height, width, true);
  const wallVariant = fill(height, width, 0);
  const floorVariant = fill(height, width, 0);
  const wallTint = fill(height, width, 'default');

  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      tiles[y][x] = TileType.FLOOR;
      floorVariant[y][x] = (x * 7 + y * 11 + room * 13) % 4;
    }
  }

  const exitX = Math.floor(width / 2);
  tiles[2][exitX] = TileType.STAIRS_DOWN;

  const obstacleRows = room % 3 === 0 ? [12, 20] : room % 2 === 0 ? [16] : [];
  const obstacleStart = 6;
  const obstacleEnd = width - 7;
  const centerLeft = exitX - 1;
  const centerRight = exitX;

  for (const y of obstacleRows) {
    for (let x = obstacleStart; x <= obstacleEnd; x++) {
      if (x === centerLeft || x === centerRight) continue;
      tiles[y][x] = TileType.WALL;
      wallVariant[y][x] = (x + y + room) % 6;
    }
  }

  return {
    width,
    height,
    tiles,
    wallVariant,
    floorVariant,
    wallTint,
    explored,
    reachable: fill(height, width, true),
    rooms: [{ x: 2, y: 2, w: width - 4, h: height - 4, roomType: room === CHAPTER_ROOMS ? 'boss_arena' : 'barracks' }],
    startX: exitX,
    startY: height - 4,
    chests: [],
    decorations: [],
    torches: [],
  };
}
