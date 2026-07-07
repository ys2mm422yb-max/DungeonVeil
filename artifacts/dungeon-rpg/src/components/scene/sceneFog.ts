import type { GameState } from '../../game/engine';

const MASK_SCALE = 4;

type FogCache = {
  map: GameState['map'] | null;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  signature: string;
  canvas: HTMLCanvasElement | null;
};

const cache: FogCache = {
  map: null,
  x0: -1,
  x1: -1,
  y0: -1,
  y1: -1,
  signature: '',
  canvas: null,
};

function explorationSignature(state: GameState, x0: number, x1: number, y0: number, y1: number): string {
  const explored = state.map.explored;
  let signature = '';
  for (let ty = y0; ty < y1; ty++) {
    let row = 0;
    let bit = 1;
    for (let tx = x0; tx < x1; tx++) {
      if (explored[ty]?.[tx]) row |= bit;
      bit <<= 1;
      if (bit === 0x40000000) {
        signature += `${row.toString(36)}.`;
        row = 0;
        bit = 1;
      }
    }
    signature += `${row.toString(36)}|`;
  }
  return signature;
}

function rebuildFogMask(state: GameState, x0: number, x1: number, y0: number, y1: number, signature: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  const widthTiles = Math.max(1, x1 - x0);
  const heightTiles = Math.max(1, y1 - y0);
  const canvas = cache.canvas ?? document.createElement('canvas');
  canvas.width = widthTiles * MASK_SCALE;
  canvas.height = heightTiles * MASK_SCALE;
  const mask = canvas.getContext('2d');
  if (!mask) return null;

  mask.clearRect(0, 0, canvas.width, canvas.height);
  mask.fillStyle = 'rgba(3,8,6,.92)';
  mask.fillRect(0, 0, canvas.width, canvas.height);
  mask.globalCompositeOperation = 'destination-out';

  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      if (!state.map.explored[ty]?.[tx]) continue;
      const cx = (tx - x0 + 0.5) * MASK_SCALE;
      const cy = (ty - y0 + 0.5) * MASK_SCALE;
      const radius = MASK_SCALE * 1.7;
      const gradient = mask.createRadialGradient(cx, cy, MASK_SCALE * 0.38, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(0.58, 'rgba(0,0,0,.96)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      mask.fillStyle = gradient;
      mask.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
  }

  mask.globalCompositeOperation = 'source-over';
  cache.map = state.map;
  cache.x0 = x0;
  cache.x1 = x1;
  cache.y0 = y0;
  cache.y1 = y1;
  cache.signature = signature;
  cache.canvas = canvas;
  return canvas;
}

export function drawSceneFog(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): void {
  const signature = explorationSignature(state, x0, x1, y0, y1);
  const validCache = cache.map === state.map && cache.x0 === x0 && cache.x1 === x1 && cache.y0 === y0 && cache.y1 === y1 && cache.signature === signature;
  const mask = validCache ? cache.canvas : rebuildFogMask(state, x0, x1, y0, y1, signature);
  if (!mask) return;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = 0.98;
  ctx.drawImage(mask, x0 * 40, y0 * 40, (x1 - x0) * 40, (y1 - y0) * 40);
  ctx.restore();
}
