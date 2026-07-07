import { GameState } from '../../game/engine';
import { TILE_SIZE } from '../../game/dungeon';
import { renderSceneTerrain, SceneJob } from '../../game/overworldSprites';
import { attractLoot } from './sceneRenderUtils';
import { addSceneJobs } from './sceneJobs';

export function runScene(canvas: HTMLCanvasElement, readState: () => GameState): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let frameId = 0;
  let cameraX = readState().camera.x;
  let cameraY = readState().camera.y;

  const render = () => {
    if (canvas.width !== innerWidth || canvas.height !== innerHeight) {
      canvas.width = innerWidth;
      canvas.height = innerHeight;
    }

    const state = readState();
    const map = state.map;
    const now = Date.now();
    attractLoot(state);
    cameraX += (state.camera.x - cameraX) * .18;
    cameraY += (state.camera.y - cameraY) * .18;

    const zoom = canvas.width < 520 ? 1.02 : 1.08;
    const halfW = canvas.width / zoom / 2;
    const halfH = canvas.height / zoom / 2;
    const x0 = Math.max(0, Math.floor((cameraX - halfW) / TILE_SIZE) - 3);
    const x1 = Math.min(map.width, Math.ceil((cameraX + halfW) / TILE_SIZE) + 3);
    const y0 = Math.max(0, Math.floor((cameraY - halfH) / TILE_SIZE) - 4);
    const y1 = Math.min(map.height, Math.ceil((cameraY + halfH) / TILE_SIZE) + 4);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = state.inDungeon ? '#020207' : '#172811';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + (state.inDungeon ? 8 : 18));
    ctx.scale(zoom, zoom);
    ctx.translate(-Math.round(cameraX), -Math.round(cameraY));

    const jobs: SceneJob[] = renderSceneTerrain(ctx, state, now, x0, x1, y0, y1);
    addSceneJobs(ctx, state, jobs, now);
    jobs.sort((a, b) => a.y - b.y).forEach(job => job.draw());
    ctx.restore();

    frameId = requestAnimationFrame(render);
  };

  render();
  return () => cancelAnimationFrame(frameId);
}
