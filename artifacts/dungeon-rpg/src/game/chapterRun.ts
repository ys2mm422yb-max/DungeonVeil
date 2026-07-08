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

  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      tiles[y][x] = TileType.FLOOR;
      floorVariant[y][x] = (x * 7 + y * 11 + room * 13) % 4;
    }
  }

  const exitX = Math.floor(width / 2);
  tiles[2][exitX] = TileType.STAIRS_DOWN;

  const setWall = (x: number, y: number) => {
    if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) return;
    tiles[y][x] = TileType.WALL;
    wallVariant[y][x] = (x * 3 + y * 5 + room) % 6;
  };

  const line = (x1: number, x2: number, y: number, gaps: number[] = []) => {
    for (let x = x1; x <= x2; x++) if (!gaps.includes(x)) setWall(x, y);
  };

  const block = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setWall(xx, yy);
  };

  if (room === 1) {
    // Verwachsener Außenposten: gebrochene Front, breite Mitte, seitliche Deckung.
    line(4, 9, 9);
    line(14, 19, 9);
    block(4, 15, 2, 3);
    block(18, 15, 2, 3);
    line(7, 10, 21);
    line(14, 17, 21);
  } else if (room === 2) {
    // Zerfallene Ruine: versetzte Mauerreste statt einer geraden Steinreihe.
    block(4, 8, 2, 5);
    block(18, 7, 2, 4);
    line(7, 12, 13, [10, 11]);
    line(12, 17, 18, [13, 14]);
    block(5, 23, 3, 2);
    block(16, 22, 3, 2);
  } else if (room === 3) {
    // Verlassenes Lager: offenes Zentrum um das Lagerfeuer, Deckung in vier Camps.
    block(4, 7, 3, 2);
    block(17, 7, 3, 2);
    block(4, 19, 3, 2);
    block(17, 19, 3, 2);
    line(8, 10, 12);
    line(14, 16, 12);
    line(8, 10, 23);
    line(14, 16, 23);
  } else if (room === 4) {
    // Waldtempel: zwei Säulengassen führen zum nördlichen Tor.
    for (const y of [8, 13, 18, 23]) {
      block(5, y, 2, 2);
      block(17, y, 2, 2);
    }
    line(8, 10, 10);
    line(14, 16, 10);
    line(8, 9, 21);
    line(15, 16, 21);
  } else {
    const obstacleRows = room % 3 === 0 ? [12, 20] : room % 2 === 0 ? [16] : [];
    for (const y of obstacleRows) {
      for (let x = 6; x <= width - 7; x++) {
        if (x === exitX - 1 || x === exitX) continue;
        setWall(x, y);
      }
    }
  }

  // Freier Spawnkorridor und Ausgang bleiben garantiert sichtbar/erreichbar.
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
    rooms: [{ x: 2, y: 2, w: width - 4, h: height - 4, roomType: room === CHAPTER_ROOMS ? 'boss_arena' : 'barracks' }],
    startX: exitX,
    startY: height - 4,
    chests: [],
    decorations: [],
    torches: [],
  };
}
