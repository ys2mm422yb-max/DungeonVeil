// Rumble Heroes style 32×32 hand-painted pixel-art overworld sprites.
// Authored at 32×32 but rendered at the tile size for sharp detail.

import { SpriteData } from './sprites';

export type PixelGrid = number[][];

const EMPTY = 0;

export function grid(w: number, h: number, fill = EMPTY): PixelGrid {
  return Array.from({ length: h }, () => new Array(w).fill(fill));
}

export function paletteSprite(frames: PixelGrid[], palette: string[]): SpriteData {
  return { frames: frames.map(f => f), palette: ['', ...palette] };
}

export function rect(g: PixelGrid, x: number, y: number, w: number, h: number, color: number): void {
  for (let r = y; r < y + h; r++) {
    for (let c = x; c < x + w; c++) {
      if (r >= 0 && r < g.length && c >= 0 && c < g[0].length) {
        g[r][c] = color;
      }
    }
  }
}

export function circle(g: PixelGrid, cx: number, cy: number, r: number, color: number): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r + 0.5) {
          g[y][x] = color;
        }
      }
    }
  }
}

export function softCircle(g: PixelGrid, cx: number, cy: number, r: number, colors: number[]): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) {
        const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (d <= r) {
          const idx = Math.floor((d / r) * (colors.length - 1));
          g[y][x] = colors[Math.min(idx, colors.length - 1)];
        }
      }
    }
  }
}

export function seededNoise(g: PixelGrid, seed: number, colors: number[], scale = 0.25): void {
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      const n = Math.abs((Math.sin(x * scale + seed) * Math.cos(y * scale + seed * 1.7)));
      g[y][x] = colors[Math.floor(n * colors.length) % colors.length];
    }
  }
}

export function blendNoise(g: PixelGrid, base: number, seed: number, chance: number, accent: number): void {
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      if (g[y][x] === base && Math.abs(noise2D(x, y, seed)) < chance) {
        g[y][x] = accent;
      }
    }
  }
}

export function drawBlob(g: PixelGrid, cx: number, cy: number, rx: number, ry: number, color: number, seed = 0): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= 1) {
          const ripple = Math.sin(x * 0.5 + seed) * Math.cos(y * 0.5 + seed) * 0.08;
          if (d + ripple <= 1) g[y][x] = color;
        }
      }
    }
  }
}

export function drawLeafCluster(g: PixelGrid, cx: number, cy: number, r: number, color: number, darkColor: number, seed: number): void {
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + seed;
    const dist = r * (0.4 + Math.abs(noise2D(i, seed, seed)) * 0.6);
    const lx = cx + Math.cos(angle) * dist;
    const ly = cy + Math.sin(angle) * dist * 0.7;
    const lr = r * (0.35 + Math.abs(noise2D(seed, i, seed)) * 0.3);
    softCircle(g, lx, ly, lr, [color, darkColor, color]);
  }
}

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

// ───────────────────────────────────────────────────────────────────────────────
// GRASS TILES
// ───────────────────────────────────────────────────────────────────────────────

const GRASS_PALETTE = ['#3a7a2e', '#4a8c3a', '#5a9e46', '#6ab052', '#7bc460', '#2e6a24', '#8fd070', '#a0e080', '#367a28'];
const FLOWER_PALETTE = ['#ff6b6b', '#ffd93d', '#ff9ff3', '#54a0ff', '#5f27cd'];

function makeGrassBase(seed: number): PixelGrid {
  const g = grid(32, 32);
  seededNoise(g, seed, [1, 2, 3, 4, 5], 0.32);
  blendNoise(g, 2, seed + 1, 0.18, 6);
  blendNoise(g, 3, seed + 2, 0.12, 7);
  blendNoise(g, 4, seed + 3, 0.08, 8);
  return g;
}

export const SPRITE_RH_GRASS: SpriteData[] = [];
for (let v = 0; v < 8; v++) {
  SPRITE_RH_GRASS.push(paletteSprite([makeGrassBase(v * 13.7)], GRASS_PALETTE));
}

export const SPRITE_RH_GRASS_FLOWERS: SpriteData[] = [];
for (let v = 0; v < 4; v++) {
  const g = makeGrassBase(v * 19.3);
  const flowerCount = 3 + Math.floor(Math.abs(noise2D(v, v, v)) * 5);
  for (let i = 0; i < flowerCount; i++) {
    const fx = Math.floor(Math.abs(noise2D(i, seedNoise(i, v), v)) * 28 + 2);
    const fy = Math.floor(Math.abs(noise2D(v, i, seedNoise(i, v))) * 28 + 2);
    const color = 10 + Math.floor(Math.abs(noise2D(i, v, v)) * 5);
    g[fy][fx] = color;
    if (fy > 0) g[fy - 1][fx] = color;
    if (fx > 0) g[fy][fx - 1] = color;
    if (fx < 31) g[fy][fx + 1] = color;
  }
  SPRITE_RH_GRASS_FLOWERS.push(paletteSprite([g], [...GRASS_PALETTE, ...FLOWER_PALETTE]));
}
function seedNoise(a: number, b: number): number { return a * 13.7 + b * 19.3; }

