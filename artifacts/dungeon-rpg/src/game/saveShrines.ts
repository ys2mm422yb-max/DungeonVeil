import { DungeonMap, TileType } from './dungeon';

export interface SaveShrine {
  id: string;
  tx: number;
  ty: number;
}

function canStand(map: DungeonMap, tx: number, ty: number): boolean {
  const tile = map.tiles[ty]?.[tx];
  return tile === TileType.GRASS || tile === TileType.ROAD || tile === TileType.BRIDGE || tile === TileType.FLOOR || tile === TileType.DOOR;
}

function nearbyStandable(map: DungeonMap, tx: number, ty: number): { tx: number; ty: number } | null {
  const offsets = [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]] as const;
  for (const [dx, dy] of offsets) {
    if (canStand(map, tx + dx, ty + dy)) return { tx: tx + dx, ty: ty + dy };
  }
  return null;
}

export function getSaveShrines(map: DungeonMap, inDungeon: boolean, floor: number): SaveShrine[] {
  if (inDungeon) {
    if (floor % 3 !== 0 && floor % 5 !== 0) return [];
    const spot = nearbyStandable(map, map.startX, map.startY) ?? { tx: map.startX, ty: map.startY };
    return [{ id: `dungeon-${floor}`, ...spot }];
  }

  const shrines: SaveShrine[] = [];
  const used: Array<{ tx: number; ty: number }> = [];
  for (let ty = 1; ty < map.height - 1; ty++) {
    for (let tx = 1; tx < map.width - 1; tx++) {
      const tile = map.tiles[ty]?.[tx];
      if (tile !== TileType.VILLAGE && tile !== TileType.DUNGEON_ENTRANCE) continue;
      if (used.some(point => Math.hypot(point.tx - tx, point.ty - ty) < 8)) continue;
      const spot = nearbyStandable(map, tx, ty);
      if (!spot) continue;
      used.push({ tx, ty });
      shrines.push({ id: `${tile === TileType.VILLAGE ? 'village' : 'entrance'}-${tx}-${ty}`, ...spot });
    }
  }
  return shrines;
}
