import { drawPremiumPlayer } from '../../game/premiumPixelArt';
import { bobOffset } from '../../game/sprites';

export function drawHero(ctx: CanvasRenderingContext2D, hero: any, now: number): void {
  const moving = hero.state === 'moving';
  const frame = moving ? Math.floor((now - hero.spawnTime) / 110) : 0;
  const cx = hero.x + hero.width / 2;
  const cy = hero.y + hero.height / 2;
  ctx.save();
  ctx.translate(cx, cy + (moving ? bobOffset(now - hero.spawnTime, 1.1) : 0));
  ctx.scale(0.48, 0.48);
  ctx.translate(-cx, -cy);
  drawPremiumPlayer(ctx, hero.x, hero.y, hero.width, hero.height, frame, hero.facing.x < 0, false, hero.playerClass, moving ? 'run' : 'idle');
  ctx.restore();
}
