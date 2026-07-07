import { GameState } from '../../game/engine';
import { drawPremiumSwordArc } from '../../game/premiumPixelArt';

export function drawSceneOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const effect of state.effects) {
    const progress = effect.lifeTime / effect.maxLifeTime;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);

    if (effect.type === 'slash') {
      drawPremiumSwordArc(ctx, effect.x, effect.y, effect.angle ?? 0, progress);
    } else if (effect.type === 'circle') {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const gradient = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, effect.radius);
      gradient.addColorStop(0, effect.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  for (const damage of state.damageNumbers) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - damage.lifeTime / damage.maxLifeTime);
    ctx.font = `bold ${Math.round(14 * (damage.scale ?? 1))}px monospace`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(damage.value, damage.x, damage.y);
    ctx.fillStyle = damage.color;
    ctx.fillText(damage.value, damage.x, damage.y);
    ctx.restore();
  }
}
