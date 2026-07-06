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
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + seed;
    const dist = r * (0.24 + Math.abs(noise2D(i, seed, seed)) * 0.62);
    softCircle(g, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.62, r * 0.33, [color, color, darkColor]);
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

const GRASS_PALETTE = ['#193915', '#28551d', '#346b26', '#438130', '#52983b', '#69b452', '#10290f', '#21491a', '#80c760', '#a7de79', '#d9f0a0', '#fff1a5', '#f77272', '#d957ff', '#6bd7ff'];
const WATER_PALETTE = ['#071f2d', '#0a334a', '#10516f', '#176d8b', '#1e8eaa', '#44bfd2', '#86edf2', '#041927', '#d8ffff'];
const ROAD_PALETTE = ['#4f3926', '#6a5032', '#81663d', '#997d4d', '#b3945d', '#d0b77b', '#3b291b', '#e5cf91'];
const WOOD_PALETTE = ['#2f1a0f', '#4c2a18', '#6a3f22', '#8a5d34', '#b17d47', '#d9ad67', '#1d110a'];
const STONE_PALETTE = ['#2d3231', '#48514d', '#66726a', '#87928a', '#b0bbb0', '#1f2422', '#53684f', '#8aa35f'];
const TREE_PALETTE = ['#071707', '#0f2d0f', '#1d4e19', '#2c7028', '#3f9436', '#66b956', '#98df72', '#4b2b19', '#744b2b', '#a17443', '#dbf59a', '#061006'];
const FLOWER_PALETTE = ['#24551d', '#5faf4d', '#fff6a1', '#ff7a7a', '#d65cff', '#7bdcff', '#ffffff', '#b9532b', '#e8d1a1'];

function makeGrassBase(seed: number): PixelGrid {
  const g = grid(W, H);
  seededNoise(g, seed, [1, 2, 2, 3, 3, 4, 7], 0.13);
  blendNoise(g, 2, seed + 1, 0.12, 5);
  blendNoise(g, 3, seed + 2, 0.09, 8);
  blendNoise(g, 4, seed + 3, 0.055, 9);
  blendNoise(g, 1, seed + 4, 0.08, 6);
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(Math.abs(noise2D(i * 0.7, seed, seed)) * 28 + 2);
    const y = Math.floor(Math.abs(noise2D(seed, i * 0.7, seed)) * 28 + 2);
    g[y][x] = i % 4 === 0 ? 10 : (i % 2 === 0 ? 5 : 8);
  }
  return g;
}

function drawPebbles(g: PixelGrid, seed: number, startIndex: number): void {
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(Math.abs(noise2D(i, seed, seed)) * 28 + 2);
    const y = Math.floor(Math.abs(noise2D(seed, i, seed)) * 28 + 2);
    g[y][x] = startIndex + (i % 3);
  }
}

export const SPRITE_RH_GRASS: SpriteData[] = Array.from({ length: 10 }, (_, i) => paletteSprite([makeGrassBase(i * 17.31)], GRASS_PALETTE));

export const SPRITE_RH_GRASS_FLOWERS: SpriteData[] = Array.from({ length: 6 }, (_, v) => {
  const g = makeGrassBase(80 + v * 9.7);
  if (v === 0 || v === 3) {
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.abs(noise2D(i, v, 17)) * 26 + 3);
      const y = Math.floor(Math.abs(noise2D(v, i, 23)) * 24 + 4);
      const c = 11 + (i % 5);
      g[y][x] = c;
      if (x > 0 && i % 2 === 0) g[y][x - 1] = c;
      if (x < 31 && i % 3 === 0) g[y][x + 1] = c;
      if (y > 0) g[y - 1][x] = c;
    }
  } else if (v === 1) {
    drawBlob(g, 12, 22, 7, 3, 16, 91);
    drawBlob(g, 19, 19, 6, 3, 17, 92);
    rect(g, 10, 19, 4, 5, 18);
    rect(g, 18, 17, 3, 4, 18);
    g[16][18] = 20; g[18][22] = 20;
  } else if (v === 2) {
    rect(g, 9, 18, 14, 4, 16);
    rect(g, 8, 17, 16, 2, 18);
    rect(g, 12, 20, 2, 3, 17);
    rect(g, 19, 20, 2, 3, 17);
    g[16][10] = 20; g[16][21] = 20;
  } else if (v === 4) {
    rect(g, 10, 15, 4, 10, 18);
    rect(g, 18, 13, 5, 13, 17);
    rect(g, 9, 13, 7, 2, 19);
    rect(g, 17, 11, 7, 2, 19);
    drawPebbles(g, 42, 16);
  } else {
    for (let i = 0; i < 6; i++) {
      const x = 7 + i * 4;
      const y = 19 + (i % 2) * 3;
      rect(g, x, y, 2, 4, 1);
      drawBlob(g, x + 1, y - 1, 3, 2, 19 + (i % 2), 120 + i);
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...WOOD_PALETTE, ...STONE_PALETTE, ...FLOWER_PALETTE]);
});

