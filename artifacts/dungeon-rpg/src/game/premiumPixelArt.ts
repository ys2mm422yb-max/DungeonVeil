import { EnemyTypeName } from './sprites';

type TileKind =
  | 'grass'
  | 'road'
  | 'water'
  | 'broadTree'
  | 'pineTree'
  | 'house'
  | 'dungeonEntrance';

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

const P = 32;

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
}

function unit(x: number, y: number, w: number, h: number) {
  return { sx: w / P, sy: h / P, ox: x, oy: y };
}

function r(ctx: CanvasRenderingContext2D, u: ReturnType<typeof unit>, x: number, y: number, w: number, h: number, c: string) {
  px(ctx, u.ox + x * u.sx, u.oy + y * u.sy, w * u.sx, h * u.sy, c);
}

function blob(ctx: CanvasRenderingContext2D, u: ReturnType<typeof unit>, cx: number, cy: number, rx: number, ry: number, c: string) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(u.ox + cx * u.sx, u.oy + cy * u.sy, rx * u.sx, ry * u.sy, 0, 0, Math.PI * 2);
  ctx.fill();
}

function dotSeed(variant: number, i: number) {
  const n = Math.sin((variant + 1) * 97.17 + i * 43.71) * 43758.5453;
  return n - Math.floor(n);
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a = 0.28) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.86, w * 0.44, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function grass(ctx: CanvasRenderingContext2D, u: ReturnType<typeof unit>, variant: number) {
  r(ctx, u, 0, 0, 32, 32, '#2d6424');
  r(ctx, u, 0, 0, 32, 5, '#34732a');
  r(ctx, u, 0, 25, 32, 7, '#24541d');
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(dotSeed(variant, i) * 30) + 1;
    const y = Math.floor(dotSeed(variant + 5, i) * 28) + 2;
    const c = i % 5 === 0 ? '#9ad86d' : i % 3 === 0 ? '#1f4b1a' : '#3f8331';
    r(ctx, u, x, y, 1, i % 4 === 0 ? 3 : 2, c);
  }
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(dotSeed(variant + 11, i) * 24) + 4;
    const y = Math.floor(dotSeed(variant + 17, i) * 22) + 5;
    r(ctx, u, x, y, 2, 1, '#6dbb50');
  }
}

function road(ctx: CanvasRenderingContext2D, u: ReturnType<typeof unit>, variant: number) {
  grass(ctx, u, variant);
  r(ctx, u, 0, 7, 32, 18, '#6b5132');
  r(ctx, u, 0, 9, 32, 13, '#8c7044');
  r(ctx, u, 0, 13, 32, 6, '#ad915a');
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(dotSeed(variant + 21, i) * 30);
    const y = 8 + Math.floor(dotSeed(variant + 29, i) * 16);
    r(ctx, u, x, y, i % 2 ? 1 : 2, 1, i % 3 ? '#5b4028' : '#d2b978');
  }
  r(ctx, u, 0, 6, 32, 2, 'rgba(25,60,20,0.55)');
  r(ctx, u, 0, 24, 32, 2, 'rgba(25,60,20,0.55)');
}

function water(ctx: CanvasRenderingContext2D, u: ReturnType<typeof unit>, variant: number) {
  r(ctx, u, 0, 0, 32, 32, '#0b3449');
  r(ctx, u, 0, 0, 32, 9, '#104d69');
  r(ctx, u, 0, 23, 32, 9, '#072638');
  for (let i = 0; i < 7; i++) {
    const x = Math.floor((dotSeed(variant + 33, i) * 28) + 2);
    const y = Math.floor((dotSeed(variant + 37, i) * 24) + 4);
    r(ctx, u, x, y, 5, 1, i % 2 ? '#3cb5c5' : '#7de6ec');
    if (i % 3 === 0) r(ctx, u, x + 2, y + 1, 3, 1, '#166f8c');
  }
}

