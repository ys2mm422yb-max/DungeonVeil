import React, { useEffect, useState } from 'react';
import type { GameState } from '../game/runEngine';
import type { UpgradeKey } from '../i18n/translations';
import { CHAPTER_ROOMS } from '../game/chapterRun';
import { veilModifierLabel } from '../game/runEffectSystems';
import { isInstantGift } from '../game/runSkills';
import { loadMySpectatorViewerCount } from '../game/socialSpectatorOnline';

interface Props{gameState:GameState;onPause:()=>void;onExitDungeon?:()=>void}

type CombatSkillKey = 'fireArrow' | 'iceArrow' | 'multishot' | 'ricochet' | 'piercing' | 'attackSpeed' | 'elementalStorm' | 'arrowStorm' | 'veilChain';

const COMBAT_SKILLS: Array<{ key: CombatSkillKey; icon: string; label: string; tone: string }> = [
 {key:'elementalStorm',icon:'✺',label:'ELEMENT',tone:'border-fuchsia-200/25 bg-fuchsia-400/10 text-fuchsia-100'},
 {key:'arrowStorm',icon:'⇶',label:'PFEILST.',tone:'border-amber-200/25 bg-amber-400/10 text-amber-100'},
 {key:'veilChain',icon:'⌁',label:'KETTE',tone:'border-violet-200/25 bg-violet-400/10 text-violet-100'},
 {key:'fireArrow',icon:'🔥',label:'FEUER',tone:'border-orange-300/25 bg-orange-500/12 text-orange-100'},
 {key:'iceArrow',icon:'❄',label:'FROST',tone:'border-cyan-200/25 bg-cyan-400/10 text-cyan-100'},
 {key:'multishot',icon:'⇶',label:'MEHRF.',tone:'border-amber-200/22 bg-amber-400/9 text-amber-100'},
 {key:'piercing',icon:'➶',label:'DURCH.',tone:'border-slate-200/20 bg-slate-300/8 text-slate-100'},
 {key:'ricochet',icon:'↗',label:'ABPR.',tone:'border-violet-200/22 bg-violet-400/10 text-violet-100'},
 {key:'attackSpeed',icon:'⚡',label:'TEMPO',tone:'border-yellow-200/20 bg-yellow-300/8 text-yellow-100'},
];

function Bar({v,m,c}:{v:number;m:number;c:string}){
 const p=Math.max(0,Math.min(100,m?v/m*100:0));
 return <div className="relative h-[14px] overflow-hidden rounded-full border border-white/10 bg-black/70"><div className="absolute inset-y-[2px] left-[2px] rounded-full transition-[width] duration-150" style={{width:`calc(${p}% - 4px)`,background:c}}/><span className="absolute inset-0 grid place-items-center text-[8px] font-black text-white drop-shadow-[0_1px_2px_#000]">{Math.ceil(v)}/{m}</span></div>
}