export const SPRITE_RH_BUSH: SpriteData = (() => {
  const g = makeGrassBase(44.1);
  drawBlob(g, 16, 19, 10, 7, 3, 44.1);
  drawBlob(g, 12, 22, 7, 5, 2, 44.2);
  drawBlob(g, 22, 22, 7, 5, 2, 44.3);
  drawBlob(g, 16, 24, 5, 4, 6, 44.4);
  return paletteSprite([g], GRASS_PALETTE);
})();

export const SPRITE_RH_ROCK_SMALL: SpriteData = (() => {
  const g = makeGrassBase(55.2);
  const rockPalette = ['#7a8a7a', '#8a9a8a', '#9aaaaa', '#6a7a6a', '#aababa', '#5a6a5a'];
  const rg = grid(32, 32);
  drawBlob(rg, 16, 18, 10, 7, 1, 55.2);
  drawBlob(rg, 12, 15, 6, 5, 2, 55.3);
  drawBlob(rg, 20, 19, 5, 4, 3, 55.4);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (rg[y][x] !== EMPTY) g[y][x] = rg[y][x] + 7;
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...rockPalette]);
})();

export const SPRITE_RH_STUMP: SpriteData = (() => {
  const g = makeGrassBase(66.3);
  const stumpPalette = ['#5a3a22', '#6a4a2a', '#7a5a32', '#4a2e1a', '#8a6a42'];
  rect(g, 13, 18, 6, 10, 8);
  rect(g, 12, 16, 8, 4, 9);
  rect(g, 14, 17, 4, 1, 10);
  g[18][12] = 11;
  g[18][21] = 11;
  return paletteSprite([g], [...GRASS_PALETTE, ...stumpPalette]);
})();

export const SPRITE_RH_HILL: SpriteData = (() => {
  const g = makeGrassBase(77.4);
  const hillPalette = ['#5a8a4a', '#6a9e5a', '#4a7a3a', '#7ab06a', '#3a6a2a', '#8ac070'];
  const hg = grid(32, 32);
  drawBlob(hg, 16, 24, 17, 9, 1, 77.4);
  drawBlob(hg, 12, 21, 9, 6, 2, 77.5);
  drawBlob(hg, 22, 23, 8, 6, 3, 77.6);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (hg[y][x] !== EMPTY) g[y][x] = hg[y][x] + 6;
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...hillPalette]);
})();

// ───────────────────────────────────────────────────────────────────────────────
// WATER
// ───────────────────────────────────────────────────────────────────────────────

const WATER_PALETTE = ['#1a4a7a', '#2266a0', '#2e80c0', '#3aa0e0', '#4ab8f0', '#103a60', '#6ad0ff'];

export const SPRITE_RH_WATER: SpriteData = (() => {
  const frames: PixelGrid[] = [];
  for (let f = 0; f < 4; f++) {
    const g = grid(32, 32);
    seededNoise(g, f * 10.5, [1, 2, 3, 4, 5, 6], 0.22 + f * 0.03);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const wave = Math.sin((x + y) * 0.5 + f * 1.5) * 0.5 + 0.5;
        if (wave > 0.7 && g[y][x] < 4) g[y][x] = 5;
        else if (wave < 0.3 && g[y][x] > 1) g[y][x] = 1;
      }
    }
    frames.push(g);
  }
  return paletteSprite(frames, WATER_PALETTE);
})();

// Water edge with grass bank
export const SPRITE_RH_WATER_EDGE: SpriteData = (() => {
  const g = makeGrassBase(111.1);
  const wg = grid(32, 32);
  for (let y = 18; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const d = (y - 18) / 14;
      const n = Math.abs(noise2D(x, y, 111.2));
      if (d + n * 0.25 > 0.45) wg[y][x] = 1;
    }
  }
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (wg[y][x] !== EMPTY) g[y][x] = wg[y][x] + 7;
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...WATER_PALETTE]);
})();

// ───────────────────────────────────────────────────────────────────────────────
// ROAD
// ───────────────────────────────────────────────────────────────────────────────

const ROAD_PALETTE = ['#6a5a42', '#7d6b4e', '#8f7d5a', '#a08e68', '#5c4e38', '#b29e72', '#4a3e2e', '#c2b082'];

