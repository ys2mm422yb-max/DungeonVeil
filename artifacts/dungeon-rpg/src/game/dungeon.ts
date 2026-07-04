export const TILE_SIZE = 40;

export enum TileType {
  EMPTY = 0,
  FLOOR = 1,
  WALL = 2,
  DOOR = 3,
  STAIRS_DOWN = 4
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DungeonMap {
  width: number;
  height: number;
  tiles: TileType[][];
  explored: boolean[][];
  rooms: Room[];
  startX: number;
  startY: number;
}

export function generateDungeon(width: number, height: number, numRooms: number): DungeonMap {
  const tiles: TileType[][] = Array(height).fill(0).map(() => Array(width).fill(TileType.EMPTY));
  const explored: boolean[][] = Array(height).fill(0).map(() => Array(width).fill(false));
  const rooms: Room[] = [];

  for (let i = 0; i < numRooms * 2 && rooms.length < numRooms; i++) {
    const w = Math.floor(Math.random() * 5) + 5; // 5 to 9
    const h = Math.floor(Math.random() * 5) + 5;
    const x = Math.floor(Math.random() * (width - w - 2)) + 1;
    const y = Math.floor(Math.random() * (height - h - 2)) + 1;

    const newRoom = { x, y, w, h };
    let failed = false;
    for (const otherRoom of rooms) {
      if (
        newRoom.x < otherRoom.x + otherRoom.w + 1 &&
        newRoom.x + newRoom.w + 1 > otherRoom.x &&
        newRoom.y < otherRoom.y + otherRoom.h + 1 &&
        newRoom.y + newRoom.h + 1 > otherRoom.y
      ) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      rooms.push(newRoom);
      for (let ry = y; ry < y + h; ry++) {
        for (let rx = x; rx < x + w; rx++) {
          tiles[ry][rx] = TileType.FLOOR;
        }
      }
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const r1 = rooms[i - 1];
    const r2 = rooms[i];
    
    const c1x = Math.floor(r1.x + r1.w / 2);
    const c1y = Math.floor(r1.y + r1.h / 2);
    const c2x = Math.floor(r2.x + r2.w / 2);
    const c2y = Math.floor(r2.y + r2.h / 2);

    let currX = c1x;
    let currY = c1y;

    while (currX !== c2x || currY !== c2y) {
      if (Math.random() < 0.5) {
        if (currX < c2x) currX++;
        else if (currX > c2x) currX--;
        else if (currY < c2y) currY++;
        else if (currY > c2y) currY--;
      } else {
        if (currY < c2y) currY++;
        else if (currY > c2y) currY--;
        else if (currX < c2x) currX++;
        else if (currX > c2x) currX--;
      }
      tiles[currY][currX] = TileType.FLOOR;
    }
  }

  // Add walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === TileType.FLOOR) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              if (tiles[ny][nx] === TileType.EMPTY) {
                tiles[ny][nx] = TileType.WALL;
              }
            }
          }
        }
      }
    }
  }

  // Place doors and stairs
  const lastRoom = rooms[rooms.length - 1];
  tiles[Math.floor(lastRoom.y + lastRoom.h / 2)][Math.floor(lastRoom.x + lastRoom.w / 2)] = TileType.STAIRS_DOWN;

  const startRoom = rooms[0];
  const startX = Math.floor(startRoom.x + startRoom.w / 2);
  const startY = Math.floor(startRoom.y + startRoom.h / 2);

  return {
    width,
    height,
    tiles,
    explored,
    rooms,
    startX,
    startY
  };
}

export function isWalkable(map: DungeonMap, px: number, py: number): boolean {
  const tx = Math.floor(px / TILE_SIZE);
  const ty = Math.floor(py / TILE_SIZE);
  
  if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) return false;
  return map.tiles[ty][tx] === TileType.FLOOR || map.tiles[ty][tx] === TileType.DOOR || map.tiles[ty][tx] === TileType.STAIRS_DOWN;
}
