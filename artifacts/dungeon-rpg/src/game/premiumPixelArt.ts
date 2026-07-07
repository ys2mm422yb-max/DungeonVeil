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
  | 'cart'
  | 'waterRock'
  | 'lilies'
  | 'torch'
  | 'shrine'
  | 'skull'
  | 'forge'
  | 'bookshelf'
  | 'barrel'
  | 'crate';

const TS = '/assets/rpg-pack/Tiny Swords/Tiny Swords (Update 010)';
const TS_FREE = '/assets/rpg-pack/Tiny Swords (Free Pack)/Tiny Swords (Free Pack)';

const TINY = {
  ground: `${TS}/Terrain/Ground/Tilemap_Flat.png`,
  elevation: `${TS}/Terrain/Ground/Tilemap_Elevation.png`,
  water: `${TS}/Terrain/Water/Water.png`,
  foam: `${TS}/Terrain/Water/Foam/Foam.png`,
  shadows: `${TS}/Terrain/Ground/Shadows.png`,
  tree: `${TS}/Resources/Trees/Tree.png`,
  bridge: `${TS}/Terrain/Bridge/Bridge_All.png`,
  freeGround: `${TS_FREE}/Terrain/Tileset/Tilemap_color1.png`,
  freeGroundAlt: `${TS_FREE}/Terrain/Tileset/Tilemap_color2.png`,
  freeWater: `${TS_FREE}/Terrain/Tileset/Water Background color.png`,
  freeFoam: `${TS_FREE}/Terrain/Tileset/Water Foam.png`,
  freeShadow: `${TS_FREE}/Terrain/Tileset/Shadow.png`,
  waterRocks: [
    `${TS}/Terrain/Water/Rocks/Rocks_01.png`,
    `${TS}/Terrain/Water/Rocks/Rocks_02.png`,
    `${TS}/Terrain/Water/Rocks/Rocks_03.png`,
    `${TS}/Terrain/Water/Rocks/Rocks_04.png`,
  ],
  deco: Array.from({ length: 18 }, (_, i) => `${TS}/Deco/${String(i + 1).padStart(2, '0')}.png`),
  houses: [
    `${TS_FREE}/Buildings/Blue Buildings/House1.png`,
    `${TS_FREE}/Buildings/Blue Buildings/House2.png`,
    `${TS_FREE}/Buildings/Blue Buildings/House3.png`,
    `${TS_FREE}/Buildings/Blue Buildings/Barracks.png`,
    `${TS_FREE}/Buildings/Blue Buildings/Archery.png`,
    `${TS_FREE}/Buildings/Blue Buildings/Monastery.png`,
    `${TS}/Factions/Knights/Buildings/House/House_Blue.png`,
    `${TS}/Factions/Knights/Buildings/House/House_Yellow.png`,
    `${TS}/Factions/Knights/Buildings/House/House_Red.png`,
    `${TS}/Factions/Knights/Buildings/Tower/Tower_Blue.png`,
  ],
  entrances: [
    `${TS_FREE}/Buildings/Purple Buildings/Castle.png`,
    `${TS_FREE}/Buildings/Black Buildings/Tower.png`,
    `${TS}/Factions/Knights/Buildings/Castle/Castle_Blue.png`,
    `${TS}/Factions/Knights/Buildings/Tower/Tower_Purple.png`,
    `${TS}/Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Destroyed.png`,
  ],
  chestClosed: `${TS}/Resources/Resources/G_Idle.png`,
  chestOpen: `${TS}/Resources/Resources/G_Spawn.png`,
  warrior: `${TS}/Factions/Knights/Troops/Warrior/Blue/Warrior_Blue.png`,
  mage: `${TS}/Factions/Knights/Troops/Pawn/Purple/Pawn_Purple.png`,
  archer: `${TS}/Factions/Knights/Troops/Archer/Blue/Archer_Blue.png`,
  units: {
    warrior: {
      idle: `${TS_FREE}/Units/Blue Units/Warrior/Warrior_Idle.png`,
      run: `${TS_FREE}/Units/Blue Units/Warrior/Warrior_Run.png`,
      attack: `${TS_FREE}/Units/Blue Units/Warrior/Warrior_Attack1.png`,
    },
    mage: {
      idle: `${TS_FREE}/Units/Purple Units/Monk/Idle.png`,
      run: `${TS_FREE}/Units/Purple Units/Monk/Run.png`,
      attack: `${TS_FREE}/Units/Purple Units/Monk/Heal.png`,
    },
    archer: {
      idle: `${TS_FREE}/Units/Yellow Units/Archer/Archer_Idle.png`,
      run: `${TS_FREE}/Units/Yellow Units/Archer/Archer_Run.png`,
      attack: `${TS_FREE}/Units/Yellow Units/Archer/Archer_Shoot.png`,
    },
    enemy: {
      goblin: `${TS_FREE}/Units/Red Units/Pawn/Pawn_Run Knife.png`,
      skeleton: `${TS_FREE}/Units/Black Units/Warrior/Warrior_Run.png`,
      slime: `${TS}/Factions/Goblins/Troops/Barrel/Purple/Barrel_Purple.png`,
    },
  },
  goblin: `${TS}/Factions/Goblins/Troops/Torch/Red/Torch_Red.png`,
  skeleton: `${TS}/Factions/Knights/Troops/Dead/Dead.png`,
  slime: `${TS}/Factions/Goblins/Troops/Barrel/Purple/Barrel_Purple.png`,
  arrow: `${TS}/Factions/Knights/Troops/Archer/Arrow/Arrow.png`,
  freeArrow: `${TS_FREE}/Units/Yellow Units/Archer/Arrow.png`,
  fire: `${TS}/Effects/Fire/Fire.png`,
  explosion: `${TS}/Effects/Explosion/Explosions.png`,
  dust: `${TS_FREE}/Particle FX/Dust_01.png`,
  fireSmall: `${TS_FREE}/Particle FX/Fire_01.png`,
  icons: Array.from({ length: 10 }, (_, i) => `${TS}/UI/Icons/Regular_${String(i + 1).padStart(2, '0')}.png`),
  uiIcons: Array.from({ length: 12 }, (_, i) => `${TS_FREE}/UI Elements/UI Elements/Icons/Icon_${String(i + 1).padStart(2, '0')}.png`),
  ui: {
    banner: `${TS_FREE}/UI Elements/UI Elements/Banners/Banner.png`,
    slots: `${TS_FREE}/UI Elements/UI Elements/Banners/Banner_Slots.png`,
    bigBarBase: `${TS_FREE}/UI Elements/UI Elements/Bars/BigBar_Base.png`,
    bigBarFill: `${TS_FREE}/UI Elements/UI Elements/Bars/BigBar_Fill.png`,
    smallBarBase: `${TS_FREE}/UI Elements/UI Elements/Bars/SmallBar_Base.png`,
    smallBarFill: `${TS_FREE}/UI Elements/UI Elements/Bars/SmallBar_Fill.png`,
    roundButtonBlue: `${TS_FREE}/UI Elements/UI Elements/Buttons/SmallBlueRoundButton_Regular.png`,
    roundButtonRed: `${TS_FREE}/UI Elements/UI Elements/Buttons/SmallRedRoundButton_Regular.png`,
    squareButtonBlue: `${TS_FREE}/UI Elements/UI Elements/Buttons/SmallBlueSquareButton_Regular.png`,
    squareButtonRed: `${TS_FREE}/UI Elements/UI Elements/Buttons/SmallRedSquareButton_Regular.png`,
  },
  buttons: {
    blue: `${TS}/UI/Buttons/Button_Blue.png`,
    red: `${TS}/UI/Buttons/Button_Red.png`,
  },
};

