import React, { useEffect, useMemo, useState } from 'react';
import { GameState } from '../game/engine';
import { TILE_SIZE, TileType } from '../game/dungeon';
import { useLanguage } from '../i18n/LanguageContext';
import { CLASS_DEFS } from '../game/classes';
import { getTinyIcon, TINY_CLASS_SPRITES, TINY_UI } from '../game/premiumPixelArt';

interface Props { gameState: GameState; onPause: () => void; onExitDungeon?: () => void; }

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(100, max ? value / max * 100 : 0));
  return <div className="relative h-[14px] overflow-hidden border border-black/80 bg-black/85">
    <div className="absolute inset-0 opacity-55" style={{ backgroundImage:`url("${TINY_UI.smallBarBase}")`, backgroundSize:'100% 100%', imageRendering:'pixelated' }}/>
    <div className="absolute inset-y-[2px] left-[2px]" style={{ width:`calc(${pct}% - 4px)`, background:color }}/>
    <div className="absolute inset-0 grid place-items-center text-[8px] font-black text-white drop-shadow-[0_1px_2px_#000]">{label} {Math.ceil(value)}/{max}</div>
  </div>;
}

function Portrait({ gameState }: { gameState: GameState }) {
  const cls = gameState.player.playerClass, cols = cls === 'warrior' ? 8 : 6;
  return <div className="relative h-12 w-12 overflow-hidden border border-amber-500/60 bg-[#160f08] shadow-lg">
    <div className="absolute left-1/2 top-[57%] h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 overflow-hidden">
      <img src={TINY_CLASS_SPRITES[cls]} alt="" className="absolute left-0 top-0 h-full max-w-none [image-rendering:pixelated]" style={{ width:`${cols * 100}%` }}/>
    </div>
  </div>;
}

function Inventory({ gameState, close }: { gameState: GameState; close: () => void }) {
  const { language } = useLanguage();
  const de = language === 'de', cls = gameState.player.playerClass;
  const gear = cls === 'warrior' ? [['Eisenklinge','Iron Blade',1],['Wächterpanzer','Guardian Plate',5]] : cls === 'mage' ? [['Runenfokus','Rune Focus',7],['Schleierrobe','Veil Robe',8]] : [['Waldläuferbogen','Ranger Bow',2],['Pfadleder','Trail Leather',9]];
  const bag = [['Heiltrank','Health Potion',3],['Runensplitter','Rune Shard',6]];
  return <div className="fixed inset-0 z-[100] pointer-events-auto bg-[#050506]/95 p-3 pt-[max(.8rem,env(safe-area-inset-top))] backdrop-blur-sm">
    <div className="mx-auto flex h-full max-w-md flex-col gap-2">
      <div className="flex items-center justify-between border border-amber-600/55 bg-[#120e09] px-3 py-2"><div><small className="text-[8px] font-black tracking-[.3em] text-amber-300/40">DUNGEON VEIL</small><h2 className="font-serif text-xl font-black tracking-widest text-amber-50">{de?'INVENTAR':'INVENTORY'}</h2></div><button onClick={close} className="h-10 w-10 border border-amber-500/40 bg-black/50 text-xl text-amber-100">×</button></div>
      <div className="grid min-h-0 flex-1 grid-cols-[112px_1fr] gap-2">
        <div className="border border-amber-700/45 bg-[#100c08] p-2"><div className="mb-2 text-[8px] font-black tracking-widest text-white/35">{de?'AUSRÜSTUNG':'EQUIPMENT'}</div>{gear.map(([dn,en,icon],i)=><div key={String(dn)} className="mb-2 border border-white/10 bg-black/40 p-2 text-center"><div className="text-[7px] text-white/25">{i?'ARMOR':'WEAPON'}</div><img src={getTinyIcon(Number(icon))} alt="" className="mx-auto h-10 w-10 object-contain [image-rendering:pixelated]"/><div className="truncate text-[8px] font-black text-amber-100">{de?dn:en}</div></div>)}</div>
        <div className="overflow-y-auto border border-amber-700/45 bg-[#100c08] p-2"><div className="mb-2 text-[8px] font-black tracking-widest text-white/35">{de?'RUCKSACK':'BAG'} · 20</div><div className="grid grid-cols-4 gap-2">{bag.map(([dn,en,icon])=><div key={String(dn)} className="relative aspect-square border border-sky-400/35 bg-black/40"><img src={getTinyIcon(Number(icon))} alt="" className="absolute inset-[18%] h-[64%] w-[64%] object-contain [image-rendering:pixelated]"/><span className="absolute inset-x-1 bottom-1 truncate text-center text-[7px] font-black text-white/80">{de?dn:en}</span></div>)}{Array.from({length:18},(_,i)=><div key={i} className="aspect-square border border-white/8 bg-black/25"/>)}</div><div className="mt-3 grid grid-cols-4 gap-1">{[['HP',gameState.player.maxHp],['ATK',gameState.player.attack],['DEF',gameState.player.defense],['SPD',gameState.player.speed]].map(([k,v])=><div key={String(k)} className="border border-white/8 bg-black/35 py-2 text-center"><small className="text-[7px] text-white/30">{k}</small><div className="text-sm font-black text-amber-100">{v}</div></div>)}</div></div>
      </div>
    </div>
  </div>;
}

