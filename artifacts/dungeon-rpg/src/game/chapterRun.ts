import { DungeonMap, TileType } from './dungeon';

const fill = <T,>(height: number, width: number, value: T): T[][] =>
  Array.from({ length: height }, () => Array<T>(width).fill(value));

export const CHAPTER_ROOMS = 10;

export function generateRunRoom(room: number): DungeonMap {
  const width = 24;
  const height = 32;
  const tiles = fill<TileType>(height, width, TileType.WALL);
  const explored = fill<boolean>(height, width, true);
  const wallVariant = fill<number>(height, width, 0);
  const floorVariant = fill<number>(height, width, 0);
  const wallTint = fill<string>(height, width, 'default');

  // Der komplette Innenraum ist begehbar. Sichtbare 3D-Architektur darf nicht
  // mehr von unabhängigen, unsichtbaren Tile-Kollisionen abweichen.
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      tiles[y][x] = TileType.FLOOR;
      floorVariant[y][x] = (x * 7 + y * 11 + room * 13) % 4;
    }
  }

  const exitX = Math.floor(width / 2);
  tiles[2][exitX] = TileType.STAIRS_DOWN;

  // Spawn- und Ausgangsbereiche bleiben garantiert frei.
  for (let y = height - 7; y < height - 2; y++) {
    for (let x = exitX - 3; x <= exitX + 3; x++) tiles[y][x] = TileType.FLOOR;
  }
  for (let y = 2; y <= 6; y++) {
    for (let x = exitX - 2; x <= exitX + 2; x++) tiles[y][x] = TileType.FLOOR;
  }
  tiles[2][exitX] = TileType.STAIRS_DOWN;

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
      roomType: room === CHAPTER_ROOMS ? 'boss_arena' : 'barracks',
    }],
    startX: exitX,
    startY: height - 4,
    chests: [],
    decorations: [],
    torches: [],
  };
}