function broadTree(ctx: CanvasRenderingContext2D, u: ReturnType<typeof unit>, variant: number) {
  shadow(ctx, u.ox, u.oy, u.sx * P, u.sy * P, 0.35);
  r(ctx, u, 14, 18, 5, 11, '#5a351f');
  r(ctx, u, 18, 21, 3, 7, '#7c5230');
  blob(ctx, u, 16, 12, 13, 9, '#123a13');
  blob(ctx, u, 9, 16, 9, 7, '#1f5b1e');
  blob(ctx, u, 23, 16, 9, 7, '#2f792b');
  blob(ctx, u, 16, 8, 9, 6, '#45a23b');
  blob(ctx, u, 12, 12, 5, 4, '#67bf54');
  r(ctx, u, 20 + (variant % 3), 9, 3, 2, '#b7e779');
  r(ctx, u, 7, 21, 6, 3, '#0d290e');
}

function pineTree(ctx: CanvasRenderingContext2D, u: ReturnType<typeof unit>, variant: number) {
  shadow(ctx, u.ox, u.oy, u.sx * P, u.sy * P, 0.34);
  r(ctx, u, 15, 18, 3, 11, '#5b3a22');
  blob(ctx, u, 16, 23, 11, 5, '#0f3314');
  blob(ctx, u, 16, 18, 13, 6, '#1a501c');
  blob(ctx, u, 16, 13, 11, 6, '#267026');
  blob(ctx, u, 16, 8, 8, 5, '#3d9638');
  r(ctx, u, 12 + (variant % 5), 12, 3, 1, '#7ec45d');
}

function house(ctx: CanvasRenderingContext2D, u: ReturnType<typeof unit>, variant: number) {
  shadow(ctx, u.ox, u.oy, u.sx * P, u.sy * P, 0.42);
  r(ctx, u, 5, 15, 22, 13, '#8b5d35');
  r(ctx, u, 7, 17, 18, 10, '#bd8a50');
  r(ctx, u, 3, 10, 26, 5, variant % 2 ? '#933d2d' : '#6f3c26');
  r(ctx, u, 5, 7, 22, 6, variant % 2 ? '#c45a3e' : '#9e5130');
  r(ctx, u, 13, 21, 6, 7, '#342015');
  r(ctx, u, 8, 18, 5, 4, '#8fb8c4');
  r(ctx, u, 20, 18, 5, 4, '#8fb8c4');
  r(ctx, u, 9, 19, 3, 2, '#d6f0ff');
  r(ctx, u, 21, 19, 3, 2, '#d6f0ff');
  r(ctx, u, 23, 4, 3, 7, '#3b2518');
  r(ctx, u, 22, 3, 5, 2, '#d0b78a');
}

function dungeonEntrance(ctx: CanvasRenderingContext2D, u: ReturnType<typeof unit>, variant: number) {
  shadow(ctx, u.ox, u.oy, u.sx * P, u.sy * P, 0.45);
  blob(ctx, u, 16, 19, 14, 12, '#30383a');
  blob(ctx, u, 16, 18, 11, 9, '#677579');
  blob(ctx, u, 16, 20, 7, 8, '#082033');
  blob(ctx, u, 16, 19, 4 + (variant % 2), 5, '#1ec6ff');
  r(ctx, u, 7, 27, 18, 2, '#a0abae');
  r(ctx, u, 5, 25, 6, 3, '#526a4d');
  r(ctx, u, 22, 24, 5, 4, '#526a4d');
}

export function drawPremiumTile(ctx: CanvasRenderingContext2D, kind: TileKind, x: number, y: number, w: number, h: number, variant = 0) {
  const u = unit(x, y, w, h);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (kind === 'grass') grass(ctx, u, variant);
  else if (kind === 'road') road(ctx, u, variant);
  else if (kind === 'water') water(ctx, u, variant);
  else if (kind === 'broadTree') broadTree(ctx, u, variant);
  else if (kind === 'pineTree') pineTree(ctx, u, variant);
  else if (kind === 'house') house(ctx, u, variant);
  else dungeonEntrance(ctx, u, variant);
  ctx.restore();
}

