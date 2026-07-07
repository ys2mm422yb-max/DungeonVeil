import { GameState } from '../../game/engine';
import { TILE_SIZE } from '../../game/dungeon';
import { renderSceneTerrain, SceneJob } from '../../game/overworldSprites';
import { attractLoot } from './sceneRenderUtils';
import { addSceneJobs } from './sceneJobs';
import { drawSceneFog } from './sceneFog';
import { drawSceneOverlay } from './sceneOverlay';

export function runScene(canvas: HTMLCanvasElement, readState: () => GameState): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let frameId = 0;
  let stopped = false;
  let cameraX = readState().camera.x;
  let cameraY = readState().camera.y;

  const render = () => {
    if (stopped) return;

    try {
      if (canvas.width !== innerWidth || canvas.height !== innerHeight) {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
      }

      const state = readState();
      const map = state.map;
      const now = Date.now();
      attractLoot(state);
      cameraX += (state.camera.x - cameraX) * 0.18;
      cameraY += (state.camera.y - cameraY) * 0.18;

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

      const terrainJobs = renderSceneTerrain(ctx, state, now, x0, x1, y0, y1);
      const jobs: SceneJob[] = terrainJobs.filter(job => job.y !== Number.MAX_SAFE_INTEGER);
      addSceneJobs(ctx, state, jobs, now);
      jobs.sort((a, b) => a.y - b.y);
      for (const job of jobs) {
        try {
          job.draw();
        } catch (error) {
          console.error('Dungeon Veil scene job failed', error);
        }
      }

      drawSceneFog(ctx, state, x0, x1, y0, y1);
      drawSceneOverlay(ctx, state);
      ctx.restore();
    } catch (error) {
      console.error('Dungeon Veil render frame failed', error);
      try { ctx.restore(); } catch {}
    }

    frameId = requestAnimationFrame(render);
  };

  render();
  return () => {
    stopped = true;
    cancelAnimationFrame(frameId);
  };
}
