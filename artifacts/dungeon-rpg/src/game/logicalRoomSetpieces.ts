import type { RoomSetpiece } from './roomSetpieceLayout';
import { calibratedRoomSetpieces } from './roomSetpieceCalibrated';

const F = 'furniture/Assets/gltf';
const T = 'tools/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';
const I = '/assets/imported/fantasy-props';

const SIDE_WALL_X = 11.1;
const TOP_WALL_Z = -15.05;
const BANNER_Y = 2.25;
const SHIELD_Y = 1.9;

export type LogicalRoomSetpiece = RoomSetpiece & { y?: number; fallbackModel?: string };

const p = (
  model: string,
  x: number,
  z: number,
  rotation = 0,
  scale = 1,
  collider?: readonly [number, number],
  y = 0,
  fallbackModel?: string,
): LogicalRoomSetpiece => ({ model, x, y, z, rotation, scale, collider, fallbackModel });

const imported = (
  name: string,
  fallbackModel: string,
  x: number,
  z: number,
  rotation = 0,
  scale = 1,
  collider?: readonly [number, number],
  y = 0,
) => p(`${I}/${name}.glb`, x, z, rotation, scale, collider, y, fallbackModel);

function mountHeight(model: string) {
  return /banner/i.test(model) ? BANNER_Y : SHIELD_Y;
}

const wallTop = (model: string, x: number, scale = 1, fallbackModel?: string): LogicalRoomSetpiece =>
  p(model, x, TOP_WALL_Z, Math.PI, scale, undefined, mountHeight(model), fallbackModel);

const wallSide = (model: string, side: -1 | 1, z: number, scale = 1, fallbackModel?: string): LogicalRoomSetpiece =>
  p(model, side * SIDE_WALL_X, z, side < 0 ? Math.PI / 2 : -Math.PI / 2, scale, undefined, mountHeight(model), fallbackModel);

