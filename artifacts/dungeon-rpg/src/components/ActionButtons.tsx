import React,{useEffect,useState}from'react';
import type{GameState}from'../game/runEngine';
import{CLASS_DEFS}from'../game/classes';

interface Props{gameState:GameState;onAttack:()=>void;onDodge:()=>void;onSkill:()=>void;onInteract:()=>void}

export function ActionButtons({gameState:g,onDodge}:Props){
 const p=g.player,d=CLASS_DEFS.archer,[dash,setDash]=useState(0);
 useEffect(()=>{let id=0;const tick=()=>{setDash(Math.max(0,Math.min(1,p.dodgeCooldown/d.dodgeCooldownMs)));id=requestAnimationFrame(tick)};id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id)},[p,d]);
 return <div className="fixed z-50 pointer-events-auto touch-none select-none" style={{width:86,height:86,right:'max(16px,env(safe-area-inset-right))',bottom:'max(22px,calc(env(safe-area-inset-bottom) + 14px))'}} data-ui-control>
  <button type="button" onPointerDown={e=>{e.preventDefault();e.stopPropagation();onDodge()}} className="absolute inset-0 grid place-items-center overflow-hidden rounded-full border border-amber-300/55 bg-black/60 shadow-[0_10px_30px_rgba(0,0,0,.6)] backdrop-blur-sm active:scale-90">
   <div className="absolute inset-2 rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(84,177,218,.75),rgba(18,66,91,.9))]"/>
   <span className="relative z-10 text-[11px] font-black tracking-[.18em] text-white">DASH</span>
   {dash>0&&<div className="absolute inset-2 rounded-full" style={{background:`conic-gradient(rgba(0,0,0,.72) ${dash*360}deg,transparent 0deg)`,transform:'rotate(-90deg)'}}/>}
  </button>
 </div>
}
