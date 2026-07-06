import { DungeonMap, TileType } from './dungeon';

/**
 * Procedural open-world generator for the overworld.
 *
 * Replaces the room-crawler dungeon with a large continuous biome map:
 * meadows, forests, rivers, hills, villages, roads, rocks, flowers and dungeon entrances.
 * Dungeons are generated separately when the player enters an entrance.
 */

export interface WorldPoint {
  tx: number;
  ty: number;
}

export interface WorldGenConfig {
  width?: number;
  height?: number;
  seed?: number;
  villageCount?: number;
  dungeonEntranceCount?: number;
}

const DEFAULT_CONFIG: Required<WorldGenConfig> = {
  width: 96,
  height: 96,
  seed: 0,
  villageCount: 6,
  dungeonEntranceCount: 7,
};

// Fast 2D value noise with deterministic integer hashing
function noise2D(nx: number, ny: number, seed: number): number {
  const x = Math.floor(nx);
  const y = Math.floor(ny);
  const fx = nx - x;
  const fy = ny - y;

  const hash = (hx: number, hy: number): number => {
    let h = ((hx * 374761393 + hy * 1234567891 + seed * 718281828) & 0x7fffffff);
    h = ((h ^ (h >>> 13)) * 1540483477) & 0x7fffffff;
    return (h ^ (h >>> 15)) / 0x7fffffff;
  };

  const a = hash(x, y);
  const b = hash(x + 1, y);
  const c = hash(x, y + 1);
  const d = hash(x + 1, y + 1);

  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(nx: number, ny: number, seed: number, octaves = 4): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise2D(nx * frequency, ny * frequency, seed + i) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / maxValue;
}

