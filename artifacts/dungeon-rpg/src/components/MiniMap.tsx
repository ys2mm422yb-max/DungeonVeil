import React from 'react';
import { DungeonMap, TILE_SIZE, TileType } from '../game/dungeon';

interface Props {
  map: DungeonMap;
  x: number;
  y: number;
}

function tileColor(tile: TileType): string {
  if (tile === TileType.WATER) return '#298db3';
  if (tile === TileType.ROAD || tile === TileType.BRIDGE) return '#c49a5a';
  if (tile === TileType.FOREST) return '#315a2b';
  if (tile === TileType.DUNGEON_ENTRANCE || tile === TileType.STAIRS_DOWN) return '#9b65e8';
  return '#6eaa4f';
}

export function MiniMap({ map, x, y }: Props) {
  const px = Math.floor(x / TILE_SIZE);
  const py = Math.floor(y / TILE_SIZE);
  const dots: React.ReactNode[] = [];

  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const tile = map.tiles[py + dy]?.[px + dx];
      if (tile === undefined || !map.explored[py + dy]?.[px + dx]) continue;
      dots.push(
        <i
          key={`${dx},${dy}`}
          className="absolute h-1 w-1"
          style={{
            left: (dx + 4) * 4,
            top: (dy + 4) * 4,
            background: dx === 0 && dy === 0 ? '#fff' : tileColor(tile),
          }}
        />,
      );
    }
  }

  return <div className="relative h-9 w-9 overflow-hidden rounded border border-[#806039]/70 bg-black/80">{dots}</div>;
}
