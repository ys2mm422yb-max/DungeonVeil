import type { GameState } from './engine';
import { TileType } from './dungeon';
import { drawPremiumTile } from './premiumPixelArt';

export type SceneObjectKind = 'tree'|'pine'|'house'|'entrance'|'cliff'|'bridge'|'torch'|'flowers'|'bush'|'rock'|'log'|'mushrooms'|'skull'|'barrel'|'crate';
export type SceneJob = { y:number; draw:()=>void };

const TS='/assets/rpg-pack/Tiny Swords/Tiny Swords (Update 010)';
const FREE='/assets/rpg-pack/Tiny Swords (Free Pack)/Tiny Swords (Free Pack)';
const A={
  tree:`${TS}/Resources/Trees/Tree.png`, elevation:`${TS}/Terrain/Ground/Tilemap_Elevation.png`, bridge:`${TS}/Terrain/Bridge/Bridge_All.png`, fire:`${TS}/Effects/Fire/Fire.png`,
  houses:[`${FREE}/Buildings/Blue Buildings/House1.png`,`${FREE}/Buildings/Blue Buildings/House2.png`,`${FREE}/Buildings/Blue Buildings/House3.png`,`${FREE}/Buildings/Blue Buildings/Barracks.png`,`${FREE}/Buildings/Blue Buildings/Archery.png`,`${FREE}/Buildings/Blue Buildings/Monastery.png`,`${TS}/Factions/Knights/Buildings/House/House_Blue.png`,`${TS}/Factions/Knights/Buildings/House/House_Yellow.png`,`${TS}/Factions/Knights/Buildings/House/House_Red.png`,`${TS}/Factions/Knights/Buildings/Tower/Tower_Blue.png`],
  entrances:[`${FREE}/Buildings/Purple Buildings/Castle.png`,`${FREE}/Buildings/Black Buildings/Tower.png`,`${TS}/Factions/Knights/Buildings/Castle/Castle_Blue.png`,`${TS}/Factions/Knights/Buildings/Tower/Tower_Purple.png`,`${TS}/Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Destroyed.png`],
  deco:Array.from({length:18},(_,i)=>`${TS}/Deco/${String(i+1).padStart(2,'0')}.png`), log:`${TS}/Resources/Resources/W_Idle.png`, barrel:`${TS}/Factions/Goblins/Troops/Barrel/Blue/Barrel_Blue.png`,
};
const cache=new Map<string,HTMLImageElement>();
function img(src:string){if(typeof Image==='undefined')return null;let i=cache.get(src);if(!i){i=new Image();i.decoding='async';i.src=src;cache.set(src,i);}return i.complete&&i.naturalWidth>0?i:null;}
function whole(c:CanvasRenderingContext2D,src:string,x:number,y:number,w:number,h:number){const i=img(src);if(!i)return false;c.imageSmoothingEnabled=false;c.drawImage(i,Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));return true;}
function frame(c:CanvasRenderingContext2D,src:string,fw:number,fh:number,n:number,x:number,y:number,w:number,h:number){const i=img(src);if(!i)return false;const cols=Math.max(1,Math.floor(i.naturalWidth/fw)),rows=Math.max(1,Math.floor(i.naturalHeight/fh)),q=Math.abs(n)%(cols*rows);c.imageSmoothingEnabled=false;c.drawImage(i,(q%cols)*fw,Math.floor(q/cols)*fh,fw,fh,Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));return true;}
function tile(c:CanvasRenderingContext2D,src:string,size:number,n:number,x:number,y:number,w:number,h:number){const i=img(src);if(!i)return false;const cols=Math.max(1,Math.floor(i.naturalWidth/size)),rows=Math.max(1,Math.floor(i.naturalHeight/size)),q=Math.abs(n)%(cols*rows);c.imageSmoothingEnabled=false;c.drawImage(i,(q%cols)*size,Math.floor(q/cols)*size,size,size,Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));return true;}
export function stableHash(x:number,y:number,salt=0){let h=((x*374761393+y*1234567891+salt*668265263)&0x7fffffff);h=((h^(h>>>13))*1540483477)&0x7fffffff;return Math.abs((h^(h>>>15))/0x7fffffff);}

export function drawSceneObject(c:CanvasRenderingContext2D,k:SceneObjectKind,x:number,y:number,w:number,h:number,v=0,f=0){
  if(k==='tree'||k==='pine'){frame(c,A.tree,192,192,k==='pine'?1+Math.abs(v)%6:Math.abs(v)%10,x,y,w,h);return;}
  if(k==='house'){whole(c,A.houses[Math.abs(v)%A.houses.length],x,y,w,h);return;}
  if(k==='entrance'){whole(c,A.entrances[Math.abs(v)%A.entrances.length],x,y,w,h);return;}
  if(k==='cliff'){tile(c,A.elevation,64,8+Math.abs(v)%12,x,y,w,h);return;}
  if(k==='bridge'){frame(c,A.bridge,192,192,v,x,y,w,h);return;}
  if(k==='torch'){frame(c,A.fire,192,192,f,x,y,w,h);return;}
  if(k==='flowers'){whole(c,A.deco[Math.abs(v)%6],x,y,w,h);return;}
  if(k==='bush'){whole(c,A.deco[6+Math.abs(v)%4],x,y,w,h);return;}
  if(k==='rock'){whole(c,A.deco[10+Math.abs(v)%4],x,y,w,h);return;}
  if(k==='mushrooms'){whole(c,A.deco[15+Math.abs(v)%3],x,y,w,h);return;}
  if(k==='skull'){whole(c,A.deco[13],x,y,w,h);return;}
  if(k==='barrel'){whole(c,A.barrel,x,y,w,h);return;}
  whole(c,A.log,x,y,w,h);
}

