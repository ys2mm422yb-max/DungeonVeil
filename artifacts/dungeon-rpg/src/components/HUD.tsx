import React from 'react';
import type { GameState } from '../game/runEngine';
import { veilModifierLabel } from '../game/runEffectSystems';

interface Props{gameState:GameState;onPause:()=>void;onExitDungeon?:()=>void}

function Bar({v,m,c}:{v:number;m:number;c:string}){
 const p=Math.max(0,Math.min(100,m?v/m*100:0));
 return <div className="relative h-[14px] overflow-hidden rounded-full border border-white/10 bg-black/70"><div className="absolute inset-[2px] rounded-full" style={{width:`calc(${p}% - 4px)`,background:c}}/><span className="absolute inset-0 grid place-items-center text-[8px] font-black text-white drop-shadow-[0_1px_2px_#000]">{Math.ceil(v)}/{m}</span></div>
}

export function HUD({gameState:g,onPause}:Props){
 const p=g.player;
 const gifts=Object.entries(g.runSkills).reduce((sum,[key,value])=>key==='heal'?sum:sum+(value??0),0);
 const living=g.enemies.filter(enemy=>enemy.hp>0&&!enemy.isDead).length;
 const pending=g.enemies.filter(enemy=>enemy.isDead).length;
 const boss=g.enemies.find(enemy=>enemy.enemyType==='boss'&&enemy.hp>0&&!enemy.isDead);
 const hunt=g.enemies.find(enemy=>enemy.isHuntTarget&&enemy.hp>0&&!enemy.isDead);
 const modifier=veilModifierLabel(g.floor);
 const visibleEnemyCount=living+pending;
 const enemyText=g.roomClearReady?'RAUM FREI':boss?'BOSSRAUM':hunt?`JAGD · ${hunt.huntName??'GEZEICHNETE BEUTE'}`:visibleEnemyCount>0?`${visibleEnemyCount} GEGNER`:'RAUM WIRD FREIGEGEBEN';
 const hintVisible=performance.now()<g.exitHintUntil;
 const exitHint=pending>0&&living===0?'AUSGANG WIRD FREIGEGEBEN':`NOCH ${living} GEGNER`;
 return <div className="fixed inset-0 z-40 pointer-events-none select-none">
  <div className="absolute left-3 right-3 top-3 flex items-start justify-between" style={{paddingTop:'env(safe-area-inset-top)',paddingLeft:'env(safe-area-inset-left)',paddingRight:'env(safe-area-inset-right)'}}>
   <div className="w-[190px] rounded-2xl border border-white/10 bg-black/55 p-3 shadow-xl backdrop-blur-sm">
    <div className="mb-2 flex items-center justify-between text-[10px] font-black tracking-[.18em] text-white/75"><span>KAPITEL {g.chapter}</span><span>RAUM {g.floor}/20</span></div>
    <Bar v={p.hp} m={p.maxHp} c="#cb463d"/>
    <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2 text-[8px] font-bold tracking-[.16em] text-white/45"><span>WALDLÄUFER</span><span>{gifts} GABEN</span></div>
    {modifier&&<div className="mt-2 truncate rounded-full border border-violet-300/15 bg-violet-500/[.07] px-2 py-1 text-center text-[6px] font-black tracking-[.18em] text-violet-100/65">{modifier}</div>}
   </div>
   <button type="button" onPointerDown={e=>{e.preventDefault();e.stopPropagation();onPause()}} className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/55 text-sm font-black text-white/85 backdrop-blur-sm active:scale-90" data-ui-control>Ⅱ</button>
  </div>
  <div className={`absolute left-1/2 top-[max(5.6rem,calc(env(safe-area-inset-top)+4.6rem))] max-w-[60vw] -translate-x-1/2 truncate rounded-full border px-4 py-1.5 text-[9px] font-black tracking-[.16em] backdrop-blur-sm ${g.roomClearReady?'border-violet-300/30 bg-violet-500/15 text-violet-100':boss?'border-red-300/30 bg-red-950/55 text-red-100':hunt?'border-amber-300/35 bg-amber-950/58 text-amber-100':'border-white/10 bg-black/38 text-white/60'}`}>{enemyText}</div>
  {hunt&&!boss&&<div className="absolute left-1/2 top-[max(8.15rem,calc(env(safe-area-inset-top)+6.95rem))] w-[min(72vw,285px)] -translate-x-1/2 rounded-xl border border-amber-300/22 bg-black/66 px-3 py-2 shadow-[0_12px_34px_rgba(0,0,0,.42)] backdrop-blur-md">
   <div className="mb-1.5 flex items-center justify-between text-[7px] font-black tracking-[.18em] text-amber-100/75"><span>{hunt.huntName??'GEZEICHNETE BEUTE'}</span><span>JAGDZIEL</span></div>
   <Bar v={hunt.hp} m={hunt.maxHp} c="#c89538"/>
  </div>}
  {boss&&<div className="absolute left-1/2 top-[max(8.2rem,calc(env(safe-area-inset-top)+7rem))] w-[min(78vw,320px)] -translate-x-1/2 rounded-2xl border border-red-300/20 bg-black/68 px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,.45)] backdrop-blur-md">
   <div className="mb-2 flex items-center justify-between text-[8px] font-black tracking-[.24em] text-red-100/75"><span>DER WÄCHTER</span><span>KAPITELBOSS</span></div>
   <Bar v={boss.hp} m={boss.maxHp} c="#9f2f33"/>
  </div>}
  {hintVisible&&<div className="absolute left-1/2 top-[max(11.5rem,calc(env(safe-area-inset-top)+10.2rem))] -translate-x-1/2 rounded-xl border border-orange-300/35 bg-black/72 px-4 py-2 text-[10px] font-black tracking-[.18em] text-orange-100 shadow-xl">{exitHint}</div>}
 </div>
}