export function HUD({gameState:g,onPause}:Props){
 const [viewerCount,setViewerCount]=useState(0);
 useEffect(()=>{
  let stopped=false;
  const refresh=()=>{void loadMySpectatorViewerCount().then(value=>{if(!stopped)setViewerCount(value)}).catch(()=>{if(!stopped)setViewerCount(0)})};
  refresh();
  const interval=window.setInterval(refresh,2000);
  return()=>{stopped=true;window.clearInterval(interval)};
 },[]);
 const p=g.player;
 const tabletLandscape=typeof window!=='undefined'&&typeof navigator!=='undefined'&&navigator.maxTouchPoints>1&&window.innerWidth>window.innerHeight&&Math.min(window.innerWidth,window.innerHeight)>=650;
 const narrowPortrait=typeof window!=='undefined'&&window.innerWidth<380&&window.innerHeight>window.innerWidth;
 const gifts=Object.entries(g.runSkills).filter(([key,value])=>(value??0)>0&&!isInstantGift(key as UpgradeKey)).length;
 const activeCombatSkills=COMBAT_SKILLS.flatMap(skill=>{const rank=g.runSkills[skill.key]??0;return rank>0?[{...skill,rank}]:[]});
 const living=g.enemies.filter(enemy=>enemy.hp>0&&!enemy.isDead).length;
 const pending=g.enemies.filter(enemy=>enemy.isDead).length;
 const boss=g.enemies.find(enemy=>enemy.enemyType==='boss'&&enemy.hp>0&&!enemy.isDead);
 const hunt=g.enemies.find(enemy=>enemy.isHuntTarget&&enemy.hp>0&&!enemy.isDead);
 const modifier=veilModifierLabel(g.floor);
 const visibleEnemyCount=living+pending;
 const enemyText=g.roomClearReady?'RAUM FREI':boss?'BOSSRAUM':hunt?`JAGD · ${hunt.huntName??'GEZEICHNETE BEUTE'}`:visibleEnemyCount>0?`${visibleEnemyCount} GEGNER`:'RAUM WIRD FREIGEGEBEN';
 const hintVisible=performance.now()<g.exitHintUntil;
 const exitHint=pending>0&&living===0?'AUSGANG WIRD FREIGEGEBEN':`NOCH ${living} GEGNER`;
 const rightEdge=tabletLandscape?'right-6':'right-3';
 const panelWidth=tabletLandscape?'w-[236px]':narrowPortrait?'w-[min(48vw,176px)]':'w-[min(52vw,210px)]';
 return <div className="fixed inset-0 z-40 pointer-events-none select-none" data-testid="run-hud">
  <div className={`absolute flex items-start justify-between ${tabletLandscape?'left-6 right-6 top-5':'left-3 right-3 top-3'}`} style={{paddingTop:'env(safe-area-inset-top)',paddingLeft:'env(safe-area-inset-left)',paddingRight:'env(safe-area-inset-right)'}}>
   <div data-testid="run-health-panel" className={`${panelWidth} ${tabletLandscape?'p-3.5':'p-3'} max-w-[calc(100vw-5.5rem)] rounded-2xl border border-white/10 bg-black/62 shadow-xl backdrop-blur-md`}>
    <div className={`mb-2 flex items-center justify-between gap-2 font-black tracking-[.14em] text-white/78 ${tabletLandscape?'text-[11px]':'text-[9px]'}`}><span className="truncate">KAPITEL {g.chapter}</span><span className="shrink-0">RAUM {g.floor}/{CHAPTER_ROOMS}</span></div>
    <Bar v={p.hp} m={p.maxHp} c="#cb463d"/>
    <div className={`mt-2 flex items-center justify-between gap-2 border-t border-white/8 pt-2 font-bold tracking-[.13em] text-white/45 ${tabletLandscape?'text-[9px]':'text-[7px]'}`}><span className="truncate">WALDLÄUFER</span><span className="shrink-0">{gifts} GABEN</span></div>
    {activeCombatSkills.length>0&&<div className={`mt-2 grid gap-1 ${narrowPortrait?'grid-cols-2':'grid-cols-3'}`}>{activeCombatSkills.map(skill=><div key={skill.key} data-testid={`run-gift-${skill.key}`} className={`min-w-0 truncate rounded-full border px-1.5 py-1 text-center font-black tracking-[.04em] ${tabletLandscape?'text-[6.5px]':'text-[5.5px]'} ${skill.tone}`}><span className={`mr-0.5 ${tabletLandscape?'text-[8px]':'text-[7px]'}`}>{skill.icon}</span>{skill.label}{skill.rank>1?` ${skill.rank}`:''}</div>)}</div>}
    {modifier&&<div className={`mt-2 truncate rounded-full border border-violet-300/15 bg-violet-500/[.07] px-2 py-1 text-center font-black tracking-[.16em] text-violet-100/65 ${tabletLandscape?'text-[7px]':'text-[6px]'}`}>{modifier}</div>}
   </div>
   <button data-testid="run-pause-control" type="button" aria-label="Pause" onPointerDown={e=>{e.preventDefault();e.stopPropagation();onPause()}} className={`pointer-events-auto grid shrink-0 place-items-center rounded-full border border-white/15 bg-black/65 font-black text-white/88 shadow-lg backdrop-blur-md active:scale-90 ${tabletLandscape?'h-14 w-14 text-base':'h-12 w-12 text-sm'}`} data-ui-control>Ⅱ</button>
  </div>
  {viewerCount>0&&<div data-testid="spectator-viewer-count" className={`absolute ${rightEdge} top-[max(4.7rem,calc(env(safe-area-inset-top)+3.8rem))] flex items-center gap-1 rounded-full border border-violet-300/20 bg-black/70 px-2.5 py-1 text-[8px] font-black text-violet-100 shadow-lg backdrop-blur-md`}><span aria-hidden="true">◉</span><span>{viewerCount}</span></div>}
  <div data-testid="run-enemy-status" className={`absolute ${rightEdge} top-[max(6.6rem,calc(env(safe-area-inset-top)+5.5rem))] max-w-[min(44vw,190px)] truncate rounded-full border px-3 py-1.5 font-black tracking-[.12em] shadow-lg backdrop-blur-md ${tabletLandscape?'text-[9px]':'text-[8px]'} ${g.roomClearReady?'border-violet-300/30 bg-violet-500/18 text-violet-100':boss?'border-red-300/30 bg-red-950/65 text-red-100':hunt?'border-amber-300/35 bg-amber-950/68 text-amber-100':'border-white/10 bg-black/58 text-white/70'}`}>{enemyText}</div>
  {hunt&&!boss&&<div className={`absolute ${rightEdge} top-[max(9.4rem,calc(env(safe-area-inset-top)+8.2rem))] w-[min(41vw,178px)] rounded-xl border border-amber-300/22 bg-black/76 px-3 py-2 shadow-[0_12px_34px_rgba(0,0,0,.42)] backdrop-blur-md`}><div className="mb-1.5 flex items-center justify-between gap-2 text-[6px] font-black tracking-[.12em] text-amber-100/75"><span className="truncate">{hunt.huntName??'GEZEICHNETE BEUTE'}</span><span>JAGD</span></div><Bar v={hunt.hp} m={hunt.maxHp} c="#c89538"/></div>}
  {boss&&<div className={`absolute ${rightEdge} top-[max(9.35rem,calc(env(safe-area-inset-top)+8.15rem))] w-[min(41vw,178px)] rounded-xl border border-red-300/20 bg-black/78 px-3 py-2.5 shadow-[0_14px_40px_rgba(0,0,0,.45)] backdrop-blur-md`}><div className="mb-1.5 flex items-center justify-between gap-2 text-[6px] font-black tracking-[.12em] text-red-100/75"><span>DER WÄCHTER</span><span>BOSS</span></div><Bar v={boss.hp} m={boss.maxHp} c="#9f2f33"/></div>}
  {hintVisible&&<div className={`absolute ${rightEdge} top-[max(13.2rem,calc(env(safe-area-inset-top)+12rem))] max-w-[min(44vw,190px)] rounded-xl border border-orange-300/35 bg-black/82 px-3 py-2 text-center text-[8px] font-black tracking-[.12em] text-orange-100 shadow-xl`}>{exitHint}</div>}
 </div>
}