export function drawPremiumProp(ctx: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, w: number, h: number, variant = 0) {
  const u = unit(x, y, w, h);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (kind === 'flowers') {
    grass(ctx, u, variant);
    for (let i = 0; i < 7; i++) {
      const dx = 7 + i * 3;
      const dy = 14 + (i % 3) * 3;
      r(ctx, u, dx, dy, 1, 5, '#2d6424');
      r(ctx, u, dx - 1, dy - 1, 3, 2, i % 2 ? '#d957ff' : '#fff1a5');
    }
  } else if (kind === 'bush') {
    grass(ctx, u, variant); blob(ctx, u, 16, 20, 12, 7, '#1e5a1c'); blob(ctx, u, 11, 17, 7, 5, '#3b8a31'); blob(ctx, u, 22, 18, 7, 5, '#61b34f');
  } else if (kind === 'rock' || kind === 'ruins') {
    grass(ctx, u, variant);
    blob(ctx, u, 16, 20, 11, 7, '#5d6862'); blob(ctx, u, 13, 16, 6, 4, '#9aa59c'); blob(ctx, u, 21, 21, 5, 4, '#3c4642');
    if (kind === 'ruins') { r(ctx, u, 8, 10, 4, 13, '#6b756e'); r(ctx, u, 20, 12, 4, 11, '#87928a'); r(ctx, u, 7, 9, 7, 2, '#a9b4aa'); }
  } else if (kind === 'log') {
    grass(ctx, u, variant); r(ctx, u, 8, 17, 16, 5, '#6a3f22'); r(ctx, u, 7, 16, 4, 7, '#b17d47'); r(ctx, u, 21, 16, 4, 7, '#4c2a18'); r(ctx, u, 9, 18, 14, 1, '#d9ad67');
  } else if (kind === 'mushrooms') {
    grass(ctx, u, variant); r(ctx, u, 12, 19, 2, 5, '#e8d1a1'); r(ctx, u, 20, 18, 2, 6, '#e8d1a1'); blob(ctx, u, 13, 18, 4, 3, '#b9532b'); blob(ctx, u, 21, 17, 5, 3, '#d957ff');
  } else if (kind === 'bridge') {
    water(ctx, u, variant); r(ctx, u, 2, 8, 28, 16, '#5b341d'); for (let yy = 9; yy < 24; yy += 5) r(ctx, u, 3, yy, 26, 3, '#bd8b54'); r(ctx, u, 5, 6, 3, 20, '#2f1a0f'); r(ctx, u, 24, 6, 3, 20, '#2f1a0f');
  } else if (kind === 'well') {
    grass(ctx, u, variant); blob(ctx, u, 16, 20, 8, 6, '#66726a'); blob(ctx, u, 16, 16, 6, 4, '#a9b4aa'); r(ctx, u, 12, 10, 8, 2, '#6a3f22');
  } else if (kind === 'fence') {
    grass(ctx, u, variant); for (let xx = 2; xx < 31; xx += 7) r(ctx, u, xx, 18, 3, 10, '#6a3f22'); r(ctx, u, 0, 21, 32, 3, '#b17d47'); r(ctx, u, 0, 25, 32, 2, '#8a5d34');
  } else {
    grass(ctx, u, variant); r(ctx, u, 8, 17, 17, 8, '#8a5d34'); r(ctx, u, 9, 16, 15, 3, '#bd8b54'); blob(ctx, u, 11, 26, 3, 3, '#2f1a0f'); blob(ctx, u, 22, 26, 3, 3, '#2f1a0f');
  }
  ctx.restore();
}

