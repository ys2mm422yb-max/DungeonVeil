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

  mask.globalCompositeOperation = 'source-over';
  mask.globalAlpha = 1;
  mask.clearRect(0, 0, canvas.width, canvas.height);
  mask.fillStyle = 'rgba(3,8,6,.94)';
  mask.fillRect(0, 0, canvas.width, canvas.height);
  mask.globalCompositeOperation = 'destination-out';
  mask.fillStyle = '#000';

  const exploredCells: Array<{ x: number; y: number }> = [];
  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      if (!state.map.explored[ty]?.[tx]) continue;
      exploredCells.push({ x: (tx - x0) * MASK_SCALE, y: (ty - y0) * MASK_SCALE });
    }
  }

  mask.globalAlpha = 0.18;
  for (const cell of exploredCells) mask.fillRect(cell.x - 5, cell.y - 5, MASK_SCALE + 10, MASK_SCALE + 10);

  mask.globalAlpha = 0.34;
  for (const cell of exploredCells) mask.fillRect(cell.x - 3, cell.y - 3, MASK_SCALE + 6, MASK_SCALE + 6);

  mask.globalAlpha = 0.62;
  for (const cell of exploredCells) mask.fillRect(cell.x - 1, cell.y - 1, MASK_SCALE + 2, MASK_SCALE + 2);

  mask.globalAlpha = 1;
  for (const cell of exploredCells) mask.fillRect(cell.x, cell.y, MASK_SCALE, MASK_SCALE);

  mask.globalCompositeOperation = 'source-over';
  mask.globalAlpha = 1;

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
  ctx.drawImage(mask, x0 * 40, y0 * 40, (x1 - x0) * 40, (y1 - y0) * 40);
  ctx.restore();
}