export const SPRITE_RH_ROAD: SpriteData = (() => {
  const g = grid(32, 32);
  seededNoise(g, 88.5, [1, 2, 3, 4, 5], 0.3);
  blendNoise(g, 2, 88.6, 0.15, 4);
  blendNoise(g, 3, 88.7, 0.1, 6);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const edge = Math.min(x, 31 - x, y, 31 - y);
      if (edge < 2 && Math.abs(noise2D(x, y, 88.8)) < 0.4) g[y][x] = 7;
    }
  }
  return paletteSprite([g], ROAD_PALETTE);
})();

export const SPRITE_RH_ROAD_OVERGRASS: SpriteData = (() => {
  const g = makeGrassBase(99.1);
  const rg = grid(32, 32);
  seededNoise(rg, 99.2, [1, 2, 3, 4], 0.25);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (rg[y][x] !== EMPTY) g[y][x] = rg[y][x] + 6;
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...ROAD_PALETTE]);
})();

// ───────────────────────────────────────────────────────────────────────────────
// FOREST / BIG TREES
// ───────────────────────────────────────────────────────────────────────────────

const TREE_PALETTE = ['#2a5a1a', '#3a7a24', '#4a9a32', '#5aba40', '#6ad050', '#1a3a10', '#5a3a22', '#7a5a3a', '#8b6a4a', '#8ad060', '#3a8a28'];

export const SPRITE_RH_TREE: SpriteData = (() => {
  const g = grid(32, 32);
  rect(g, 14, 22, 4, 9, 7);
  rect(g, 13, 20, 6, 5, 6);
  g[30][12] = 8; g[30][13] = 8; g[30][18] = 8; g[30][19] = 8;
  rect(g, 8, 29, 16, 2, 9);
  drawBlob(g, 16, 14, 13, 10, 3, 101.1);
  drawBlob(g, 12, 18, 10, 8, 2, 101.2);
  drawBlob(g, 22, 18, 10, 8, 2, 101.3);
  drawBlob(g, 16, 9, 11, 9, 4, 101.4);
  drawBlob(g, 10, 12, 9, 8, 1, 101.5);
  drawBlob(g, 24, 12, 9, 8, 1, 101.6);
  drawBlob(g, 14, 10, 5, 4, 5, 101.7);
  drawBlob(g, 20, 14, 4, 3, 5, 101.8);
  drawBlob(g, 18, 10, 3, 2, 10, 101.9);
  return paletteSprite([g], TREE_PALETTE);
})();

export const SPRITE_RH_TREE_PINE: SpriteData = (() => {
  const g = grid(32, 32);
  rect(g, 15, 22, 2, 8, 7);
  rect(g, 9, 29, 14, 2, 9);
  drawBlob(g, 16, 22, 7, 4, 2, 102.1);
  drawBlob(g, 16, 17, 9, 5, 3, 102.2);
  drawBlob(g, 16, 12, 8, 5, 4, 102.3);
  drawBlob(g, 16, 8, 6, 4, 5, 102.4);
  return paletteSprite([g], TREE_PALETTE);
})();

// ───────────────────────────────────────────────────────────────────────────────
// VILLAGE / HOUSES
// ───────────────────────────────────────────────────────────────────────────────

const HOUSE_PALETTE = ['#7a5a3a', '#8f6d4a', '#a0805a', '#c0a070', '#5a3a22', '#8b5a3a', '#663322', '#442211', '#d0c0a0', '#9a7a5a', '#b09070'];

function makeHouse(seed: number): PixelGrid {
  const g = grid(32, 32);
  // wall
  rect(g, 5, 14, 22, 17, 1 + Math.floor(Math.abs(noise2D(seed, 1, seed)) * 2));
  rect(g, 5, 14, 22, 2, 5);
  // door
  rect(g, 14, 22, 4, 9, 6);
  rect(g, 14, 22, 4, 1, 7);
  // windows
  rect(g, 8, 17, 4, 4, 9);
  rect(g, 20, 17, 4, 4, 9);
  rect(g, 9, 18, 2, 2, 8);
  rect(g, 21, 18, 2, 2, 8);
  // roof
  drawBlob(g, 16, 12, 14, 7, 5, 103.1 + seed);
  drawBlob(g, 16, 13, 12, 6, 7, 103.2 + seed);
  // chimney
  if (Math.abs(noise2D(seed, 2, seed)) < 0.6) {
    rect(g, 22, 5, 3, 8, 5);
  }
  return g;
}

export const SPRITE_RH_HOUSE_VARIANTS: SpriteData[] = [];
for (let v = 0; v < 4; v++) {
  SPRITE_RH_HOUSE_VARIANTS.push(paletteSprite([makeHouse(v * 17.3)], HOUSE_PALETTE));
}

