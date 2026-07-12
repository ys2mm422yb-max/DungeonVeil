import { isBossRoom } from './chapterRun';
import { roomBibleSpec } from './roomBible';
import { roomPropColliders } from './roomCollision3D';

export type RoomSpawnPoint = { x: number; z: number };

const GRID_X = [-4.2, -2.1, 0, 2.1, 4.2] as const;
const GRID_Z = [-6.4, -4.1, -1.8, 0.7, 3.1, 5.3] as const;
const BOSS_CANDIDATES: readonly RoomSpawnPoint[] = [
  { x: 0, z: 1.8 },
  { x: -3.2, z: 1.8 },
  { x: 3.2, z: 1.8 },
  { x: 0, z: 4.2 },
  { x: -4.5, z: -1.0 },
  { x: 4.5, z: -1.0 },
  { x: -4.5, z: 4.2 },
  { x: 4.5, z: 4.2 },
];

function runtimeSafeSpawnPoints(room: number): RoomSpawnPoint[] {
  const spec = roomBibleSpec(room);
  const boss = isBossRoom(room);
  const targetCount = boss ? 1 : 8;
  const clearance = boss ? 1.18 : 0.72;
  const portalClearance = boss ? 1.8 : 3.1;
  const maxX = boss ? 7.2 : 4.25;
  const portal = {
    x: spec.portal.x,
    z: spec.portal.z < -8 ? -8.5 : spec.portal.z,
  };
  const colliders = roomPropColliders(room);
  const selected: RoomSpawnPoint[] = [];

  const valid = (point: RoomSpawnPoint) => {
    if (Math.abs(point.x) > maxX || point.z < -6.6 || point.z > 5.5) return false;
    if (Math.hypot(point.x - portal.x, point.z - portal.z) <= portalClearance) return false;
    if (colliders.some(collider =>
      Math.abs(point.x - collider.x) < collider.halfW + clearance
      && Math.abs(point.z - collider.z) < collider.halfH + clearance
    )) return false;
    return selected.every(existing => Math.hypot(point.x - existing.x, point.z - existing.z) >= 1.55);
  };

  const add = (point: RoomSpawnPoint) => {
    if (selected.length < targetCount && valid(point)) selected.push({ ...point });
  };

  spec.enemySpawns.forEach(add);
  if (boss) {
    BOSS_CANDIDATES.forEach(add);
  } else {
    for (const z of GRID_Z) {
      for (const x of GRID_X) add({ x, z });
    }
  }

  if (selected.length < targetCount) {
    throw new Error(`Raum ${room} besitzt nur ${selected.length} runtime-sichere Gegner-Spawnpunkte.`);
  }

  return selected;
}

/**
 * Enemy formations originate in the room bible, then receive one final runtime
 * pass against the exact visible prop and architecture colliders used by movement.
 */
export function getRoomSpawnPoints(room: number): RoomSpawnPoint[] {
  return runtimeSafeSpawnPoints(room);
}

export function sceneSpawnToGame(point: RoomSpawnPoint, mapWidth: number, mapHeight: number, size: number) {
  return {
    x: (point.x + mapWidth / 2 - 0.5) * 40 - size / 2,
    y: (point.z + mapHeight / 2 - 0.5) * 40 - size / 2,
  };
}
