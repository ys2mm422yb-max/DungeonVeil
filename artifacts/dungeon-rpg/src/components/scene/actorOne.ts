import * as art from '../../game/premiumPixelArt';
import { bobOffset } from '../../game/sprites';

export function drawActor(ctx: CanvasRenderingContext2D, actor: any, now: number): void {
  const moving = actor.state === 'chase' || actor.state === 'patrol';
  const frame = moving ? Math.floor((now - actor.spawnTime) / 120) : 0;
  const fade = actor.hp <= 0 ? 1 - Math.min(1, (now - actor.deathTime) / 400) : 1;
  const cx = actor.x + actor.width / 2;
  const cy = actor.y + actor.height / 2;
  ctx.save();
  ctx.translate(cx, cy + (moving ? bobOffset(now - actor.spawnTime, 1.1) : 0));
  ctx.scale(0.58 * fade, 0.58 * fade);
  ctx.translate(-cx, -cy);
  art.drawPremiumEnemy(ctx, actor.enemyType, actor.x, actor.y, actor.width, actor.height, frame, actor.flashUntil > now);
  ctx.restore();
}