export function drawPremiumChest(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, opened: boolean) {
  const u = unit(x, y, w, h);
  ctx.save();
  shadow(ctx, x, y, w, h, 0.3);
  r(ctx, u, 5, opened ? 8 : 11, 22, 7, '#7a451e');
  r(ctx, u, 6, opened ? 10 : 13, 20, 5, '#d49b3c');
  r(ctx, u, 5, 18, 22, 9, '#6a3b1a');
  r(ctx, u, 7, 19, 18, 6, '#a96b2c');
  r(ctx, u, 15, 16, 3, 5, '#ffdf66');
  if (opened) r(ctx, u, 9, 13, 14, 3, '#fff0aa');
  ctx.restore();
}

export function drawPremiumPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame = 0, flipX = false, flash = false) {
  const u = unit(x, y, w, h);
  ctx.save();
  if (flash) ctx.filter = 'brightness(3)';
  if (flipX) { ctx.translate(x + w, y); ctx.scale(-1, 1); u.ox = 0; u.oy = 0; }
  const walk = frame % 2;
  r(ctx, u, 10, 22, 4, 7, '#273452'); r(ctx, u, 18, 22, 4, 7, '#273452');
  r(ctx, u, 9 + walk, 28, 6, 2, '#161922'); r(ctx, u, 17 - walk, 28, 6, 2, '#161922');
  r(ctx, u, 9, 14, 14, 10, '#496899'); r(ctx, u, 7, 16, 4, 10, '#7e2630'); r(ctx, u, 21, 16, 4, 10, '#7e2630');
  r(ctx, u, 11, 7, 10, 8, '#f0c48a'); r(ctx, u, 10, 5, 12, 5, '#4a2b1a'); r(ctx, u, 12, 10, 2, 2, '#17151f'); r(ctx, u, 18, 10, 2, 2, '#17151f');
  r(ctx, u, 24, 12, 2, 13, '#d8dce8'); r(ctx, u, 26, 10, 2, 5, '#ffffff'); r(ctx, u, 23, 24, 4, 2, '#b58a35');
  ctx.restore();
}

export function drawPremiumEnemy(ctx: CanvasRenderingContext2D, type: EnemyTypeName, x: number, y: number, w: number, h: number, frame = 0, flash = false) {
  const u = unit(x, y, w, h);
  ctx.save();
  if (flash) ctx.filter = 'brightness(3.4) saturate(1.5)';
  const walk = frame % 2;
  const isSkeleton = type === 'skeleton';
  const isGoblin = type === 'goblin' || type === 'orc';
  const body = isSkeleton ? '#d8d2c8' : isGoblin ? '#6f9a3d' : '#7046a0';
  const dark = isSkeleton ? '#6d665f' : isGoblin ? '#24391a' : '#321d4a';
  r(ctx, u, 10, 21, 4, 7, dark); r(ctx, u, 18, 21, 4, 7, dark);
  r(ctx, u, 9 + walk, 28, 6, 2, '#161616'); r(ctx, u, 17 - walk, 28, 6, 2, '#161616');
  r(ctx, u, 9, 14, 14, 9, body); r(ctx, u, 7, 17, 4, 7, dark); r(ctx, u, 21, 17, 4, 7, dark);
  r(ctx, u, 9, 7, 14, 9, body); r(ctx, u, 7, 9, 4, 4, body); r(ctx, u, 21, 9, 4, 4, body);
  r(ctx, u, 12, 10, 2, 2, '#111'); r(ctx, u, 18, 10, 2, 2, '#111');
  r(ctx, u, 14, 14, 5, 1, isSkeleton ? '#111' : '#ffd84a');
  if (isSkeleton) { r(ctx, u, 12, 17, 8, 1, '#f6f1e6'); r(ctx, u, 15, 18, 2, 6, '#f6f1e6'); }
  else { r(ctx, u, 22, 19, 7, 2, '#c9cfd2'); r(ctx, u, 27, 17, 2, 2, '#ffffff'); }
  ctx.restore();
}
