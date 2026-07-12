import React from 'react';
import type { GameState } from '../game/runEngine';
import { CHAPTER_ROOMS } from '../game/chapterRun';
import { veilModifierLabel } from '../game/runEffectSystems';

interface Props{gameState:GameState;onPause:()=>void;onExitDungeon?:()=>void}

type CombatSkillKey = 'fireArrow' | 'iceArrow' | 'multishot' | 'ricochet' | 'piercing' | 'attackSpeed';

const COMBAT_SKILLS: Array<{ key: CombatSkillKey; icon: string; label: string; tone: string }> = [
 {key:'fireArrow',icon:'🔥',label:'FEUER',tone:'border-orange-300/25 bg-orange-500/12 text-orange-100'},
 {key:'iceArrow',icon:'❄',label:'FROST',tone:'border-cyan-200/25 bg-cyan-400/10 text-cyan-100'},
 {key:'multishot',icon:'⇶',label:'MEHRF.',tone:'border-amber-200/22 bg-amber-400/9 text-amber-100'},
 {key:'piercing',icon:'➶',label:'DURCH.',tone:'border-slate-200/20 bg-slate-300/8 text-slate-100'},
 {key:'ricochet',icon:'↗',label:'ABPR.',tone:'border-violet-200/22 bg-violet-400/10 text-violet-100'},
 {key:'attackSpeed',icon:'⚡',label:'TEMPO',tone:'border-yellow-200/20 bg-yellow-300/8 text-yellow-100'},
];

function Bar({v,m,c}:{v:number;m:number;c:string}){
 const p=Math.max(0,Math.min(100,m?v/m*100:0));
 return <div className="relative h-[14px] overflow-hidden rounded-full border border-white/10 bg-black/70"><div className="absolute inset-[2px] rounded-full" style={{width:`calc(${p}% - 4px)`,background:c}}/><span className="absolute inset-0 grid place-items-center text-[8px] font-black text-white drop-shadow-[0_1px_2px_#000]">{Math.ceil(v)}/{m}</span></div>
}

export function HUD({gameState:g,onPause}:Props){
 const p=g.player;
 const gifts=Object.entries(g.runSkills).reduce((sum,[key,value])=>key==='heal'?sum:sum+(value??0),0);
 const activeCombatSkills=COMBAT_SKILLS.flatMap(skill=>{
  const rank=g.runSkills[skill.key]??0;
  return rank>0?[{...skill,rank}]:[];
 });
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
   <div className="w-[200px] rounded-2xl border border-white/10 bg-black/55 p-3 shadow-xl backdrop-blur-sm">
    <div className="mb-2 flex items-center justify-between text-[10px] font-black tracking-[.18em] text-white/75"><span>KAPITEL {g.chapter}</span><span>RAUM {g.floor}/{CHAPTER_ROOMS}</span></div>
    <Bar v={p.hp} m={p.maxHp} c="#cb463d"/>
    <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2 text-[8px] font-bold tracking-[.16em] text-white/45"><span>WALDLÄUFER</span><span>{gifts} GABEN</span></div>
    {activeCombatSkills.length>0&&<div className="mt-2 grid grid-cols-3 gap-1">
     {activeCombatSkills.map(skill=><div key={skill.key} className={`min-w-0 truncate rounded-full border px-1.5 py-1 text-center text-[5.5px] font-black tracking-[.04em] ${skill.tone}`}><span className="mr-0.5 text-[7px]">{skill.icon}</span>{skill.label} {skill.rank}</div>)}
    </div>}
    {modifier&&<div className="mt-2 truncate rounded-full border border-violet-300/15 bg-violet-500/[.07] px-2 py-1 text-center text-[6px] font-black tracking-[.18em] text-violet-100/65">{modifier}</div>}
   </div>
   <button type="button" onPointerDown={e=>{e.preventDefault();e.stopPropagation();onPause()}} className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/55 text-sm font-black text-white/85 backdrop-blur-sm active:scale-90" data-ui-control>Ⅱ</button>
  </div>
  <div className={`absolute right-3 top-[max(5.25rem,calc(env(safe-area-inset-top)+4.25rem))] max-w-[42vw] truncate rounded-full border px-3 py-1.5 text-[8px] font-black tracking-[.14em] backdrop-blur-sm ${g.roomClearReady?'border-violet-300/30 bg-violet-500/15 text-violet-100':boss?'border-red-300/30 bg-red-950/55 text-red-100':hunt?'border-amber-300/35 bg-amber-950/58 text-amber-100':'border-white/10 bg-black/46 text-white/65'}`}>{enemyText}</div>
  {hunt&&!boss&&<div className="absolute right-3 top-[max(8.2rem,calc(env(safe-area-inset-top)+7rem))] w-[min(41vw,178px)] rounded-xl border border-amber-300/22 bg-black/70 px-3 py-2 shadow-[0_12px_34px_rgba(0,0,0,.42)] backdrop-blur-md">
   <div className="mb-1.5 flex items-center justify-between gap-2 text-[6px] font-black tracking-[.12em] text-amber-100/75"><span className="truncate">{hunt.huntName??'GEZEICHNETE BEUTE'}</span><span>JAGD</span></div>
   <Bar v={hunt.hp} m={hunt.maxHp} c="#c89538"/>
  </div>}
  {boss&&<div className="absolute right-3 top-[max(8.15rem,calc(env(safe-area-inset-top)+6.95rem))] w-[min(41vw,178px)] rounded-xl border border-red-300/20 bg-black/72 px-3 py-2.5 shadow-[0_14px_40px_rgba(0,0,0,.45)] backdrop-blur-md">
   <div className="mb-1.5 flex items-center justify-between gap-2 text-[6px] font-black tracking-[.12em] text-red-100/75"><span>DER WÄCHTER</span><span>BOSS</span></div>
   <Bar v={boss.hp} m={boss.maxHp} c="#9f2f33"/>
  </div>}
  {hintVisible&&<div className="absolute right-3 top-[max(12rem,calc(env(safe-area-inset-top)+10.8rem))] max-w-[42vw] rounded-xl border border-orange-300/35 bg-black/75 px-3 py-2 text-center text-[8px] font-black tracking-[.12em] text-orange-100 shadow-xl">{exitHint}</div>}
 </div>
}
