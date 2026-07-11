import { DungeonMap, TileType } from './dungeon';
import { roomPortalTile } from './roomBible';

const fill = <T,>(height: number, width: number, value: T): T[][] =>
  Array.from({ length: height }, () => Array<T>(width).fill(value));

export const CHAPTER_ROOMS = 20;
export const MID_CHAPTER_BOSS_ROOM = 10;
export const FINAL_BOSS_ROOM = 20;

export function isBossRoom(room: number): boolean {
  return room === MID_CHAPTER_BOSS_ROOM || room === FINAL_BOSS_ROOM;
}

export function generateRunRoom(room: number): DungeonMap {
  const width = 24;
  const height = 32;
  const tiles = fill<TileType>(height, width, TileType.WALL);
  const explored = fill<boolean>(height, width, true);
  const wallVariant = fill<number>(height, width, 0);
  const floorVariant = fill<number>(height, width, 0);
  const wallTint = fill<string>(height, width, 'default');

  // Visible 3D props are the collision source. The authored room interior therefore
  // stays walkable and can change silhouette without hidden tile walls disagreeing.
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      tiles[y][x] = TileType.FLOOR;
      floorVariant[y][x] = (x * 7 + y * 11 + room * 13) % 4;
    }
  }

  const startX = Math.floor(width / 2);
  const startY = height - 4;
  const exit = roomPortalTile(room, width, height);

  // Player start and the room-specific portal stage always stay clear. Portals can
  // now sit in a ritual center, side gate or boss core instead of every room ending
  // at the same top-center doorway.
  for (let y = startY - 3; y <= startY + 1; y++) {
    for (let x = startX - 3; x <= startX + 3; x++) {
      if (tiles[y]?.[x] !== undefined) tiles[y][x] = TileType.FLOOR;
    }
  }
  for (let y = exit.y - 2; y <= exit.y + 2; y++) {
    for (let x = exit.x - 2; x <= exit.x + 2; x++) {
      if (tiles[y]?.[x] !== undefined) tiles[y][x] = TileType.FLOOR;
    }
  }
  tiles[exit.y][exit.x] = TileType.STAIRS_DOWN;

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
    startX,
    startY,
    chests: [],
    decorations: [],
    torches: [],
  };
}