export const SPRITE_RH_BUSH: SpriteData = (() => {
  const g = makeGrassBase(42);
  drawBlob(g, 15, 19, 12, 8, 3, 42);
  drawBlob(g, 9, 21, 8, 5, 2, 44);
  drawBlob(g, 22, 21, 9, 5, 4, 46);
  drawBlob(g, 16, 14, 9, 6, 5, 48);
  drawBlob(g, 12, 15, 4, 3, 9, 49);
  drawBlob(g, 23, 17, 3, 3, 10, 50);
  blendNoise(g, 3, 50, 0.08, 9);
  return paletteSprite([g], GRASS_PALETTE);
})();

export const SPRITE_RH_ROCK_SMALL: SpriteData = (() => {
  const g = makeGrassBase(55);
  drawBlob(g, 16, 19, 10, 7, 16, 55);
  drawBlob(g, 12, 16, 6, 4, 17, 57);
  drawBlob(g, 21, 20, 5, 4, 18, 59);
  g[14][13] = 20; g[15][14] = 20; g[18][20] = 19;
  rect(g, 14, 22, 7, 1, 21);
  return paletteSprite([g], [...GRASS_PALETTE, ...STONE_PALETTE]);
})();

export const SPRITE_RH_STUMP: SpriteData = (() => {
  const g = makeGrassBase(66);
  rect(g, 13, 18, 7, 10, 18);
  rect(g, 11, 16, 11, 4, 19);
  rect(g, 14, 17, 5, 1, 20);
  rect(g, 10, 24, 14, 2, 22);
  g[18][12] = 21; g[18][22] = 21; g[19][17] = 22;
  return paletteSprite([g], [...GRASS_PALETTE, ...WOOD_PALETTE]);
})();

export const SPRITE_RH_HILL: SpriteData = (() => {
  const g = makeGrassBase(77);
  drawBlob(g, 16, 24, 18, 9, 2, 77);
  drawBlob(g, 12, 21, 9, 6, 5, 78);
  drawBlob(g, 22, 23, 8, 6, 7, 79);
  drawBlob(g, 18, 20, 7, 3, 9, 81);
  blendNoise(g, 2, 80, 0.1, 8);
  return paletteSprite([g], GRASS_PALETTE);
})();

export const SPRITE_RH_WATER: SpriteData = (() => {
  const frames: PixelGrid[] = [];
  for (let f = 0; f < 4; f++) {
    const g = grid(W, H);
    seededNoise(g, f * 12.4, [1, 2, 2, 3, 3, 4], 0.1);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const wave = Math.sin((x * 0.18 + y * 0.09) + f * 0.7);
        const ripple = Math.sin((x - y) * 0.13 + f * 1.1);
        if (wave > 0.75 && (x + y + f) % 6 === 0) g[y][x] = 6;
        else if (ripple > 0.78 && (x + f) % 5 === 0) g[y][x] = 5;
        else if (wave < -0.74) g[y][x] = 1;
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
        const stream = Math.sin(x * 0.38 + y * 0.2 + f * 1.2);
        g[y][x] = stream > 0.74 ? 9 : (stream > 0.24 ? 6 : 4);
      }
    }
    frames.push(g);
  }
  return paletteSprite(frames, WATER_PALETTE);
})();

export const SPRITE_RH_WATER_EDGE: SpriteData = (() => {
  const g = makeGrassBase(111);
  for (let y = 15; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const bank = (y - 15) / 17 + Math.abs(noise2D(x * 0.35, y * 0.35, 111)) * 0.24;
      if (bank > 0.28) g[y][x] = 16 + ((x + y) % 4);
      if (bank > 0.52 && (x + y) % 6 === 0) g[y][x] = 25;
      if (bank > 0.84 && (x + y) % 5 === 0) g[y][x] = 22;
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...WATER_PALETTE, ...STONE_PALETTE]);
})();

