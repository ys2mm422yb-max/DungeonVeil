import React, { useEffect, useRef } from 'react';
import { GameState } from '../game/engine';
import { CLASS_DEFS } from '../game/classes';
import { bobOffset } from '../game/sprites';
import { drawPremiumArrow, drawPremiumChest, drawPremiumEnemy, drawPremiumMagicBolt, drawPremiumPlayer, drawPremiumSwordArc } from '../game/premiumPixelArt';
import { renderSceneTerrain, SceneJob } from '../game/overworldSprites';
import { TINY_SEMANTIC_UI } from '../game/tinyUiAssets';

interface Props { gameState: GameState; }

const imageCache = new Map<string, HTMLImageElement>();
function image(src: string): HTMLImageElement | null {
  let img = imageCache.get(src);
  if (!img) { img = new Image(); img.src = src; img.decoding = 'async'; imageCache.set(src, img); }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function prepareLoot(state: GameState): void {
  const player = state.player;
  const pcx = player.x + player.width / 2;
  const pcy = player.y + player.height / 2;
  for (const item of state.items) {
    if (item.width < 24 || item.height < 24) {
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      item.width = 24;
      item.height = 24;
      item.x = cx - 12;
      item.y = cy - 12;
    }
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const dx = pcx - cx;
    const dy = pcy - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > 20 && dist < 92) {
      const pull = Math.max(1.2, (92 - dist) * 0.055);
      item.x += dx / dist * pull;
      item.y += dy / dist * pull;
    }
  }
}

function drawLoot(ctx: CanvasRenderingContext2D, item: GameState['items'][number], now: number): void {
  const bob = bobOffset((now + item.spawnTime) / 2, 2.4);
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2 + bob;
  const pulse = 0.82 + Math.sin((now + item.spawnTime) / 180) * 0.12;
  const src = item.itemType === 'potion' ? TINY_SEMANTIC_UI.heal : TINY_SEMANTIC_UI.goldDrop;
  const img = image(src);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = item.itemType === 'potion' ? '#55e97b' : '#ffd45d';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 16 * pulse, 7 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 15;
  ctx.shadowColor = item.itemType === 'potion' ? '#55e97b' : '#ffc83d';
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.floor(cx - 15), Math.floor(cy - 15), 30, 30);
  }
  ctx.restore();
}

