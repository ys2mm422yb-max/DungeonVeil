import type { RoomSetpiece } from './roomSetpieceLayout';
import { calibratedRoomSetpieces } from './roomSetpieceCalibrated';

const F = 'furniture/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';

const SIDE_WALL_X = 11.05;
const TOP_WALL_Z = -14.95;

const p = (
  model: string,
  x: number,
  z: number,
  rotation = 0,
  scale = 1,
  collider?: readonly [number, number],
): RoomSetpiece => ({ model, x, z, rotation, scale, collider });

const wallTop = (model: string, x: number, scale = 1): RoomSetpiece =>
  p(model, x, TOP_WALL_Z, Math.PI, scale);

const wallSide = (model: string, side: -1 | 1, z: number, scale = 1): RoomSetpiece =>
  p(model, side * SIDE_WALL_X, z, side < 0 ? Math.PI / 2 : -Math.PI / 2, scale);

const ROOM_OVERRIDES: Partial<Record<number, RoomSetpiece[]>> = {
  // Supply is stored in two believable wall-side bays. Nothing sits alone in the
  // combat centre and every large collider belongs to a visible storage cluster.
  1: [
    p(`${F}/shelf_B_large_decorated.gltf`, -8.7, -6.0, Math.PI / 2, 1.1, [1, 2.1]),
    p(`${D}/shelf_large.gltf`, -8.6, -3.2, Math.PI / 2, 1.06, [1, 2]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -6.9, -5.0, 0.08, 1.05, [1.45, 0.9]),
    p(`${D}/barrel_small_stack.gltf`, -6.6, -3.2, -0.08, 1.02, [1, 0.85]),
    p(`${D}/box_stacked.gltf`, 7.0, -5.6, 0, 1.06, [1.15, 0.9]),
    p(`${D}/barrel_large_decorated.gltf`, 8.5, -4.2, 0, 1.02, [1, 1]),
    p(`${D}/trunk_medium_A.gltf`, 7.0, -2.8, -0.1, 1.08, [1.35, 0.8]),
    p(`${D}/chest.gltf`, 8.2, 2.7, -Math.PI / 2, 1.08, [1.3, 0.85]),
    p(`${D}/box_stacked.gltf`, 7.0, 3.2, 0.1, 0.94, [1.05, 0.82]),
  ],

  // The command table remains the room hero. Heraldry and weapons are mounted on
  // the real perimeter wall instead of floating beside the combat lane.
  2: [
    p(`${D}/table_long_decorated_A.gltf`, 0, -5.2, 0, 1.14, [2.45, 1]),
    p(`${D}/chair.gltf`, -1.35, -3.8, 0.15, 1.04),
    p(`${D}/chair.gltf`, 1.35, -3.8, -0.15, 1.04),
    wallTop(`${D}/sword_shield_gold.gltf`, -6.8, 1.14),
    wallTop(`${D}/sword_shield_gold.gltf`, 6.8, 1.14),
    wallSide(`${D}/banner_shield_red.gltf`, -1, -5.2, 1.08),
    wallSide(`${D}/banner_patternC_red.gltf`, 1, -5.2, 1.08),
    p(`${D}/chest_gold.gltf`, 7.3, 2.8, -Math.PI / 2, 1.05, [1.3, 0.85]),
  ],

  // The renderer already builds the two column rows. Keep the hall ceremonial and
  // readable instead of adding a random centre barrier and loose rubble piles.
  3: [
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.22),
    wallSide(`${D}/banner_patternB_blue.gltf`, -1, -4.8, 1.05),
    wallSide(`${D}/banner_patternA_green.gltf`, 1, -4.8, 1.05),
    p(`${D}/torch_lit.gltf`, -5.2, -1.0, 0, 1.16),
    p(`${D}/torch_lit.gltf`, 5.2, -1.0, 0, 1.16),
    p(`${D}/torch_lit.gltf`, -5.2, 4.0, 0, 1.16),
    p(`${D}/torch_lit.gltf`, 5.2, 4.0, 0, 1.16),
  ],
};

function anchorWallDecoration(room: number, piece: RoomSetpiece, index: number): RoomSetpiece {
  if (piece.model.includes('/banner_')) {
    if (room === 12) {
      const anchors: Array<[-1 | 1, number]> = [[-1, -5.0], [1, -5.0], [-1, 1.0], [1, 1.0]];
      const anchor = anchors[index % anchors.length];
      return wallSide(piece.model, anchor[0], anchor[1], piece.scale ?? 1);
    }
    if (room === 16) {
      const anchors: Array<[-1 | 1, number]> = [[-1, -6.0], [1, -6.0], [-1, 2.2], [1, 2.2]];
      const anchor = anchors[index % anchors.length];
      return wallSide(piece.model, anchor[0], anchor[1], piece.scale ?? 1);
    }
    if (room === 19 || room === 20) {
      const side: -1 | 1 = index % 2 === 0 ? -1 : 1;
      return wallSide(piece.model, side, room === 19 ? -1.0 : 0, piece.scale ?? 1);
    }
  }

  if (piece.model.includes('/sword_shield_gold.gltf')) {
    if (room === 12) return wallTop(piece.model, 0, piece.scale ?? 1);
    if (room === 16) return wallSide(piece.model, piece.x < 0 ? -1 : 1, -3.6, piece.scale ?? 1);
    if (room === 19) return wallTop(piece.model, piece.x < 0 ? -4.6 : 4.6, piece.scale ?? 1);
  }

  return piece;
}

export function logicalRoomSetpieces(room: number): RoomSetpiece[] {
  const key = Math.max(1, Math.min(20, room));
  const override = ROOM_OVERRIDES[key];
  if (override) return override.map(piece => ({ ...piece }));

  let bannerIndex = 0;
  return calibratedRoomSetpieces(key).map(piece => {
    const index = piece.model.includes('/banner_') ? bannerIndex++ : 0;
    return { ...anchorWallDecoration(key, piece, index) };
  });
}
