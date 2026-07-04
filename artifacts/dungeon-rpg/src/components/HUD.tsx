import React, { useEffect, useState } from 'react';
import { GameState } from '../game/engine';
import { TILE_SIZE, TileType } from '../game/dungeon';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  gameState: GameState;
  onPause: () => void;
}

export function HUD({ gameState, onPause }: Props) {
  const { t } = useLanguage();
  const { player, floor, map } = gameState;

  const [stats, setStats] = useState({ hp: player.hp, maxHp: player.maxHp, xp: player.xp, level: player.level });

  useEffect(() => {
    let frameId: number;
    const updateStats = () => {
      setStats({ hp: player.hp, maxHp: player.maxHp, xp: player.xp, level: player.level });
      frameId = requestAnimationFrame(updateStats);
    };
    frameId = requestAnimationFrame(updateStats);
    return () => cancelAnimationFrame(frameId);
  }, [player]);

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const xpNeeded = stats.level * 100;
  const xpPercent = Math.min(100, (stats.xp / xpNeeded) * 100);

  const renderMinimap = () => {
    const size = 80;
    const scale = 2;
    const mmW = Math.floor(size / scale);
    const mmH = Math.floor(size / scale);
    const px = Math.floor(player.x / TILE_SIZE);
    const py = Math.floor(player.y / TILE_SIZE);
    const startX = Math.max(0, px - Math.floor(mmW / 2));
    const startY = Math.max(0, py - Math.floor(mmH / 2));
    const dots = [];
    for (let y = 0; y < mmH; y++) {
      for (let x = 0; x < mmW; x++) {
        const mx = startX + x;
        const my = startY + y;
        if (my >= 0 && my < map.height && mx >= 0 && mx < map.width && map.explored[my][mx]) {
          const tile = map.tiles[my][mx];
          if (tile !== TileType.EMPTY) {
            let color = 'bg-gray-600';
            if (tile === TileType.STAIRS_DOWN) color = 'bg-purple-500';
            else if (mx === px && my === py) color = 'bg-blue-400';
            dots.push(
              <div
                key={`${mx}-${my}`}
                className={`absolute w-0.5 h-0.5 ${color}`}
                style={{ left: x * scale, top: y * scale }}
              />
            );
          }
        }
      }
    }
    return (
      <div className="w-[80px] h-[80px] bg-black/60 border border-white/20 rounded-md relative overflow-hidden flex-shrink-0">
        {dots}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex justify-between items-start p-4">
        {/* HP Bar */}
        <div className="w-48 bg-black/80 border-2 border-zinc-800 rounded p-1 shadow-lg pointer-events-auto">
          <div className="h-6 bg-zinc-900 rounded-sm relative overflow-hidden border border-black">
            <div
              className="absolute top-0 left-0 h-full bg-destructive transition-all duration-300 ease-out"
              style={{ width: `${hpPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md font-sans tracking-wide">
              {Math.ceil(stats.hp)} / {stats.maxHp} {t.hpLabel}
            </div>
          </div>
        </div>

        {/* Center Info — tap to pause */}
        <div
          className="flex flex-col items-center pointer-events-auto cursor-pointer active:scale-95 transition-transform"
          onTouchStart={(e) => { e.preventDefault(); onPause(); }}
          onClick={onPause}
          data-testid="button-pause"
        >
          <div className="bg-black/80 border border-primary/50 text-primary px-6 py-1 rounded-t shadow-lg font-serif tracking-widest text-lg font-bold">
            {t.floorLabel} {floor}
          </div>
          <div className="bg-zinc-900 border-x border-b border-primary/30 text-white/80 px-4 py-0.5 rounded-b text-xs font-bold tracking-wider">
            {t.lvlLabel} {stats.level}
          </div>
        </div>

        {/* Minimap */}
        <div className="pointer-events-auto">
          {renderMinimap()}
        </div>
      </div>

      {/* Bottom XP Bar */}
      <div className="w-full px-4 pb-2">
        <div className="w-full h-2 bg-black/80 border border-zinc-800 rounded-full overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.8)] relative">
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 shadow-[0_0_8px_hsl(var(--primary))]"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <div className="text-[10px] text-center text-primary font-bold tracking-widest mt-1 opacity-70">
          {t.experience}
        </div>
      </div>
    </div>
  );
}