export function GameCanvas({ gameState }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef(gameState);
  state.current = gameState;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let id = 0;
    let vx = state.current.camera.x;
    let vy = state.current.camera.y;

    const loop = () => {
      if (canvas.width !== innerWidth || canvas.height !== innerHeight) { canvas.width = innerWidth; canvas.height = innerHeight; }
      ctx.imageSmoothingEnabled = false;
      const now = Date.now();
      const s = state.current;
      const p = s.player;
      const m = s.map;
      prepareLoot(s);
      vx += (s.camera.x - vx) * .18;
      vy += (s.camera.y - vy) * .18;
      const zoom = canvas.width < 520 ? 1.06 : 1.12;
      const bias = s.inDungeon ? 12 : 24;
      const hw = canvas.width / zoom / 2;
      const hh = canvas.height / zoom / 2;
      const x0 = Math.max(0, Math.floor((vx - hw) / 40) - 3);
      const x1 = Math.min(m.width, Math.ceil((vx + hw) / 40) + 3);
      const y0 = Math.max(0, Math.floor((vy - hh) / 40) - 4);
      const y1 = Math.min(m.height, Math.ceil((vy + hh) / 40) + 4);

      ctx.fillStyle = s.inDungeon ? '#020207' : '#172811';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2 + bias);
      ctx.scale(zoom, zoom);
      ctx.translate(-Math.round(vx), -Math.round(vy));

      const jobs: SceneJob[] = renderSceneTerrain(ctx, s, now, x0, x1, y0, y1);
      for (const q of s.chests) jobs.push({ y: q.y + q.height, draw: () => { shadow(ctx, q.x + q.width / 2, q.y + q.height - 1, q.width * .72, 5); drawPremiumChest(ctx, q.x, q.y, q.width, q.height, q.opened); } });
      for (const q of s.items) jobs.push({ y: q.y + q.height, draw: () => drawLoot(ctx, q, now) });
      for (const e of s.enemies) jobs.push({ y: e.y + e.height, draw: () => drawEnemy(ctx, e, now) });
      jobs.push({ y: p.y + p.height, draw: () => drawPlayer(ctx, p, now) });
      jobs.sort((a, b) => a.y - b.y).forEach(job => job.draw());

      for (const particle of s.particles) {
        const life = particle.lifeTime / particle.maxLifeTime;
        ctx.save();
        ctx.globalAlpha = particle.fade ? 1 - life : 1;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = particle.size;
        ctx.shadowColor = particle.color;
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        ctx.restore();
      }
      for (const effect of s.effects) {
        const progress = effect.lifeTime / effect.maxLifeTime;
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        if (effect.type === 'slash') drawPremiumSwordArc(ctx, effect.x, effect.y, effect.angle ?? 0, progress);
        else if (effect.type === 'circle') { ctx.strokeStyle = effect.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2); ctx.stroke(); }
        else { const g = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, effect.radius); g.addColorStop(0, effect.color); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      for (const d of s.damageNumbers) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - d.lifeTime / d.maxLifeTime); ctx.font = `bold ${Math.round(14 * (d.scale ?? 1))}px monospace`; ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(d.value, d.x, d.y); ctx.fillStyle = d.color; ctx.fillText(d.value, d.x, d.y); ctx.restore(); }
      ctx.restore();

      const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2 + bias, Math.min(canvas.width, canvas.height) * .2, canvas.width / 2, canvas.height / 2 + bias, Math.max(canvas.width, canvas.height) * .7);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, s.inDungeon ? 'rgba(2,3,10,.76)' : 'rgba(13,28,10,.18)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      id = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(id);
  }, []);

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" style={{ imageRendering: 'pixelated' }} />;
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: GameState['enemies'][number], now: number) {
  const age = now - e.spawnTime, moving = e.state === 'chase' || e.state === 'patrol', frame = moving ? Math.floor(age / 120) : 0, bob = moving ? bobOffset(age, 1.2) : 0, dead = e.hp <= 0, scale = dead ? 1 - Math.min(1, (now - e.deathTime) / 400) : 1, cx = e.x + e.width / 2, cy = e.y + e.height / 2;
  shadow(ctx, cx, e.y + e.height - 1, e.width * .7, 4 * scale); ctx.save(); ctx.translate(cx, cy + bob); ctx.scale(scale, scale); ctx.translate(-cx, -cy); drawPremiumEnemy(ctx, e.enemyType, e.x, e.y, e.width, e.height, frame, e.flashUntil > now); ctx.restore();
  if (!dead && e.hp < e.maxHp) { const pct = Math.max(0, e.hp / e.maxHp); ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(e.x - 2, e.y - 7, e.width + 4, 4); ctx.fillStyle = pct > .5 ? '#39b85a' : pct > .25 ? '#d89a2c' : '#c93a32'; ctx.fillRect(e.x - 1, e.y - 6, (e.width + 2) * pct, 2); }
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: GameState['player'], now: number) {
  const d = CLASS_DEFS[p.playerClass], age = now - p.spawnTime, moving = p.state === 'moving', attacking = now - p.lastAttackTime < 180, frame = moving ? Math.floor(age / 110) : attacking ? 2 : 0, bob = moving ? bobOffset(age, 1.2) : 0, cx = p.x + p.width / 2, cy = p.y + p.height / 2, fx = p.facing.x, fy = p.facing.y;
  shadow(ctx, cx, p.y + p.height - 1, p.width * .75, 5); ctx.save(); ctx.translate(cx, cy + bob); if (attacking) { const l = 1 - (now - p.lastAttackTime) / 180; ctx.translate(fx * l * 5, fy * l * 5); } ctx.translate(-cx, -cy); if (p.invincibleUntil > now) ctx.globalAlpha = Math.floor(now / 60) % 2 ? .55 : .9; ctx.shadowBlur = 8; ctx.shadowColor = d.glowColor; drawPremiumPlayer(ctx, p.x, p.y, p.width, p.height, frame, fx < 0, false, p.playerClass, attacking ? 'attack' : moving ? 'run' : 'idle'); ctx.restore();
  if (attacking && p.playerClass === 'warrior') drawPremiumSwordArc(ctx, cx, cy, Math.atan2(fy, fx), (now - p.lastAttackTime) / 180); else if (attacking && p.playerClass === 'mage') drawPremiumMagicBolt(ctx, cx + fx * 24, cy + fy * 24, now, d.color); else if (attacking) drawPremiumArrow(ctx, cx + fx * 23, cy + fy * 23, Math.atan2(fy, fx), 30);
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(x, y, w / 2, h, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
