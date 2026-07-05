import { DungeonMap, TileType } from './dungeon';

/**
 * Procedural open-world generator for the overworld.
 *
 * Replaces the room-crawler dungeon with a large continuous biome map:
 * meadows, forests, rivers, roads, villages and dungeon entrances.
 * Dungeons are generated separately when the player enters an entrance.
 */

export interface WorldPoint {
  tx: number;
  ty: number;
}

export interface WorldGenConfig {
  width: number;
  height: number;
  seed?: number;
  villageCount?: number;
  dungeonEntranceCount?: number;
}

const DEFAULT_CONFIG: Required<WorldGenConfig> = {
  width: 96,
  height: 96,
  seed: 0,
  villageCount: 4,
  dungeonEntranceCount: 5,
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

/**
 * Generate a large connected overworld map.
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

  const scale = 0.05;

  // 1. Biome base pass (water, grass, forest)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = fbm(x * scale, y * scale, seed, 5);
      const h = n * 0.5 + 0.5;

      if (h < 0.32) {
        tiles[y][x] = TileType.WATER;
      } else if (h > 0.72) {
        tiles[y][x] = TileType.FOREST;
      } else {
        tiles[y][x] = TileType.GRASS;
      }

      // grass variation for visual diversity
      if (tiles[y][x] === TileType.GRASS) {
        floorVariant[y][x] = Math.abs(noise2D(x * 0.2, y * 0.2, seed + 10)) < 0.33 ? 1 : 0;
      }
      // forest edge hint
      if (tiles[y][x] === TileType.FOREST) {
        wallVariant[y][x] = Math.abs(noise2D(x * 0.3, y * 0.3, seed + 20)) < 0.5 ? 1 : 0;
      }
    }
  }

  // 2. Build a list of candidate clearings (grass cells away from water)
  const candidates: WorldPoint[] = [];
  for (let y = 4; y < height - 4; y++) {
    for (let x = 4; x < width - 4; x++) {
      let ok = true;
      for (let dy = -2; dy <= 2 && ok; dy++) {
        for (let dx = -2; dx <= 2 && ok; dx++) {
          if (tiles[y + dy][x + dx] !== TileType.GRASS) ok = false;
        }
      }
      if (ok) candidates.push({ tx: x, ty: y });
    }
  }
  const shuffled = shuffle(candidates, seed + 30);

  // 3. Place villages
  const villages: WorldPoint[] = [];
  for (let i = 0; i < Math.min(villageCount, shuffled.length); i++) {
    const p = shuffled[i];
    if (villages.some(v => distanceSq(v, p) < 225)) continue;

    villages.push(p);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = p.tx + dx;
        const ny = p.ty + dy;
        if (dx === 0 && dy === 0) {
          tiles[ny][nx] = TileType.VILLAGE;
          floorVariant[ny][nx] = 1;
        } else if (Math.abs(dx) + Math.abs(dy) <= 2) {
          tiles[ny][nx] = TileType.VILLAGE;
          floorVariant[ny][nx] = 0;
        }
      }
    }
  }

  // 4. Place dungeon entrances in forest edges or remote grass
  const entrances: WorldPoint[] = [];
  const entranceCandidates = shuffle(
    candidates.filter(p => tiles[p.ty][p.tx] === TileType.GRASS || tiles[p.ty][p.tx] === TileType.FOREST),
    seed + 40,
  );
  for (const p of entranceCandidates) {
    if (entrances.length >= dungeonEntranceCount) break;
    if (villages.some(v => distanceSq(v, p) < 400)) continue;
    if (entrances.some(e => distanceSq(e, p) < 400)) continue;
    if (p.tx < 5 || p.tx >= width - 5 || p.ty < 5 || p.ty >= height - 5) continue;

    // Ensure it is reachable (grass/road/village neighbor)
    let reachable = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const t = tiles[p.ty + dy][p.tx + dx];
      if (t === TileType.GRASS || t === TileType.ROAD || t === TileType.VILLAGE) {
        reachable = true;
        break;
      }
    }
    if (!reachable) continue;

    tiles[p.ty][p.tx] = TileType.DUNGEON_ENTRANCE;
    entrances.push(p);
  }

  // 5. Roads: connect villages to nearest village/entrance with drunken walk
  const roadTargets = [...villages, ...entrances];
  for (let i = 0; i < roadTargets.length; i++) {
    const start = roadTargets[i];
    const target = roadTargets[(i + 1) % roadTargets.length];
    let cx = start.tx;
    let cy = start.ty;
    let steps = 0;
    const maxSteps = (Math.abs(target.tx - start.tx) + Math.abs(target.ty - start.ty)) * 2 + 40;
    while ((cx !== target.tx || cy !== target.ty) && steps < maxSteps) {
      const dx = Math.sign(target.tx - cx);
      const dy = Math.sign(target.ty - cy);
      if (dx !== 0 && dy !== 0) {
        if (Math.abs(noise2D(cx, cy, seed + 50)) < 0.5) {
          cx += dx;
        } else {
          cy += dy;
        }
      } else if (dx !== 0) {
        cx += dx;
      } else if (dy !== 0) {
        cy += dy;
      }
      if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
        if (tiles[cy][cx] === TileType.GRASS || tiles[cy][cx] === TileType.FOREST) {
          tiles[cy][cx] = TileType.ROAD;
        }
      }
      steps++;
    }
  }

  // 6. Add a few chests near villages/entrances
  const chests: { tx: number; ty: number; locked: boolean; roomIndex: number }[] = [];
  const occupied = new Set<string>();
  for (const p of [...villages, ...entrances]) {
    for (let t = 0; t < 12; t++) {
      const dx = Math.floor(noise2D(t + p.tx, p.ty, seed + 60) * 4);
      const dy = Math.floor(noise2D(p.tx, t + p.ty, seed + 61) * 4);
      const cx = p.tx + dx;
      const cy = p.ty + dy;
      const key = `${cx},${cy}`;
      if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
        const t = tiles[cy][cx];
        if (
          (t === TileType.GRASS || t === TileType.ROAD || t === TileType.VILLAGE) &&
          !occupied.has(key)
        ) {
          occupied.add(key);
          chests.push({ tx: cx, ty: cy, locked: Math.random() < 0.3, roomIndex: -1 });
          break;
        }
      }
    }
  }

  // 7. Decorations (shrines/altars in villages, skulls in forests, torches at villages)
  const decorations: { tx: number; ty: number; kind: 'torch' | 'shrine' | 'skull' | 'forge' | 'bookshelf' | 'altar' }[] = [];
  const torches: WorldPoint[] = [];
  for (const v of villages) {
    if (Math.random() < 0.5) {
      decorations.push({ tx: v.tx - 1, ty: v.ty - 1, kind: 'shrine' });
    }
    torches.push({ tx: v.tx - 1, ty: v.ty });
    torches.push({ tx: v.tx + 1, ty: v.ty });
  }
  for (const e of entrances) {
    torches.push({ tx: e.tx - 1, ty: e.ty });
    torches.push({ tx: e.tx + 1, ty: e.ty });
  }

  // 8. Start position: first village centre, or a grass clearing if no villages
  const startX = villages.length > 0 ? villages[0].tx : Math.floor(width / 2);
  const startY = villages.length > 0 ? villages[0].ty : Math.floor(height / 2);

  // Mark the area around the start as explored so the player sees something immediately
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const nx = startX + dx;
      const ny = startY + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        explored[ny][nx] = true;
      }
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
    rooms: [],
    startX,
    startY,
    chests,
    decorations,
    torches,
  };
}
