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
      y: y + 36,
      draw: () => {
        const pulse = 0.18 + Math.sin((now + shrine.tx * 73) / 320) * 0.06;
        const glow = ctx.createRadialGradient(x + 20, y + 18, 2, x + 20, y + 18, 42);
        glow.addColorStop(0, `rgba(172,112,255,${pulse})`);
        glow.addColorStop(1, 'rgba(94,45,180,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 22, y - 24, 84, 84);
        drawPremiumProp(ctx, 'shrine', x - 8, y - 22, 56, 62, shrine.tx + shrine.ty);
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
