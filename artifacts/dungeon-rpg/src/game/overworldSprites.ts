export type SceneObjectKind =
  | 'tree' | 'pine' | 'house' | 'entrance' | 'cliff' | 'bridge' | 'torch'
  | 'flowers' | 'bush' | 'rock' | 'log' | 'mushrooms' | 'skull' | 'barrel' | 'crate';

const TS = '/assets/rpg-pack/Tiny Swords/Tiny Swords (Update 010)';
const FREE = '/assets/rpg-pack/Tiny Swords (Free Pack)/Tiny Swords (Free Pack)';

const ASSET = {
  tree: `${TS}/Resources/Trees/Tree.png`,
  elevation: `${TS}/Terrain/Ground/Tilemap_Elevation.png`,
  bridge: `${TS}/Terrain/Bridge/Bridge_All.png`,
  fire: `${TS}/Effects/Fire/Fire.png`,
  houses: [
    `${FREE}/Buildings/Blue Buildings/House1.png`,
    `${FREE}/Buildings/Blue Buildings/House2.png`,
    `${FREE}/Buildings/Blue Buildings/House3.png`,
    `${FREE}/Buildings/Blue Buildings/Barracks.png`,
    `${FREE}/Buildings/Blue Buildings/Archery.png`,
    `${FREE}/Buildings/Blue Buildings/Monastery.png`,
    `${TS}/Factions/Knights/Buildings/House/House_Blue.png`,
    `${TS}/Factions/Knights/Buildings/House/House_Yellow.png`,
    `${TS}/Factions/Knights/Buildings/House/House_Red.png`,
    `${TS}/Factions/Knights/Buildings/Tower/Tower_Blue.png`,
  ],
  entrances: [
    `${FREE}/Buildings/Purple Buildings/Castle.png`,
    `${FREE}/Buildings/Black Buildings/Tower.png`,
    `${TS}/Factions/Knights/Buildings/Castle/Castle_Blue.png`,
    `${TS}/Factions/Knights/Buildings/Tower/Tower_Purple.png`,
    `${TS}/Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Destroyed.png`,
  ],
  deco: Array.from({ length: 18 }, (_, i) => `${TS}/Deco/${String(i + 1).padStart(2, '0')}.png`),
  log: `${TS}/Resources/Resources/W_Idle.png`,
  barrel: `${TS}/Factions/Goblins/Troops/Barrel/Blue/Barrel_Blue.png`,
};

const cache = new Map<string, HTMLImageElement>();

function image(src: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = cache.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = src;
    cache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function whole(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, w: number, h: number): boolean {
  const img = image(src);
  if (!img) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  return true;
}

function frame(ctx: CanvasRenderingContext2D, src: string, fw: number, fh: number, index: number, x: number, y: number, w: number, h: number): boolean {
  const img = image(src);
  if (!img) return false;
  const cols = Math.max(1, Math.floor(img.naturalWidth / fw));
  const rows = Math.max(1, Math.floor(img.naturalHeight / fh));
  const safe = Math.abs(index) % (cols * rows);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, (safe % cols) * fw, Math.floor(safe / cols) * fh, fw, fh, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  return true;
}

function tile(ctx: CanvasRenderingContext2D, src: string, size: number, index: number, x: number, y: number, w: number, h: number): boolean {
  const img = image(src);
  if (!img) return false;
  const cols = Math.max(1, Math.floor(img.naturalWidth / size));
  const rows = Math.max(1, Math.floor(img.naturalHeight / size));
  const safe = Math.abs(index) % (cols * rows);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, (safe % cols) * size, Math.floor(safe / cols) * size, size, size, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  return true;
}

export function stableHash(x: number, y: number, salt = 0): number {
  let h = ((x * 374761393 + y * 1234567891 + salt * 668265263) & 0x7fffffff);
  h = ((h ^ (h >>> 13)) * 1540483477) & 0x7fffffff;
  return Math.abs((h ^ (h >>> 15)) / 0x7fffffff);
}

export function drawSceneObject(
  ctx: CanvasRenderingContext2D,
  kind: SceneObjectKind,
  x: number,
  y: number,
  w: number,
  h: number,
  variant = 0,
  animationFrame = 0,
): void {
  switch (kind) {
    case 'tree':
    case 'pine':
      frame(ctx, ASSET.tree, 192, 192, kind === 'pine' ? 1 + Math.abs(variant) % 6 : Math.abs(variant) % 10, x, y, w, h);
      return;
    case 'house':
      whole(ctx, ASSET.houses[Math.abs(variant) % ASSET.houses.length], x, y, w, h);
      return;
    case 'entrance':
      whole(ctx, ASSET.entrances[Math.abs(variant) % ASSET.entrances.length], x, y, w, h);
      return;
    case 'cliff':
      tile(ctx, ASSET.elevation, 64, 8 + Math.abs(variant) % 12, x, y, w, h);
      return;
    case 'bridge':
      frame(ctx, ASSET.bridge, 192, 192, variant, x, y, w, h);
      return;
    case 'torch':
      frame(ctx, ASSET.fire, 192, 192, animationFrame, x, y, w, h);
      return;
    case 'flowers': whole(ctx, ASSET.deco[Math.abs(variant) % 6], x, y, w, h); return;
    case 'bush': whole(ctx, ASSET.deco[6 + Math.abs(variant) % 4], x, y, w, h); return;
    case 'rock': whole(ctx, ASSET.deco[10 + Math.abs(variant) % 4], x, y, w, h); return;
    case 'mushrooms': whole(ctx, ASSET.deco[15 + Math.abs(variant) % 3], x, y, w, h); return;
    case 'skull': whole(ctx, ASSET.deco[13], x, y, w, h); return;
    case 'log': whole(ctx, ASSET.log, x, y, w, h); return;
    case 'barrel': whole(ctx, ASSET.barrel, x, y, w, h); return;
    case 'crate': whole(ctx, ASSET.log, x, y, w, h); return;
  }
}