function distanceSq(a: WorldPoint, b: WorldPoint): number {
  const dx = a.tx - b.tx;
  const dy = a.ty - b.ty;
  return dx * dx + dy * dy;
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(noise2D(i, seed, seed)) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function posKey(x: number, y: number): string { return `${x},${y}`; }

function isWalkable(t: TileType): boolean {
  return t === TileType.GRASS || t === TileType.ROAD || t === TileType.VILLAGE || t === TileType.DUNGEON_ENTRANCE || t === TileType.BRIDGE;
}

  export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Generate a large connected, organic overworld map.
 *
 * The returned map uses the same DungeonMap shape so the engine and renderer
 * can consume it without a full rewrite. Dungeons are NOT generated here; the
 * map only contains dungeon entrance tiles that the engine can resolve later.
 */
export function generateWorld(config: Partial<WorldGenConfig> = {}): DungeonMap {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { width, height, seed, villageCount, dungeonEntranceCount } = cfg;

  const tiles: TileType[][] = Array.from({ length: height }, () =>
    new Array<TileType>(width).fill(TileType.GRASS),
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
  const reachable: boolean[][] = Array.from({ length: height }, () =>
    new Array<boolean>(width).fill(false),
  );

  // 1. Large-scale biome pass: water / grass / forest with smooth thresholds
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = fbm(x * 0.035, y * 0.035, seed, 5);
      const h = n * 0.5 + 0.5;
      if (h < 0.26) {
        tiles[y][x] = TileType.WATER;
      } else if (h > 0.68) {
        tiles[y][x] = TileType.FOREST;
      } else {
        tiles[y][x] = TileType.GRASS;
      }
      // visual variation index
      floorVariant[y][x] = Math.floor(Math.abs(noise2D(x * 0.3, y * 0.3, seed + 10)) * 8);
      // forest tree type: 0 = broadleaf, 1 = pine
      if (tiles[y][x] === TileType.FOREST) {
        wallVariant[y][x] = Math.abs(noise2D(x * 0.3, y * 0.3, seed + 20)) < 0.5 ? 1 : 0;
      }
    }
  }

  // 1b. Smooth small isolated noise specks into larger organic regions
  for (let pass = 0; pass < 2; pass++) {
    const next = tiles.map(row => [...row]);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const counts = new Map<TileType, number>();
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const t = tiles[y + dy][x + dx];
            counts.set(t, (counts.get(t) ?? 0) + 1);
          }
        }
        let best = tiles[y][x];
        let bestCount = 0;
        counts.forEach((c, t) => { if (c > bestCount) { bestCount = c; best = t; } });
        if (bestCount >= 5) next[y][x] = best;
      }
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles[y][x] = next[y][x];
  }

  // 1c. Carve organic meandering rivers from one edge to another
  const riverCount = 2 + Math.floor(Math.abs(noise2D(seed, seed, seed * 2)) * 3);
  for (let r = 0; r < riverCount; r++) {
    let rx = Math.floor(Math.abs(noise2D(seed + r, 0, seed)) * width);
    let ry = Math.floor(Math.abs(noise2D(0, seed + r, seed)) * height);
    const steps = 160 + Math.floor(Math.abs(noise2D(r, r, seed + 5)) * 120);
    for (let s = 0; s < steps; s++) {
      if (inBounds(rx, ry, width, height)) {
        tiles[ry][rx] = TileType.WATER;
        // carve a gently wandering channel 2-3 cells wide
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = rx + dx, ny = ry + dy;
          if (inBounds(nx, ny, width, height) && tiles[ny][nx] !== TileType.WATER) {
            if (Math.abs(noise2D(nx, ny, seed + r + 100)) < 0.42) tiles[ny][nx] = TileType.WATER;
          }
        }
      }
      const targetAngle = (s / steps) * Math.PI * 2 + noise2D(rx, ry, seed + r) * 3;
      const turn = noise2D(rx * 0.2, ry * 0.2, seed + r + 200) * 2;
      rx += Math.round(Math.cos(targetAngle + turn));
      ry += Math.round(Math.sin(targetAngle + turn));
    }
  }

  // 1d. Add natural ponds and lakes
  const pondCount = 4 + Math.floor(Math.abs(noise2D(seed, seed, seed + 7)) * 4);
  for (let p = 0; p < pondCount; p++) {
    const cx = Math.floor(Math.abs(noise2D(seed + p, 0, seed + 8)) * (width - 8)) + 4;
    const cy = Math.floor(Math.abs(noise2D(0, seed + p, seed + 9)) * (height - 8)) + 4;
    const radius = 2 + Math.floor(Math.abs(noise2D(cx, cy, seed + p + 10)) * 5);
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const d = Math.sqrt(x * x + y * y);
        const noisy = Math.abs(noise2D(cx + x, cy + y, seed + p + 11)) * 1.5;
        if (d <= radius - noisy) {
          const nx = cx + x, ny = cy + y;
          if (inBounds(nx, ny, width, height)) tiles[ny][nx] = TileType.WATER;
        }
      }
    }
  }

  // 2. Find grass clearings for villages (large 7x7 and smaller 5x5)
  const largeClearings: WorldPoint[] = [];
  const smallClearings: WorldPoint[] = [];
  for (let y = 5; y < height - 5; y++) {
    for (let x = 5; x < width - 5; x++) {
      let large = true;
      for (let dy = -3; dy <= 3 && large; dy++) {
        for (let dx = -3; dx <= 3 && large; dx++) {
          if (tiles[y + dy][x + dx] !== TileType.GRASS) large = false;
        }
      }
      if (large) largeClearings.push({ tx: x, ty: y });
      else {
        let small = true;
        for (let dy = -2; dy <= 2 && small; dy++) {
          for (let dx = -2; dx <= 2 && small; dx++) {
            if (tiles[y + dy][x + dx] !== TileType.GRASS) small = false;
          }
        }
        if (small) smallClearings.push({ tx: x, ty: y });
      }
    }
  }
  const shuffledClearings = shuffle([...largeClearings, ...smallClearings], seed + 30);

  // 3. Place organic villages: a cluster of houses around a central square
  const villages: WorldPoint[] = [];
  const villageCenters: WorldPoint[] = [];
  let clearingIdx = 0;
  while (villageCenters.length < villageCount && clearingIdx < shuffledClearings.length) {
    const center = shuffledClearings[clearingIdx++];
    if (villageCenters.some(v => distanceSq(v, center) < 400)) continue;

    villageCenters.push(center);
    // central village square / road
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = center.tx + dx, ny = center.ty + dy;
        if (inBounds(nx, ny, width, height)) tiles[ny][nx] = TileType.ROAD;
      }
    }
    // 2-5 houses around the square
    const houseCount = 2 + Math.floor(Math.abs(noise2D(center.tx, center.ty, seed + 60)) * 4);
    const dirs: Array<[number, number]> = [[-2,-2],[-2,0],[-2,2],[0,-2],[0,2],[2,-2],[2,0],[2,2]];
    const shuffledDirs = shuffle([...dirs], seed + center.tx + center.ty);
    for (let h = 0; h < Math.min(houseCount, shuffledDirs.length); h++) {
      const [dx, dy] = shuffledDirs[h];
      const hx = center.tx + dx;
      const hy = center.ty + dy;
      if (!inBounds(hx, hy, width, height)) continue;
      // house footprint + small yard
      for (let hyOff = -1; hyOff <= 1; hyOff++) {
        for (let hxOff = -1; hxOff <= 1; hxOff++) {
          const nx = hx + hxOff, ny = hy + hyOff;
          if (inBounds(nx, ny, width, height)) {
            tiles[ny][nx] = (hxOff === 0 && hyOff === 0) ? TileType.VILLAGE : TileType.ROAD;
          }
        }
      }
      villages.push({ tx: hx, ty: hy });
      floorVariant[hy][hx] = Math.floor(Math.abs(noise2D(hx, hy, seed + 70)) * 4);
      // connect house to square with road
      for (let cx = Math.min(hx, center.tx); cx <= Math.max(hx, center.tx); cx++) {
        if (inBounds(cx, center.ty, width, height) && tiles[center.ty][cx] !== TileType.VILLAGE) tiles[center.ty][cx] = TileType.ROAD;
      }
      for (let cy = Math.min(hy, center.ty); cy <= Math.max(hy, center.ty); cy++) {
        if (inBounds(hx, cy, width, height) && tiles[cy][hx] !== TileType.VILLAGE) tiles[cy][hx] = TileType.ROAD;
      }
    }
  }

  // 4. Place dungeon entrances in remote forest edges or quiet clearings
  const entrances: WorldPoint[] = [];
  const entranceCandidates = shuffle(
    shuffledClearings.filter(p => tiles[p.ty][p.tx] === TileType.GRASS || tiles[p.ty][p.tx] === TileType.FOREST),
    seed + 40,
  );
  for (const p of entranceCandidates) {
    if (entrances.length >= dungeonEntranceCount) break;
    if (villageCenters.some(v => distanceSq(v, p) < 400)) continue;
    if (entrances.some(e => distanceSq(e, p) < 400)) continue;
    if (p.tx < 5 || p.tx >= width - 5 || p.ty < 5 || p.ty >= height - 5) continue;

    // Ensure it is reachable from a grass/road/village neighbor
    let neighborReachable = false;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const t = tiles[p.ty + dy][p.tx + dx];
      if (t === TileType.GRASS || t === TileType.ROAD || t === TileType.VILLAGE) {
        neighborReachable = true;
        break;
      }
    }
    if (!neighborReachable) continue;

    tiles[p.ty][p.tx] = TileType.DUNGEON_ENTRANCE;
    entrances.push(p);
  }
  // Fallback: if clearings didn't yield enough, sample any interior grass/forest tile
  let fallbackScan = 0;
  while (entrances.length < dungeonEntranceCount && fallbackScan < 1000) {
    fallbackScan++;
    const x = Math.floor(Math.abs(noise2D(seed, fallbackScan, seed + 130)) * (width - 10)) + 5;
    const y = Math.floor(Math.abs(noise2D(fallbackScan, seed, seed + 131)) * (height - 10)) + 5;
    if (tiles[y][x] !== TileType.GRASS && tiles[y][x] !== TileType.FOREST) continue;
    if (villageCenters.some(v => distanceSq(v, { tx: x, ty: y }) < 225)) continue;
    if (entrances.some(e => distanceSq(e, { tx: x, ty: y }) < 225)) continue;
    let neighborReachable = false;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const t = tiles[y + dy][x + dx];
      if (t === TileType.GRASS || t === TileType.ROAD || t === TileType.VILLAGE) {
        neighborReachable = true;
        break;
      }
    }
    if (!neighborReachable) continue;
    tiles[y][x] = TileType.DUNGEON_ENTRANCE;
    entrances.push({ tx: x, ty: y });
  }

  // 5. Build roads: connect every village and entrance to the nearest POI
  const roadTargets = [...villageCenters, ...entrances];
  for (const start of roadTargets) {
    // connect to nearest other POI
    let nearest: WorldPoint | null = null;
    let bestDist = Infinity;
    for (const target of roadTargets) {
      if (target === start) continue;
      const d = distanceSq(start, target);
      if (d < bestDist) { bestDist = d; nearest = target; }
    }
    if (!nearest) continue;
    let cx = start.tx, cy = start.ty;
    let steps = 0;
    const maxSteps = (Math.abs(nearest.tx - start.tx) + Math.abs(nearest.ty - start.ty)) * 3 + 60;
    while ((cx !== nearest.tx || cy !== nearest.ty) && steps < maxSteps) {
      const dx = Math.sign(nearest.tx - cx);
      const dy = Math.sign(nearest.ty - cy);
      const nudge = noise2D(cx, cy, seed + 50);
      if (dx !== 0 && dy !== 0) {
        if (Math.abs(nudge) < 0.55) cx += dx; else cy += dy;
      } else if (dx !== 0) {
        cx += dx;
      } else if (dy !== 0) {
        cy += dy;
      }
      if (inBounds(cx, cy, width, height)) {
        if (tiles[cy][cx] === TileType.GRASS || tiles[cy][cx] === TileType.FOREST) tiles[cy][cx] = TileType.ROAD;
      }
      steps++;
    }
  }

  // 6. Connectivity guard: build bridges over water so every entrance is reachable
  const reachableFrom = (sx: number, sy: number): Set<string> => {
    const seen = new Set<string>();
    const q: WorldPoint[] = [{ tx: sx, ty: sy }];
    seen.add(posKey(sx, sy));
    while (q.length) {
      const { tx, ty } = q.shift()!;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = tx + dx, ny = ty + dy;
        if (inBounds(nx, ny, width, height) && !seen.has(posKey(nx, ny)) && isWalkable(tiles[ny][nx])) {
          seen.add(posKey(nx, ny));
          q.push({ tx: nx, ty: ny });
        }
      }
    }
    return seen;
  };
  const findPath = (sx: number, sy: number, tx: number, ty: number): WorldPoint[] | null => {
    const seen = new Set<string>();
    const q: { p: WorldPoint; path: WorldPoint[] }[] = [{ p: { tx: sx, ty: sy }, path: [{ tx: sx, ty: sy }] }];
    seen.add(posKey(sx, sy));
    while (q.length) {
      const { p, path } = q.shift()!;
      if (p.tx === tx && p.ty === ty) return path;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = p.tx + dx, ny = p.ty + dy;
        if (
          inBounds(nx, ny, width, height) &&
          !seen.has(posKey(nx, ny)) &&
          (isWalkable(tiles[ny][nx]) || tiles[ny][nx] === TileType.WATER)
        ) {
          seen.add(posKey(nx, ny));
          q.push({ p: { tx: nx, ty: ny }, path: [...path, { tx: nx, ty: ny }] });
        }
      }
    }
    return null;
  };
  const startX = villageCenters.length > 0 ? villageCenters[0].tx : Math.floor(width / 2);
  const startY = villageCenters.length > 0 ? villageCenters[0].ty : Math.floor(height / 2);
  let reachableSet = reachableFrom(startX, startY);
  // All village centers, every placed house tile, and every dungeon entrance must be reachable.
  const allPois = [...villageCenters, ...villages, ...entrances];
  for (const poi of allPois) {
    if (!reachableSet.has(posKey(poi.tx, poi.ty))) {
      const path = findPath(startX, startY, poi.tx, poi.ty);
      if (path) {
        for (const p of path) {
          if (tiles[p.ty][p.tx] === TileType.WATER) tiles[p.ty][p.tx] = TileType.BRIDGE;
        }
      }
    }
  }
  // Recompute after all bridges; if any POI still isolated, carve a direct corridor through anything.
  reachableSet = reachableFrom(startX, startY);
  for (const poi of allPois) {
    if (reachableSet.has(posKey(poi.tx, poi.ty))) continue;
    const dx = Math.sign(poi.tx - startX);
    const dy = Math.sign(poi.ty - startY);
    let cx = startX, cy = startY;
    while (cx !== poi.tx || cy !== poi.ty) {
      if (inBounds(cx, cy, width, height) && tiles[cy][cx] === TileType.WATER) tiles[cy][cx] = TileType.BRIDGE;
      else if (inBounds(cx, cy, width, height) && tiles[cy][cx] === TileType.FOREST) tiles[cy][cx] = TileType.ROAD;
      if (cx !== poi.tx) cx += dx;
      else if (cy !== poi.ty) cy += dy;
    }
  }
  reachableSet = reachableFrom(startX, startY);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      reachable[y][x] = reachableSet.has(posKey(x, y));
    }
  }
  // Forest tiles directly adjacent to the walkable network are reachable for spawning,
  // so goblins/spiders can appear in woods near paths while isolated forests stay empty.
  // We expand from a snapshot to avoid cascading through whole forest regions.
  const baseReachable = reachable.map(row => [...row]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === TileType.FOREST && !baseReachable[y][x]) {
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = x + dx, ny = y + dy;
          if (inBounds(nx, ny, width, height) && baseReachable[ny][nx]) {
            reachable[y][x] = true;
            break;
          }
        }
      }
    }
  }

  // 7. Add chests near villages and dungeon entrances
  const chests: { tx: number; ty: number; locked: boolean; roomIndex: number }[] = [];
  const occupied = new Set<string>();
  for (const p of [...villageCenters, ...entrances]) {
    for (let t = 0; t < 16; t++) {
      const dx = Math.floor(noise2D(t + p.tx, p.ty, seed + 60) * 5);
      const dy = Math.floor(noise2D(p.tx, t + p.ty, seed + 61) * 5);
      const cx = p.tx + dx;
      const cy = p.ty + dy;
      const key = `${cx},${cy}`;
      if (inBounds(cx, cy, width, height)) {
        const t = tiles[cy][cx];
        if (
          (t === TileType.GRASS || t === TileType.ROAD || t === TileType.VILLAGE) &&
          reachable[cy][cx] &&
          !occupied.has(key)
        ) {
          occupied.add(key);
          chests.push({ tx: cx, ty: cy, locked: Math.abs(noise2D(cx, cy, seed + 80)) < 0.3, roomIndex: -1 });
          break;
        }
      }
    }
  }

  // 8. Decorations (shrines, blacksmiths, tavern/library markers, ruins and entrance torches)
  const decorations: { tx: number; ty: number; kind: 'torch' | 'shrine' | 'skull' | 'forge' | 'bookshelf' | 'altar' }[] = [];
  const torches: WorldPoint[] = [];
  for (const v of villageCenters) {
    const civic: Array<'shrine' | 'forge' | 'bookshelf' | 'altar'> = ['shrine', 'forge', 'bookshelf', 'altar'];
    for (let i = 0; i < civic.length; i++) {
      const px = v.tx + (i % 2 === 0 ? -2 : 2);
      const py = v.ty + (i < 2 ? -2 : 2);
      if (inBounds(px, py, width, height) && reachable[py][px]) {
        decorations.push({ tx: px, ty: py, kind: civic[i] });
      }
    }
  }
  for (const e of entrances) {
    torches.push({ tx: e.tx - 1, ty: e.ty });
    torches.push({ tx: e.tx + 1, ty: e.ty });
    if (inBounds(e.tx, e.ty + 1, width, height)) decorations.push({ tx: e.tx, ty: e.ty + 1, kind: 'skull' });
  }

  // 9. Mark the start area as explored
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      const nx = startX + dx, ny = startY + dy;
      if (inBounds(nx, ny, width, height)) explored[ny][nx] = true;
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
    reachable,
    rooms: [],
    startX,
    startY,
    chests,
    decorations,
    torches,
  };
}
