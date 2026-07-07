import { GameState } from '../../game/engine';
import { TILE_SIZE } from '../../game/dungeon';
import { bobOffset } from '../../game/sprites';
import { TINY_SEMANTIC_UI } from '../../game/tinyUiAssets';

const imageCache = new Map<string, HTMLImageElement>();

function image(src: string): HTMLImageElement | null {
  let value = imageCache.get(src);
  if (!value) {
    value = new Image();
    value.src = src;
    value.decoding = 'async';
    imageCache.set(src, value);
  }
  return value.complete && value.naturalWidth > 0 ? value : null;
}

export function isExplored(state: GameState, x: number, y: number): boolean {
  return !!state.map.explored[Math.floor(y / TILE_SIZE)]?.[Math.floor(x / TILE_SIZE)];
}

export function attractLoot(state: GameState): void {
  const player = state.player;
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  for (const item of state.items) {
    if (item.width < 26 || item.height < 26) {
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      item.width = 26;
      item.height = 26;
      item.x = cx - 13;
      item.y = cy - 13;
    }
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    const distance = Math.hypot(dx, dy);
    if (distance > 12 && distance < 120) {
      const pull = Math.max(2, (120 - distance) * 0.09);
      item.x += dx / distance * pull;
      item.y += dy / distance * pull;
    }
  }
}

export function drawLoot(ctx: CanvasRenderingContext2D, item: GameState['items'][number], now: number): void {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2 + bobOffset((now + item.spawnTime) / 2, 2.5);
  const potion = item.itemType === 'potion';
  const icon = image(potion ? TINY_SEMANTIC_UI.heal : TINY_SEMANTIC_UI.goldDrop);
  ctx.save();
  ctx.fillStyle = potion ? 'rgba(70,240,110,.32)' : 'rgba(255,208,70,.34)';
  ctx.shadowBlur = 18;
  ctx.shadowColor = potion ? '#55e97b' : '#ffc83d';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 9, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (icon) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(icon, cx - 17, cy - 17, 34, 34);
  }
  ctx.restore();
}