export function HUD({ gameState, onPause, onExitDungeon }: Props) {
  const { t, language } = useLanguage();
  const { player, floor, map } = gameState;
  const [inventory, setInventory] = useState(false);
  const [stats, setStats] = useState({ hp:player.hp, maxHp:player.maxHp, xp:player.xp, level:player.level, skillCooldown:player.skillCooldown });
  useEffect(()=>{ let id:number; const tick=()=>{ setStats({hp:player.hp,maxHp:player.maxHp,xp:player.xp,level:player.level,skillCooldown:player.skillCooldown}); id=requestAnimationFrame(tick); }; id=requestAnimationFrame(tick); return()=>cancelAnimationFrame(id); },[player]);
  const def = CLASS_DEFS[player.playerClass], mp = Math.round((1-Math.min(1,stats.skillCooldown/def.skillCooldownMs))*100), xp = Math.min(100,stats.xp/(stats.level*100)*100), coins=gameState.killCount*8+floor*20, crystals=Math.max(0,stats.level-1);

  const dots = useMemo(()=>{
    const s=3, size=29, px=Math.floor((player.x+16)/TILE_SIZE), py=Math.floor((player.y+16)/TILE_SIZE), out:React.ReactNode[]=[];
    const c=(v:TileType)=>v===TileType.WATER?'#236f91':v===TileType.FOREST?'#153619':v===TileType.GRASS?'#4f7f35':v===TileType.ROAD?'#b08b4d':v===TileType.VILLAGE?'#d8b963':v===TileType.DUNGEON_ENTRANCE||v===TileType.STAIRS_DOWN?'#b66cff':v===TileType.BRIDGE?'#bd8d50':v===TileType.CLIFF||v===TileType.WALL?'#4c4338':'#5a5850';
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const mx=px-14+x,my=py-14+y;if(mx<0||my<0||mx>=map.width||my>=map.height||!map.explored[my][mx]||map.tiles[my][mx]===TileType.EMPTY)continue;out.push(<span key={`${mx}-${my}`} className="absolute" style={{left:x*s,top:y*s,width:s,height:s,background:c(map.tiles[my][mx])}}/>);} out.push(<span key="p" className="absolute z-10 h-[5px] w-[5px] rounded-full border border-black bg-white shadow-[0_0_5px_white]" style={{left:41,top:41}}/>); return out;
  },[map,player.x,player.y]);

  return <div className="fixed inset-0 z-40 pointer-events-none select-none">
    <div className="absolute left-2 top-2 pointer-events-auto" style={{paddingTop:'env(safe-area-inset-top)',paddingLeft:'env(safe-area-inset-left)'}}><div className="flex gap-1.5"><div className="relative"><Portrait gameState={gameState}/><div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border border-amber-500/50 bg-black/90 px-1.5 text-[8px] font-black text-amber-200">LV {stats.level}</div></div><div className="w-[142px] space-y-1"><Bar value={stats.hp} max={stats.maxHp} color="#c9342e" label="HP"/><Bar value={mp} max={100} color="#2b78c5" label="MP"/><div className="flex h-[18px] items-center gap-1 border border-white/8 bg-black/58 px-2 text-[8px] font-black text-white/75"><span className="text-amber-300">◆</span><span className="truncate">{language==='de'?'Gegner besiegen':'Defeat enemies'}</span><span className="ml-auto text-white/40">{Math.min(gameState.killCount,10)}/10</span></div></div></div></div>
    <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5 pointer-events-auto" style={{paddingTop:'env(safe-area-inset-top)',paddingRight:'env(safe-area-inset-right)'}}><div className="flex gap-1.5"><div className="relative h-[90px] w-[90px] overflow-hidden rounded-full border-2 border-amber-700/70 bg-[#0b100b] shadow-xl"><div className="absolute left-[1px] top-[1px] h-[87px] w-[87px]">{dots}</div><div className="absolute inset-0 rounded-full shadow-[inset_0_0_18px_rgba(0,0,0,.8)]"/></div><div className="grid gap-1"><button onClick={()=>setInventory(true)} className="grid h-10 w-10 place-items-center border border-amber-600/55 bg-[#151008]/95 active:scale-90"><img src={getTinyIcon(5)} alt="" className="h-6 w-6 object-contain [image-rendering:pixelated]"/></button><button onClick={onPause} className="h-10 w-10 border border-amber-600/55 bg-[#151008]/95 text-[10px] font-black text-amber-100 active:scale-90" data-testid="button-pause">II</button></div></div><div className="flex gap-1"><span className="flex h-6 items-center gap-1 border border-amber-700/45 bg-black/70 px-1.5 text-[9px] font-black text-white"><img src={getTinyIcon(0)} alt="" className="h-4 w-4 object-contain [image-rendering:pixelated]"/>{coins}</span><span className="flex h-6 items-center gap-1 border border-violet-500/35 bg-black/70 px-1.5 text-[9px] font-black text-white"><img src={getTinyIcon(6)} alt="" className="h-4 w-4 object-contain [image-rendering:pixelated]"/>{crystals}</span></div><div className="max-w-[132px] border border-white/8 bg-black/55 px-2 py-1 text-right"><div className="truncate text-[8px] font-black uppercase tracking-widest text-amber-100/80">{gameState.inDungeon?t.dungeonLabel:'Greenwald'}</div><div className="text-[7px] text-white/35">{gameState.inDungeon?`${t.floorLabel} ${floor}`:t.worldLabel}</div></div>{gameState.inDungeon&&onExitDungeon&&<button onClick={onExitDungeon} className="border border-red-500/35 bg-black/70 px-2 py-1 text-[8px] font-black text-red-200" data-testid="button-exit-dungeon">{t.exitDungeon}</button>}</div>
    <div className="absolute bottom-[2px] left-[18%] right-[18%] h-1 overflow-hidden border border-black/80 bg-black/70"><div className="h-full bg-amber-400" style={{width:`${xp}%`}}/></div>{inventory&&<Inventory gameState={gameState} close={()=>setInventory(false)}/>} 
  </div>;
}
