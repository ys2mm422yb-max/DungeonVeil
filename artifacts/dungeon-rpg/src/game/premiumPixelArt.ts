import type { ClassKey } from './classes';
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

// Verified from the committed PNGs. These lists intentionally avoid cells that contain
// "Premium version!" preview text or mixed non-game atlas areas.
const SAFE_PLAINS_GRASS = [28, 32, 33, 34];
const SAFE_PLAINS_ROAD = [4, 8, 9, 14, 15, 20, 21];
const SAFE_WALLS = [32, 33, 34, 35, 36, 37, 40, 41, 42, 43, 44, 45];
const SAFE_FLOORS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

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

function drawTileCell(
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
  if (tileIndex < 0 || tileIndex >= cols * rows) return false;
  const sx = (tileIndex % cols) * tileSize;
  const sy = Math.floor(tileIndex / cols) * tileSize;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, tileSize, tileSize, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  return true;
}

function pick(list: number[], variant: number): number {
  return list[Math.abs(variant) % list.length];
}

function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
}

function seed(variant: number, i: number): number {
  const n = Math.sin((variant + 1) * 97.17 + i * 43.71) * 43758.5453;
  return n - Math.floor(n);
}

function drawProceduralGrass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, variant: number): void {
  fill(ctx, x, y, w, h, '#315f2f');
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 10; i++) {
    const px = x + seed(variant, i) * w;
    const py = y + seed(variant + 4, i) * h;
    fill(ctx, px, py, Math.max(1, w / 18), Math.max(2, h / 10), i % 2 ? '#6dac55' : '#234d27');
  }
  ctx.globalAlpha = 1;
}

function drawProceduralRoad(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, variant: number): void {
  drawProceduralGrass(ctx, x, y, w, h, variant);
  fill(ctx, x, y + h * 0.18, w, h * 0.64, '#7f623d');
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 8; i++) fill(ctx, x + seed(variant, i) * w, y + h * (0.25 + seed(variant + 6, i) * 0.45), w / 10, h / 18, '#d0b071');
  ctx.globalAlpha = 1;
}

function drawProceduralWater(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, variant: number): void {
  fill(ctx, x, y, w, h, '#0d4665');
  fill(ctx, x, y, w, h * 0.28, '#176f8f');
  fill(ctx, x, y + h * 0.75, w, h * 0.25, '#08334d');
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 3; i++) fill(ctx, x + seed(variant, i) * w * 0.8, y + h * (0.25 + i * 0.18), w * 0.28, Math.max(1, h / 18), '#75d9e8');
  ctx.globalAlpha = 1;
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawProceduralTree(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pine: boolean, variant: number): void {
  ellipse(ctx, x + w * 0.5, y + h * 0.86, w * 0.34, h * 0.11, 'rgba(0,0,0,0.32)');
  fill(ctx, x + w * 0.45, y + h * 0.55, w * 0.12, h * 0.32, '#664021');
  if (pine) {
    ellipse(ctx, x + w * 0.5, y + h * 0.62, w * 0.34, h * 0.16, '#123d21');
    ellipse(ctx, x + w * 0.5, y + h * 0.44, w * 0.42, h * 0.18, '#1f612d');
    ellipse(ctx, x + w * 0.5, y + h * 0.26, w * 0.31, h * 0.16, '#3d8f3b');
  } else {
    ellipse(ctx, x + w * 0.5, y + h * 0.38, w * 0.43, h * 0.27, '#174718');
    ellipse(ctx, x + w * 0.33, y + h * 0.49, w * 0.30, h * 0.20, '#2f7a2e');
    ellipse(ctx, x + w * 0.67, y + h * 0.48, w * 0.31, h * 0.21, '#3b8d35');
    ellipse(ctx, x + w * (0.42 + seed(variant, 1) * 0.12), y + h * 0.30, w * 0.22, h * 0.13, '#70bd58');
  }
}

