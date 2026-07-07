import type { GameState } from './engine';
import { TileType } from './dungeon';
import { drawPremiumTile } from './premiumPixelArt';

export type SceneJob = { y: number; draw: () => void };

type SceneObjectKind = 'tree' | 'pine' | 'house' | 'entrance' | 'cliff' | 'bridge' | 'torch' | 'flowers' | 'bush' | 'rock' | 'mushrooms' | 'skull' | 'barrel' | 'crate';

const TS = '/assets/rpg-pack/Tiny Swords/Tiny Swords (Update 010)';
const FREE = '/assets/rpg-pack/Tiny Swords (Free Pack)/Tiny Swords (Free Pack)';
const ASSETS = {
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
  ],
  entrances: [
    `${FREE}/Buildings/Purple Buildings/Castle.png`,
    `${FREE}/Buildings/Black Buildings/Tower.png`,
    `${TS}/Factions/Knights/Buildings/Castle/Castle_Blue.png`,
    `${TS}/Factions/Knights/Buildings/Tower/Tower_Purple.png`,
  ],
  deco: Array.from({ length: 18 }, (_, i) => `${TS}/Deco/${String(i + 1).padStart(2, '0')}.png`),
  barrel: `${TS}/Factions/Goblins/Troops/Barrel/Blue/Barrel_Blue.png`,
  crate: `${TS}/Resources/Resources/W_Idle.png`,
};