export function renderSceneTerrain(c:CanvasRenderingContext2D,s:GameState,now:number,x0:number,x1:number,y0:number,y1:number):SceneJob[]{
  const m=s.map,j:SceneJob[]=[];
  const seen=(x:number,y:number)=>!!m.explored[y]?.[x];
  const near=(x:number,y:number,t:TileType)=>m.tiles[y]?.[x-1]===t||m.tiles[y]?.[x+1]===t||m.tiles[y-1]?.[x]===t||m.tiles[y+1]?.[x]===t;
  for(let ty=y0;ty<y1;ty++)for(let tx=x0;tx<x1;tx++){
    if(!seen(tx,ty))continue;const t=m.tiles[ty][tx];if(t===TileType.EMPTY)continue;const x=tx*40,y=ty*40,h=stableHash(tx,ty),v=m.floorVariant[ty]?.[tx]??Math.floor(h*8);
    if(t===TileType.WALL)drawPremiumTile(c,'wall',x,y,40,40,m.wallVariant[ty]?.[tx]??0);
    else if(t===TileType.FLOOR||t===TileType.DOOR||t===TileType.STAIRS_DOWN){drawPremiumTile(c,'floor',x,y,40,40,Math.min(3,v));if(t===TileType.DOOR)drawPremiumTile(c,'door',x+5,y+4,30,32,v);if(t===TileType.STAIRS_DOWN)j.push({y:y+36,draw:()=>drawSceneObject(c,'entrance',x-15,y-33,70,75,Math.floor(h*5))});}
    else if(t===TileType.GRASS)drawPremiumTile(c,'grass',x,y,40,40,v);
    else if(t===TileType.ROAD)drawPremiumTile(c,'road',x,y,40,40,tx*7+ty*11);
    else if(t===TileType.WATER||t===TileType.WATERFALL)drawPremiumTile(c,'water',x,y,40,40,Math.floor(now/500)+tx*3+ty);
    else if(t===TileType.BRIDGE){drawPremiumTile(c,'water',x,y,40,40,tx+ty);drawSceneObject(c,'bridge',x-7,y-11,54,60,tx+ty);}
    else if(t===TileType.FOREST){drawPremiumTile(c,'grass',x,y,40,40,v);const pine=(m.wallVariant[ty]?.[tx]??0)===1,ox=stableHash(tx,ty,5)*9-4;j.push({y:y+35,draw:()=>drawSceneObject(c,pine?'pine':'tree',x-24+ox,y-54,88,94,tx*13+ty*17)});if(h>.84&&!near(tx,ty,TileType.ROAD))j.push({y:y+29,draw:()=>drawSceneObject(c,pine?'tree':'pine',x+3-ox,y-61,72,80,tx*19+ty)});}
    else if(t===TileType.VILLAGE){drawPremiumTile(c,'road',x,y,40,40,tx+ty*7);const n=Math.floor(stableHash(tx,ty,21)*10);j.push({y:y+36,draw:()=>drawSceneObject(c,'house',x-28,y-58,96,98,n)});}
    else if(t===TileType.DUNGEON_ENTRANCE){drawPremiumTile(c,'grass',x,y,40,40,v);const n=Math.floor(stableHash(tx,ty,91)*5);j.push({y:y+35,draw:()=>drawSceneObject(c,'entrance',x-34,y-72,108,114,n)});}
    else if(t===TileType.CLIFF){drawPremiumTile(c,'grass',x,y,40,15,v);drawSceneObject(c,'cliff',x,y+9,40,38,tx+ty);}
    if(!s.inDungeon&&t===TileType.GRASS&&!near(tx,ty,TileType.ROAD)&&!near(tx,ty,TileType.WATER)){const k=h<.035?'flowers':h<.065?'bush':h<.085?'rock':h<.1?'mushrooms':null;if(k)j.push({y:y+31,draw:()=>drawSceneObject(c,k,x+8,y+11,24,21,tx+ty)});}
    if(s.inDungeon&&t===TileType.FLOOR&&h<.04){const k=h<.014?'skull':h<.027?'barrel':'crate';j.push({y:y+31,draw:()=>drawSceneObject(c,k,x+9,y+12,23,21,tx+ty)});}
  }
  for(const t of m.torches){if(!seen(t.tx,t.ty)||t.tx<x0-1||t.tx>x1+1||t.ty<y0-1||t.ty>y1+1)continue;const x=t.tx*40,y=t.ty*40;j.push({y:y+25,draw:()=>{drawSceneObject(c,'torch',x-13,y-22,66,66,0,Math.floor((now+t.tx*91)/110));const g=c.createRadialGradient(x+20,y+14,2,x+20,y+14,44);g.addColorStop(0,'rgba(255,145,45,.25)');g.addColorStop(1,'rgba(255,80,0,0)');c.fillStyle=g;c.fillRect(x-24,y-30,88,88);}});}
  return j;
}
