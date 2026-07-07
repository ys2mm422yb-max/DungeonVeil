import { GameState } from '../../game/engine';
import { drawPremiumChest, drawPremiumProp } from '../../game/premiumPixelArt';
import { getSaveShrines } from '../../game/saveShrines';
import { SceneJob } from '../../game/overworldSprites';
import { drawActor } from './actorOne';
import { drawHero } from './actorTwo';
import { drawLoot, isExplored } from './sceneRenderUtils';

export function addSceneJobs(ctx: CanvasRenderingContext2D, state: GameState, jobs: SceneJob[], now: number): void {
  for (const shrine of getSaveShrines(state.map, state.inDungeon, state.floor)) {
    const x = shrine.tx * 40;
    const y = shrine.ty * 40;
    if (!isExplored(state, x + 20, y + 20)) continue;
    jobs.push({
      y: y + 38,
      draw: () => {
        const wave = (Math.sin((now + shrine.tx * 73) / 300) + 1) / 2;
        const pulse = 0.24 + wave * 0.14;
        const glow = ctx.createRadialGradient(x + 20, y + 14, 4, x + 20, y + 14, 58);
        glow.addColorStop(0, `rgba(205,160,255,${pulse})`);
        glow.addColorStop(0.45, `rgba(142,76,230,${pulse * 0.7})`);
        glow.addColorStop(1, 'rgba(72,20,150,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 40, y - 46, 120, 120);

        ctx.save();
        ctx.strokeStyle = `rgba(197,145,255,${0.5 + wave * 0.35})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 28, 24 + wave * 3, 9 + wave, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        drawPremiumProp(ctx, 'shrine', x - 18, y - 34, 76, 82, shrine.tx + shrine.ty);

        const runeY = y - 34 - wave * 7;
        ctx.save();
        ctx.translate(x + 20, runeY);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = `rgba(221,190,255,${0.78 + wave * 0.22})`;
        ctx.fillRect(-6, -6, 12, 12);
        ctx.strokeStyle = 'rgba(116,49,210,.95)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-6, -6, 12, 12);
        ctx.restore();
      },
    });
  }

  for (const chest of state.chests) {
    if (!isExplored(state, chest.x + chest.width / 2, chest.y + chest.height / 2)) continue;
    jobs.push({ y: chest.y + chest.height, draw: () => drawPremiumChest(ctx, chest.x, chest.y, chest.width, chest.height, chest.opened) });
  }
  for (const item of state.items) {
    if (!isExplored(state, item.x + item.width / 2, item.y + item.height / 2)) continue;
    jobs.push({ y: item.y + item.height, draw: () => drawLoot(ctx, item, now) });
  }
  for (const actor of state.enemies) {
    if (!isExplored(state, actor.x + actor.width / 2, actor.y + actor.height / 2)) continue;
    jobs.push({ y: actor.y + actor.height, draw: () => drawActor(ctx, actor, now) });
  }
  jobs.push({ y: state.player.y + state.player.height, draw: () => drawHero(ctx, state.player, now) });
}
