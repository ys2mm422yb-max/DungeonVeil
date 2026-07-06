import { SpriteData } from './sprites';

export type PixelGrid = number[][];

const EMPTY = 0;
const W = 32;
const H = 32;

export function grid(w: number, h: number, fill = EMPTY): PixelGrid {
  return Array.from({ length: h }, () => new Array(w).fill(fill));
}

export function paletteSprite(frames: PixelGrid[], palette: string[]): SpriteData {
  return { frames: frames.map(f => f), palette: ['', ...palette] };
}

export function rect(g: PixelGrid, x: number, y: number, w: number, h: number, color: number): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (yy >= 0 && yy < g.length && xx >= 0 && xx < g[0].length) g[yy][xx] = color;
    }
  }
}

export function circle(g: PixelGrid, cx: number, cy: number, r: number, color: number): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) continue;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5) g[y][x] = color;
    }
  }
}

export function softCircle(g: PixelGrid, cx: number, cy: number, r: number, colors: number[]): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) continue;
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d <= r) g[y][x] = colors[Math.min(colors.length - 1, Math.floor((d / r) * colors.length))];
    }
  }
}

export function seededNoise(g: PixelGrid, seed: number, colors: number[], scale = 0.25): void {
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      const n = Math.abs(Math.sin(x * scale + seed) * Math.cos(y * scale + seed * 1.73));
      g[y][x] = colors[Math.floor(n * colors.length) % colors.length];
    }
  }
}

export function blendNoise(g: PixelGrid, base: number, seed: number, chance: number, accent: number): void {
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      if (g[y][x] === base && Math.abs(noise2D(x * 0.45, y * 0.45, seed)) < chance) g[y][x] = accent;
    }
  }
}

export function drawBlob(g: PixelGrid, cx: number, cy: number, rx: number, ry: number, color: number, seed = 0): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) continue;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const edge = Math.sin(x * 0.37 + seed) * Math.cos(y * 0.31 + seed) * 0.14;
      if (Math.sqrt(dx * dx + dy * dy) + edge <= 1) g[y][x] = color;
    }
  }
}

export function drawLeafCluster(g: PixelGrid, cx: number, cy: number, r: number, color: number, darkColor: number, seed: number): void {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + seed;
    const dist = r * (0.28 + Math.abs(noise2D(i, seed, seed)) * 0.58);
    softCircle(g, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.62, r * 0.32, [color, color, darkColor]);
  }
}

function noise2D(nx: number, ny: number, seed: number): number {
  const x = Math.floor(nx);
  const y = Math.floor(ny);
  const fx = nx - x;
  const fy = ny - y;
  const hash = (hx: number, hy: number): number => {
    let h = ((hx * 374761393 + hy * 668265263 + seed * 1442695041) & 0x7fffffff);
    h = ((h ^ (h >>> 13)) * 1274126177) & 0x7fffffff;
    return ((h ^ (h >>> 16)) / 0x7fffffff) * 2 - 1;
  };
  const a = hash(x, y);
  const b = hash(x + 1, y);
  const c = hash(x, y + 1);
  const d = hash(x + 1, y + 1);
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const GRASS_PALETTE = ['#244a1b', '#2f6024', '#3b732d', '#478537', '#569742', '#6eb458', '#183714', '#29581f', '#76c263', '#98d87a', '#d6ec9c', '#fff1a5', '#f77272', '#d957ff', '#6bd7ff'];
const WATER_PALETTE = ['#0b2636', '#0d3c59', '#145777', '#1a6f90', '#2391ad', '#48bdd1', '#83e8ef', '#061f2e', '#d8ffff'];
const ROAD_PALETTE = ['#5b442e', '#71583a', '#866d45', '#9b8053', '#b09361', '#c8ad76', '#453322', '#d8c08b'];
const WOOD_PALETTE = ['#3b2113', '#5b341d', '#764b2a', '#976a3c', '#bd8b54', '#dfb873', '#21140d'];
const STONE_PALETTE = ['#333838', '#4d5652', '#69756e', '#87928a', '#a9b4aa', '#222726', '#5a6f5a', '#8aa35f'];
const TREE_PALETTE = ['#0c240d', '#173e15', '#245f1f', '#327d2d', '#43a03b', '#67c057', '#90df73', '#5b341e', '#7e5530', '#a07747', '#d9f08b', '#0a1809'];
const FLOWER_PALETTE = ['#2f6824', '#5faf4d', '#fff6a1', '#ff7a7a', '#d65cff', '#7bdcff', '#ffffff'];

function makeGrassBase(seed: number): PixelGrid {
  const g = grid(W, H);
  seededNoise(g, seed, [1, 2, 2, 3, 3, 4, 7], 0.16);
  blendNoise(g, 2, seed + 1, 0.14, 5);
  blendNoise(g, 3, seed + 2, 0.1, 8);
  blendNoise(g, 4, seed + 3, 0.06, 9);
  blendNoise(g, 1, seed + 4, 0.09, 6);
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(Math.abs(noise2D(i * 0.7, seed, seed)) * 28 + 2);
    const y = Math.floor(Math.abs(noise2D(seed, i * 0.7, seed)) * 28 + 2);
    g[y][x] = i % 3 === 0 ? 5 : 8;
  }
  return g;
}

