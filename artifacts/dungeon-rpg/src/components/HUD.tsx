import React, { useState } from 'react';
import { GameState } from '../game/engine';
import { CLASS_DEFS } from '../game/classes';
import { getTinyIcon, TINY_CLASS_SPRITES, TINY_UI } from '../game/premiumPixelArt';
import { InventoryPanel } from './InventoryPanel';
import { MiniMap } from './MiniMap';

interface Props { gameState: GameState; onPause: () => void; onExitDungeon?: () => void; }

function StatusBar({ value, max, color, label }: { value:number; max:number; color:string; label:string }) {
  const pct=Math.max(0,Math.min(100,max?value/max*100:0));
  return <div className="relative h-[14px] overflow-hidden border border-[#2c1d0c] bg-black/85 shadow-[0_2px_6px_rgba(0,0,0,.55)]">
    <img src={TINY_UI.smallBarBase} alt="" className="absolute inset-0 h-full w-full opacity-60 [image-rendering:pixelated]"/>
    <div className="absolute inset-y-[2px] left-[2px] transition-[width] duration-200" style={{width:`calc(${pct}% - 4px)`,background:color}}/>
    <span className="absolute inset-0 grid place-items-center text-[8px] font-black tracking-wide text-white drop-shadow-[0_1px_2px_#000]">{label} {Math.ceil(value)}/{max}</span>
  </div>;
}

function Portrait({ gameState }: { gameState: GameState }) {
  const cls=gameState.player.playerClass,cols=cls==='warrior'?8:6;
  return <div className="relative h-[46px] w-[46px] overflow-hidden border border-[#c7923d]/70 bg-[#151008] shadow-lg">
    <div className="absolute inset-0 opacity-35" style={{background:`radial-gradient(circle at 50% 35%,${CLASS_DEFS[cls].color},transparent 68%)`}}/>
    <div className="absolute left-1/2 top-[57%] h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2 overflow-hidden"><img src={TINY_CLASS_SPRITES[cls]} alt="" className="absolute left-0 top-0 h-full max-w-none [image-rendering:pixelated]" style={{width:`${cols*100}%`}}/></div>
  </div>;
}

export function HUD({ gameState:g, onPause, onExitDungeon }: Props) {
  const [inv,setInv]=useState(false),p=g.player,d=CLASS_DEFS[p.playerClass];
  const mp=Math.round((1-Math.min(1,p.skillCooldown/d.skillCooldownMs))*100),xp=Math.min(100,p.xp/(p.level*100)*100),coins=g.killCount*8+g.floor*20,crystals=Math.max(0,p.level-1);
  return <>
    {inv&&<InventoryPanel gameState={g} onClose={()=>setInv(false)}/>} 
    <div className="fixed inset-0 z-40 pointer-events-none select-none">
      <div className="absolute left-2 top-2 flex gap-1.5" style={{paddingTop:'env(safe-area-inset-top)',paddingLeft:'env(safe-area-inset-left)'}}>
        <div className="relative"><Portrait gameState={g}/><span className="absolute -bottom-2 left-1/2 -translate-x-1/2 border border-[#b98136]/60 bg-black/90 px-1.5 text-[8px] font-black text-[#f3c75d]">LV {p.level}</span></div>
        <div className="w-[138px] space-y-1"><StatusBar value={p.hp} max={p.maxHp} color="#c83b32" label="HP"/><StatusBar value={mp} max={100} color="#2d79c7" label="MP"/><div className="flex h-[18px] items-center gap-1 border border-white/8 bg-black/58 px-2 text-[8px] font-black text-white/75"><span className="text-[#e0b34b]">◆</span><span className="truncate">Gegner besiegen</span><span className="ml-auto text-white/40">{Math.min(g.killCount,10)}/10</span></div></div>
      </div>

      <div className="pointer-events-auto absolute right-2 top-2 flex items-start gap-1.5" style={{paddingTop:'env(safe-area-inset-top)',paddingRight:'env(safe-area-inset-right)'}}>
        <MiniMap map={g.map} x={p.x+p.width/2} y={p.y+p.height/2}/>
        <div className="grid gap-1">
          <button onClick={()=>setInv(true)} className="relative h-10 w-10 active:scale-90" aria-label="Inventory"><img src={TINY_UI.squareButtonBlue} alt="" className="absolute inset-0 h-full w-full [image-rendering:pixelated]"/><img src={getTinyIcon(6)} alt="" className="absolute inset-[27%] h-[46%] w-[46%] object-contain [image-rendering:pixelated]"/></button>
          <button onClick={onPause} className="relative h-10 w-10 active:scale-90" data-testid="button-pause"><img src={TINY_UI.squareButtonRed} alt="" className="absolute inset-0 h-full w-full [image-rendering:pixelated]"/><b className="relative text-xs text-white">II</b></button>
        </div>
      </div>

      <div className="absolute right-2 top-[max(4.1rem,calc(env(safe-area-inset-top)+4.1rem))] flex gap-1 text-[9px] font-black text-white">
        <span className="flex h-6 items-center gap-1 border border-[#8d6837]/55 bg-black/70 px-1.5"><img src={getTinyIcon(0)} alt="" className="h-4 w-4 object-contain [image-rendering:pixelated]"/>{coins}</span>
        <span className="flex h-6 items-center gap-1 border border-violet-500/35 bg-black/70 px-1.5"><img src={getTinyIcon(6)} alt="" className="h-4 w-4 object-contain [image-rendering:pixelated]"/>{crystals}</span>
      </div>

      {g.inDungeon&&onExitDungeon&&<button onClick={onExitDungeon} className="pointer-events-auto absolute right-2 top-[max(6rem,calc(env(safe-area-inset-top)+6rem))] border border-red-500/35 bg-black/70 px-2 py-1 text-[8px] font-black text-red-200 active:scale-95" data-testid="button-exit-dungeon">DUNGEON VERLASSEN</button>}
      <div className="absolute bottom-[2px] left-[18%] right-[18%] h-1 overflow-hidden border border-black/80 bg-black/70"><div className="h-full bg-[#c99a32]" style={{width:`${xp}%`}}/></div>
    </div>
  </>;
}