export const SPRITE_RH_HOUSE: SpriteData = SPRITE_RH_HOUSE_VARIANTS[0];

export const SPRITE_RH_WELL: SpriteData = (() => {
  const g = makeGrassBase(112.1);
  const stonePalette = ['#6a6a6a', '#7a7a7a', '#8a8a8a', '#5a5a5a', '#9a9a9a'];
  const sg = grid(32, 32);
  drawBlob(sg, 16, 20, 6, 5, 1, 112.2);
  drawBlob(sg, 16, 14, 5, 3, 2, 112.3);
  rect(sg, 14, 10, 4, 1, 3);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (sg[y][x] !== EMPTY) g[y][x] = sg[y][x] + 7;
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...stonePalette]);
})();

export const SPRITE_RH_FENCE: SpriteData = (() => {
  const g = makeGrassBase(113.1);
  const woodPalette = ['#7a5a3a', '#8b6a4a', '#6a4a2a', '#5a3a22'];
  for (let x = 0; x < 32; x++) {
    if (x % 6 === 0) for (let y = 22; y < 30; y++) g[y][x] = 1;
    else for (let y = 24; y < 27; y++) g[y][x] = 2;
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...woodPalette]);
})();

export const SPRITE_RH_CART: SpriteData = (() => {
  const g = makeGrassBase(114.1);
  const woodPalette = ['#7a5a3a', '#8b6a4a', '#6a4a2a', '#5a3a22', '#9a7a5a'];
  rect(g, 8, 18, 16, 8, 1); // cart body
  rect(g, 10, 24, 3, 4, 2); // wheel
  rect(g, 19, 24, 3, 4, 2); // wheel
  rect(g, 8, 16, 16, 2, 3); // load
  return paletteSprite([g], [...GRASS_PALETTE, ...woodPalette]);
})();

// ───────────────────────────────────────────────────────────────────────────────
// DUNGEON ENTRANCE
// ───────────────────────────────────────────────────────────────────────────────

const DUNGEON_PALETTE = ['#2a2a2a', '#3a3a3a', '#4a4a4a', '#5a5a5a', '#6a6a6a', '#1a1a1a', '#7a6a9a', '#9a8ac0'];

export const SPRITE_RH_DUNGEON_ENTRANCE: SpriteData = (() => {
  const g = grid(32, 32);
  drawBlob(g, 16, 18, 14, 13, 2, 104.1);
  drawBlob(g, 16, 18, 12, 11, 3, 104.2);
  drawBlob(g, 16, 20, 7, 8, 6, 104.3);
  rect(g, 7, 28, 18, 2, 4);
  rect(g, 9, 26, 14, 2, 5);
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(Math.abs(noise2D(i, 104, 104)) * 28 + 2);
    const y = Math.floor(Math.abs(noise2D(104, i, 104)) * 20 + 8);
    if (g[y][x] !== EMPTY && g[y][x] !== 6) g[y][x] = 7;
  }
  return paletteSprite([g], DUNGEON_PALETTE);
})();

// ───────────────────────────────────────────────────────────────────────────────
// SMALL DECORATIONS (drawn as overlays on top of base tiles)
// ───────────────────────────────────────────────────────────────────────────────

const DECO_GRASS = ['#3a7a2e', '#4a8c3a', '#5a9e46'];

export const SPRITE_RH_FLOWER_RED: SpriteData = (() => {
  const g = grid(16, 16);
  g[12][8] = 1; g[11][7] = 2; g[11][9] = 2; g[10][8] = 2; g[11][8] = 2;
  g[13][8] = 3; g[14][8] = 3;
  return paletteSprite([g], ['', '#4a8c3a', '#ff4a4a', '#2e5a24']);
})();

export const SPRITE_RH_FLOWER_YELLOW: SpriteData = (() => {
  const g = grid(16, 16);
  g[12][8] = 1; g[11][7] = 2; g[11][9] = 2; g[10][8] = 2; g[12][7] = 2; g[12][9] = 2;
  g[13][8] = 3; g[14][8] = 3;
  return paletteSprite([g], ['', '#4a8c3a', '#ffd93d', '#2e5a24']);
})();

export const SPRITE_RH_GRASS_TUFT: SpriteData = (() => {
  const g = grid(16, 16);
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(Math.abs(noise2D(i, 115, 115)) * 14 + 1);
    const y = Math.floor(Math.abs(noise2D(115, i, 115)) * 8 + 6);
    g[y][x] = 1 + Math.floor(Math.abs(noise2D(i, i, 115)) * 3);
  }
  return paletteSprite([g], ['', ...DECO_GRASS]);
})();