export const SPRITE_RH_GRASS: SpriteData[] = Array.from({ length: 10 }, (_, i) => paletteSprite([makeGrassBase(i * 17.31)], GRASS_PALETTE));

export const SPRITE_RH_GRASS_FLOWERS: SpriteData[] = Array.from({ length: 6 }, (_, v) => {
  const g = makeGrassBase(80 + v * 9.7);
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(Math.abs(noise2D(i, v, 17)) * 26 + 3);
    const y = Math.floor(Math.abs(noise2D(v, i, 23)) * 24 + 4);
    const c = 11 + (i % 5);
    g[y][x] = c;
    if (x > 0 && i % 2 === 0) g[y][x - 1] = c;
    if (x < 31 && i % 3 === 0) g[y][x + 1] = c;
    if (y > 0) g[y - 1][x] = c;
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...FLOWER_PALETTE]);
});

export const SPRITE_RH_BUSH: SpriteData = (() => {
  const g = makeGrassBase(42);
  drawBlob(g, 15, 19, 11, 7, 3, 42);
  drawBlob(g, 10, 21, 7, 5, 2, 44);
  drawBlob(g, 21, 21, 8, 5, 4, 46);
  drawBlob(g, 16, 15, 8, 5, 5, 48);
  blendNoise(g, 3, 50, 0.08, 9);
  return paletteSprite([g], GRASS_PALETTE);
})();

export const SPRITE_RH_ROCK_SMALL: SpriteData = (() => {
  const g = makeGrassBase(55);
  drawBlob(g, 16, 19, 10, 7, 16, 55);
  drawBlob(g, 12, 16, 6, 4, 17, 57);
  drawBlob(g, 21, 20, 5, 4, 18, 59);
  g[14][13] = 20; g[15][14] = 20; g[18][20] = 19;
  return paletteSprite([g], [...GRASS_PALETTE, ...STONE_PALETTE]);
})();

export const SPRITE_RH_STUMP: SpriteData = (() => {
  const g = makeGrassBase(66);
  rect(g, 13, 18, 7, 10, 18);
  rect(g, 11, 16, 11, 4, 19);
  rect(g, 14, 17, 5, 1, 20);
  g[18][12] = 21; g[18][22] = 21; g[19][17] = 22;
  return paletteSprite([g], [...GRASS_PALETTE, ...WOOD_PALETTE]);
})();

export const SPRITE_RH_HILL: SpriteData = (() => {
  const g = makeGrassBase(77);
  drawBlob(g, 16, 24, 18, 9, 2, 77);
  drawBlob(g, 12, 21, 9, 6, 5, 78);
  drawBlob(g, 22, 23, 8, 6, 7, 79);
  blendNoise(g, 2, 80, 0.1, 8);
  return paletteSprite([g], GRASS_PALETTE);
})();

