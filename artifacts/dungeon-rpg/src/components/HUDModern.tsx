import React, { useState } from 'react';
import { GameState } from '../game/engine';
import { CLASS_DEFS } from '../game/classes';
import { TINY_CLASS_SPRITES, TINY_UI } from '../game/premiumPixelArt';
import { InventoryPanel } from './InventoryPanel';
import { MiniMap } from './MiniMap';
import { HudTouchButton } from './HudTouchButton';

interface Props {
  gameState: GameState;
  onPause: () => void;
  onExitDungeon?: () => void;
}

function StatBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const percent = Math.max(0, Math.min(100, max ? value / max * 100 : 0));
  return (
    <div className="relative h-[13px] overflow-hidden border border-[#2c1d0c] bg-black/85">
      <div className="absolute inset-y-[2px] left-[2px]" style={{ width: `calc(${percent}% - 4px)`, background: color }} />
      <span className="absolute inset-0 grid place-items-center text-[8px] font-black text-white drop-shadow-[0_1px_2px_#000]">
        {label} {Math.ceil(value)}/{max}
      </span>
    </div>
  );
}

export function HUDModern({ gameState, onPause, onExitDungeon }: Props) {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const player = gameState.player;
  const classDef = CLASS_DEFS[player.playerClass];
  const portraitColumns = player.playerClass === 'warrior' ? 8 : 6;
  const mana = Math.round((1 - Math.min(1, player.skillCooldown / classDef.skillCooldownMs)) * 100);
  const xp = Math.min(100, player.xp / (player.level * 100) * 100);
  const coins = gameState.killCount * 8 + gameState.floor * 20;

  return (
    <>
      {inventoryOpen ? <InventoryPanel gameState={gameState} onClose={() => setInventoryOpen(false)} /> : null}
      <div className="fixed inset-0 z-40 pointer-events-none select-none">
        <div className="absolute left-2 top-2 flex gap-1.5" style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)' }}>
          <div className="relative h-[44px] w-[44px] overflow-hidden border border-[#c7923d]/70 bg-[#151008]">
            <img src={TINY_CLASS_SPRITES[player.playerClass]} alt="" className="absolute left-0 top-0 h-full max-w-none [image-rendering:pixelated]" style={{ width: `${portraitColumns * 100}%` }} />
            <span className="absolute bottom-0 left-0 right-0 bg-black/78 text-center text-[7px] font-black text-[#f3c75d]">LV {player.level}</span>
          </div>
          <div className="w-[142px] space-y-1">
            <StatBar value={player.hp} max={player.maxHp} color="#c83b32" label="HP" />
            <StatBar value={mana} max={100} color="#2d79c7" label="MP" />
            <div className="flex h-[17px] items-center gap-1 border border-white/8 bg-black/58 px-1.5 text-[8px] font-black text-white/75">
              <span className="text-[#e0b34b]">◆</span>
              <span className="truncate">Gegner besiegen</span>
              <span className="ml-auto text-white/45">{Math.min(gameState.killCount, 10)}/10</span>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto absolute right-2 top-2 flex flex-col items-end gap-1" style={{ paddingTop: 'env(safe-area-inset-top)', paddingRight: 'env(safe-area-inset-right)' }} data-ui-control>
          <MiniMap map={gameState.map} x={player.x + player.width / 2} y={player.y + player.height / 2} />
          <div className="flex gap-1">
            <HudTouchButton ariaLabel="Inventory" onPress={() => setInventoryOpen(true)} className="relative h-9 w-9 touch-none active:scale-90">
              <img src={TINY_UI.squareButtonBlue} alt="" className="absolute inset-0 h-full w-full [image-rendering:pixelated]" />
              <b className="relative text-[9px] text-white">BAG</b>
            </HudTouchButton>
            <HudTouchButton ariaLabel="Pause" onPress={onPause} className="relative h-9 w-9 touch-none active:scale-90">
              <img src={TINY_UI.squareButtonRed} alt="" className="absolute inset-0 h-full w-full [image-rendering:pixelated]" />
              <b className="relative text-xs text-white">II</b>
            </HudTouchButton>
          </div>
          <div className="flex gap-1 text-[9px] font-black text-white">
            <span className="border border-[#8d6837]/55 bg-black/72 px-1.5 py-1 text-[#f3d47c]">● {coins}</span>
            <span className="border border-violet-500/35 bg-black/72 px-1.5 py-1 text-violet-200">◆ {Math.max(0, player.level - 1)}</span>
          </div>
        </div>

        {gameState.inDungeon && onExitDungeon ? (
          <HudTouchButton ariaLabel="Dungeon verlassen" onPress={onExitDungeon} className="pointer-events-auto absolute left-1/2 top-[max(.55rem,env(safe-area-inset-top))] -translate-x-1/2 border border-red-500/30 bg-black/68 px-2 py-1 text-[7px] font-black text-red-200">
            VERLASSEN
          </HudTouchButton>
        ) : null}

        <div className="absolute bottom-[2px] left-[18%] right-[18%] h-1 overflow-hidden border border-black/80 bg-black/70">
          <div className="h-full bg-[#c99a32]" style={{ width: `${xp}%` }} />
        </div>
      </div>
    </>
  );
}
