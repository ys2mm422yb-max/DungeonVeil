import React, { useEffect, useRef } from 'react';
import { GameState } from '../game/engine';
import { TILE_SIZE, TileType } from '../game/dungeon';
import { CLASS_DEFS } from '../game/classes';
import {
  drawSprite, animFrame,
  SPRITE_WALL, SPRITE_WALL_FRONT,
  SPRITE_FLOOR,
  SPRITE_STAIRS,
  SPRITE_DOOR_CLOSED, SPRITE_DOOR_OPEN,
  SPRITE_CHEST_CLOSED, SPRITE_CHEST_OPEN,
  SPRITE_POTION, SPRITE_XP_ORB,
  SPRITE_TORCH, SPRITE_SHRINE, SPRITE_SKULL,
  PLAYER_SPRITES, ENEMY_SPRITES,
  SpriteData,
} from '../game/sprites';
import { Chest } from '../game/entities';

interface Props {
  gameState: GameState;
}

export function GameCanvas({ gameState }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const lightRef     = useRef<HTMLCanvasElement | null>(null);
  const lightCtxRef  = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    // Pixel-art mode: no blurring at all
    ctx.imageSmoothingEnabled = false;

    const render = () => {
      // Resize canvas if window changed
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.imageSmoothingEnabled = false;
      }

      const now = Date.now();
      const { camera, map, player, enemies, items, chests, effects, damageNumbers } = gameState;
      const classDef = CLASS_DEFS[player.playerClass];

      // ── Clear ───────────────────────────────────────────────────────────────
      ctx.fillStyle = '#05060c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(
        Math.round(canvas.width  / 2 - camera.x),
        Math.round(canvas.height / 2 - camera.y),
      );

      // ── Tile culling bounds ─────────────────────────────────────────────────
      const half_w = Math.ceil(canvas.width  / 2);
      const half_h = Math.ceil(canvas.height / 2);
      const startCol = Math.max(0, Math.floor((camera.x - half_w) / TILE_SIZE) - 1);
      const endCol   = Math.min(map.width,  Math.ceil ((camera.x + half_w) / TILE_SIZE) + 1);
      const startRow = Math.max(0, Math.floor((camera.y - half_h) / TILE_SIZE) - 1);
      const endRow   = Math.min(map.height, Math.ceil ((camera.y + half_h) / TILE_SIZE) + 1);

      // ── Draw map tiles ───────────────────────────────────────────────────────
      for (let ty = startRow; ty < endRow; ty++) {
        for (let tx = startCol; tx < endCol; tx++) {
          if (!map.explored[ty][tx]) continue;
          const tile = map.tiles[ty][tx];
          if (tile === TileType.EMPTY) continue;

          const wx = tx * TILE_SIZE;
          const wy = ty * TILE_SIZE;

          // ── WALL ──────────────────────────────────────────────────────────
          if (tile === TileType.WALL) {
            const variant = map.wallVariant[ty][tx];
            const spr = variant === 1 ? SPRITE_WALL_FRONT : SPRITE_WALL;
            drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, spr, 0);
            continue;
          }

          // ── FLOOR (all walkable tiles get a floor first) ──────────────────
          const fv = Math.min(3, map.floorVariant[ty][tx] ?? 0);
          drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, SPRITE_FLOOR[fv], 0);

          // ── DOOR ──────────────────────────────────────────────────────────
          if (tile === TileType.DOOR) {
            drawSprite(ctx, wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8, SPRITE_DOOR_OPEN, 0);
            continue;
          }

          // ── STAIRS ────────────────────────────────────────────────────────
          if (tile === TileType.STAIRS_DOWN) {
            const sf = animFrame(SPRITE_STAIRS, now, 1.5);
            drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, SPRITE_STAIRS, sf);
            // Pulsing purple glow around stairs
            const pulsed = 0.25 + 0.15 * Math.sin(now / 300);
            ctx.save();
            ctx.shadowBlur = 24;
            ctx.shadowColor = `rgba(160,80,255,${pulsed})`;
            ctx.beginPath();
            ctx.arc(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(160,80,255,${pulsed * 0.4})`;
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // ── Torches (on wall tiles) ─────────────────────────────────────────────
      for (const torch of map.torches) {
        if (!map.explored[torch.ty]?.[torch.tx]) continue;
        const wx = torch.tx * TILE_SIZE;
        const wy = torch.ty * TILE_SIZE;
        const tf = animFrame(SPRITE_TORCH, now + torch.tx * 200 + torch.ty * 400, 6);
        drawSprite(ctx, wx + 10, wy + 2, 20, 28, SPRITE_TORCH, tf);
        // Warm glow
        const glow = ctx.createRadialGradient(wx + 20, wy + 12, 2, wx + 20, wy + 12, 32);
        glow.addColorStop(0, 'rgba(255,140,30,0.18)');
        glow.addColorStop(1, 'rgba(255,90,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(wx - 16, wy - 16, TILE_SIZE + 32, TILE_SIZE + 32);
      }

      // ── Decorations ────────────────────────────────────────────────────────
      for (const dec of map.decorations) {
        if (!map.explored[dec.ty]?.[dec.tx]) continue;
        const wx = dec.tx * TILE_SIZE;
        const wy = dec.ty * TILE_SIZE;
        let spr: SpriteData | null = null;
        let frm = 0;

        if (dec.kind === 'shrine' || dec.kind === 'altar') {
          frm = animFrame(SPRITE_SHRINE, now, 2);
          spr = SPRITE_SHRINE;
        } else if (dec.kind === 'skull') {
          spr = SPRITE_SKULL;
        } else if (dec.kind === 'forge') {
          // Draw as a generic orange glow tile placeholder
          ctx.save();
          ctx.shadowBlur = 16;
          ctx.shadowColor = '#ff6600';
          ctx.fillStyle = '#663300';
          ctx.fillRect(wx + 8, wy + 8, TILE_SIZE - 16, TILE_SIZE - 16);
          ctx.restore();
        } else if (dec.kind === 'bookshelf') {
          ctx.fillStyle = '#442211';
          ctx.fillRect(wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.fillStyle = '#884422';
          for (let b = 0; b < 4; b++) {
            ctx.fillStyle = b % 2 === 0 ? '#cc4411' : '#4488aa';
            ctx.fillRect(wx + 6 + b * 8, wy + 8, 6, TILE_SIZE - 16);
          }
        }

        if (spr) drawSprite(ctx, wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8, spr, frm);
      }

      // ── Chests ─────────────────────────────────────────────────────────────
      for (const chest of chests) {
        const tileX = Math.floor((chest.x + chest.width / 2) / TILE_SIZE);
        const tileY = Math.floor((chest.y + chest.height / 2) / TILE_SIZE);
        if (!map.explored[tileY]?.[tileX]) continue;

        const spr = chest.opened ? SPRITE_CHEST_OPEN : SPRITE_CHEST_CLOSED;
        drawSprite(ctx, chest.x, chest.y, chest.width, chest.height, spr, 0);

        if (!chest.opened) {
          // Gold shimmer on closed chest
          const shimmer = 0.3 + 0.15 * Math.sin(now / 500 + chest.x);
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = `rgba(255,220,50,${shimmer})`;
          ctx.strokeStyle = `rgba(255,220,50,${shimmer})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(chest.x, chest.y, chest.width, chest.height);
          ctx.restore();

          if ((chest as Chest).locked) {
            // Lock icon overlay
            ctx.fillStyle = '#ffdd33';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🔒', chest.x + chest.width / 2, chest.y - 4);
          }
        }
      }

      // ── Items ──────────────────────────────────────────────────────────────
      for (const item of items) {
        if (item.itemType === 'potion') {
          const pf = animFrame(SPRITE_POTION, now + item.x * 100, 3);
          drawSprite(ctx, item.x, item.y, item.width, item.height, SPRITE_POTION, pf);
          // Green glow
          ctx.save();
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#33cc66';
          drawSprite(ctx, item.x, item.y, item.width, item.height, SPRITE_POTION, pf);
          ctx.restore();
        } else {
          // XP orb
          const of2 = animFrame(SPRITE_XP_ORB, now + item.x * 80, 4);
          drawSprite(ctx, item.x, item.y, item.width, item.height, SPRITE_XP_ORB, of2);
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ffaa00';
          drawSprite(ctx, item.x, item.y, item.width, item.height, SPRITE_XP_ORB, of2);
          ctx.restore();
        }
      }

      // ── Enemies ────────────────────────────────────────────────────────────
      for (const enemy of enemies) {
        const tileX = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
        const tileY = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);
        if (!map.explored[tileY]?.[tileX]) continue;

        const spr = ENEMY_SPRITES[enemy.enemyType] ?? ENEMY_SPRITES['slime'];
        const isFlash = enemy.flashUntil > now;
        const ageMs = now - enemy.spawnTime;
        const ef = animFrame(spr, ageMs, 3);

        if (isFlash) {
          ctx.save();
          ctx.filter = 'brightness(4)';
          drawSprite(ctx, enemy.x, enemy.y, enemy.width, enemy.height, spr, ef);
          ctx.filter = 'none';
          ctx.restore();
        } else {
          // Coloured glow matching enemy
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = enemy.color;
          drawSprite(ctx, enemy.x, enemy.y, enemy.width, enemy.height, spr, ef);
          ctx.restore();
          drawSprite(ctx, enemy.x, enemy.y, enemy.width, enemy.height, spr, ef);
        }

        // HP bar
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        const barW = enemy.width + 4;
        const barX = enemy.x - 2;
        const barY = enemy.y - 7;
        ctx.fillStyle = '#000000cc';
        ctx.fillRect(barX, barY, barW, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#c0392b';
        ctx.fillRect(barX, barY, barW * hpPct, 4);
        ctx.strokeStyle = '#00000066';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(barX, barY, barW, 4);
      }

      // ── Player ─────────────────────────────────────────────────────────────
      {
        const spr = PLAYER_SPRITES[player.playerClass] ?? PLAYER_SPRITES['warrior'];
        const isInvincible = player.invincibleUntil > now;
        const ageMs = now - player.spawnTime;
        // Walk animation when moving
        const isMoving = player.state === 'moving';
        const pf = isMoving ? animFrame(spr, ageMs, 6) : 0;

        // Player glow
        ctx.save();
        ctx.shadowBlur = 22;
        ctx.shadowColor = classDef.glowColor;
        drawSprite(ctx, player.x, player.y, player.width, player.height, spr, pf);
        ctx.restore();

        if (isInvincible) {
          // Blinking effect
          const blink = Math.floor(now / 60) % 2 === 0;
          if (blink) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.filter = 'brightness(3)';
            drawSprite(ctx, player.x, player.y, player.width, player.height, spr, pf);
            ctx.filter = 'none';
            ctx.restore();
          } else {
            drawSprite(ctx, player.x, player.y, player.width, player.height, spr, pf);
          }
        } else {
          drawSprite(ctx, player.x, player.y, player.width, player.height, spr, pf);
        }

        // Facing-direction weapon indicator (drawn outside the sprite)
        const cx = player.x + 16;
        const cy = player.y + 16;
        const fx = player.facing.x;
        const fy = player.facing.y;

        if (player.playerClass === 'warrior') {
          // Sword blade
          ctx.save();
          ctx.strokeStyle = '#c8d8ff';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#88aaff';
          ctx.beginPath();
          ctx.moveTo(cx + fx * 18, cy + fy * 18);
          ctx.lineTo(cx + fx * 30 + fy * 5, cy + fy * 30 + fx * 5);
          ctx.stroke();
          ctx.restore();
        } else if (player.playerClass === 'mage') {
          // Orbiting magic orb
          const orbitAngle = now / 600;
          const ox = cx + Math.cos(orbitAngle) * 22;
          const oy = cy + Math.sin(orbitAngle) * 22;
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = classDef.color;
          ctx.beginPath();
          ctx.arc(ox, oy, 5, 0, Math.PI * 2);
          ctx.fillStyle = classDef.color;
          ctx.fill();
          ctx.restore();
        } else {
          // Archer arrow in facing direction
          ctx.save();
          ctx.strokeStyle = '#cc8833';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 4;
          ctx.shadowColor = '#ff9900';
          ctx.beginPath();
          ctx.moveTo(cx + fx * 16, cy + fy * 16);
          ctx.lineTo(cx + fx * 30, cy + fy * 30);
          ctx.stroke();
          ctx.fillStyle = '#ff9900';
          ctx.beginPath();
          ctx.arc(cx + fx * 30, cy + fy * 30, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // ── Visual effects ─────────────────────────────────────────────────────
      for (const effect of effects) {
        const progress = effect.lifeTime / effect.maxLifeTime;
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        if (effect.type === 'sweep' || effect.type === 'flash' || effect.type === 'circle') {
          const grad = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, effect.radius);
          grad.addColorStop(0, effect.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ── Damage numbers ─────────────────────────────────────────────────────
      for (const dn of damageNumbers) {
        const opacity = Math.max(0, 1 - dn.lifeTime / dn.maxLifeTime);
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.font = 'bold 15px "Courier New", monospace';
        ctx.textAlign = 'center';
        // Outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(dn.value, dn.x, dn.y);
        ctx.fillStyle = dn.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = dn.color;
        ctx.fillText(dn.value, dn.x, dn.y);
        ctx.restore();
      }

      // ── Dynamic torch lighting overlay (reused off-screen canvas) ─────────
      {
        // Allocate / resize the light canvas only when viewport changes
        if (!lightRef.current) {
          lightRef.current = document.createElement('canvas');
          lightRef.current.width  = canvas.width;
          lightRef.current.height = canvas.height;
          lightCtxRef.current = lightRef.current.getContext('2d');
        }
        const lc = lightRef.current;
        if (lc.width !== canvas.width || lc.height !== canvas.height) {
          lc.width  = canvas.width;
          lc.height = canvas.height;
        }
        const lctx = lightCtxRef.current!;

        // Fill with darkness, then punch out light regions
        lctx.globalCompositeOperation = 'source-over';
        lctx.fillStyle = 'rgba(4,5,10,0.86)';
        lctx.fillRect(0, 0, lc.width, lc.height);
        lctx.globalCompositeOperation = 'destination-out';

        // Player torch
        const pcx = Math.round(canvas.width / 2 - camera.x + player.x + 16);
        const pcy = Math.round(canvas.height / 2 - camera.y + player.y + 16);
        const pFlicker = 1 + 0.04 * Math.sin(now / 120);
        const pg = lctx.createRadialGradient(pcx, pcy, 20, pcx, pcy, 220 * pFlicker);
        pg.addColorStop(0, 'rgba(255,180,80,0.95)');
        pg.addColorStop(0.4, 'rgba(255,120,40,0.6)');
        pg.addColorStop(0.75, 'rgba(200,80,20,0.3)');
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = pg;
        lctx.fillRect(0, 0, lc.width, lc.height);

        // Wall-torch lights
        const offX = canvas.width / 2 - camera.x;
        const offY = canvas.height / 2 - camera.y;
        for (const torch of map.torches) {
          if (!map.explored[torch.ty]?.[torch.tx]) continue;
          const twx = Math.round(offX + torch.tx * TILE_SIZE + TILE_SIZE / 2);
          const twy = Math.round(offY + torch.ty * TILE_SIZE + TILE_SIZE / 2);
          if (twx < -100 || twx > lc.width + 100 || twy < -100 || twy > lc.height + 100) continue;
          const flicker = 1 + 0.08 * Math.sin(now / 80 + torch.tx + torch.ty);
          const tg = lctx.createRadialGradient(twx, twy, 4, twx, twy, 90 * flicker);
          tg.addColorStop(0, 'rgba(255,160,40,0.72)');
          tg.addColorStop(0.5, 'rgba(200,80,10,0.32)');
          tg.addColorStop(1, 'rgba(0,0,0,0)');
          lctx.fillStyle = tg;
          lctx.fillRect(twx - 100, twy - 100, 200, 200);
        }

        // Blit the light mask onto the main canvas (in screen-space, not world-space)
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(lc, -Math.round(canvas.width / 2 - camera.x), -Math.round(canvas.height / 2 - camera.y));
      }

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
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
