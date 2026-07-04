import React, { useEffect, useRef } from 'react';
import { GameState } from '../game/engine';
import { TILE_SIZE, TileType } from '../game/dungeon';

interface Props {
  gameState: GameState;
}

export function GameCanvas({ gameState }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Resize canvas to match window
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const { camera, map, player, enemies, items, effects, damageNumbers } = gameState;
      
      // Clear background
      ctx.fillStyle = '#0a0a0f'; // Background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (gameState.status === 'start') {
        // Draw particles for start screen
        return;
      }

      ctx.save();
      // Translate to camera
      const cx = canvas.width / 2 - camera.x;
      const cy = canvas.height / 2 - camera.y;
      ctx.translate(cx, cy);

      // Draw map
      const startCol = Math.floor(camera.x / TILE_SIZE) - Math.ceil(canvas.width / 2 / TILE_SIZE) - 1;
      const endCol = startCol + Math.ceil(canvas.width / TILE_SIZE) + 2;
      const startRow = Math.floor(camera.y / TILE_SIZE) - Math.ceil(canvas.height / 2 / TILE_SIZE) - 1;
      const endRow = startRow + Math.ceil(canvas.height / TILE_SIZE) + 2;

      for (let y = Math.max(0, startRow); y < Math.min(map.height, endRow); y++) {
        for (let x = Math.max(0, startCol); x < Math.min(map.width, endCol); x++) {
          if (!map.explored[y][x]) continue;

          const tile = map.tiles[y][x];
          ctx.fillStyle = tile === TileType.WALL ? '#1a1a2e' : tile === TileType.FLOOR ? '#16213e' : '#111';
          
          if (tile !== TileType.EMPTY) {
             ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
             // Add texture/borders
             ctx.strokeStyle = '#0a0a0f';
             ctx.lineWidth = 1;
             ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }

          if (tile === TileType.STAIRS_DOWN) {
            ctx.fillStyle = '#8e44ad';
            ctx.fillRect(x * TILE_SIZE + 10, y * TILE_SIZE + 10, 20, 20);
          }
        }
      }

      // Draw items
      items.forEach(item => {
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.width, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.color;
        ctx.fill(); // double fill for glow
        ctx.shadowBlur = 0;
      });

      // Draw enemies
      enemies.forEach(enemy => {
        if (enemy.flashUntil > Date.now()) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = enemy.color;
        }
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

        // HP bar
        const hpPercent = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#000';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * hpPercent, 4);
      });

      // Draw player
      ctx.fillStyle = '#3498db'; // fallback color if needed, but we style as warrior
      ctx.fillRect(player.x, player.y, player.width, player.height);
      // Sword indicator based on facing
      ctx.fillStyle = '#bdc3c7';
      const swordX = player.x + player.width/2 + player.facing.x * 15 - 2;
      const swordY = player.y + player.height/2 + player.facing.y * 15 - 2;
      ctx.fillRect(swordX, swordY, 4, 4);

      // Draw effects
      effects.forEach(effect => {
        if (effect.type === 'sweep') {
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
          ctx.fillStyle = effect.color;
          ctx.fill();
        } else if (effect.type === 'flash') {
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
          ctx.fillStyle = effect.color;
          ctx.fill();
        }
      });

      // Draw damage numbers
      damageNumbers.forEach(dn => {
        const opacity = 1 - (dn.lifeTime / dn.maxLifeTime);
        ctx.fillStyle = dn.color;
        ctx.globalAlpha = opacity;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(dn.value, dn.x, dn.y);
        ctx.globalAlpha = 1;
      });

      // Lighting overlay (simple radial gradient on player)
      const grad = ctx.createRadialGradient(
        player.x + player.width/2, player.y + player.height/2, 50,
        player.x + player.width/2, player.y + player.height/2, 300
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(10,10,15,0.85)'); // Dark vignette
      
      ctx.fillStyle = grad;
      ctx.fillRect(camera.x - canvas.width/2, camera.y - canvas.height/2, canvas.width, canvas.height);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none"
    />
  );
}
