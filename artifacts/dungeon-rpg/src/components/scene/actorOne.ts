import * as art from '../../game/premiumPixelArt';
import { bobOffset } from '../../game/sprites';

export function drawActor(ctx: CanvasRenderingContext2D, actor: any, now: number): void {
  const moving = actor.state === 'chase' || actor.state === 'patrol';
  const frame = moving ? Math.floor((now - actor.spawnTime) / 120) : 0;
  const dead = actor.hp <= 0;
  const fade = dead ? 1 - Math.min(1, (now - actor.deathTime) / 400) : 1;
  const cx = actor.x + actor.width / 2;
  const cy = actor.y + actor.height / 2;
  const renderType = actor.enemyType === 'slime' ? 'goblin' : actor.enemyType;

  ctx.save();
  ctx.translate(cx, cy + (moving ? bobOffset(now - actor.spawnTime, 1.1) : 0));
  ctx.scale(0.58 * fade, 0.58 * fade);
  ctx.translate(-cx, -cy);
  art.drawPremiumEnemy(ctx, renderType, actor.x, actor.y, actor.width, actor.height, frame, actor.flashUntil > now);
  ctx.restore();

  if (!dead && (actor.hp < actor.maxHp || actor.state === 'chase')) {
    const width = Math.max(22, actor.width * 0.9);
    const height = 4;
    const x = cx - width / 2;
    const y = actor.y - 8;
    const pct = Math.max(0, Math.min(1, actor.hp / Math.max(1, actor.maxHp)));

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.82)';
    ctx.fillRect(Math.floor(x - 1), Math.floor(y - 1), Math.ceil(width + 2), height + 2);
    ctx.fillStyle = pct > .55 ? '#45c866' : pct > .25 ? '#d79d35' : '#d4473f';
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(width * pct), height);
    ctx.restore();
  }
}
