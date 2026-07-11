import type { RoomSetpiece } from './roomSetpieceLayout';
import { runtimeRoomSetpieces as canvaRoomSetpieces } from './roomSetpieceRuntime';

const F = 'furniture/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';

const p = (
  model: string,
  x: number,
  z: number,
  rotation = 0,
  scale = 1,
  collider?: readonly [number, number],
): RoomSetpiece => ({ model, x, z, rotation, scale, collider });

const wallSpan = (
  x: number,
  z: number,
  length: number,
  rotation = 0,
  model = `${D}/wall_broken.gltf`,
): RoomSetpiece[] => {
  const count = Math.max(1, Math.ceil(length / 3.05));
  const step = length / count;
  const scale = Math.max(.72, Math.min(1, step / 3.3));
  return Array.from({ length: count }, (_, index) => {
    const offset = (index - (count - 1) / 2) * step;
    return p(
      model,
      x + Math.cos(rotation) * offset,
      z + Math.sin(rotation) * offset,
      rotation + (index % 2 ? Math.PI : 0),
      scale,
      [3.3, .7],
    );
  });
};

const barrierSpan = (x: number, z: number, length: number, rotation = 0): RoomSetpiece[] => {
  const count = Math.max(1, Math.ceil(length / 2.35));
  const step = length / count;
  return Array.from({ length: count }, (_, index) => {
    const offset = (index - (count - 1) / 2) * step;
    const half = index % 2 === 1;
    return p(
      half ? `${D}/barrier_half.gltf` : `${D}/barrier.gltf`,
      x + Math.cos(rotation) * offset,
      z + Math.sin(rotation) * offset,
      rotation + (half ? Math.PI : 0),
      1.04,
      half ? [2, .75] : [2.6, .8],
    );
  });
};

