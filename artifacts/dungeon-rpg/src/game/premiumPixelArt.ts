import type { EnemyTypeName } from './sprites';

type TileKind =
  | 'grass'
  | 'road'
  | 'water'
  | 'broadTree'
  | 'pineTree'
  | 'house'
  | 'dungeonEntrance'
  | 'wall'
  | 'floor'
  | 'door';

type PropKind =
  | 'flowers'
  | 'bush'
  | 'rock'
  | 'log'
  | 'mushrooms'
  | 'ruins'
  | 'bridge'
  | 'well'
  | 'fence'
  | 'cart';

const MW = '/assets/rpg-pack/mystic_woods_free_2.2/sprites';
const CHARS = '/assets/rpg-pack/FreeCharactersAnimationsAssetPack/FreeCharactersAnimationsAssetPack/SpriteSheets(96x96)';

const imageCache = new Map<string, HTMLImageElement>();

function getImage(src: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = src;
    imageCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function drawWhole(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, w: number, h: number): boolean {
  const img = getImage(src);
  if (!img) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  return true;
}

function drawSheetFrame(
  ctx: CanvasRenderingContext2D,
  src: string,
  frameW: number,
  frameH: number,
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  flipX = false,
): boolean {
  const img = getImage(src);
  if (!img) return false;
  const cols = Math.max(1, Math.floor(img.naturalWidth / frameW));
  const rows = Math.max(1, Math.floor(img.naturalHeight / frameH));
  const safeFrame = Math.abs(frame) % (cols * rows);
  const sx = (safeFrame % cols) * frameW;
  const sy = Math.floor(safeFrame / cols) * frameH;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.translate(Math.floor(x + w), Math.floor(y));
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, frameW, frameH, 0, 0, Math.ceil(w), Math.ceil(h));
  } else {
    ctx.drawImage(img, sx, sy, frameW, frameH, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  }
  ctx.restore();
  return true;
}

function drawTileFrame(
  ctx: CanvasRenderingContext2D,
  src: string,
  tileSize: number,
  tileIndex: number,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const img = getImage(src);
  if (!img) return false;
  const cols = Math.max(1, Math.floor(img.naturalWidth / tileSize));
  const rows = Math.max(1, Math.floor(img.naturalHeight / tileSize));
  const frame = Math.abs(tileIndex) % (cols * rows);
  const sx = (frame % cols) * tileSize;
  const sy = Math.floor(frame / cols) * tileSize;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, tileSize, tileSize, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  return true;
}

function drawFallback(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
}

