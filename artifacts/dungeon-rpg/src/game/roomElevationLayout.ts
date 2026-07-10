import type { RoomSetpiece } from './roomSetpieceLayout';

export type RoomElevationPiece = {
  model: string;
  x: number;
  y?: number;
  z: number;
  rotation?: number;
  scale?: number;
};

const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const stage = (x: number, z: number, scale = 1, y = 0.08): RoomElevationPiece => ({ model: `${D}/floor_foundation_front_and_sides.gltf`, x, y, z, scale });
const stairs = (x: number, z: number, rotation = Math.PI, scale = 0.78): RoomElevationPiece => ({ model: `${D}/stairs_wide.gltf`, x, z, rotation, scale });

const ROOM_ELEVATIONS: Record<number, RoomElevationPiece[]> = {
  2: [stage(-1.8, -4.2, 1.18), stairs(-1.8, -2.55, Math.PI, 0.76)],
  6: [stage(-5.35, -5.15, 1.02), stairs(-5.35, -3.65, Math.PI, 0.7)],
  12: [stage(-0.8, -2.05, 1.18), stairs(-0.8, -0.45, Math.PI, 0.74)],
  18: [stage(0, 1.35, 1.08, 0.09), stairs(0, 2.8, 0, 0.7)],
};

export function roomElevationPieces(room: number): RoomElevationPiece[] {
  return ROOM_ELEVATIONS[Math.max(1, Math.min(20, room))] ?? [];
}

export function elevationForSetpiece(room: number, piece: RoomSetpiece): number {
  if (room === 2 && piece.x > -4.2 && piece.x < 0.6 && piece.z < -2.35 && piece.z > -5.8) return 0.08;
  if (room === 6 && piece.x < -3.4 && piece.z < -3.45) return 0.08;
  if (room === 9 && piece.z < -4.8) return 0.11;
  if (room === 10 && piece.z < -6.6 && Math.abs(piece.x) < 3.6) return 0.11;
  if (room === 12 && piece.x > -2.6 && piece.x < 1.5 && piece.z > -3.1 && piece.z < -1.1) return 0.08;
  if (room === 15 && piece.z < -4.8) return 0.11;
  if (room === 18 && piece.x > -1.7 && piece.x < 1.7 && piece.z > 0.3 && piece.z < 2.4) return 0.09;
  if (room === 19 && piece.z < -4.7 && piece.x > -1.4 && piece.x < 2.6) return 0.11;
  if (room === 20 && piece.z < -6.7 && Math.abs(piece.x) < 4.2) return 0.14;
  return 0;
}
