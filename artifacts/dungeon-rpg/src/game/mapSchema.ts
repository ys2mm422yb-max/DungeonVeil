import { RoomType } from './roomTypes';

export const TILE_SIZE = 40;
export enum TileType { EMPTY, FLOOR, WALL, DOOR, STAIRS_DOWN, GRASS, FOREST, WATER, ROAD, VILLAGE, DUNGEON_ENTRANCE, CLIFF, WATERFALL, BRIDGE }
export interface Room { x:number; y:number; w:number; h:number; roomType:RoomType }
export interface Decoration { tx:number; ty:number; kind:'torch'|'shrine'|'skull'|'forge'|'bookshelf'|'altar' }
export interface ChestSpawn { tx:number; ty:number; locked:boolean; roomIndex:number }
export interface DungeonMap {
  width:number; height:number; tiles:TileType[][];
  wallVariant:number[][]; floorVariant:number[][]; wallTint:string[][];
  explored:boolean[][]; reachable?:boolean[][]; rooms:Room[];
  startX:number; startY:number; chests:ChestSpawn[];
  decorations:Decoration[]; torches:Array<{tx:number;ty:number}>;
}
