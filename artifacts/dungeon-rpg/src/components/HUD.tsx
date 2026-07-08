import React from 'react';
import type { GameState } from '../game/runEngine';

interface Props{gameState:GameState;onPause:()=>void;onExitDungeon?:()=>void}

function Bar({v,m,c}:{v:number;m:number;c:string}){
 const p=Math.max(0,Math.min(100,m?v/m*100:0));
 return <div className="relative h-[14px] overflow-hidden rounded-full border border-white/10 bg-black/70"><div className="absolute inset-[2px] rounded-full" style={{width:`calc(${p}% - 4px)`,background:c}}/><span className="absolute inset-0 grid place-items-center text-[8px] font-black text-white drop-shadow-[0_1px_2px_#000]">{Math.ceil(v)}/{m}</span></div>
}

export function HUD({gameState:g,onPause}:Props){
 const p=g.player;
 const gifts=Object.values(g.runSkills).reduce((sum,value)=>sum+(value??0),0);
 return <div className="fixed inset-0 z-40 pointer-events-none select-none">
  <div className="absolute left-3 right-3 top-3 flex items-start justify-between" style={{paddingTop:'env(safe-area-inset-top)',paddingLeft:'env(safe-area-inset-left)',paddingRight:'env(safe-area-inset-right)'}}>
   <div className="w-[190px] rounded-2xl border border-white/10 bg-black/55 p-3 shadow-xl backdrop-blur-sm">
    <div className="mb-2 flex items-center justify-between text-[10px] font-black tracking-[.18em] text-white/75"><span>KAPITEL {g.chapter}</span><span>RAUM {g.floor}/10</span></div>
    <Bar v={p.hp} m={p.maxHp} c="#cb463d"/>
    <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2 text-[8px] font-bold tracking-[.16em] text-white/45"><span>WALDLÄUFER</span><span>{gifts} GABEN</span></div>
   </div>
   <button type="button" onPointerDown={e=>{e.preventDefault();e.stopPropagation();onPause()}} className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/55 text-sm font-black text-white/85 backdrop-blur-sm active:scale-90" data-ui-control>Ⅱ</button>
  </div>
  <div className="absolute left-1/2 top-[max(5.6rem,calc(env(safe-area-inset-top)+4.6rem))] -translate-x-1/2 rounded-full border border-white/10 bg-black/38 px-4 py-1.5 text-[9px] font-black tracking-[.2em] text-white/60 backdrop-blur-sm">{g.enemies.filter(enemy=>enemy.hp>0&&!enemy.isDead).length} GEGNER</div>
 </div>
}
