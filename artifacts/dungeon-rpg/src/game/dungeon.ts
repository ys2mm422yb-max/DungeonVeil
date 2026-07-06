import { RoomType, RoomTypeDef, ROOM_TYPE_DEFS, pickRoomType } from './roomTypes';

export const TILE_SIZE = 40;

export enum TileType {
  EMPTY = 0,
  FLOOR = 1,
  WALL = 2,
  DOOR = 3,
  STAIRS_DOWN = 4,
  // Overworld biomes
  GRASS = 5,
  FOREST = 6,
  WATER = 7,
  ROAD = 8,
  VILLAGE = 9,
  DUNGEON_ENTRANCE = 10,
  CLIFF = 11,
  WATERFALL = 12,
  BRIDGE = 13,
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  roomType: RoomType;
}

export interface Decoration {
  tx: number;
  ty: number;
  kind: 'torch' | 'shrine' | 'skull' | 'forge' | 'bookshelf' | 'altar';
}

export interface ChestSpawn {
  tx: number;
  ty: number;
  locked: boolean;
  roomIndex: number;
}

export interface DungeonMap {
  width: number;
  height: number;
  tiles: TileType[][];
  /** 0 = back wall, 1 = front face (floor tile directly south) */
  wallVariant: number[][];
  /** floor colour variant index per tile (0-3) */
  floorVariant: number[][];
  /** wall tint/style key per tile (e.g. 'mossy', 'blood', 'broken') */
  wallTint: string[][];
  explored: boolean[][];
  /** Walkable-reachable mask for the overworld; used by enemy spawning */
  reachable?: boolean[][];
  rooms: Room[];
  startX: number;
  startY: number;
  chests: ChestSpawn[];
  decorations: Decoration[];
  torches: Array<{ tx: number; ty: number }>;
}

// Deterministic per-tile hash for stable visual variation
function tileHash(tx: number, ty: number): number {
  let h = ((tx * 374761393 + ty * 1234567891) & 0x7fffffff);
  h = ((h ^ (h >>> 13)) * 1540483477) & 0x7fffffff;
  return (h ^ (h >>> 15)) / 0x7fffffff;
}

