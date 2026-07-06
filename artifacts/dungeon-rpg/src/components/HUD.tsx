import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameState } from '../game/engine';
import { TILE_SIZE, TileType } from '../game/dungeon';
import { useLanguage } from '../i18n/LanguageContext';
import { CLASS_DEFS } from '../game/classes';
import { drawSprite, PLAYER_SPRITES } from '../game/sprites';

interface Props {
  gameState: GameState;
  onPause: () => void;
  onExitDungeon?: () => void;
}

interface StatBarProps {
  value: number;
  max: number;
  label: string;
  fillClass: string;
  glow: string;
}

function clampPercent(value: number, max: number): number {
  return Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
}

function StatBar({ value, max, label, fillClass, glow }: StatBarProps) {
  const percent = clampPercent(value, max);
  return (
    <div className="h-[20px] sm:h-[22px] rounded-md border border-black/70 bg-black/80 shadow-inner overflow-hidden relative">
      <div
        className={`absolute inset-y-0 left-0 ${fillClass} transition-all duration-300 ease-out`}
        style={{ width: `${percent}%`, boxShadow: glow }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/35" />
      <div className="absolute inset-0 flex items-center justify-center text-[11px] sm:text-[13px] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] tracking-wide whitespace-nowrap">
        {Math.ceil(value)} / {max} {label}
      </div>
    </div>
  );
}

function PlayerPortrait({ gameState }: { gameState: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { player } = gameState;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 80;
    canvas.height = 80;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createRadialGradient(40, 34, 6, 40, 40, 44);
    grad.addColorStop(0, CLASS_DEFS[player.playerClass].glowColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sprite = PLAYER_SPRITES[player.playerClass];
    drawSprite(ctx, 14, 12, 52, 52, sprite, 0);
  }, [player.playerClass]);

  return (
    <div className="w-[56px] h-[56px] sm:w-[74px] sm:h-[74px] rounded-lg border-2 border-[#9b6b2e] bg-[#17100b]/95 shadow-[0_0_18px_rgba(0,0,0,0.8)] p-1 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/50 pointer-events-none" />
      <canvas ref={canvasRef} className="w-full h-full relative z-10" />
    </div>
  );
}

export function HUD({ gameState, onPause, onExitDungeon }: Props) {
  const { t } = useLanguage();
  const { player, floor, map } = gameState;

  const [stats, setStats] = useState({
    hp: player.hp,
    maxHp: player.maxHp,
    xp: player.xp,
    level: player.level,
    skillCooldown: player.skillCooldown,
  });

  useEffect(() => {
    let frameId: number;
    const updateStats = () => {
      setStats({
        hp: player.hp,
        maxHp: player.maxHp,
        xp: player.xp,
        level: player.level,
        skillCooldown: player.skillCooldown,
      });
      frameId = requestAnimationFrame(updateStats);
    };
    frameId = requestAnimationFrame(updateStats);
    return () => cancelAnimationFrame(frameId);
  }, [player]);

  const classDef = CLASS_DEFS[player.playerClass];
  const mpMax = 100;
  const mpValue = Math.round((1 - Math.min(1, stats.skillCooldown / classDef.skillCooldownMs)) * mpMax);
  const xpNeeded = stats.level * 100;
  const xpPercent = Math.min(100, (stats.xp / xpNeeded) * 100);
  const coins = gameState.killCount * 8 + floor * 20;
  const crystals = Math.max(0, stats.level - 1);
  const questKills = Math.min(gameState.killCount, 10);

  const minimapDots = useMemo(() => {
    const size = 96;
    const scale = 3;
    const mmW = Math.floor(size / scale);
    const mmH = Math.floor(size / scale);
    const px = Math.floor(player.x / TILE_SIZE);
    const py = Math.floor(player.y / TILE_SIZE);
    const startX = Math.max(0, px - Math.floor(mmW / 2));
    const startY = Math.max(0, py - Math.floor(mmH / 2));
    const dots: React.ReactNode[] = [];

    for (let y = 0; y < mmH; y++) {
      for (let x = 0; x < mmW; x++) {
        const mx = startX + x;
        const my = startY + y;
        if (my < 0 || my >= map.height || mx < 0 || mx >= map.width || !map.explored[my][mx]) continue;

        const tile = map.tiles[my][mx];
        if (tile === TileType.EMPTY) continue;

        let color = '#5f6368';
        if (mx === px && my === py) color = '#ffffff';
        else if (tile === TileType.STAIRS_DOWN) color = '#b86cff';
        else if (tile === TileType.DUNGEON_ENTRANCE) color = '#28d7ff';
        else if (tile === TileType.WATER) color = '#167ca4';
        else if (tile === TileType.FOREST) color = '#183f18';
        else if (tile === TileType.GRASS) color = '#477c2d';
        else if (tile === TileType.ROAD) color = '#ad8a49';
        else if (tile === TileType.VILLAGE) color = '#d5b65a';

        dots.push(
          <div
            key={`${mx}-${my}`}
            className="absolute rounded-[1px]"
            style={{ left: x * scale, top: y * scale, width: scale, height: scale, background: color }}
          />,
        );
      }
    }

    return dots;
  }, [map, player.x, player.y]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 select-none">
      {/* Player panel */}
      <div
        className="absolute top-3 left-3 pointer-events-auto max-w-[228px] sm:max-w-none"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)' }}
      >
        <div className="flex items-start gap-2 w-[228px] sm:w-auto">
          <div className="relative shrink-0">
            <PlayerPortrait gameState={gameState} />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 min-w-[48px] sm:min-w-[58px] rounded-md border border-[#9b6b2e] bg-[#21170e]/95 px-1.5 sm:px-2 py-0.5 text-center text-[11px] sm:text-[13px] font-black text-[#ffd35b] shadow-lg whitespace-nowrap">
              Lv. {stats.level}
            </div>
          </div>

          <div className="w-[164px] sm:w-[min(58vw,245px)] pt-0.5 sm:pt-1 space-y-1 shrink-0">
            <StatBar
              value={stats.hp}
              max={stats.maxHp}
              label={t.hpLabel}
              fillClass="bg-gradient-to-r from-[#7c0505] via-[#d90d0d] to-[#ff3d2e]"
              glow="0 0 12px rgba(255,0,0,0.45)"
            />
            <StatBar
              value={mpValue}
              max={mpMax}
              label="MP"
              fillClass="bg-gradient-to-r from-[#063f88] via-[#0b79d0] to-[#35b7ff]"
              glow="0 0 12px rgba(40,160,255,0.45)"
            />
          </div>
        </div>

        <div className="mt-7 w-[228px] sm:w-[min(72vw,290px)] rounded-lg border border-white/15 bg-black/72 px-3 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <div className="text-[#ffd35b] text-[11px] sm:text-[12px] font-black tracking-widest uppercase mb-2">Active Quests</div>
          <div className="space-y-1.5 text-[11px] sm:text-[12px] text-white/90 font-semibold leading-tight">
            <div className="flex justify-between gap-3">
              <span className="truncate">Defeat 10 enemies</span>
              <span className="text-white/80 shrink-0">{questKills} / 10</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="truncate">Find the old shrine</span>
              <span className="text-white/55 shrink-0">-</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="truncate">Open a chest</span>
              <span className="text-white/55 shrink-0">-</span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimap and currencies */}
      <div
        className="absolute top-3 right-3 pointer-events-auto flex flex-col items-end gap-4 w-[120px] sm:w-auto"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        <div className="w-[120px] sm:w-auto rounded-lg border-2 border-white/18 bg-black/75 p-2 shadow-[0_8px_28px_rgba(0,0,0,0.6)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="font-serif text-[10px] sm:text-[13px] text-white/90 font-black tracking-widest uppercase leading-none truncate">
                {gameState.inDungeon ? t.dungeonLabel : 'Greenwald'}
              </div>
              <div className="text-[9px] sm:text-[11px] text-white/60 font-bold tracking-wider mt-1 truncate">
                {gameState.inDungeon ? `${t.floorLabel} ${floor}` : t.worldLabel}
              </div>
            </div>
            <button
              onClick={onPause}
              onTouchStart={(e) => { e.preventDefault(); onPause(); }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-[#9b6b2e] bg-[#21170e]/95 text-[#ffd35b] text-lg sm:text-xl font-black active:scale-95 transition-transform shrink-0"
              data-testid="button-pause"
            >
              ⚙
            </button>
          </div>

          <div className="w-[96px] h-[96px] sm:w-[108px] sm:h-[108px] bg-[#10150d] border border-white/15 rounded-md relative overflow-hidden shadow-inner mx-auto">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_65%)]" />
            {minimapDots}
          </div>
        </div>

        <div className="flex gap-4 justify-end">
          <div className="min-w-[54px] sm:min-w-[72px] h-8 sm:h-9 rounded-md border border-white/15 bg-black/72 px-2 flex items-center gap-1.5 sm:gap-2 shadow-lg">
            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-[#fff27a] via-[#e4a51c] to-[#8b4c05] border border-yellow-900/70 shrink-0" />
            <span className="text-white font-black text-xs sm:text-sm">{coins}</span>
          </div>
          <div className="min-w-[50px] sm:min-w-[60px] h-8 sm:h-9 rounded-md border border-white/15 bg-black/72 px-2 flex items-center gap-1.5 sm:gap-2 shadow-lg">
            <span className="w-4 h-4 sm:w-5 sm:h-5 rotate-45 rounded-sm bg-gradient-to-br from-[#e6b7ff] via-[#8c32d9] to-[#3b136c] border border-purple-950 shrink-0" />
            <span className="text-white font-black text-xs sm:text-sm">{crystals}</span>
          </div>
        </div>

        {gameState.inDungeon && onExitDungeon && (
          <button
            onClick={onExitDungeon}
            onTouchStart={(e) => { e.preventDefault(); onExitDungeon(); }}
            className="bg-red-900/80 border border-red-500/50 text-white/90 px-4 py-1 rounded shadow-lg text-xs font-bold tracking-wider active:scale-95 transition-transform"
            data-testid="button-exit-dungeon"
          >
            {t.exitDungeon}
          </button>
        )}
      </div>

      {/* Bottom XP Bar */}
      <div
        className="absolute left-4 right-4 bottom-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="h-2 bg-black/80 border border-zinc-800 rounded-full overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.8)] relative">
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 shadow-[0_0_8px_hsl(var(--primary))]"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