const CALIBRATED_MOBILE_ROOMS: Partial<Record<number, RoomSetpiece[]>> = {
  // Screenshot-calibrated: architecture reaches the visible lower half while two dash routes stay open.
  1: [
    ...wallSpan(-5.2, -1.55, 5.9),
    ...wallSpan(5.2, -1.55, 5.9, Math.PI),
    ...wallSpan(-7.35, 1.35, 4.8, Math.PI / 2, `${D}/wall_cracked.gltf`),
    ...wallSpan(7.35, 1.55, 4.5, Math.PI / 2, `${D}/wall_cracked.gltf`),
    p(`${F}/shelf_B_large_decorated.gltf`, -6.2, -5.4, Math.PI / 2, 1.12, [1, 2.2]),
    p(`${D}/shelf_large.gltf`, -4.1, -5.4, 0, 1.12, [2, 1]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.3, -3.8, 0, 1.08, [1.5, 1]),
    p(`${D}/box_stacked.gltf`, -6.8, -3.6, 0, 1.12, [1.2, 1]),
    p(`${F}/shelf_A_big.gltf`, 6.2, -5.4, -Math.PI / 2, 1.12, [1, 2.2]),
    p(`${D}/trunk_medium_A.gltf`, 4.6, -4.7, 0, 1.12, [1.4, .85]),
    p(`${D}/barrel_large_decorated.gltf`, 6.4, -3.6, 0, 1.1, [1, 1]),
    p(`${D}/box_stacked.gltf`, -6.25, 3.55, 0, 1.12, [1.2, 1]),
    p(`${D}/barrel_small_stack.gltf`, -4.95, 3.8, .1, 1.08, [1, .9]),
    p(`${R}/Pallet_Wood.gltf`, -3.55, 3.7, 0, 1.08, [1.5, 1]),
    ...wallSpan(5.25, 3.65, 4.6, 0, `${D}/wall_cracked.gltf`),
    ...wallSpan(-5.5, 5.6, 3.5, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(5.5, 5.6, 3.5, Math.PI, `${D}/wall_broken.gltf`),
  ],

  2: [
    ...wallSpan(-5.2, -5.7, 5.5, 0),
    ...wallSpan(5.2, -5.7, 5.5, Math.PI),
    ...wallSpan(-7.5, -2.3, 5.9, Math.PI / 2),
    ...wallSpan(7.5, -2.3, 5.9, Math.PI / 2),
    p(`${D}/table_long_decorated_A.gltf`, -4.7, -4.1, 0, 1.15, [2.5, 1]),
    p(`${D}/chair.gltf`, -5.9, -2.8, 0, 1.05),
    p(`${D}/chair.gltf`, -3.5, -2.8, 0, 1.05),
    p(`${F}/shelf_B_large_decorated.gltf`, 6.2, -4.4, -Math.PI / 2, 1.12, [1, 2.2]),
    p(`${D}/box_stacked.gltf`, 4.6, -3.8, 0, 1.12, [1.2, 1]),
    p(`${D}/barrel_large.gltf`, 6.3, -2.8, 0, 1.1, [1, 1]),
    ...barrierSpan(-5.5, .25, 3.1),
    ...barrierSpan(0, .25, 2.2),
    ...barrierSpan(5.5, .25, 3.1),
    ...wallSpan(-7.3, 3.45, 3.3, Math.PI / 2, `${D}/wall_cracked.gltf`),
    ...wallSpan(7.3, 3.45, 3.3, Math.PI / 2, `${D}/wall_cracked.gltf`),
    ...wallSpan(-5.45, 5.15, 3.6, 0),
    ...wallSpan(5.45, 5.15, 3.6, Math.PI),
    p(`${D}/pillar.gltf`, -4.2, 3.15, 0, 1.2, [.9, .9]),
    p(`${D}/pillar.gltf`, 4.2, 3.15, 0, 1.2, [.9, .9]),
  ],

  3: [
    p(`${D}/wall_arched.gltf`, 0, -7.15, 0, 1.08, [3.2, .8]),
    p(`${D}/column.gltf`, -5.8, -5.4, 0, 1.32, [.9, .9]),
    p(`${D}/column.gltf`, 5.8, -5.4, 0, 1.32, [.9, .9]),
    p(`${D}/column.gltf`, -5.8, -1.65, 0, 1.32, [.9, .9]),
    p(`${D}/column.gltf`, 5.8, -1.65, 0, 1.32, [.9, .9]),
    p(`${D}/column.gltf`, -5.8, 2.15, 0, 1.32, [.9, .9]),
    p(`${D}/column.gltf`, 5.8, 2.15, 0, 1.32, [.9, .9]),
    p(`${D}/column.gltf`, -5.8, 5.55, 0, 1.32, [.9, .9]),
    p(`${D}/column.gltf`, 5.8, 5.55, 0, 1.32, [.9, .9]),
    ...wallSpan(-3.8, .2, 4.2, 0),
    ...wallSpan(3.8, .2, 4.2, Math.PI),
    ...barrierSpan(-5.35, 4.45, 3.1, 0),
    ...barrierSpan(5.35, 4.45, 3.1, Math.PI),
    p(`${D}/rubble_half.gltf`, 6.55, 5.9, -.2, .72, [1.25, .85]),
    p(`${D}/rubble_half.gltf`, -6.55, -5.9, .2, .68, [1.25, .85]),
    p(`${D}/barrier_column.gltf`, 0, -3.5, 0, 1.18, [1, 1]),
  ],

  4: [
    ...wallSpan(-5.2, -5.65, 5.5, 0, `${D}/wall_cracked.gltf`),
    ...wallSpan(5.2, -5.65, 5.5, Math.PI, `${D}/wall_cracked.gltf`),
    ...wallSpan(-7.5, -2.2, 5.6, Math.PI / 2, `${D}/wall_cracked.gltf`),
    ...wallSpan(7.5, -2.2, 5.6, Math.PI / 2, `${D}/wall_cracked.gltf`),
    p(`${D}/table_medium_decorated_A.gltf`, -5.35, -4.15, 0, 1.12, [1.8, 1]),
    p(`${D}/box_stacked.gltf`, -6.8, -2.3, 0, 1.12, [1.2, 1]),
    p(`${D}/barrel_small_stack.gltf`, -5.4, -2.1, 0, 1.08, [1, .9]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 5.65, -4.75, 0, 1.1, [1.5, 1]),
    p(`${D}/box_stacked.gltf`, 4.45, -3.65, 0, 1.12, [1.2, 1]),
    p(`${D}/barrel_large.gltf`, 6.2, -2.8, 0, 1.1, [1, 1]),
    ...barrierSpan(-5.4, .45, 3.2, -.08),
    ...barrierSpan(0, .45, 2.5, -.08),
    ...barrierSpan(5.4, .45, 3.2, -.08),
    p(`${R}/Pallet_Wood.gltf`, -5.7, 4.05, 0, 1.08, [1.5, 1]),
    p(`${D}/box_stacked.gltf`, -4.25, 4.25, 0, 1.12, [1.2, 1]),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, 4.25, 4.15, 0, 1.1, [1.25, .8]),
    p(`${D}/barrel_small_stack.gltf`, 5.8, 4.35, 0, 1.08, [1, .9]),
    p(`${D}/rubble_half.gltf`, 6.85, 3.45, -.2, .72, [1.25, .85]),
    ...wallSpan(-5.6, 5.7, 3.3, 0),
    ...wallSpan(5.6, 5.7, 3.3, Math.PI),
  ],
};

export function calibratedRoomSetpieces(room: number): RoomSetpiece[] {
  const key = Math.max(1, Math.min(20, room));
  return CALIBRATED_MOBILE_ROOMS[key] ?? canvaRoomSetpieces(key);
}