export const SPRITE_RH_CLIFF: SpriteData = (() => {
  const g = grid(W, H);
  seededNoise(g, 201, [1, 2, 3, 5], 0.2);
  drawBlob(g, 16, 10, 17, 9, 4, 201);
  for (let y = 13; y < H; y++) {
    for (let x = 0; x < W; x++) if (g[y][x] === EMPTY || g[y][x] === 4) g[y][x] = 1 + (x + y) % 4;
  }
  for (let i = 0; i < 12; i++) {
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
  drawBlob(g, 19, 13, 5, 3, 20, 59);
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
      const center = Math.abs(y - 16 + noise2D(x * 0.16, y * 0.16, 88) * 3.8);
      const edge = Math.min(x, 31 - x, y, 31 - y);
      if (center < 8 || edge > 2) g[y][x] = 2 + Math.floor(Math.abs(noise2D(x * 0.24, y * 0.24, 89)) * 3);
      if (center < 3.2) g[y][x] = 4;
      if (center > 10 && Math.abs(noise2D(x * 0.4, y * 0.4, 90)) < 0.16) g[y][x] = 1;
      if ((x + y) % 17 === 0) g[y][x] = 5;
    }
  }
  drawPebbles(g, 88, 5);
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
  drawBlob(g, 16, 29, 13, 3, 12, 12);
  rect(g, 14, 17, 5, 13, 8); rect(g, 12, 22, 4, 6, 9); rect(g, 18, 20, 4, 8, 10);
  drawLeafCluster(g, 15, 13, 15, 4, 2, 101);
  drawBlob(g, 16, 8, 13, 8, 5, 102); drawBlob(g, 8, 14, 10, 8, 3, 103); drawBlob(g, 24, 15, 10, 8, 3, 104);
  drawBlob(g, 13, 8, 5, 3, 11, 105); drawBlob(g, 20, 12, 4, 3, 7, 106); drawBlob(g, 27, 20, 3, 4, 2, 107);
  drawBlob(g, 7, 21, 4, 3, 1, 108);
  return paletteSprite([g], TREE_PALETTE);
})();

export const SPRITE_RH_TREE_PINE: SpriteData = (() => {
  const g = grid(W, H);
  drawBlob(g, 16, 29, 12, 3, 12, 11);
  rect(g, 15, 17, 3, 13, 8);
  drawBlob(g, 16, 24, 11, 5, 2, 121); drawBlob(g, 15, 19, 13, 6, 3, 122); drawBlob(g, 17, 14, 12, 6, 4, 123); drawBlob(g, 15, 9, 9, 5, 5, 124); drawBlob(g, 17, 5, 6, 3, 10, 125);
  drawBlob(g, 10, 17, 5, 3, 1, 126); drawBlob(g, 23, 20, 5, 3, 2, 127);
  return paletteSprite([g], TREE_PALETTE);
})();

const HOUSE_PALETTE = ['#3d2315', '#694026', '#98683d', '#c08a52', '#e1bd75', '#2a170f', '#873323', '#c15435', '#1a0e09', '#f5dc92', '#516876', '#8aa7b4', '#cfb58f', '#283b2d', '#5d743a'];

function makeHouse(seed: number): PixelGrid {
  const g = grid(W, H);
  drawBlob(g, 16, 29, 15, 3, 9, seed);
  rect(g, 5, 15, 22, 14, 2 + Math.floor(Math.abs(noise2D(seed, 1, seed)) * 2));
  rect(g, 4, 27, 24, 2, 13);
  drawBlob(g, 16, 11, 16, 8, 7, seed + 1);
  drawBlob(g, 16, 13, 14, 6, 8, seed + 2);
  rect(g, 13, 22, 6, 7, 6); rect(g, 14, 23, 4, 6, 8);
  rect(g, 8, 17, 5, 4, 11); rect(g, 20, 17, 5, 4, 11); rect(g, 9, 18, 3, 2, 12); rect(g, 21, 18, 3, 2, 12);
  rect(g, 6, 24, 5, 2, 14); rect(g, 22, 24, 4, 2, 15);
  if (Math.abs(noise2D(seed, 2, seed)) < 0.7) { rect(g, 22, 4, 3, 8, 5); rect(g, 21, 3, 5, 2, 13); }
  blendNoise(g, 7, seed + 3, 0.08, 4);
  return g;
}