export const TINY_CLASS_SPRITES: Record<ClassKey, string> = {
  warrior: TINY.units.warrior.idle,
  mage: TINY.units.mage.idle,
  archer: TINY.units.archer.idle,
};

export const TINY_UI = TINY.ui;

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

function drawFirst(ctx: CanvasRenderingContext2D, srcs: string[], x: number, y: number, w: number, h: number): boolean {
  for (const src of srcs) {
    if (drawWhole(ctx, src, x, y, w, h)) return true;
  }
  return false;
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
  const safeIndex = Math.abs(tileIndex) % (cols * rows);
  const sx = (safeIndex % cols) * tileSize;
  const sy = Math.floor(safeIndex / cols) * tileSize;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, tileSize, tileSize, Math.floor(x) - 1, Math.floor(y) - 1, Math.ceil(w) + 2, Math.ceil(h) + 2);
  return true;
}

function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function seeded(variant: number, i: number): number {
  const n = Math.sin((variant + 1) * 91.13 + i * 37.71) * 43758.5453;
  return n - Math.floor(n);
}

function tint(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha;
  fill(ctx, x, y, w, h, color);
  ctx.restore();
}

function drawGroundBase(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, variant: number): void {
  fill(ctx, x, y, w, h, '#5e9b46');
  if (!drawTileCell(ctx, TINY.freeGround, 64, [0, 1, 2, 3, 9, 10, 11, 18][Math.abs(variant) % 8], x, y, w, h) &&
      !drawTileCell(ctx, TINY.ground, 64, [0, 1, 2, 3, 10, 11, 12, 13][Math.abs(variant) % 8], x, y, w, h)) {
    fill(ctx, x, y, w, h, '#4d8b3e');
  }
  if (variant % 5 === 0) tint(ctx, x, y, w, h, '#3f7a35', 0.16);
}