export function generateDungeon(
  width: number,
  height: number,
  numRooms: number,
  floor = 1,
): DungeonMap {
  const tiles: TileType[][] = Array.from({ length: height }, () =>
    new Array<TileType>(width).fill(TileType.EMPTY),
  );
  const explored: boolean[][] = Array.from({ length: height }, () =>
    new Array<boolean>(width).fill(false),
  );
  const wallVariant: number[][] = Array.from({ length: height }, () =>
    new Array<number>(width).fill(0),
  );
  const floorVariant: number[][] = Array.from({ length: height }, () =>
    new Array<number>(width).fill(0),
  );
  const wallTint: string[][] = Array.from({ length: height }, () =>
    new Array<string>(width).fill('default'),
  );

  const rooms: Room[] = [];
  const isBossFloor = floor % 5 === 0;

  // ── Room placement ───────────────────────────────────────────────────────────
  const maxAttempts = numRooms * 8;
  for (let attempt = 0; attempt < maxAttempts && rooms.length < numRooms; attempt++) {
    const isFirst = rooms.length === 0;
    const isLast = rooms.length === numRooms - 1;
    const isSpec = isFirst || isLast;
    const rw = isSpec ? 8 : Math.floor(Math.random() * 6) + 5;
    const rh = isSpec ? 8 : Math.floor(Math.random() * 6) + 5;
    const x = Math.floor(Math.random() * (width - rw - 3)) + 2;
    const y = Math.floor(Math.random() * (height - rh - 3)) + 2;

    const newRoom: Room = {
      x, y, w: rw, h: rh,
      roomType: pickRoomType(rooms.length, numRooms, floor, isBossFloor),
    };

    let failed = false;
    for (const r of rooms) {
      if (
        newRoom.x < r.x + r.w + 2 &&
        newRoom.x + newRoom.w + 2 > r.x &&
        newRoom.y < r.y + r.h + 2 &&
        newRoom.y + newRoom.h + 2 > r.y
      ) { failed = true; break; }
    }
    if (failed) continue;

    rooms.push(newRoom);
    for (let ry = y; ry < y + rh; ry++)
      for (let rx = x; rx < x + rw; rx++)
        tiles[ry][rx] = TileType.FLOOR;
  }

  if (rooms.length === 0) {
    rooms.push({ x: 2, y: 2, w: 8, h: 8, roomType: 'entrance' });
    for (let ry = 2; ry < 10; ry++)
      for (let rx = 2; rx < 10; rx++)
        tiles[ry][rx] = TileType.FLOOR;
  }

  // ── Connect rooms with L-shaped corridors ─────────────────────────────────────
  for (let i = 1; i < rooms.length; i++) {
    const r1 = rooms[i - 1];
    const r2 = rooms[i];
    const c1x = Math.floor(r1.x + r1.w / 2);
    const c1y = Math.floor(r1.y + r1.h / 2);
    const c2x = Math.floor(r2.x + r2.w / 2);
    const c2y = Math.floor(r2.y + r2.h / 2);

    let cx = c1x, cy = c1y;
    if (Math.random() < 0.5) {
      while (cx !== c2x) { cx += Math.sign(c2x - cx); tiles[cy][cx] = TileType.FLOOR; }
      while (cy !== c2y) { cy += Math.sign(c2y - cy); tiles[cy][cx] = TileType.FLOOR; }
    } else {
      while (cy !== c2y) { cy += Math.sign(c2y - cy); tiles[cy][cx] = TileType.FLOOR; }
      while (cx !== c2x) { cx += Math.sign(c2x - cx); tiles[cy][cx] = TileType.FLOOR; }
    }

    // Door tiles at the corridor mouth near each room
    tryPlaceDoor(tiles, rooms[i - 1], c1x, c1y, width, height);
    tryPlaceDoor(tiles, rooms[i], c2x, c2y, width, height);
  }

  // ── Walls ────────────────────────────────────────────────────────────────────
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === TileType.FLOOR || tiles[y][x] === TileType.DOOR) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width && tiles[ny][nx] === TileType.EMPTY)
              tiles[ny][nx] = TileType.WALL;
          }
        }
      }
    }
  }

  // ── Wall variant: 1 = front face ─────────────────────────────────────────────
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === TileType.WALL) {
        const below = y + 1 < height ? tiles[y + 1][x] : TileType.EMPTY;
        wallVariant[y][x] =
          (below === TileType.FLOOR || below === TileType.DOOR || below === TileType.STAIRS_DOWN) ? 1 : 0;
      }
    }
  }

  // ── Wall tint per room type + random damage ───────────────────────────────
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const tintKey = tintToKey(ROOM_TYPE_DEFS[room.roomType].wallTint);
    if (tintKey === 'default') continue;
    for (let wy = room.y - 1; wy <= room.y + room.h; wy++) {
      for (let wx = room.x - 1; wx <= room.x + room.w; wx++) {
        if (wy >= 0 && wy < height && wx >= 0 && wx < width && tiles[wy][wx] === TileType.WALL) {
          wallTint[wy][wx] = tintKey;
        }
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === TileType.WALL && Math.random() < 0.025) {
        wallTint[y][x] = 'broken';
      }
    }
  }

  // ── Stairs ───────────────────────────────────────────────────────────────────
  const lastRoom = rooms[rooms.length - 1];
  const stairX = Math.floor(lastRoom.x + lastRoom.w / 2);
  const stairY = Math.floor(lastRoom.y + lastRoom.h / 2);
  tiles[stairY][stairX] = TileType.STAIRS_DOWN;

  const startRoom = rooms[0];
  const startX = Math.floor(startRoom.x + startRoom.w / 2);
  const startY = Math.floor(startRoom.y + startRoom.h / 2);

  // ── Floor variants ─────────────────────────────────────────────────────────────
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const def: RoomTypeDef = ROOM_TYPE_DEFS[room.roomType];
    const fv = def.floorVariant;
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      for (let rx = room.x; rx < room.x + room.w; rx++) {
        if (tiles[ry][rx] === TileType.FLOOR) {
          const h = tileHash(rx, ry);
          floorVariant[ry][rx] = h < 0.08 && fv === 0 ? 1 : fv;
        }
      }
    }
  }

  // ── Chests & decorations (shared occupancy set prevents overlap) ─────────────
  const occupied = new Set<string>();
  occupied.add(`${startX},${startY}`);
  occupied.add(`${stairX},${stairY}`);

  const chests: ChestSpawn[] = [];
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    if (room.roomType === 'entrance') continue;
    const def: RoomTypeDef = ROOM_TYPE_DEFS[room.roomType];
    if (Math.random() < def.chestChance) {
      for (let t = 0; t < 12; t++) {
        const cx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        const cy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
        const key = `${cx},${cy}`;
        if (tiles[cy][cx] === TileType.FLOOR && !occupied.has(key)) {
          occupied.add(key);
          chests.push({
            tx: cx, ty: cy,
            locked: Math.random() < def.lockedChestChance,
            roomIndex: i,
          });
          break;
        }
      }
    }
  }

  // ── Decorations & torches ─────────────────────────────────────────────────────
  const decorations: Decoration[] = [];
  const torches: Array<{ tx: number; ty: number }> = [];

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const def: RoomTypeDef = ROOM_TYPE_DEFS[room.roomType];

    // Place a decoration at room centre if applicable, avoiding occupied tiles
    if (def.decoration && room.roomType !== 'exit') {
      const dx = Math.floor(room.x + room.w / 2);
      const dy = Math.floor(room.y + room.h / 2);
      const key = `${dx},${dy}`;
      if (tiles[dy]?.[dx] === TileType.FLOOR && !occupied.has(key)) {
        occupied.add(key);
        decorations.push({ tx: dx, ty: dy, kind: def.decoration });
      }
    }

    // Torches on wall tiles surrounding the room
    const spacing = 4;
    let counter = 0;
    for (let rx = room.x; rx < room.x + room.w; rx++) {
      for (const ty2 of [room.y - 1, room.y + room.h]) {
        if (counter % spacing === 0 && tiles[ty2]?.[rx] === TileType.WALL)
          torches.push({ tx: rx, ty: ty2 });
        counter++;
      }
    }
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      for (const tx2 of [room.x - 1, room.x + room.w]) {
        if (counter % spacing === 0 && tiles[ry]?.[tx2] === TileType.WALL)
          torches.push({ tx: tx2, ty: ry });
        counter++;
      }
    }
  }

  return {
    width, height, tiles, wallVariant, floorVariant, wallTint, explored,
    rooms, startX, startY, chests, decorations, torches,
  };
}