const cache = new Map<string, HTMLImageElement>();
function img(src: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let image = cache.get(src);
  if (!image) {
    image = new Image();
    image.decoding = 'async';
    image.src = src;
    cache.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

function whole(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, w: number, h: number): boolean {
  const image = img(src);
  if (!image) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  return true;
}

function frame(ctx: CanvasRenderingContext2D, src: string, fw: number, fh: number, n: number, x: number, y: number, w: number, h: number): boolean {
  const image = img(src);
  if (!image) return false;
  const cols = Math.max(1, Math.floor(image.naturalWidth / fw));
  const rows = Math.max(1, Math.floor(image.naturalHeight / fh));
  const q = Math.abs(Math.floor(n)) % (cols * rows);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, (q % cols) * fw, Math.floor(q / cols) * fh, fw, fh, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  return true;
}

function tile(ctx: CanvasRenderingContext2D, src: string, size: number, n: number, x: number, y: number, w: number, h: number): boolean {
  const image = img(src);
  if (!image) return false;
  const cols = Math.max(1, Math.floor(image.naturalWidth / size));
  const rows = Math.max(1, Math.floor(image.naturalHeight / size));
  const q = Math.abs(Math.floor(n)) % (cols * rows);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, (q % cols) * size, Math.floor(q / cols) * size, size, size, Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
  return true;
}

export function stableHash(x: number, y: number, salt = 0): number {
  let h = ((x * 374761393 + y * 1234567891 + salt * 668265263) & 0x7fffffff);
  h = ((h ^ (h >>> 13)) * 1540483477) & 0x7fffffff;
  return Math.abs((h ^ (h >>> 15)) / 0x7fffffff);
}

function drawGrass(ctx: CanvasRenderingContext2D, x: number, y: number, hash: number): void {
  ctx.fillStyle = hash > 0.66 ? '#619a47' : hash > 0.33 ? '#5f9644' : '#5b9141';
  ctx.fillRect(x, y, 41, 41);
  if (hash > 0.82) {
    ctx.fillStyle = 'rgba(37,96,42,.14)';
    ctx.fillRect(x + 7, y + 8, 2, 2);
    ctx.fillRect(x + 27, y + 24, 2, 2);
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, map: GameState['map'], tx: number, ty: number, x: number, y: number): void {
  drawGrass(ctx, x, y, stableHash(tx, ty, 5));
  const isRoad = (xx: number, yy: number) => {
    const t = map.tiles[yy]?.[xx];
    return t === TileType.ROAD || t === TileType.BRIDGE || t === TileType.VILLAGE || t === TileType.DUNGEON_ENTRANCE;
  };
  ctx.fillStyle = '#9a7447';
  ctx.fillRect(x + 12, y + 12, 16, 16);
  if (isRoad(tx, ty - 1)) ctx.fillRect(x + 12, y, 16, 20);
  if (isRoad(tx, ty + 1)) ctx.fillRect(x + 12, y + 20, 16, 21);
  if (isRoad(tx - 1, ty)) ctx.fillRect(x, y + 12, 20, 16);
  if (isRoad(tx + 1, ty)) ctx.fillRect(x + 20, y + 12, 21, 16);
  ctx.fillStyle = 'rgba(225,194,126,.14)';
  ctx.fillRect(x + 15, y + 14, 2, 2);
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number, hash: number, now: number): void {
  ctx.fillStyle = '#2488a2';
  ctx.fillRect(x, y, 41, 41);
  const phase = ((now / 700) + hash * 10) % 1;
  ctx.fillStyle = 'rgba(126,220,228,.18)';
  ctx.fillRect(x + 4, y + 8 + phase * 10, 15, 2);
  ctx.fillRect(x + 22, y + 25 - phase * 7, 12, 2);
}

function drawSceneObject(ctx: CanvasRenderingContext2D, kind: SceneObjectKind, x: number, y: number, w: number, h: number, variant = 0, animFrame = 0): void {
  if (kind === 'tree' || kind === 'pine') {
    frame(ctx, ASSETS.tree, 192, 192, kind === 'pine' ? 1 + Math.abs(variant) % 6 : Math.abs(variant) % 10, x, y, w, h);
    return;
  }
  if (kind === 'house') { whole(ctx, ASSETS.houses[Math.abs(variant) % ASSETS.houses.length], x, y, w, h); return; }
  if (kind === 'entrance') { whole(ctx, ASSETS.entrances[Math.abs(variant) % ASSETS.entrances.length], x, y, w, h); return; }
  if (kind === 'cliff') { tile(ctx, ASSETS.elevation, 64, 8 + Math.abs(variant) % 12, x, y, w, h); return; }
  if (kind === 'bridge') { frame(ctx, ASSETS.bridge, 192, 192, 0, x, y, w, h); return; }
  if (kind === 'torch') { frame(ctx, ASSETS.fire, 192, 192, animFrame, x, y, w, h); return; }
  if (kind === 'flowers') { whole(ctx, ASSETS.deco[Math.abs(variant) % 6], x, y, w, h); return; }
  if (kind === 'bush') { whole(ctx, ASSETS.deco[6 + Math.abs(variant) % 4], x, y, w, h); return; }
  if (kind === 'rock') { whole(ctx, ASSETS.deco[10 + Math.abs(variant) % 4], x, y, w, h); return; }
  if (kind === 'mushrooms') { whole(ctx, ASSETS.deco[15 + Math.abs(variant) % 3], x, y, w, h); return; }
  if (kind === 'skull') { whole(ctx, ASSETS.deco[13], x, y, w, h); return; }
  if (kind === 'barrel') { frame(ctx, ASSETS.barrel, 192, 192, 0, x, y, w, h); return; }
  frame(ctx, ASSETS.crate, 192, 192, 0, x, y, w, h);
}

function exploredNeighborCount(map: GameState['map'], tx: number, ty: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (map.explored[ty + dy]?.[tx + dx]) count++;
  return count;
}

export function renderSceneTerrain(ctx: CanvasRenderingContext2D, state: GameState, now: number, x0: number, x1: number, y0: number, y1: number): SceneJob[] {
  const map = state.map;
  const jobs: SceneJob[] = [];
  const bridgeStarts = new Set<string>();

  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      const type = map.tiles[ty]?.[tx];
      if (type === undefined || type === TileType.EMPTY) continue;
      const x = tx * 40;
      const y = ty * 40;
      const hash = stableHash(tx, ty);
      const seen = !!map.explored[ty]?.[tx];

      if (type === TileType.WATER || type === TileType.WATERFALL || type === TileType.BRIDGE) drawWater(ctx, x, y, hash, now);
      else if (type === TileType.ROAD || type === TileType.VILLAGE || type === TileType.DUNGEON_ENTRANCE) drawRoad(ctx, map, tx, ty, x, y);
      else if (type === TileType.WALL) drawPremiumTile(ctx, 'wall', x, y, 40, 40, map.wallVariant[ty]?.[tx] ?? 0);
      else if (type === TileType.FLOOR || type === TileType.DOOR || type === TileType.STAIRS_DOWN) drawPremiumTile(ctx, 'floor', x, y, 40, 40, Math.min(3, map.floorVariant[ty]?.[tx] ?? 0));
      else if (type === TileType.CLIFF) {
        drawGrass(ctx, x, y, hash);
        drawSceneObject(ctx, 'cliff', x, y + 9, 40, 38, tx + ty);
      } else drawGrass(ctx, x, y, hash);

      if (!seen) {
        const nearSeen = exploredNeighborCount(map, tx, ty) > 0;
        ctx.fillStyle = nearSeen ? 'rgba(8,18,12,.48)' : 'rgba(5,11,8,.72)';
        ctx.fillRect(x, y, 41, 41);
        continue;
      }

      if (type === TileType.FOREST) {
        const pine = (map.wallVariant[ty]?.[tx] ?? 0) === 1;
        const ox = stableHash(tx, ty, 5) * 9 - 4;
        jobs.push({ y: y + 35, draw: () => drawSceneObject(ctx, pine ? 'pine' : 'tree', x - 21 + ox, y - 49, 80, 88, tx * 13 + ty * 17) });
        if (hash > .88) jobs.push({ y: y + 31, draw: () => drawSceneObject(ctx, pine ? 'tree' : 'pine', x + 7 - ox, y - 45, 62, 72, tx * 19 + ty) });
      } else if (type === TileType.VILLAGE) {
        const n = Math.floor(stableHash(tx, ty, 21) * ASSETS.houses.length);
        jobs.push({ y: y + 36, draw: () => drawSceneObject(ctx, 'house', x - 18, y - 42, 76, 78, n) });
      } else if (type === TileType.DUNGEON_ENTRANCE) {
        const n = Math.floor(stableHash(tx, ty, 91) * ASSETS.entrances.length);
        jobs.push({ y: y + 36, draw: () => drawSceneObject(ctx, 'entrance', x - 24, y - 52, 88, 92, n) });
      } else if (type === TileType.STAIRS_DOWN) {
        jobs.push({ y: y + 36, draw: () => drawSceneObject(ctx, 'entrance', x - 18, y - 36, 76, 78, 1) });
      }

      if (type === TileType.BRIDGE) {
        const horizontal = map.tiles[ty]?.[tx - 1] === TileType.BRIDGE || map.tiles[ty]?.[tx + 1] === TileType.BRIDGE;
        const prev = horizontal ? map.tiles[ty]?.[tx - 1] : map.tiles[ty - 1]?.[tx];
        const key = `${tx},${ty}`;
        if (prev !== TileType.BRIDGE && !bridgeStarts.has(key)) {
          let len = 1;
          while ((horizontal ? map.tiles[ty]?.[tx + len] : map.tiles[ty + len]?.[tx]) === TileType.BRIDGE) len++;
          bridgeStarts.add(key);
          const bx = horizontal ? x - 6 : x - 8;
          const by = horizontal ? y - 9 : y - 8;
          const bw = horizontal ? len * 40 + 12 : 56;
          const bh = horizontal ? 58 : len * 40 + 16;
          jobs.push({ y: y + len * 40, draw: () => drawSceneObject(ctx, 'bridge', bx, by, bw, bh, 0) });
        }
      }

      if (!state.inDungeon && type === TileType.GRASS) {
        const kind = hash < .018 ? 'flowers' : hash < .034 ? 'bush' : hash < .046 ? 'rock' : hash < .056 ? 'mushrooms' : null;
        if (kind) jobs.push({ y: y + 31, draw: () => drawSceneObject(ctx, kind, x + 9, y + 13, 20, 18, tx + ty) });
      }
      if (state.inDungeon && type === TileType.FLOOR && hash < .025) {
        const kind = hash < .009 ? 'skull' : hash < .017 ? 'barrel' : 'crate';
        jobs.push({ y: y + 31, draw: () => drawSceneObject(ctx, kind, x + 10, y + 13, 20, 18, tx + ty) });
      }
    }
  }

  for (const torch of map.torches) {
    if (!map.explored[torch.ty]?.[torch.tx] || torch.tx < x0 - 1 || torch.tx > x1 + 1 || torch.ty < y0 - 1 || torch.ty > y1 + 1) continue;
    const x = torch.tx * 40;
    const y = torch.ty * 40;
    jobs.push({ y: y + 25, draw: () => {
      drawSceneObject(ctx, 'torch', x - 13, y - 22, 66, 66, 0, Math.floor((now + torch.tx * 91) / 110));
      const glow = ctx.createRadialGradient(x + 20, y + 14, 2, x + 20, y + 14, 44);
      glow.addColorStop(0, 'rgba(255,145,45,.25)');
      glow.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 24, y - 30, 88, 88);
    } });
  }

  return jobs;
}