function drawTinyUnit(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
  flipX = false,
): boolean {
  return drawSheetFrame(ctx, src, 192, 192, frame, x, y, w, h, flipX);
}

function classSheet(playerClass: ClassKey, action: 'idle' | 'run' | 'attack'): string {
  return TINY.units[playerClass][action] ?? TINY_CLASS_SPRITES[playerClass];
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
      drawGroundBase(ctx, x, y, w, h, variant);
      return;
    case 'road':
      drawGroundBase(ctx, x, y, w, h, variant);
      if (drawTileCell(ctx, TINY.freeGroundAlt, 64, 22 + (Math.abs(variant) % 5), x, y, w, h) ||
          drawTileCell(ctx, TINY.ground, 64, 22 + (Math.abs(variant) % 5), x, y, w, h)) return;
      fill(ctx, x, y + h * 0.18, w, h * 0.62, '#9b7b4d');
      return;
    case 'water':
      fill(ctx, x, y, w, h, '#216f89');
      if (!drawWhole(ctx, TINY.freeWater, x - 1, y - 1, w + 2, h + 2) && !drawWhole(ctx, TINY.water, x - 1, y - 1, w + 2, h + 2)) fill(ctx, x, y, w, h, '#247aa0');
      return;
    case 'broadTree':
    case 'pineTree': {
      drawGroundBase(ctx, x, y + h * 0.42, w, h * 0.58, variant);
      const frame = kind === 'pineTree' ? 1 + (Math.abs(variant) % 6) : Math.abs(variant) % 10;
      drawSheetFrame(ctx, TINY.tree, 192, 192, frame, x - w * 0.10, y - h * 0.04, w * 1.20, h * 1.14);
      return;
    }
    case 'house':
      drawGroundBase(ctx, x, y + h * 0.32, w, h * 0.68, variant);
      drawWhole(ctx, TINY.houses[Math.abs(variant) % TINY.houses.length], x - w * 0.45, y - h * 0.92, w * 1.9, h * 2.2);
      return;
    case 'dungeonEntrance':
      drawGroundBase(ctx, x, y + h * 0.46, w, h * 0.54, variant);
      drawWhole(ctx, TINY.entrances[Math.abs(variant) % TINY.entrances.length], x - w * 0.55, y - h * 1.15, w * 2.15, h * 2.55);
      return;
    case 'wall':
      if (!drawTileCell(ctx, TINY.freeGroundAlt, 64, 28 + (Math.abs(variant) % 8), x, y, w, h) &&
          !drawTileCell(ctx, TINY.elevation, 64, 8 + (Math.abs(variant) % 12), x, y, w, h)) fill(ctx, x, y, w, h, '#5d604e');
      tint(ctx, x, y, w, h, '#6a5c45', 0.2);
      return;
    case 'floor':
      if (!drawTileCell(ctx, TINY.freeGroundAlt, 64, 30 + (Math.abs(variant) % 8), x, y, w, h) &&
          !drawTileCell(ctx, TINY.ground, 64, 30 + (Math.abs(variant) % 8), x, y, w, h)) fill(ctx, x, y, w, h, '#686055');
      tint(ctx, x, y, w, h, '#7b6a58', 0.24);
      return;
    case 'door':
      drawTileCell(ctx, TINY.elevation, 64, 13 + (Math.abs(variant) % 3), x, y, w, h);
      fill(ctx, x + w * 0.34, y + h * 0.25, w * 0.32, h * 0.58, '#5e3b25');
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
      drawWhole(ctx, TINY.deco[Math.abs(variant) % 6], x - w * 0.15, y - h * 0.15, w * 1.3, h * 1.3);
      return;
    case 'bush':
      drawWhole(ctx, TINY.deco[6 + (Math.abs(variant) % 4)], x - w * 0.1, y - h * 0.1, w * 1.2, h * 1.2);
      return;
    case 'rock':
      drawWhole(ctx, TINY.deco[10 + (Math.abs(variant) % 4)], x, y, w, h);
      return;
    case 'ruins':
      drawFirst(ctx, [TINY.deco[14], TINY.entrances[2], TINY.houses[3]], x - w * 0.35, y - h * 0.45, w * 1.7, h * 1.8);
      return;
    case 'log':
      drawWhole(ctx, `${TS}/Resources/Resources/W_Idle.png`, x - w * 0.35, y - h * 0.35, w * 1.7, h * 1.7);
      return;
    case 'mushrooms':
      drawWhole(ctx, TINY.deco[15 + (Math.abs(variant) % 3)], x - w * 0.2, y - h * 0.2, w * 1.4, h * 1.4);
      return;
    case 'bridge':
      if (!drawSheetFrame(ctx, TINY.bridge, 192, 192, variant, x - w * 0.15, y - h * 0.28, w * 1.3, h * 1.52)) {
        fill(ctx, x, y + h * 0.25, w, h * 0.48, '#8a5f34');
      }
      return;
    case 'waterRock':
      drawWhole(ctx, TINY.waterRocks[Math.abs(variant) % TINY.waterRocks.length], x - w * 0.1, y - h * 0.1, w * 1.2, h * 1.2);
      return;
    case 'lilies':
      drawWhole(ctx, TINY.waterRocks[Math.abs(variant + 1) % TINY.waterRocks.length], x - w * 0.05, y - h * 0.05, w * 1.1, h * 1.1);
      return;
    case 'well':
      drawWhole(ctx, `${TS}/Resources/Gold Mine/GoldMine_Inactive.png`, x - w * 0.55, y - h * 0.85, w * 2.1, h * 2.25);
      return;
    case 'fence':
      drawWhole(ctx, TINY.deco[variant % 2 === 0 ? 16 : 17], x - w * 0.2, y - h * 0.28, w * 1.4, h * 1.5);
      return;
    case 'cart':
      drawWhole(ctx, `${TS}/Resources/Resources/W_Idle_(NoShadow).png`, x - w * 0.25, y - h * 0.25, w * 1.5, h * 1.5);
      return;
    case 'torch':
      if (!drawSheetFrame(ctx, TINY.fire, 192, 192, variant, x - w * 1.1, y - h * 1.55, w * 3.2, h * 3.2)) {
        ellipse(ctx, x + w * 0.5, y + h * 0.25, w * 0.18, h * 0.18, '#ffb545');
      }
      fill(ctx, x + w * 0.42, y + h * 0.48, w * 0.16, h * 0.42, '#5c3a20');
      return;
    case 'shrine':
      drawWhole(ctx, TINY.entrances[1], x - w * 0.65, y - h * 1.05, w * 2.3, h * 2.4);
      return;
    case 'skull':
      drawWhole(ctx, TINY.deco[13], x - w * 0.1, y - h * 0.1, w * 1.2, h * 1.2);
      return;
    case 'forge':
      drawWhole(ctx, `${TS}/Resources/Gold Mine/GoldMine_Active.png`, x - w * 0.7, y - h * 0.95, w * 2.4, h * 2.45);
      return;
    case 'bookshelf':
      drawWhole(ctx, TINY.houses[3], x - w * 0.55, y - h * 0.95, w * 2.1, h * 2.25);
      return;
    case 'barrel':
      drawWhole(ctx, `${TS}/Factions/Goblins/Troops/Barrel/Blue/Barrel_Blue.png`, x - w * 0.62, y - h * 0.75, w * 2.2, h * 2.2);
      return;
    case 'crate':
      drawWhole(ctx, `${TS}/Resources/Resources/W_Idle.png`, x - w * 0.62, y - h * 0.75, w * 2.2, h * 2.2);
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
  const src = opened ? TINY.chestOpen : TINY.chestClosed;
  if (!drawSheetFrame(ctx, src, 192, 192, opened ? 3 : 0, x - w * 0.72, y - h * 0.82, w * 2.45, h * 2.45)) {
    drawPremiumProp(ctx, 'cart', x, y, w, h, opened ? 1 : 0);
  }
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
  action: 'idle' | 'run' | 'attack' = 'idle',
): void {
  const src = classSheet(playerClass, action);
  ctx.save();
  if (flash) ctx.filter = 'brightness(2.2) saturate(0.45)';
  const drawn = drawTinyUnit(ctx, src, x - w * 1.52, y - h * 1.72, w * 4.05, h * 4.2, frame, flipX) ||
    drawTinyUnit(ctx, TINY_CLASS_SPRITES[playerClass], x - w * 1.34, y - h * 1.55, w * 3.65, h * 3.85, frame, flipX);
  ctx.restore();
  if (!drawn) {
    ellipse(ctx, x + w * 0.5, y + h * 0.55, w * 0.42, h * 0.42, '#4d8bd8');
  }
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
  const src = enemyType === 'skeleton' ? TINY.units.enemy.skeleton : enemyType === 'slime' ? TINY.units.enemy.slime : TINY.units.enemy.goblin;
  ctx.save();
  if (flash) ctx.filter = 'brightness(2.35) saturate(0.5)';
  const scale = enemyType === 'skeleton' ? 3.75 : 3.35;
  const drawn = drawTinyUnit(ctx, src, x - w * 1.18, y - h * 1.42, w * scale, h * scale, frame) ||
    drawTinyUnit(ctx, enemyType === 'skeleton' ? TINY.skeleton : enemyType === 'slime' ? TINY.slime : TINY.goblin, x - w * 1.02, y - h * 1.22, w * 3.05, h * 3.05, frame);
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
  if (!drawWhole(ctx, TINY.freeArrow, -length * 0.55, -length * 0.20, length * 1.1, length * 0.4) &&
      !drawWhole(ctx, TINY.arrow, -length * 0.55, -length * 0.20, length * 1.1, length * 0.4)) {
    ctx.strokeStyle = '#eadfbd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-length * 0.45, 0);
    ctx.lineTo(length * 0.42, 0);
    ctx.stroke();
  }
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
  ctx.globalAlpha = 1 - sweep * 0.4;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ffd66a';
  ctx.strokeStyle = '#fff7d8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 30, -0.72 + sweep * 0.45, 0.72 + sweep * 0.45);
  ctx.stroke();
  ctx.strokeStyle = '#f0bd45';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 24, -0.50 + sweep * 0.45, 0.50 + sweep * 0.45);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = -0.36 + i * 0.18 + sweep * 0.5;
    fill(ctx, Math.cos(a) * (30 + seeded(progress * 100, i) * 8), Math.sin(a) * 30, 2, 2, '#fff1a6');
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
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  if (!drawSheetFrame(ctx, TINY.explosion, 192, 192, Math.floor(time / 90), cx - 18, cy - 18, 36, 36)) {
    const pulse = 0.5 + Math.sin(time / 120) * 0.5;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14 + pulse * 4);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, color);
    grad.addColorStop(1, 'rgba(120,70,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 14 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function getTinyIcon(index: number): string {
  return TINY.uiIcons[Math.abs(index) % TINY.uiIcons.length] ?? TINY.icons[Math.abs(index) % TINY.icons.length];
}

export function drawPremiumIcon(
  ctx: CanvasRenderingContext2D,
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (!drawWhole(ctx, getTinyIcon(index), x, y, w, h)) {
    ellipse(ctx, x + w * 0.5, y + h * 0.5, w * 0.38, h * 0.38, '#f3c763');
  }
}