export function drawPremiumTile(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  x: number,
  y: number,
  w: number,
  h: number,
  variant = 0,
): void {
  switch (kind) {
    case 'grass':
      if (drawTileFrame(ctx, `${MW}/tilesets/plains.png`, 16, 8 + (variant % 8), x, y, w, h)) return;
      if (drawWhole(ctx, `${MW}/tilesets/grass.png`, x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#315f2f');
      return;
    case 'road':
      if (drawTileFrame(ctx, `${MW}/tilesets/plains.png`, 16, 32 + (variant % 10), x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#80613d');
      return;
    case 'water': {
      const frame = 1 + (Math.abs(variant) % 6);
      if (drawWhole(ctx, `${MW}/tilesets/water${frame}.png`, x, y, w, h)) return;
      if (drawTileFrame(ctx, `${MW}/tilesets/water-sheet.png`, 16, variant, x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#246f8f');
      return;
    }
    case 'broadTree':
      if (drawTileFrame(ctx, `${MW}/objects/objects.png`, 32, 16 + (variant % 8), x, y, w, h)) return;
      if (drawTileFrame(ctx, `${MW}/tilesets/decor_16x16.png`, 16, 48 + (variant % 8), x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#1f4d24');
      return;
    case 'pineTree':
      if (drawTileFrame(ctx, `${MW}/objects/objects.png`, 32, 24 + (variant % 8), x, y, w, h)) return;
      if (drawTileFrame(ctx, `${MW}/tilesets/decor_16x16.png`, 16, 56 + (variant % 8), x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#1b422c');
      return;
    case 'house':
      if (drawTileFrame(ctx, `${MW}/objects/objects.png`, 32, 40 + (variant % 6), x, y, w, h)) return;
      if (drawTileFrame(ctx, `${MW}/tilesets/walls/wooden_door.png`, 16, variant, x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#74523b');
      return;
    case 'dungeonEntrance':
      if (drawTileFrame(ctx, `${MW}/tilesets/walls/wooden_door_b.png`, 16, variant, x, y, w, h)) return;
      if (drawTileFrame(ctx, `${MW}/tilesets/walls/walls.png`, 16, 12 + (variant % 4), x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#40384c');
      return;
    case 'wall':
      if (drawTileFrame(ctx, `${MW}/tilesets/walls/walls.png`, 16, variant, x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#3d3946');
      return;
    case 'floor':
      if (drawTileFrame(ctx, `${MW}/tilesets/floors/flooring.png`, 16, variant, x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#5f564c');
      return;
    case 'door':
      if (drawTileFrame(ctx, `${MW}/tilesets/walls/wooden_door.png`, 16, variant, x, y, w, h)) return;
      drawFallback(ctx, x, y, w, h, '#7b5136');
      return;
  }
}

export function drawPremiumProp(
  ctx: CanvasRenderingContext2D,
  kind: PropKind,
  x: number,
  y: number,
  w: number,
  h: number,
  variant = 0,
): void {
  const decor = `${MW}/tilesets/decor_16x16.png`;
  const objects = `${MW}/objects/objects.png`;
  const fences = `${MW}/tilesets/fences.png`;
  const wooden = `${MW}/tilesets/floors/wooden.png`;
  const plains = `${MW}/tilesets/plains.png`;
  const byKind: Record<PropKind, { src: string; size: number; base: number; span: number; color: string }> = {
    flowers: { src: decor, size: 16, base: 80, span: 12, color: '#b9d86a' },
    bush: { src: decor, size: 16, base: 64, span: 8, color: '#2f6f35' },
    rock: { src: objects, size: 32, base: 4, span: 8, color: '#7a7d78' },
    log: { src: objects, size: 32, base: 36, span: 4, color: '#6f4b2f' },
    mushrooms: { src: decor, size: 16, base: 96, span: 8, color: '#d65a5a' },
    ruins: { src: `${MW}/tilesets/walls/walls.png`, size: 16, base: 20, span: 8, color: '#6c6872' },
    bridge: { src: wooden, size: 16, base: 0, span: 8, color: '#7a5631' },
    well: { src: objects, size: 32, base: 48, span: 4, color: '#5e6470' },
    fence: { src: fences, size: 16, base: 0, span: 8, color: '#7b5935' },
    cart: { src: objects, size: 32, base: 52, span: 4, color: '#805b35' },
  };
  const entry = byKind[kind];
  if (drawTileFrame(ctx, entry.src, entry.size, entry.base + (Math.abs(variant) % entry.span), x, y, w, h)) return;
  if ((kind === 'flowers' || kind === 'bush' || kind === 'mushrooms') && drawTileFrame(ctx, plains, 16, entry.base + (Math.abs(variant) % entry.span), x, y, w, h)) return;
  drawFallback(ctx, x, y, w, h, entry.color);
}

export function drawPremiumChest(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opened: boolean,
): void {
  const src = opened ? `${MW}/objects/chest_02.png` : `${MW}/objects/chest_01.png`;
  if (drawWhole(ctx, src, x, y, w, h)) return;
  drawPremiumProp(ctx, 'cart', x, y, w, h, opened ? 1 : 0);
}

export function drawPremiumPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frame = 0,
  flipX = false,
  flash = false,
): void {
  const src = `${CHARS}/Human_Soldier_Sword_Shield/No_Shadows/Human_Soldier_Sword_Shield_Walk-Sheet.png`;
  ctx.save();
  if (flash) ctx.filter = 'brightness(2.2) saturate(0.4)';
  const drawn = drawSheetFrame(ctx, src, 96, 96, frame, x - w * 0.5, y - h * 0.78, w * 2, h * 2.2, flipX);
  ctx.restore();
  if (!drawn) drawWhole(ctx, `${MW}/characters/player.png`, x, y, w, h);
}

export function drawPremiumEnemy(
  ctx: CanvasRenderingContext2D,
  enemyType: EnemyTypeName,
  x: number,
  y: number,
  w: number,
  h: number,
  frame = 0,
  flash = false,
): void {
  let drawn = false;
  ctx.save();
  if (flash) ctx.filter = 'brightness(2.4) saturate(0.4)';
  if (enemyType === 'slime') {
    drawn = drawSheetFrame(ctx, `${CHARS}/Monster_Slime/No_Shadows/Monster_Slime_Walk-Sheet.png`, 96, 96, frame, x - w * 0.55, y - h * 0.72, w * 2.1, h * 2.05);
  } else if (enemyType === 'skeleton') {
    drawn = drawSheetFrame(ctx, `${MW}/characters/skeleton.png`, 48, 48, frame, x - w * 0.25, y - h * 0.35, w * 1.5, h * 1.55);
  } else {
    drawn = drawWhole(ctx, `${MW}/characters/slime.png`, x - w * 0.15, y - h * 0.2, w * 1.3, h * 1.35);
  }
  ctx.restore();
  if (!drawn) drawFallback(ctx, x, y, w, h, '#4e8f46');
}

export function drawPremiumArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  length = 28,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  ctx.strokeStyle = '#d7c19a';
  ctx.fillStyle = '#eadfbd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-length * 0.42, 0);
  ctx.lineTo(length * 0.32, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(length * 0.48, 0);
  ctx.lineTo(length * 0.20, -5);
  ctx.lineTo(length * 0.26, 0);
  ctx.lineTo(length * 0.20, 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a5a2d';
  ctx.fillRect(Math.floor(-length * 0.5), -3, 4, 2);
  ctx.fillRect(Math.floor(-length * 0.5), 1, 4, 2);
  ctx.restore();
}
