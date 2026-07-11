import { roomBibleSpec } from './roomBible';

export type RoomSpawnPoint = { x: number; z: number };

/**
 * Enemy formations are authored in the same source as silhouettes, portal staging
 * and room identity. This prevents the encounter from drifting away from the
 * Canva-approved composition when a room layout changes.
 */
export function getRoomSpawnPoints(room: number): RoomSpawnPoint[] {
  return roomBibleSpec(room).enemySpawns.map(point => ({ ...point }));
}

export function sceneSpawnToGame(point: RoomSpawnPoint, mapWidth: number, mapHeight: number, size: number) {
  return {
    x: (point.x + mapWidth / 2 - 0.5) * 40 - size / 2,
    y: (point.z + mapHeight / 2 - 0.5) * 40 - size / 2,
  };
}
