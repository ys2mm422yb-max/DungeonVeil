import type { GameState } from '../../game/engine';
import { TileType } from '../../game/dungeon';

function exploredNeighborCount(map: GameState['map'], tx: number, ty: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (map.explored[ty + dy]?.[tx + dx]) count++;
    }
  }
  return count;
}

export function drawSceneFog(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): void {
  const map = state.map;
  const soft = new Path2D();
  const medium = new Path2D();
  const dense = new Path2D();
  let hasSoft = false;
  let hasMedium = false;
  let hasDense = false;

  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      const type = map.tiles[ty]?.[tx];
      if (type === undefined || type === TileType.EMPTY || map.explored[ty]?.[tx]) continue;

      const neighbors = exploredNeighborCount(map, tx, ty);
      const x = tx * 40 - 5;
      const y = ty * 40 - 5;

      if (neighbors >= 4) {
        soft.rect(x, y, 51, 51);
        hasSoft = true;
      } else if (neighbors > 0) {
        medium.rect(x, y, 51, 51);
        hasMedium = true;
      } else {
        dense.rect(x, y, 51, 51);
        hasDense = true;
      }
    }
  }

  if (hasSoft) {
    ctx.fillStyle = 'rgba(5,11,8,.38)';
    ctx.fill(soft);
  }
  if (hasMedium) {
    ctx.fillStyle = 'rgba(5,11,8,.56)';
    ctx.fill(medium);
  }
  if (hasDense) {
    ctx.fillStyle = 'rgba(5,11,8,.78)';
    ctx.fill(dense);
  }
}