export const SPRITE_RH_WATER: SpriteData = (() => {
  const frames: PixelGrid[] = [];
  for (let f = 0; f < 4; f++) {
    const g = grid(W, H);
    seededNoise(g, f * 12.4, [1, 2, 2, 3, 3, 4], 0.13);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const wave = Math.sin((x * 0.23 + y * 0.11) + f * 0.7);
        const ripple = Math.sin((x - y) * 0.16 + f * 1.1);
        if (wave > 0.72 && (x + y + f) % 5 === 0) g[y][x] = 6;
        else if (ripple > 0.76 && (x + f) % 4 === 0) g[y][x] = 5;
        else if (wave < -0.72) g[y][x] = 1;
      }
    }
    frames.push(g);
  }
  return paletteSprite(frames, WATER_PALETTE);
})();

export const SPRITE_RH_WATERFALL: SpriteData = (() => {
  const frames: PixelGrid[] = [];
  for (let f = 0; f < 4; f++) {
    const g = grid(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const stream = Math.sin(x * 0.44 + y * 0.22 + f * 1.2);
        g[y][x] = stream > 0.72 ? 9 : (stream > 0.25 ? 6 : 4);
      }
    }
    frames.push(g);
  }
  return paletteSprite(frames, WATER_PALETTE);
})();

export const SPRITE_RH_WATER_EDGE: SpriteData = (() => {
  const g = makeGrassBase(111);
  for (let y = 17; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const bank = (y - 17) / 15 + Math.abs(noise2D(x * 0.35, y * 0.35, 111)) * 0.22;
      if (bank > 0.35) g[y][x] = 16 + ((x + y) % 4);
      if (bank > 0.82 && (x + y) % 5 === 0) g[y][x] = 22;
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...WATER_PALETTE, ...STONE_PALETTE]);
})();

export const SPRITE_RH_CLIFF: SpriteData = (() => {
  const g = grid(W, H);
  seededNoise(g, 201, [1, 2, 3, 5], 0.24);
  drawBlob(g, 16, 10, 17, 9, 4, 201);
  for (let y = 13; y < H; y++) {
    for (let x = 0; x < W; x++) if (g[y][x] === EMPTY || g[y][x] === 4) g[y][x] = 1 + (x + y) % 4;
  }
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(Math.abs(noise2D(i, 2, 201)) * 27 + 2);
    const y = Math.floor(Math.abs(noise2D(2, i, 201)) * 12 + 15);
    rect(g, x, y, 1, 5, i % 2 ? 6 : 7);
  }
  return paletteSprite([g], STONE_PALETTE);
})();

export const SPRITE_RH_ROCK: SpriteData = (() => {
  const g = makeGrassBase(56);
  drawBlob(g, 16, 18, 13, 8, 16, 56);
  drawBlob(g, 11, 15, 8, 5, 17, 57);
  drawBlob(g, 21, 19, 7, 5, 18, 58);
  g[12][14] = 20; g[15][10] = 20; g[20][23] = 19;
  return paletteSprite([g], [...GRASS_PALETTE, ...STONE_PALETTE]);
})();

export const SPRITE_RH_BRIDGE: SpriteData = (() => {
  const g = grid(W, H);
  rect(g, 0, 0, W, H, 8);
  for (let y = 4; y < 29; y += 5) rect(g, 3, y, 26, 4, 2 + (y % 3));
  rect(g, 2, 1, 4, 30, 1); rect(g, 26, 1, 4, 30, 1);
  for (let y = 3; y < 30; y += 7) { rect(g, 1, y, 6, 2, 5); rect(g, 25, y, 6, 2, 5); }
  for (let x = 5; x < 28; x += 5) rect(g, x, 2, 2, 28, 6);
  return paletteSprite([g], WOOD_PALETTE);
})();

export const SPRITE_RH_ROAD: SpriteData = (() => {
  const g = grid(W, H, 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const center = Math.abs(y - 16 + noise2D(x * 0.18, y * 0.18, 88) * 3.5);
      const edge = Math.min(x, 31 - x, y, 31 - y);
      if (center < 7.5 || edge > 2) g[y][x] = 2 + Math.floor(Math.abs(noise2D(x * 0.28, y * 0.28, 89)) * 3);
      if (center < 3.2) g[y][x] = 4;
      if (center > 10 && Math.abs(noise2D(x * 0.4, y * 0.4, 90)) < 0.16) g[y][x] = 1;
      if ((x + y) % 17 === 0) g[y][x] = 5;
    }
  }
  return paletteSprite([g], ROAD_PALETTE);
})();

