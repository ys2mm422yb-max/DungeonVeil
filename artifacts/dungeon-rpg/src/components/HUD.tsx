import React,{useState}from'react';
import{GameState}from'../game/engine';
import{CLASS_DEFS}from'../game/classes';
import{TINY_CLASS_SPRITES,TINY_UI}from'../game/premiumPixelArt';
import{InventoryPanel}from'./InventoryPanel';
import{MiniMap}from'./MiniMap';

interface Props{gameState:GameState;onPause:()=>void;onExitDungeon?:()=>void}

function Bar({v,m,c,l}:{v:number;m:number;c:string;l:string}){
 const p=Math.max(0,Math.min(100,m?v/m*100:0));
 return <div className="relative h-[13px] overflow-hidden border border-[#2c1d0c] bg-black/85"><div className="absolute inset-y-[2px] left-[2px]" style={{width:`calc(${p}% - 4px)`,background:c}}/><span className="absolute inset-0 grid place-items-center text-[8px] font-black text-white drop-shadow-[0_1px_2px_#000]">{l} {Math.ceil(v)}/{m}</span></div>
}

export function HUD({gameState:g,onPause,onExitDungeon}:Props){
 const[inv,setInv]=useState(false);
 const p=g.player,d=CLASS_DEFS[p.playerClass],cols=p.playerClass==='warrior'?8:6;
 const mp=Math.round((1-Math.min(1,p.skillCooldown/d.skillCooldownMs))*100);
 const xp=Math.min(100,p.xp/(p.level*100)*100);
 const coins=g.killCount*8+g.floor*20;
 const reset=()=>window.dispatchEvent(new Event('dungeon-veil-reset-input'));
 const activate=(event:React.PointerEvent<HTMLButtonElement>,action:()=>void)=>{event.preventDefault();event.stopPropagation();reset();action()};
 const closeInventory=()=>{reset();setInv(false)};

 return <>
  {inv&&<InventoryPanel gameState={g} onClose={closeInventory}/>} 
  <div className="fixed inset-0 z-40 pointer-events-none select-none">
   <div className="absolute left-2 top-2 flex gap-1.5" style={{paddingTop:'env(safe-area-inset-top)',paddingLeft:'env(safe-area-inset-left)'}}>
    <div className="relative h-[44px] w-[44px] overflow-hidden border border-[#c7923d]/70 bg-[#151008]"><img src={TINY_CLASS_SPRITES[p.playerClass]} alt="" className="absolute left-0 top-0 h-full max-w-none [image-rendering:pixelated]" style={{width:`${cols*100}%`}}/><span className="absolute bottom-0 left-0 right-0 bg-black/78 text-center text-[7px] font-black text-[#f3c75d]">LV {p.level}</span></div>
    <div className="w-[142px] space-y-1"><Bar v={p.hp} m={p.maxHp} c="#c83b32" l="HP"/><Bar v={mp} m={100} c="#2d79c7" l="MP"/><div className="flex h-[17px] items-center gap-1 border border-white/8 bg-black/58 px-1.5 text-[8px] font-black text-white/75"><span className="text-[#e0b34b]">◆</span><span className="truncate">Gegner besiegen</span><span className="ml-auto text-white/45">{Math.min(g.killCount,10)}/10</span></div></div>
   </div>

   <div className="pointer-events-auto absolute right-2 top-2 flex flex-col items-end gap-1" style={{paddingTop:'env(safe-area-inset-top)',paddingRight:'env(safe-area-inset-right)'}} data-ui-control>
    <MiniMap map={g.map} x={p.x+p.width/2} y={p.y+p.height/2}/>
    <div className="flex gap-1">
     <button type="button" onPointerDown={e=>activate(e,()=>setInv(true))} className="relative h-9 w-9 touch-none active:scale-90" aria-label="Inventory" data-ui-control><img src={TINY_UI.squareButtonBlue} alt="" className="absolute inset-0 h-full w-full [image-rendering:pixelated]"/><b className="relative text-[9px] text-white">BAG</b></button>
     <button type="button" onPointerDown={e=>activate(e,onPause)} className="relative h-9 w-9 touch-none active:scale-90" aria-label="Pause" data-ui-control><img src={TINY_UI.squareButtonRed} alt="" className="absolute inset-0 h-full w-full [image-rendering:pixelated]"/><b className="relative text-xs text-white">II</b></button>
    </div>
    <div className="flex gap-1 text-[9px] font-black text-white"><span className="border border-[#8d6837]/55 bg-black/72 px-1.5 py-1 text-[#f3d47c]">● {coins}</span><span className="border border-violet-500/35 bg-black/72 px-1.5 py-1 text-violet-200">◆ {Math.max(0,p.level-1)}</span></div>
   </div>

   {g.inDungeon&&onExitDungeon&&<button type="button" onPointerDown={e=>activate(e,onExitDungeon)} className="pointer-events-auto absolute left-1/2 top-[max(.55rem,env(safe-area-inset-top))] -translate-x-1/2 border border-red-500/30 bg-black/68 px-2 py-1 text-[7px] font-black text-red-200" data-ui-control>VERLASSEN</button>}
   <div className="absolute bottom-[2px] left-[18%] right-[18%] h-1 overflow-hidden border border-black/80 bg-black/70"><div className="h-full bg-[#c99a32]" style={{width:`${xp}%`}}/></div>
  </div>
 </>
}