function tintToKey(tint?: string): string {
  if (!tint) return 'default';
  if (tint.includes('green') || tint.includes('003300')) return 'mossy';
  if (tint.includes('red') || tint.includes('880000') || tint.includes('440000')) return 'blood';
  if (tint.includes('purple') || tint.includes('220011')) return 'default';
  return 'default';
}

function tryPlaceDoor(
  tiles: TileType[][],
  room: Room,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  // Walk outward from (cx, cy) until we hit the room border; place door there
  const dirs: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of dirs) {
    let nx = cx, ny = cy;
    while (nx >= room.x && nx < room.x + room.w && ny >= room.y && ny < room.y + room.h) {
      nx += dx; ny += dy;
    }
    if (nx >= 0 && nx < width && ny >= 0 && ny < height && tiles[ny][nx] === TileType.FLOOR) {
      tiles[ny][nx] = TileType.DOOR;
      return;
    }
  }
}

export function isWalkable(map: DungeonMap, px: number, py: number): boolean {
  const tx = Math.floor(px / TILE_SIZE);
  const ty = Math.floor(py / TILE_SIZE);
  if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) return false;
  const t = map.tiles[ty][tx];
  return (
    t === TileType.FLOOR ||
    t === TileType.DOOR ||
    t === TileType.STAIRS_DOWN ||
    t === TileType.GRASS ||
    t === TileType.ROAD ||
    t === TileType.VILLAGE ||
    t === TileType.DUNGEON_ENTRANCE ||
    t === TileType.BRIDGE
  );
}

export function getRoomAt(map: DungeonMap, tx: number, ty: number): number {
  for (let i = 0; i < map.rooms.length; i++) {
    const r = map.rooms[i];
    if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return i;
  }
  return -1;
}
