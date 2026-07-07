import { GameState } from '../../game/engine';
import { drawPremiumChest } from '../../game/premiumPixelArt';
import { SceneJob } from '../../game/overworldSprites';
import { drawActor } from './actorOne';
import { drawHero } from './actorTwo';
import { drawLoot, isExplored } from './sceneRenderUtils';

export function addSceneJobs(ctx: CanvasRenderingContext2D, state: GameState, jobs: SceneJob[], now: number): void {
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
