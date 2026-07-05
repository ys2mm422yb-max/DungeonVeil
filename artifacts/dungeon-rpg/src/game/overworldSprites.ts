// Rumble Heroes style 32×32 pixel-art overworld sprites.
// These are rendered at the tile size, but authored at 32×32 for sharp detail.

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

export function noiseFill(g: PixelGrid, seed: number, colors: number[], density = 0.5): void {
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      if (g[y][x] !== EMPTY && Math.random() < density) {
        const h = Math.abs((Math.sin(x * 0.4 + seed) + Math.cos(y * 0.4 + seed * 2)) * 0.5);
        g[y][x] = colors[Math.floor(h * colors.length) % colors.length];
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
      if (g[y][x] === base && Math.random() < chance) {
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
    const dist = r * (0.4 + Math.random() * 0.6);
    const lx = cx + Math.cos(angle) * dist;
    const ly = cy + Math.sin(angle) * dist * 0.7;
    const lr = r * (0.35 + Math.random() * 0.3);
    softCircle(g, lx, ly, lr, [color, darkColor, color]);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// GRASS TILES
// ───────────────────────────────────────────────────────────────────────────────

const GRASS_PALETTE = ['#3a7a2e', '#4a8c3a', '#5a9e46', '#6ab052', '#7bc460', '#2e6a24', '#8fd070'];
const FLOWER_PALETTE = ['#ff6b6b', '#ffd93d', '#ff9ff3', '#54a0ff', '#5f27cd'];

function makeGrassBase(seed: number): PixelGrid {
  const g = grid(32, 32);
  seededNoise(g, seed, [1, 2, 3, 4, 5], 0.35);
  blendNoise(g, 2, seed + 1, 0.12, 6);
  blendNoise(g, 3, seed + 2, 0.08, 7);
  return g;
}

export const SPRITE_RH_GRASS: SpriteData[] = [];

for (let v = 0; v < 8; v++) {
  const g = makeGrassBase(v * 13.7);
  SPRITE_RH_GRASS.push(paletteSprite([g], GRASS_PALETTE));
}

// Plain meadow with a few small flowers
export const SPRITE_RH_GRASS_FLOWERS: SpriteData[] = [];
for (let v = 0; v < 4; v++) {
  const g = makeGrassBase(v * 19.3);
  const flowerCount = 3 + Math.floor(Math.random() * 5);
  for (let i = 0; i < flowerCount; i++) {
    const fx = Math.floor(Math.random() * 28 + 2);
    const fy = Math.floor(Math.random() * 28 + 2);
    const color = 8 + Math.floor(Math.random() * 5);
    g[fy][fx] = color;
    if (fy > 0) g[fy - 1][fx] = color;
    if (fx > 0) g[fy][fx - 1] = color;
    if (fx < 31) g[fy][fx + 1] = color;
  }
  SPRITE_RH_GRASS_FLOWERS.push(paletteSprite([g], [...GRASS_PALETTE, ...FLOWER_PALETTE]));
}

// Grass with a single small bush
export const SPRITE_RH_BUSH: SpriteData = (() => {
  const g = makeGrassBase(44.1);
  drawBlob(g, 16, 20, 9, 7, 3, 44.1);
  drawBlob(g, 12, 22, 6, 5, 2, 44.2);
  drawBlob(g, 22, 22, 6, 5, 2, 44.3);
  drawBlob(g, 16, 26, 4, 3, 6, 44.4);
  return paletteSprite([g], GRASS_PALETTE);
})();

// Grass with a small rock / stone
export const SPRITE_RH_ROCK_SMALL: SpriteData = (() => {
  const g = makeGrassBase(55.2);
  const rockPalette = ['#7a8a7a', '#8a9a8a', '#9aaaaa', '#6a7a6a', '#aababa'];
  const rg = grid(32, 32);
  drawBlob(rg, 16, 18, 9, 7, 1, 55.2);
  drawBlob(rg, 12, 16, 5, 4, 2, 55.3);
  drawBlob(rg, 20, 19, 4, 3, 3, 55.4);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (rg[y][x] !== EMPTY) g[y][x] = rg[y][x] + 7;
    }
  }
  return paletteSprite([g], [...GRASS_PALETTE, ...rockPalette]);
})();

// Grass with a tree stump
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

// Grass with tiny hill/rock outcrop
export const SPRITE_RH_HILL: SpriteData = (() => {
  const g = makeGrassBase(77.4);
  const hillPalette = ['#5a8a4a', '#6a9e5a', '#4a7a3a', '#7ab06a', '#3a6a2a'];
  const hg = grid(32, 32);
  drawBlob(hg, 16, 24, 16, 8, 1, 77.4);
  drawBlob(hg, 12, 22, 8, 5, 2, 77.5);
  drawBlob(hg, 22, 23, 7, 5, 3, 77.6);
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

const WATER_PALETTE = ['#1a4a7a', '#2266a0', '#2e80c0', '#3aa0e0', '#4ab8f0', '#103a60'];

export const SPRITE_RH_WATER: SpriteData = (() => {
  const frames: PixelGrid[] = [];
  for (let f = 0; f < 4; f++) {
    const g = grid(32, 32);
    seededNoise(g, f * 10.5, [1, 2, 3, 4, 5, 6], 0.25 + f * 0.03);
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

// ───────────────────────────────────────────────────────────────────────────────
// ROAD
// ───────────────────────────────────────────────────────────────────────────────

const ROAD_PALETTE = ['#6a5a42', '#7d6b4e', '#8f7d5a', '#a08e68', '#5c4e38', '#b29e72', '#4a3e2e'];

export const SPRITE_RH_ROAD: SpriteData = (() => {
  const g = grid(32, 32);
  seededNoise(g, 88.5, [1, 2, 3, 4, 5], 0.3);
  blendNoise(g, 2, 88.6, 0.15, 4);
  blendNoise(g, 3, 88.7, 0.1, 6);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const edge = Math.min(x, 31 - x, y, 31 - y);
      if (edge < 2 && Math.random() < 0.4) g[y][x] = 7;
    }
  }
  return paletteSprite([g], ROAD_PALETTE);
})();

// ───────────────────────────────────────────────────────────────────────────────
// FOREST / BIG TREES
// ───────────────────────────────────────────────────────────────────────────────

const TREE_PALETTE = ['#2a5a1a', '#3a7a24', '#4a9a32', '#5aba40', '#6ad050', '#1a3a10', '#5a3a22', '#7a5a3a', '#8b6a4a'];

export const SPRITE_RH_TREE: SpriteData = (() => {
  const g = grid(32, 32);
  // trunk
  rect(g, 14, 22, 4, 9, 7);
  rect(g, 13, 20, 6, 5, 6);
  // roots/base
  g[30][12] = 8; g[30][13] = 8; g[30][18] = 8; g[30][19] = 8;
  // shadow on ground
  rect(g, 8, 29, 16, 2, 9);
  // canopy layers
  drawBlob(g, 16, 14, 12, 9, 3, 101.1);
  drawBlob(g, 12, 18, 9, 7, 2, 101.2);
  drawBlob(g, 22, 18, 9, 7, 2, 101.3);
  drawBlob(g, 16, 9, 10, 8, 4, 101.4);
  drawBlob(g, 10, 12, 8, 7, 1, 101.5);
  drawBlob(g, 24, 12, 8, 7, 1, 101.6);
  // highlights
  drawBlob(g, 14, 10, 4, 3, 5, 101.7);
  drawBlob(g, 20, 14, 3, 2, 5, 101.8);
  return paletteSprite([g], TREE_PALETTE);
})();

export const SPRITE_RH_TREE_PINE: SpriteData = (() => {
  const g = grid(32, 32);
  rect(g, 15, 22, 2, 8, 7);
  // shadow
  rect(g, 9, 29, 14, 2, 9);
  // tiers
  drawBlob(g, 16, 22, 7, 4, 2, 102.1);
  drawBlob(g, 16, 17, 9, 5, 3, 102.2);
  drawBlob(g, 16, 12, 8, 5, 4, 102.3);
  drawBlob(g, 16, 8, 6, 4, 5, 102.4);
  return paletteSprite([g], TREE_PALETTE);
})();

// ───────────────────────────────────────────────────────────────────────────────
// VILLAGE / HOUSE
// ───────────────────────────────────────────────────────────────────────────────

const HOUSE_PALETTE = ['#7a5a3a', '#8f6d4a', '#a0805a', '#c0a070', '#5a3a22', '#8b5a3a', '#663322', '#442211', '#d0c0a0'];

export const SPRITE_RH_HOUSE: SpriteData = (() => {
  const g = grid(32, 32);
  // house body
  rect(g, 6, 14, 20, 16, 1);
  rect(g, 6, 14, 20, 2, 5);
  // door
  rect(g, 14, 22, 4, 8, 6);
  rect(g, 14, 22, 4, 1, 7);
  // windows
  rect(g, 9, 18, 4, 4, 9);
  rect(g, 19, 18, 4, 4, 9);
  rect(g, 10, 19, 2, 2, 8);
  rect(g, 20, 19, 2, 2, 8);
  // roof
  drawBlob(g, 16, 12, 13, 6, 5, 103.1);
  drawBlob(g, 16, 13, 11, 5, 7, 103.2);
  // chimney
  rect(g, 22, 6, 3, 8, 5);
  return paletteSprite([g], HOUSE_PALETTE);
})();

// ───────────────────────────────────────────────────────────────────────────────
// DUNGEON ENTRANCE
// ───────────────────────────────────────────────────────────────────────────────

const DUNGEON_PALETTE = ['#2a2a2a', '#3a3a3a', '#4a4a4a', '#5a5a5a', '#6a6a6a', '#1a1a1a', '#7a6a9a', '#9a8ac0'];

export const SPRITE_RH_DUNGEON_ENTRANCE: SpriteData = (() => {
  const g = grid(32, 32);
  // stone arch
  drawBlob(g, 16, 18, 13, 12, 2, 104.1);
  drawBlob(g, 16, 18, 11, 10, 3, 104.2);
  // dark opening
  drawBlob(g, 16, 20, 6, 7, 6, 104.3);
  // steps
  rect(g, 8, 28, 16, 2, 4);
  rect(g, 10, 26, 12, 2, 5);
  // cracks/moss
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(Math.random() * 28 + 2);
    const y = Math.floor(Math.random() * 20 + 8);
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
    const x = Math.floor(Math.random() * 14 + 1);
    const y = Math.floor(Math.random() * 8 + 6);
    g[y][x] = 1 + Math.floor(Math.random() * 3);
  }
  return paletteSprite([g], ['', ...DECO_GRASS]);
})();
