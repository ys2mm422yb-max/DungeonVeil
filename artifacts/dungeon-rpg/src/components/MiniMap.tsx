import React from 'react';
import { DungeonMap, TILE_SIZE, TileType } from '../game/dungeon';

interface Props { map: DungeonMap; x: number; y: number; }

function tileColor(tile: TileType): string {
  if (tile === TileType.EMPTY) return 'transparent';
  if (tile === TileType.WATER || tile === TileType.WATERFALL) return '#287fa0';
  if (tile === TileType.ROAD) return '#b58b4c';
  if (tile === TileType.BRIDGE) return '#c79a5c';
  if (tile === TileType.FOREST) return '#173b1c';
  if (tile === TileType.GRASS) return '#4f7c37';
  if (tile === TileType.VILLAGE) return '#d1ad59';
  if (tile === TileType.DUNGEON_ENTRANCE || tile === TileType.STAIRS_DOWN) return '#9d62e8';
  if (tile === TileType.WALL || tile === TileType.CLIFF) return '#4d463d';
  return '#77736a';
}

export function MiniMap({ map, x, y }: Props) {
  const px=Math.floor(x/TILE_SIZE),py=Math.floor(y/TILE_SIZE),dots:React.ReactNode[]=[];
  for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){
    const mx=px+dx,my=py+dy,tile=map.tiles[my]?.[mx];
    if(tile===undefined||!map.explored[my]?.[mx]||tile===TileType.EMPTY)continue;
    dots.push(<i key={`${mx},${my}`} className="absolute h-1 w-1" style={{left:(dx+6)*4,top:(dy+6)*4,background:tileColor(tile)}}/>);
  }
  return <div className="relative h-[54px] w-[54px] overflow-hidden rounded-full border-2 border-[#8a6536]/75 bg-[#090c09] shadow-[0_6px_18px_rgba(0,0,0,.65)]">
    <div className="absolute left-0 top-0 h-[52px] w-[52px]">{dots}</div>
    <i className="absolute left-[24px] top-[24px] z-10 h-[5px] w-[5px] rounded-full border border-black bg-white shadow-[0_0_5px_white]"/>
    <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_14px_rgba(0,0,0,.8)]"/>
  </div>;
}