const ROOM_OVERRIDES: Partial<Record<number, LogicalRoomSetpiece[]>> = {
  // Two real storage bays with a clear central delivery lane.
  1: [
    imported('Shelf_Simple', `${F}/shelf_B_large_decorated.gltf`, -8.6, -5.9, Math.PI / 2, 1.05, [1, 2]),
    imported('Crate_Wooden', `${D}/box_stacked.gltf`, -6.9, -5.4, 0.08, 1.0, [1.05, 0.9]),
    imported('Barrel_Holder', `${D}/barrel_small_stack.gltf`, -6.6, -3.6, -0.08, 1.0, [1.15, 0.9]),
    imported('FarmCrate_Apple', `${D}/box_small_decorated.gltf`, -8.2, -2.8, 0.04, 0.92, [0.9, 0.8]),
    imported('Shelf_Small_Bottles', `${D}/shelf_large.gltf`, 8.5, -5.8, -Math.PI / 2, 1.02, [1, 2]),
    imported('Crate_Metal', `${D}/trunk_medium_A.gltf`, 6.8, -5.2, -0.08, 1.0, [1.2, 0.85]),
    imported('Barrel_Apples', `${D}/barrel_large_decorated.gltf`, 8.0, -3.5, 0, 1.0, [1, 1]),
    imported('FarmCrate_Carrot', `${D}/box_small_decorated.gltf`, 6.6, -2.8, 0.12, 0.92, [0.9, 0.8]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 7.2, 2.8, -0.1, 1.02, [1.45, 0.9]),
  ],

  // Command table is the hero object; food props form one readable scene and all
  // heraldry is physically mounted on the perimeter.
  2: [
    imported('Table_Large', `${D}/table_long_decorated_A.gltf`, 0, -5.0, 0, 1.08, [2.45, 1.05]),
    imported('Chair_1', `${D}/chair.gltf`, -1.5, -3.45, 0.12, 1.0),
    imported('Chair_1', `${D}/chair.gltf`, 1.5, -3.45, -0.12, 1.0),
    imported('Table_Plate', `${T}/map.gltf`, -0.55, -4.9, 0.08, 0.95),
    imported('Table_Fork', `${T}/file.gltf`, 0.3, -4.72, -0.15, 0.9),
    imported('Banner_1_Cloth', `${D}/banner_shield_red.gltf`, -6.6, TOP_WALL_Z, Math.PI, 1.05, undefined, BANNER_Y),
    imported('Banner_2_Cloth', `${D}/banner_patternC_red.gltf`, 6.6, TOP_WALL_Z, Math.PI, 1.05, undefined, BANNER_Y),
    wallSide(`${D}/sword_shield_gold.gltf`, -1, -5.0, 1.12),
    wallSide(`${D}/sword_shield_gold.gltf`, 1, -5.0, 1.12),
    p(`${D}/chest_gold.gltf`, 7.5, 2.8, -Math.PI / 2, 1.05, [1.3, 0.85]),
  ],

  // The shell supplies the two column rows. Supporting props stay on the walls so
  // all three combat lanes remain visually and physically readable.
  3: [
    imported('Banner_1_Cloth', `${D}/banner_patternB_blue.gltf`, -6.8, TOP_WALL_Z, Math.PI, 1.05, undefined, BANNER_Y),
    imported('Banner_2_Cloth', `${D}/banner_patternA_green.gltf`, 6.8, TOP_WALL_Z, Math.PI, 1.05, undefined, BANNER_Y),
    imported('Torch_Metal', `${D}/torch_lit.gltf`, -8.8, -5.2, Math.PI / 2, 1.08),
    imported('Torch_Metal', `${D}/torch_lit.gltf`, 8.8, -5.2, -Math.PI / 2, 1.08),
    imported('CandleStick_Triple', `${D}/torch_lit.gltf`, -8.4, 3.8, Math.PI / 2, 0.92),
    imported('CandleStick_Triple', `${D}/torch_lit.gltf`, 8.4, 3.8, -Math.PI / 2, 0.92),
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.2),
  ],

  // Mining camp: one tool station, one ore sorting bay and one collapsed rail edge.
  4: [
    imported('Table_Large', `${F}/table_low.gltf`, -7.2, -5.6, Math.PI / 2, 0.92, [1.7, 1]),
    p(`${T}/pickaxe.gltf`, -6.7, -5.5, 0.18, 1.3),
    p(`${T}/shovel.gltf`, -7.4, -4.9, -0.18, 1.25),
    imported('Crate_Wooden', `${D}/box_small_decorated.gltf`, -5.4, -3.8, 0.08, 0.96, [0.95, 0.85]),
    imported('Barrel', `${D}/barrel_small_stack.gltf`, -7.8, -2.9, 0, 0.96, [0.9, 0.9]),
    p(`${R}/Pallet_Wood.gltf`, 6.9, -5.5, 0, 1.0, [1.55, 1]),
    p(`${R}/Iron_Nuggets.gltf`, 6.2, -5.2, 0.2, 1.12),
    p(`${R}/Copper_Nuggets.gltf`, 7.4, -4.9, -0.2, 1.12),
    imported('Crate_Metal', `${D}/box_large.gltf`, 6.0, -3.5, -0.08, 1.0, [1.15, 0.95]),
    p(`${D}/rubble_large.gltf`, 6.8, 3.8, 0.2, 0.82, [1.9, 1.3]),
    p(`${T}/lantern.gltf`, 4.6, -3.9, 0, 1.2),
  ],

  // Workshop: three coherent work zones along the walls, leaving the S-curve route
  // through the middle free for combat.
  5: [
    imported('Anvil_Log', `${T}/anvil.gltf`, -7.5, -5.4, Math.PI / 2, 1.0, [1.2, 0.9]),
    imported('Table_Large', `${D}/table_long_decorated_C.gltf`, -4.6, -5.5, 0, 0.94, [2.2, 1]),
    p(`${T}/blueprint_stacked.gltf`, -5.1, -5.4, 0.1, 1.12),
    p(`${T}/handdrill.gltf`, -4.2, -5.2, -0.25, 1.18),
    imported('Shelf_Small_Bottles', `${D}/shelves.gltf`, -8.5, -2.4, Math.PI / 2, 1.0, [1, 1.9]),
    imported('Anvil', `${T}/anvil.gltf`, 6.2, -5.0, -Math.PI / 2, 1.08, [1.1, 0.85]),
    p(`${T}/grindstone.gltf`, 8.1, -4.7, -Math.PI / 2, 1.25, [1, 1.1]),
    imported('Crate_Metal', `${D}/box_stacked.gltf`, 7.2, -2.5, 0.08, 0.96, [1.05, 0.9]),
    imported('Shelf_Simple', `${D}/shelf_small.gltf`, 8.6, 1.4, -Math.PI / 2, 0.98, [1, 1.55]),
    imported('Torch_Metal', `${D}/torch_lit.gltf`, -9.0, 2.8, Math.PI / 2, 1.05),
    imported('Torch_Metal', `${D}/torch_lit.gltf`, 9.0, 2.8, -Math.PI / 2, 1.05),
  ],
};

function genericWallAnchor(piece: RoomSetpiece, index: number): LogicalRoomSetpiece {
  const side: -1 | 1 = piece.x < -0.5 ? -1 : piece.x > 0.5 ? 1 : index % 2 === 0 ? -1 : 1;
  const clampedZ = Math.max(-8, Math.min(5.5, piece.z));
  if (Math.abs(piece.x) > 3.5) return wallSide(piece.model, side, clampedZ, piece.scale ?? 1);
  return wallTop(piece.model, Math.max(-7.5, Math.min(7.5, piece.x)), piece.scale ?? 1);
}

function anchorWallDecoration(room: number, piece: RoomSetpiece, index: number): LogicalRoomSetpiece {
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
    return genericWallAnchor(piece, index);
  }

  if (piece.model.includes('/sword_shield')) {
    if (room === 12) return wallTop(piece.model, 0, piece.scale ?? 1);
    if (room === 16) return wallSide(piece.model, piece.x < 0 ? -1 : 1, -3.6, piece.scale ?? 1);
    if (room === 19) return wallTop(piece.model, piece.x < 0 ? -4.6 : 4.6, piece.scale ?? 1);
    return genericWallAnchor(piece, index);
  }

  return { ...piece };
}

export function logicalRoomSetpieces(room: number): LogicalRoomSetpiece[] {
  const key = Math.max(1, Math.min(20, room));
  const override = ROOM_OVERRIDES[key];
  if (override) return override.map(piece => ({ ...piece }));

  let wallDecorIndex = 0;
  return calibratedRoomSetpieces(key).map(piece => {
    const wallDecor = piece.model.includes('/banner_') || piece.model.includes('/sword_shield');
    return anchorWallDecoration(key, piece, wallDecor ? wallDecorIndex++ : 0);
  });
}