export const SPRITE_RH_ROAD_OVERGRASS: SpriteData = (() => {
  const g = makeGrassBase(99);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const path = Math.abs(y - 16 + noise2D(x * 0.18, y * 0.18, 99) * 4.5);
      if (path < 8) g[y][x] = 16 + Math.floor(Math.abs(noise2D(x * 0.35, y * 0.35, 100)) * 5);
      if (path > 6 && path < 10 && Math.abs(noise2D(x * 0.3, y * 0.3, 101)) < 0.2) g[y][x] = 4;
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...ROAD_PALETTE]);
})();

export const SPRITE_RH_TREE: SpriteData = (() => {
  const g = grid(W, H);
  drawBlob(g, 16, 29, 12, 3, 12, 12);
  rect(g, 14, 18, 5, 12, 8); rect(g, 13, 22, 3, 6, 9); rect(g, 18, 21, 3, 7, 10);
  drawLeafCluster(g, 15, 13, 14, 4, 2, 101);
  drawBlob(g, 16, 8, 12, 7, 5, 102); drawBlob(g, 8, 14, 9, 7, 3, 103); drawBlob(g, 24, 15, 9, 7, 3, 104);
  drawBlob(g, 13, 8, 4, 3, 11, 105); drawBlob(g, 20, 12, 4, 3, 7, 106); drawBlob(g, 27, 20, 3, 4, 2, 107);
  return paletteSprite([g], TREE_PALETTE);
})();

export const SPRITE_RH_TREE_PINE: SpriteData = (() => {
  const g = grid(W, H);
  drawBlob(g, 16, 29, 12, 3, 12, 11);
  rect(g, 15, 18, 3, 12, 8);
  drawBlob(g, 16, 23, 10, 5, 2, 121); drawBlob(g, 15, 18, 12, 6, 3, 122); drawBlob(g, 17, 13, 11, 6, 4, 123); drawBlob(g, 15, 8, 8, 5, 5, 124); drawBlob(g, 17, 5, 5, 3, 10, 125);
  return paletteSprite([g], TREE_PALETTE);
})();

const HOUSE_PALETTE = ['#4f2e1d', '#744a2b', '#9b6c3d', '#c89a5f', '#e5c88d', '#3b2115', '#9d3f2d', '#c45a3c', '#2b1710', '#f6df9b', '#6b7e8a', '#9fb9c7', '#d9c4a0'];

function makeHouse(seed: number): PixelGrid {
  const g = grid(W, H);
  drawBlob(g, 16, 29, 14, 3, 9, seed);
  rect(g, 5, 15, 22, 14, 2 + Math.floor(Math.abs(noise2D(seed, 1, seed)) * 2));
  rect(g, 4, 27, 24, 2, 13);
  drawBlob(g, 16, 11, 16, 8, 7, seed + 1);
  drawBlob(g, 16, 13, 14, 6, 8, seed + 2);
  rect(g, 13, 22, 6, 7, 6); rect(g, 14, 23, 4, 6, 8);
  rect(g, 8, 17, 5, 4, 11); rect(g, 20, 17, 5, 4, 11); rect(g, 9, 18, 3, 2, 12); rect(g, 21, 18, 3, 2, 12);
  if (Math.abs(noise2D(seed, 2, seed)) < 0.7) { rect(g, 22, 4, 3, 8, 5); rect(g, 21, 3, 5, 2, 13); }
  blendNoise(g, 7, seed + 3, 0.08, 4);
  return g;
}

export const SPRITE_RH_HOUSE_VARIANTS: SpriteData[] = Array.from({ length: 4 }, (_, i) => paletteSprite([makeHouse(i * 13.3)], HOUSE_PALETTE));
export const SPRITE_RH_HOUSE: SpriteData = SPRITE_RH_HOUSE_VARIANTS[0];

