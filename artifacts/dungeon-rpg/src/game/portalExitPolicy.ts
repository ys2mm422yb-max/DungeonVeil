import { isBossRoom } from './chapterRun';
import { TILE_SIZE, TileType } from './dungeon';
import { GameEngine } from './runEngine';

const PATCH_MARKER = Symbol.for('dungeon-veil.portal-loot-exit.v1');
const prototype = GameEngine.prototype as any;

if (!prototype[PATCH_MARKER]) {
  const originalUpdateRoomFlow = prototype.updateRoomFlow as (this: any, time: number) => void;
  prototype[PATCH_MARKER] = true;

  prototype.playerInExitZone = function playerInExitZone(this: any): boolean {
    const player = this.state.player;
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const tileX = Math.floor(centerX / TILE_SIZE);
    const tileY = Math.floor(centerY / TILE_SIZE);
    if (this.state.map.tiles[tileY]?.[tileX] === TileType.STAIRS_DOWN) return true;

    const exitRadius = TILE_SIZE * 1.05;
    for (let y = 0; y < this.state.map.height; y++) {
      for (let x = 0; x < this.state.map.width; x++) {
        if (this.state.map.tiles[y]?.[x] !== TileType.STAIRS_DOWN) continue;
        const exitX = (x + 0.5) * TILE_SIZE;
        const exitY = (y + 0.5) * TILE_SIZE;
        return Math.hypot(centerX - exitX, centerY - exitY) <= exitRadius;
      }
    }
    return false;
  };

  prototype.canExitRoom = function canExitRoom(this: any): boolean {
    return this.state.status === 'playing'
      && this.livingEnemies().length === 0
      && this.state.roomClearReady;
  };

  prototype.updateRoomFlow = function updateRoomFlow(this: any, time: number): void {
    const living = this.livingEnemies().length;
    if (living === 0 && !this.roomAnnouncedClear) {
      this.roomAnnouncedClear = true;
      this.state.roomClearReady = true;
      this.state.roomClearAt = time;
      this.state.damageNumbers.push({
        id: `clear-${time}`,
        x: this.state.player.x + 16,
        y: this.state.player.y - 24,
        value: isBossRoom(this.state.floor) ? 'BOSS BESIEGT · AUSGANG OFFEN' : 'RAUM FREI · AUSGANG OFFEN',
        color: '#d9b8ff',
        lifeTime: 0,
        maxLifeTime: 1800,
        scale: 0.9,
      });
      this.state.effects.push({
        id: `clear-wave-${time}`,
        x: this.state.player.x + 16,
        y: this.state.player.y + 16,
        radius: 0,
        maxRadius: 64,
        color: '#b693ff',
        lifeTime: 0,
        maxLifeTime: 360,
        type: 'circle',
        element: 'arcane',
      });
    }

    originalUpdateRoomFlow.call(this, time);

    if (this.state.status === 'playing' && this.canExitRoom() && this.playerInExitZone()) {
      this.nextRoom();
    }
  };
}