export const SPRITE_RH_HOUSE_VARIANTS: SpriteData[] = Array.from({ length: 4 }, (_, i) => paletteSprite([makeHouse(i * 13.3)], HOUSE_PALETTE));
export const SPRITE_RH_HOUSE: SpriteData = SPRITE_RH_HOUSE_VARIANTS[0];

export const SPRITE_RH_WELL: SpriteData = (() => {
  const g = makeGrassBase(112);
  drawBlob(g, 16, 20, 8, 6, 16, 112); drawBlob(g, 16, 15, 6, 4, 17, 113); rect(g, 13, 9, 6, 2, 19); rect(g, 14, 8, 4, 1, 20);
  rect(g, 11, 12, 2, 8, 18); rect(g, 20, 12, 2, 8, 18);
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
  rect(g, 12, 18, 2, 5, 21); rect(g, 19, 18, 2, 5, 21);
  return paletteSprite([g], [...GRASS_PALETTE, ...WOOD_PALETTE]);
})();

const DUNGEON_PALETTE = ['#171b1c', '#30383a', '#4c5759', '#748083', '#a0abae', '#061827', '#0b6fa6', '#21c7ff', '#c7fbff', '#4b2d78', '#8c61dc', '#1f2d25', '#526a4d'];

export const SPRITE_RH_DUNGEON_ENTRANCE: SpriteData = (() => {
  const frames: PixelGrid[] = [];
  for (let f = 0; f < 3; f++) {
    const g = grid(W, H);
    drawBlob(g, 16, 18, 15, 13, 2, 104); drawBlob(g, 16, 18, 12, 10, 3, 105); drawBlob(g, 16, 20, 7, 8, 6 + f, 106);
    rect(g, 7, 28, 18, 2, 4); rect(g, 9, 26, 14, 2, 5); circle(g, 16, 18, 5, 8 + f);
    rect(g, 6, 25, 5, 3, 12); rect(g, 22, 24, 5, 4, 13);
    for (let i = 0; i < 20; i++) { const x = Math.floor(Math.abs(noise2D(i, 104, 104)) * 28 + 2); const y = Math.floor(Math.abs(noise2D(104, i, 104)) * 18 + 8); if (g[y][x] > 0 && g[y][x] < 6) g[y][x] = 4; }
    frames.push(g);
  }
  return paletteSprite(frames, DUNGEON_PALETTE);
})();

const DECO_GRASS = ['#24551d', '#4c9a3d', '#77c864', '#fff6a1', '#ff7a7a', '#d65cff', '#7bdcff', '#b75b2c', '#f0d28a'];

export const SPRITE_RH_FLOWER_RED: SpriteData = (() => {
  const g = grid(16, 16);
  rect(g, 7, 10, 2, 5, 1); g[9][6] = 5; g[8][7] = 5; g[9][8] = 5; g[10][7] = 5; g[9][7] = 7;
  g[11][10] = 4; g[10][11] = 4; g[12][11] = 4;
  return paletteSprite([g], DECO_GRASS);
})();

export const SPRITE_RH_FLOWER_YELLOW: SpriteData = (() => {
  const g = grid(16, 16);
  rect(g, 7, 10, 2, 5, 1); g[9][6] = 4; g[8][7] = 4; g[9][8] = 4; g[10][7] = 4; g[9][7] = 7;
  rect(g, 11, 10, 2, 4, 1); g[9][10] = 8; g[9][11] = 9; g[10][12] = 8;
  return paletteSprite([g], DECO_GRASS);
})();

export const SPRITE_RH_GRASS_TUFT: SpriteData = (() => {
  const g = grid(16, 16);
  for (let i = 0; i < 12; i++) { const x = Math.floor(Math.abs(noise2D(i, 115, 115)) * 14 + 1); const y = Math.floor(Math.abs(noise2D(115, i, 115)) * 8 + 6); g[y][x] = 1 + (i % 3); if (y > 0) g[y - 1][x] = 2; }
  g[12][4] = 8; g[11][5] = 9; g[12][6] = 8;
  return paletteSprite([g], DECO_GRASS);
})();
