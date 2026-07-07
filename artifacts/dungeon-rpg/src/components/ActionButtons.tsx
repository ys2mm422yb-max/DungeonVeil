import React from 'react';
import { GameState } from '../game/engine';
import { getTinyIcon, TINY_UI } from '../game/premiumPixelArt';
interface Props { gameState: GameState; onAttack:()=>void; onDodge:()=>void; onSkill:()=>void; onInteract:()=>void }
export function ActionButtons({ gameState, onAttack, onDodge, onSkill, onInteract }: Props) {
  const p=gameState.player;
  const B=({fn,icon,pos,red=false}:{fn:()=>void;icon:number;pos:string;red?:boolean})=><button type="button" onPointerDown={e=>{e.preventDefault();e.stopPropagation();fn();}} className={`absolute ${pos} active:scale-90 touch-none`}><img src={red?TINY_UI.roundButtonRed:TINY_UI.roundButtonBlue} alt="" className="absolute inset-0 h-full w-full [image-rendering:pixelated]"/><img src={getTinyIcon(icon)} alt="" className="absolute inset-[29%] h-[42%] w-[42%] object-contain [image-rendering:pixelated]"/></button>;
  return <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(.6rem,env(safe-area-inset-right))] z-50 h-36 w-40 pointer-events-auto">
    <B fn={onAttack} icon={1} red pos="bottom-0 right-0 h-[72px] w-[72px]"/>
    <B fn={onSkill} icon={p.playerClass==='mage'?4:p.playerClass==='archer'?3:2} pos="right-[54px] top-0 h-[58px] w-[58px]"/>
    <B fn={onDodge} icon={7} pos="bottom-1 left-0 h-[50px] w-[50px]"/>
    <B fn={onInteract} icon={10} pos="right-0 top-10 h-10 w-10"/>
  </div>;
}