function drawProceduralHouse(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, variant: number): void {
  ellipse(ctx, x + w * 0.5, y + h * 0.86, w * 0.42, h * 0.12, 'rgba(0,0,0,0.35)');
  fill(ctx, x + w * 0.16, y + h * 0.46, w * 0.68, h * 0.38, '#9a6a3e');
  fill(ctx, x + w * 0.09, y + h * 0.28, w * 0.82, h * 0.20, variant % 2 ? '#7a392b' : '#8c4d2f');
  fill(ctx, x + w * 0.38, y + h * 0.62, w * 0.20, h * 0.22, '#302014');
  fill(ctx, x + w * 0.22, y + h * 0.54, w * 0.16, h * 0.12, '#9dc4ca');
  fill(ctx, x + w * 0.63, y + h * 0.54, w * 0.16, h * 0.12, '#9dc4ca');
}

function drawProceduralEntrance(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ellipse(ctx, x + w * 0.5, y + h * 0.78, w * 0.42, h * 0.14, 'rgba(0,0,0,0.38)');
  ellipse(ctx, x + w * 0.5, y + h * 0.55, w * 0.40, h * 0.34, '#566064');
  ellipse(ctx, x + w * 0.5, y + h * 0.60, w * 0.24, h * 0.27, '#10253a');
  ellipse(ctx, x + w * 0.5, y + h * 0.58, w * 0.14, h * 0.18, '#25bdf4');
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
      if (drawWhole(ctx, `${MW}/tilesets/grass.png`, x, y, w, h)) return;
      if (drawTileCell(ctx, `${MW}/tilesets/plains.png`, 16, pick(SAFE_PLAINS_GRASS, variant), x, y, w, h)) return;
      drawProceduralGrass(ctx, x, y, w, h, variant);
      return;
    case 'road':
      if (drawTileCell(ctx, `${MW}/tilesets/plains.png`, 16, pick(SAFE_PLAINS_ROAD, variant), x, y, w, h)) return;
      drawProceduralRoad(ctx, x, y, w, h, variant);
      return;
    case 'water':
      drawProceduralWater(ctx, x, y, w, h, variant);
      return;
    case 'broadTree':
      drawProceduralTree(ctx, x, y, w, h, false, variant);
      return;
    case 'pineTree':
      drawProceduralTree(ctx, x, y, w, h, true, variant);
      return;
    case 'house':
      drawProceduralHouse(ctx, x, y, w, h, variant);
      return;
    case 'dungeonEntrance':
      drawProceduralEntrance(ctx, x, y, w, h);
      return;
    case 'wall':
      if (drawTileCell(ctx, `${MW}/tilesets/walls/walls.png`, 16, pick(SAFE_WALLS, variant), x, y, w, h)) return;
      fill(ctx, x, y, w, h, '#3d4354');
      return;
    case 'floor':
      if (drawTileCell(ctx, `${MW}/tilesets/floors/flooring.png`, 16, pick(SAFE_FLOORS, variant), x, y, w, h)) return;
      fill(ctx, x, y, w, h, '#4f493f');
      return;
    case 'door':
      if (drawTileCell(ctx, `${MW}/tilesets/walls/wooden_door.png`, 16, variant % 2, x, y, w, h)) return;
      fill(ctx, x, y, w, h, '#7b5136');
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
  switch (kind) {
    case 'flowers':
      drawProceduralGrass(ctx, x, y, w, h, variant);
      fill(ctx, x + w * 0.25, y + h * 0.42, w * 0.12, h * 0.12, '#f0e28a');
      fill(ctx, x + w * 0.55, y + h * 0.38, w * 0.12, h * 0.12, '#d96dce');
      fill(ctx, x + w * 0.70, y + h * 0.58, w * 0.10, h * 0.10, '#ffffff');
      return;
    case 'bush':
      ellipse(ctx, x + w * 0.5, y + h * 0.62, w * 0.42, h * 0.24, '#276b2b');
      ellipse(ctx, x + w * 0.38, y + h * 0.54, w * 0.24, h * 0.17, '#3f9238');
      return;
    case 'rock':
    case 'ruins':
      ellipse(ctx, x + w * 0.5, y + h * 0.60, w * 0.35, h * 0.22, '#747b78');
      fill(ctx, x + w * 0.35, y + h * 0.38, w * 0.26, h * 0.12, '#9ba39d');
      if (kind === 'ruins') fill(ctx, x + w * 0.18, y + h * 0.18, w * 0.18, h * 0.50, '#656d68');
      return;
    case 'log':
      fill(ctx, x + w * 0.20, y + h * 0.45, w * 0.60, h * 0.20, '#714522');
      ellipse(ctx, x + w * 0.22, y + h * 0.55, w * 0.10, h * 0.13, '#b9864f');
      return;
    case 'mushrooms':
      fill(ctx, x + w * 0.40, y + h * 0.52, w * 0.08, h * 0.20, '#e3c89a');
      ellipse(ctx, x + w * 0.44, y + h * 0.48, w * 0.16, h * 0.10, '#c2523a');
      return;
    case 'bridge':
      fill(ctx, x, y + h * 0.28, w, h * 0.44, '#7a5430');
      fill(ctx, x, y + h * 0.38, w, h * 0.08, '#be8b52');
      fill(ctx, x, y + h * 0.58, w, h * 0.08, '#be8b52');
      return;
    case 'well':
      ellipse(ctx, x + w * 0.5, y + h * 0.62, w * 0.28, h * 0.18, '#707a74');
      fill(ctx, x + w * 0.34, y + h * 0.30, w * 0.32, h * 0.08, '#76502e');
      return;
    case 'fence':
      fill(ctx, x, y + h * 0.58, w, h * 0.12, '#8a5f34');
      fill(ctx, x + w * 0.18, y + h * 0.35, w * 0.10, h * 0.45, '#60401f');
      fill(ctx, x + w * 0.70, y + h * 0.35, w * 0.10, h * 0.45, '#60401f');
      return;
    case 'cart':
      fill(ctx, x + w * 0.18, y + h * 0.36, w * 0.58, h * 0.30, '#8b5f34');
      ellipse(ctx, x + w * 0.28, y + h * 0.72, w * 0.10, h * 0.10, '#2f1e13');
      ellipse(ctx, x + w * 0.68, y + h * 0.72, w * 0.10, h * 0.10, '#2f1e13');
      return;
  }
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
  if (drawSheetFrame(ctx, src, 16, 16, opened ? 1 : 0, x, y, w, h)) return;
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
  playerClass: ClassKey = 'warrior',
): void {
  const src = `${CHARS}/Human_Soldier_Sword_Shield/No_Shadows/Human_Soldier_Sword_Shield_Walk-Sheet.png`;
  ctx.save();
  const classFilter: Record<ClassKey, string> = {
    warrior: 'none',
    mage: 'hue-rotate(72deg) saturate(1.25) brightness(1.08)',
    archer: 'hue-rotate(-38deg) saturate(1.25) brightness(1.04)',
  };
  ctx.filter = flash ? 'brightness(2.2) saturate(0.4)' : classFilter[playerClass];
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
  if (!drawn) drawPremiumProp(ctx, 'bush', x, y, w, h, frame);
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

export function drawPremiumSwordArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  progress: number,
): void {
  const sweep = Math.max(0, Math.min(1, progress));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.globalAlpha = 1 - sweep * 0.45;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ffd66a';
  ctx.strokeStyle = '#fff7d8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 28, -0.78 + sweep * 0.5, 0.78 + sweep * 0.5);
  ctx.stroke();
  ctx.strokeStyle = '#e8a833';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 22, -0.55 + sweep * 0.5, 0.55 + sweep * 0.5);
  ctx.stroke();
  ctx.fillStyle = '#fff1a6';
  for (let i = 0; i < 4; i++) {
    const a = -0.4 + i * 0.28 + sweep * 0.4;
    ctx.fillRect(Math.cos(a) * 30, Math.sin(a) * 30, 2, 2);
  }
  ctx.restore();
}

export function drawPremiumMagicBolt(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  color = '#a66cff',
): void {
  const pulse = 0.5 + Math.sin(time / 120) * 0.5;
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14 + pulse * 4);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(120,70,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 14 + pulse * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f0dcff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, time / 220, time / 220 + Math.PI * 1.25);
  ctx.stroke();
  ctx.restore();
}