export const SPRITE_RH_WELL: SpriteData = (() => {
  const g = makeGrassBase(112);
  drawBlob(g, 16, 20, 8, 6, 16, 112); drawBlob(g, 16, 15, 6, 4, 17, 113); rect(g, 13, 9, 6, 2, 19); rect(g, 14, 8, 4, 1, 20);
  return paletteSprite([g], [...GRASS_PALETTE, ...STONE_PALETTE]);
})();

export const SPRITE_RH_FENCE: SpriteData = (() => {
  const g = makeGrassBase(113);
  for (let x = 1; x < 32; x += 6) rect(g, x, 20, 3, 10, 16);
  rect(g, 0, 23, 32, 3, 17); rect(g, 0, 27, 32, 2, 18);
  return paletteSprite([g], [...GRASS_PALETTE, ...WOOD_PALETTE]);
})();

export const SPRITE_RH_CART: SpriteData = (() => {
  const g = makeGrassBase(114);
  rect(g, 8, 17, 17, 8, 16); rect(g, 9, 16, 15, 3, 18); rect(g, 6, 22, 22, 2, 17);
  circle(g, 11, 26, 3, 20); circle(g, 22, 26, 3, 20); rect(g, 26, 18, 5, 2, 19);
  return paletteSprite([g], [...GRASS_PALETTE, ...WOOD_PALETTE]);
})();

const DUNGEON_PALETTE = ['#1d2022', '#343a3c', '#525a5d', '#778083', '#9ba5a8', '#071c2e', '#0d76b8', '#22c9ff', '#bff7ff', '#52347a', '#8b63d9'];

export const SPRITE_RH_DUNGEON_ENTRANCE: SpriteData = (() => {
  const frames: PixelGrid[] = [];
  for (let f = 0; f < 3; f++) {
    const g = grid(W, H);
    drawBlob(g, 16, 18, 15, 13, 2, 104); drawBlob(g, 16, 18, 12, 10, 3, 105); drawBlob(g, 16, 20, 7, 8, 6 + f, 106);
    rect(g, 7, 28, 18, 2, 4); rect(g, 9, 26, 14, 2, 5); circle(g, 16, 18, 5, 8 + f);
    for (let i = 0; i < 20; i++) { const x = Math.floor(Math.abs(noise2D(i, 104, 104)) * 28 + 2); const y = Math.floor(Math.abs(noise2D(104, i, 104)) * 18 + 8); if (g[y][x] > 0 && g[y][x] < 6) g[y][x] = 4; }
    frames.push(g);
  }
  return paletteSprite(frames, DUNGEON_PALETTE);
})();

const DECO_GRASS = ['#24551d', '#4c9a3d', '#77c864', '#fff6a1', '#ff7a7a', '#d65cff', '#7bdcff'];

export const SPRITE_RH_FLOWER_RED: SpriteData = (() => {
  const g = grid(16, 16);
  rect(g, 7, 10, 2, 5, 1); g[9][6] = 5; g[8][7] = 5; g[9][8] = 5; g[10][7] = 5; g[9][7] = 7;
  return paletteSprite([g], DECO_GRASS);
})();

export const SPRITE_RH_FLOWER_YELLOW: SpriteData = (() => {
  const g = grid(16, 16);
  rect(g, 7, 10, 2, 5, 1); g[9][6] = 4; g[8][7] = 4; g[9][8] = 4; g[10][7] = 4; g[9][7] = 7;
  return paletteSprite([g], DECO_GRASS);
})();

export const SPRITE_RH_GRASS_TUFT: SpriteData = (() => {
  const g = grid(16, 16);
  for (let i = 0; i < 12; i++) { const x = Math.floor(Math.abs(noise2D(i, 115, 115)) * 14 + 1); const y = Math.floor(Math.abs(noise2D(115, i, 115)) * 8 + 6); g[y][x] = 1 + (i % 3); if (y > 0) g[y - 1][x] = 2; }
  return paletteSprite([g], DECO_GRASS);
})();
