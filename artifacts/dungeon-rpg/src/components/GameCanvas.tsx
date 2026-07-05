import React, { useEffect, useRef } from 'react';
import { GameState } from '../game/engine';
import { TILE_SIZE, TileType } from '../game/dungeon';
import { CLASS_DEFS } from '../game/classes';
import {
  drawSprite, animFrame, bobOffset,
  SPRITE_WALL, SPRITE_WALL_FRONT, WALL_SPRITES_BY_TINT,
  SPRITE_FLOOR, SPRITE_FLOOR_EDGE,
  SPRITE_STAIRS,
  SPRITE_DOOR_CLOSED, SPRITE_DOOR_OPEN,
  SPRITE_CHEST_CLOSED, SPRITE_CHEST_OPEN,
  SPRITE_POTION, SPRITE_XP_ORB,
  SPRITE_TORCH, SPRITE_SHRINE, SPRITE_SKULL, SPRITE_FORGE, SPRITE_BOOKSHELF, SPRITE_ALTAR, SPRITE_BARREL, SPRITE_CRATE,
  SPRITE_GRASS, SPRITE_ROAD, SPRITE_WATER, SPRITE_FOREST, SPRITE_VILLAGE, SPRITE_DUNGEON_ENTRANCE,
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
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Use a ref for the render loop so the RAF effect is created once and not torn
  // down/recreated on every engine tick (which caused freezes/stutters).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    ctx.imageSmoothingEnabled = false;

    const render = () => {
      // Resize canvas if window changed
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.imageSmoothingEnabled = false;
      }

      const now = Date.now();
      const { camera, map, player, enemies, items, chests, effects, damageNumbers, particles } = gameStateRef.current;
      const classDef = CLASS_DEFS[player.playerClass];
      const camOffX = Math.round(canvas.width  / 2 - camera.x);
      const camOffY = Math.round(canvas.height / 2 - camera.y);

      // ── Clear ───────────────────────────────────────────────────────────────
      ctx.fillStyle = '#03040a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(camOffX, camOffY);

      // ── Tile culling bounds ─────────────────────────────────────────────────
      const half_w = Math.ceil(canvas.width  / 2);
      const half_h = Math.ceil(canvas.height / 2);
      const startCol = Math.max(0, Math.floor((camera.x - half_w) / TILE_SIZE) - 1);
      const endCol   = Math.min(map.width,  Math.ceil ((camera.x + half_w) / TILE_SIZE) + 1);
      const startRow = Math.max(0, Math.floor((camera.y - half_h) / TILE_SIZE) - 1);
      const endRow   = Math.min(map.height, Math.ceil ((camera.y + half_h) / TILE_SIZE) + 1);

      // ── Draw map tiles (overworld + dungeon) ─────────────────────────────────
      for (let ty = startRow; ty < endRow; ty++) {
        for (let tx = startCol; tx < endCol; tx++) {
          if (!map.explored[ty][tx]) continue;
          const tile = map.tiles[ty][tx];
          if (tile === TileType.EMPTY) continue;

          const wx = tx * TILE_SIZE;
          const wy = ty * TILE_SIZE;

          switch (tile) {
            // DUNGEON TILES
            case TileType.WALL: {
              const variant = map.wallVariant[ty][tx];
              const tint = map.wallTint[ty][tx] ?? 'default';
              const spr = variant === 1
                ? SPRITE_WALL_FRONT
                : (WALL_SPRITES_BY_TINT[tint] ?? SPRITE_WALL);
              drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, spr, 0);
              break;
            }
            case TileType.FLOOR:
            case TileType.DOOR:
            case TileType.STAIRS_DOWN: {
              const fv = Math.min(3, map.floorVariant[ty][tx] ?? 0);
              const above = ty > 0 ? map.tiles[ty - 1][tx] : TileType.EMPTY;
              if (above === TileType.WALL && fv === 0) {
                drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, SPRITE_FLOOR_EDGE[0], 0);
              } else {
                drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, SPRITE_FLOOR[fv], 0);
              }
              if (tile === TileType.DOOR) {
                drawSprite(ctx, wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8, SPRITE_DOOR_OPEN, 0);
              } else if (tile === TileType.STAIRS_DOWN) {
                const sf = animFrame(SPRITE_STAIRS, now, 1.5);
                drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, SPRITE_STAIRS, sf);
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
              break;
            }

            // OVERWORLD TILES
            case TileType.GRASS: {
              const gv = map.floorVariant[ty][tx] ?? 0;
              drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, SPRITE_GRASS[gv % SPRITE_GRASS.length], 0);
              break;
            }
            case TileType.ROAD: {
              drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, SPRITE_ROAD, 0);
              break;
            }
            case TileType.WATER: {
              const wf = animFrame(SPRITE_WATER, now + tx * 100 + ty * 50, 2);
              drawSprite(ctx, wx, wy, TILE_SIZE, TILE_SIZE, SPRITE_WATER, wf);
              break;
            }
            case TileType.FOREST: {
              drawSprite(ctx, wx, wy - 8, TILE_SIZE, TILE_SIZE + 8, SPRITE_FOREST, 0);
              break;
            }
            case TileType.VILLAGE: {
              drawSprite(ctx, wx, wy - 8, TILE_SIZE, TILE_SIZE + 8, SPRITE_VILLAGE, 0);
              break;
            }
            case TileType.DUNGEON_ENTRANCE: {
              drawSprite(ctx, wx, wy - 8, TILE_SIZE, TILE_SIZE + 8, SPRITE_DUNGEON_ENTRANCE, 0);
              const pulse = 0.25 + 0.15 * Math.sin(now / 300);
              ctx.save();
              ctx.shadowBlur = 24;
              ctx.shadowColor = `rgba(120,80,200,${pulse})`;
              ctx.beginPath();
              ctx.arc(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2, 10, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(120,80,200,${pulse * 0.4})`;
              ctx.fill();
              ctx.restore();
              break;
            }
          }
        }
      }

      // ── Ambient occlusion / wall-base shading ───────────────────────────────
      ctx.save();
      if (gameStateRef.current.inDungeon) {
        for (let ty = startRow; ty < endRow; ty++) {
          for (let tx = startCol; tx < endCol; tx++) {
            if (!map.explored[ty]?.[tx]) continue;
            const tile = map.tiles[ty][tx];
            const wx = tx * TILE_SIZE;
            const wy = ty * TILE_SIZE;
            if (tile === TileType.WALL) {
              const grad = ctx.createLinearGradient(wx, wy, wx, wy + TILE_SIZE);
              grad.addColorStop(0, 'rgba(0,0,0,0)');
              grad.addColorStop(0.6, 'rgba(0,0,0,0.22)');
              grad.addColorStop(1, 'rgba(0,0,0,0.42)');
              ctx.fillStyle = grad;
              ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
            } else if (tile !== TileType.EMPTY) {
              if (ty > 0 && map.tiles[ty - 1][tx] === TileType.WALL) {
                const grad = ctx.createLinearGradient(wx, wy + TILE_SIZE, wx, wy);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(1, 'rgba(0,0,0,0.18)');
                ctx.fillStyle = grad;
                ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
              }
            }
          }
        }
      } else {
        // Overworld: subtle shadow under tall trees/villages/entrances
        for (let ty = startRow; ty < endRow; ty++) {
          for (let tx = startCol; tx < endCol; tx++) {
            if (!map.explored[ty]?.[tx]) continue;
            const tile = map.tiles[ty][tx];
            if (tile === TileType.FOREST || tile === TileType.VILLAGE || tile === TileType.DUNGEON_ENTRANCE) {
              const wx = tx * TILE_SIZE;
              const wy = ty * TILE_SIZE + TILE_SIZE - 6;
              const grad = ctx.createLinearGradient(wx, wy, wx, wy + 8);
              grad.addColorStop(0, 'rgba(0,0,0,0.25)');
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.fillRect(wx, wy, TILE_SIZE, 8);
            }
          }
        }
      }
      ctx.restore();

      // ── Subtle screen-space dust / mist ─────────────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#aaccff';
      const dustPhase = now / 2000;
      for (let i = 0; i < 12; i++) {
        const dx = ((Math.sin(i * 1.7 + dustPhase) * 0.5 + 0.5) * canvas.width);
        const dy = ((Math.cos(i * 2.3 + dustPhase * 0.7) * 0.5 + 0.5) * canvas.height);
        const dsize = 2 + (i % 3);
        ctx.fillRect(dx, dy, dsize, dsize);
      }
      ctx.restore();

      // ── Torches (on wall tiles) ─────────────────────────────────────────────
      for (const torch of map.torches) {
        if (!map.explored[torch.ty]?.[torch.tx]) continue;
        const wx = torch.tx * TILE_SIZE;
        const wy = torch.ty * TILE_SIZE;
        const tf = animFrame(SPRITE_TORCH, now + torch.tx * 200 + torch.ty * 400, 6);
        drawSprite(ctx, wx + 10, wy + 2, 20, 28, SPRITE_TORCH, tf);
        // Warm glow on the wall itself
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

        switch (dec.kind) {
          case 'shrine':
          case 'altar':
            frm = animFrame(SPRITE_SHRINE, now, 2);
            spr = SPRITE_SHRINE;
            break;
          case 'skull':
            spr = SPRITE_SKULL;
            break;
          case 'forge':
            frm = animFrame(SPRITE_FORGE, now, 3);
            spr = SPRITE_FORGE;
            // Warm glow
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ff6600';
            drawSprite(ctx, wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8, spr, frm);
            ctx.restore();
            continue;
          case 'bookshelf':
            spr = SPRITE_BOOKSHELF;
            break;
        }

        if (spr) drawSprite(ctx, wx + 4, wy + 4, TILE_SIZE - 8, TILE_SIZE - 8, spr, frm);
      }

      // Extra room props: barrels / crates near walls (deterministic from hash)
      if (gameStateRef.current.inDungeon) {
        for (let ty = startRow; ty < endRow; ty++) {
          for (let tx = startCol; tx < endCol; tx++) {
            if (!map.explored[ty]?.[tx]) continue;
            const tile = map.tiles[ty][tx];
            if (tile !== TileType.FLOOR) continue;
            const h = hash(tx, ty);
            if (h < 0.02) {
              const wx = tx * TILE_SIZE;
              const wy = ty * TILE_SIZE;
              const spr = h < 0.01 ? SPRITE_BARREL : SPRITE_CRATE;
              drawSprite(ctx, wx + 8, wy + 8, TILE_SIZE - 16, TILE_SIZE - 16, spr, 0);
            }
          }
        }
      }

      // ── Chests ─────────────────────────────────────────────────────────────
      for (const chest of chests) {
        const tileX = Math.floor((chest.x + chest.width / 2) / TILE_SIZE);
        const tileY = Math.floor((chest.y + chest.height / 2) / TILE_SIZE);
        if (!map.explored[tileY]?.[tileX]) continue;

        drawEntityShadow(ctx, chest.x + chest.width / 2, chest.y + chest.height - 2, chest.width * 0.7, 5);
        const spr = chest.opened ? SPRITE_CHEST_OPEN : SPRITE_CHEST_CLOSED;
        drawSprite(ctx, chest.x, chest.y, chest.width, chest.height, spr, 0);

        if (!chest.opened) {
          const shimmer = 0.3 + 0.15 * Math.sin(now / 500 + chest.x);
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = `rgba(255,220,50,${shimmer})`;
          ctx.strokeStyle = `rgba(255,220,50,${shimmer})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(chest.x, chest.y, chest.width, chest.height);
          ctx.restore();

          if ((chest as Chest).locked) {
            ctx.fillStyle = '#ffdd33';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🔒', chest.x + chest.width / 2, chest.y - 4);
          }
        }
      }

      // ── Items ──────────────────────────────────────────────────────────────
      for (const item of items) {
        const bob = bobOffset((now + (item.spawnTime ?? 0)) / 2, 2);
        if (item.itemType === 'potion') {
          const pf = animFrame(SPRITE_POTION, now + item.x * 100, 3);
          drawSprite(ctx, item.x, item.y + bob, item.width, item.height, SPRITE_POTION, pf);
          ctx.save();
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#33cc66';
          drawSprite(ctx, item.x, item.y + bob, item.width, item.height, SPRITE_POTION, pf);
          ctx.restore();
        } else {
          const of2 = animFrame(SPRITE_XP_ORB, now + item.x * 80, 4);
          drawSprite(ctx, item.x, item.y + bob, item.width, item.height, SPRITE_XP_ORB, of2);
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ffaa00';
          drawSprite(ctx, item.x, item.y + bob, item.width, item.height, SPRITE_XP_ORB, of2);
          ctx.restore();
        }
      }

      // ── Particles (under entities) ─────────────────────────────────────────
      for (const p of particles) {
        const life = p.lifeTime / p.maxLifeTime;
        const alpha = p.fade ? 1 - life : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.size * 1.5;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        // motion streak for fast particles
        if (Math.abs(p.vx) + Math.abs(p.vy) > 60) {
          ctx.globalAlpha = alpha * 0.4;
          ctx.fillRect(p.x - p.vx * 0.03 - p.size / 2, p.y - p.vy * 0.03 - p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }

      // ── Enemies ────────────────────────────────────────────────────────────
      for (const enemy of enemies) {
        const tileX = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
        const tileY = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);
        if (!map.explored[tileY]?.[tileX]) continue;

        const spr = ENEMY_SPRITES[enemy.enemyType] ?? ENEMY_SPRITES['slime'];
        const isFlash = enemy.flashUntil > now;
        const isDying = enemy.hp <= 0;
        const ageMs = now - enemy.spawnTime;
        const isMoving = enemy.state === 'chase' || enemy.state === 'patrol';
        const ef = isMoving ? animFrame(spr, ageMs, 4) : 0;
        const bob = isMoving ? bobOffset(ageMs, 1.5) : 0;
        const dyingScale = isDying ? 1 - Math.min(1, (now - enemy.deathTime) / 400) : 1;

        drawEntityShadow(ctx, enemy.x + enemy.width / 2, enemy.y + enemy.height - 2, enemy.width * 0.65, 4 * dyingScale);

        ctx.save();
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;
        ctx.translate(cx, cy + bob);
        ctx.scale(dyingScale, dyingScale);
        ctx.translate(-cx, -cy);

        if (isFlash) {
          ctx.save();
          ctx.filter = 'brightness(4) saturate(2)';
          drawSprite(ctx, enemy.x, enemy.y, enemy.width, enemy.height, spr, ef);
          ctx.filter = 'none';
          ctx.restore();
        } else {
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = enemy.color;
          drawSprite(ctx, enemy.x, enemy.y, enemy.width, enemy.height, spr, ef);
          ctx.restore();
        }
        ctx.restore();

        // Attack flash / lunge
        if (now - enemy.lastAttackTime < 200 && !isDying) {
          const lunge = 1 - (now - enemy.lastAttackTime) / 200;
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.arc(cx, cy, enemy.width * 0.5 * lunge, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // HP bar
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        const barW = enemy.width + 4;
        const barX = enemy.x - 2;
        const barY = enemy.y - 8;
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
        const isMoving = player.state === 'moving';
        const isAttacking = now - player.lastAttackTime < 180;
        const pf = isMoving ? animFrame(spr, ageMs, 6) : 0;
        const bob = isMoving ? bobOffset(ageMs, 1.5) : 0;
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;
        const fx = player.facing.x;
        const fy = player.facing.y;

        drawEntityShadow(ctx, cx, player.y + player.height - 2, player.width * 0.7, 5);

        ctx.save();
        ctx.translate(cx, cy + bob);
        if (isAttacking) {
          const lunge = 1 - (now - player.lastAttackTime) / 180;
          ctx.translate(fx * lunge * 6, fy * lunge * 6);
        }
        ctx.translate(-cx, -cy);

        if (isInvincible) {
          const blink = Math.floor(now / 60) % 2 === 0;
          ctx.globalAlpha = blink ? 0.55 : 0.9;
          ctx.save();
          ctx.filter = 'brightness(3)';
          drawSprite(ctx, player.x, player.y, player.width, player.height, spr, pf, fx < 0);
          ctx.filter = 'none';
          ctx.restore();
        } else {
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = classDef.glowColor;
          drawSprite(ctx, player.x, player.y, player.width, player.height, spr, pf, fx < 0);
          ctx.restore();
        }
        ctx.restore();

        // Class weapon / skill indicator
        if (player.playerClass === 'warrior') {
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
        if (effect.type === 'sweep') {
          const grad = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, effect.radius);
          grad.addColorStop(0, effect.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (effect.type === 'flash') {
          const grad = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, effect.radius);
          grad.addColorStop(0, effect.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (effect.type === 'slash') {
          ctx.save();
          ctx.translate(effect.x, effect.y);
          ctx.rotate(effect.angle ?? 0);
          const sw = effect.width ?? 10;
          const sr = effect.radius;
          // Bright core + tapering blade gradient
          const blade = ctx.createLinearGradient(0, -sw, 0, sw);
          blade.addColorStop(0, 'rgba(255,255,255,0)');
          blade.addColorStop(0.25, replaceAlpha(effect.color, 0.55));
          blade.addColorStop(0.5, '#ffffff');
          blade.addColorStop(0.75, replaceAlpha(effect.color, 0.55));
          blade.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = blade;
          ctx.shadowBlur = 10;
          ctx.shadowColor = effect.color;
          ctx.beginPath();
          ctx.ellipse(sr * 0.5, 0, sr * 0.6, sw, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (effect.type === 'circle') {
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Damage numbers ─────────────────────────────────────────────────────
      for (const dn of damageNumbers) {
        const progress = dn.lifeTime / dn.maxLifeTime;
        const opacity = Math.max(0, 1 - progress);
        const scale = (dn.scale ?? 1) * (1 + 0.3 * Math.sin(progress * Math.PI));
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.font = `bold ${Math.round(15 * scale)}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(dn.value, dn.x, dn.y);
        ctx.fillStyle = dn.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = dn.color;
        ctx.fillText(dn.value, dn.x, dn.y);
        ctx.restore();
      }

      ctx.restore();

      // ── Dynamic torch lighting overlay (reused off-screen canvas) ─────────
      {
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

        lctx.globalCompositeOperation = 'source-over';
        if (gameStateRef.current.inDungeon) {
          // Soft base darkness with a faint blue moon/cave ambient
          const baseGrad = lctx.createLinearGradient(0, 0, 0, lc.height);
          baseGrad.addColorStop(0, 'rgba(4,5,14,0.86)');
          baseGrad.addColorStop(1, 'rgba(6,5,12,0.92)');
          lctx.fillStyle = baseGrad;
          lctx.fillRect(0, 0, lc.width, lc.height);
        } else {
          // Overworld: bright daylight with a very faint atmospheric tint
          lctx.fillStyle = 'rgba(10,14,26,0.15)';
          lctx.fillRect(0, 0, lc.width, lc.height);
        }
        lctx.globalCompositeOperation = 'destination-out';

        // Player torch light with layered warm glow and subtle flicker
        const pwx = Math.round(canvas.width / 2 + 16);
        const pwy = Math.round(canvas.height / 2 + 16);
        const pFlicker = 1 + 0.05 * Math.sin(now / 120) + 0.03 * Math.sin(now / 37) + 0.02 * Math.sin(now / 19);
        const pg = lctx.createRadialGradient(pwx, pwy, 8, pwx, pwy, 260 * pFlicker);
        pg.addColorStop(0, 'rgba(255,210,140,0.98)');
        pg.addColorStop(0.25, 'rgba(255,170,80,0.72)');
        pg.addColorStop(0.55, 'rgba(255,130,50,0.38)');
        pg.addColorStop(0.85, 'rgba(200,80,20,0.12)');
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = pg;
        lctx.fillRect(0, 0, lc.width, lc.height);

        // Torch wall lights with stronger color and jitter
        for (const torch of map.torches) {
          if (!map.explored[torch.ty]?.[torch.tx]) continue;
          const twx = Math.round(canvas.width / 2 - camera.x + torch.tx * TILE_SIZE + TILE_SIZE / 2);
          const twy = Math.round(canvas.height / 2 - camera.y + torch.ty * TILE_SIZE + TILE_SIZE / 2);
          if (twx < -140 || twx > lc.width + 140 || twy < -140 || twy > lc.height + 140) continue;
          const flicker = 1 + 0.12 * Math.sin(now / 80 + torch.tx + torch.ty) + 0.07 * Math.sin(now / 29) + 0.04 * Math.sin(now / 13);
          const tg = lctx.createRadialGradient(twx, twy, 2, twx, twy, 105 * flicker);
          tg.addColorStop(0, 'rgba(255,190,80,0.82)');
          tg.addColorStop(0.35, 'rgba(255,130,40,0.42)');
          tg.addColorStop(0.7, 'rgba(220,80,15,0.16)');
          tg.addColorStop(1, 'rgba(0,0,0,0)');
          lctx.fillStyle = tg;
          lctx.fillRect(twx - 110, twy - 110, 220, 220);
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(lc, 0, 0);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

function drawEntityShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  by: number,
  w: number,
  h: number,
  lightDir: { x: number; y: number } = { x: 0.3, y: -0.8 },
): void {
  ctx.save();
  // Soft shadow offset away from the dominant light source (player torch)
  const offsetX = lightDir.x * h * 0.8;
  const offsetY = lightDir.y * h * 0.3;
  const gx = cx + offsetX;
  const gy = by + offsetY + h * 0.3;
  const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h * 2));
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(gx, gy, w / 2, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function replaceAlpha(color: string, alpha: number): string {
  // Only mutate well-formed rgba(...) strings; otherwise leave the color as-is
  // so addColorStop never receives a malformed string.
  return color.replace(
    /^rgba\((\d{1,3},\s*\d{1,3},\s*\d{1,3}),\s*[\d.]+\)$/,
    `rgba($1,${alpha})`,
  );
}

function hash(x: number, y: number): number {
  let h = ((x * 374761393 + y * 1234567891) & 0x7fffffff);
  h = ((h ^ (h >>> 13)) * 1540483477) & 0x7fffffff;
  return (h ^ (h >>> 15)) / 0x7fffffff;
}
