import type { RoomSetpiece } from './roomSetpieceLayout';
import { runtimeRoomSetpieces as canvaRoomSetpieces } from './roomSetpieceRuntime';

const F = 'furniture/Assets/gltf';
const T = 'tools/Assets/gltf';
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

/**
 * Mobile-camera layouts based on the real iPhone screenshots.
 * The outer room renderer already provides the architectural boundary, so these
 * layouts deliberately avoid internal wall mazes. Each room is built from
 * readable themed clusters with at most a few honest collision islands.
 */
const CALIBRATED_MOBILE_ROOMS: Partial<Record<number, RoomSetpiece[]>> = {
  // ROOM 01 · Versorgungsposten — offene Mittelachse, drei echte Vorratsgruppen
  1: [
    p(`${F}/shelf_B_large_decorated.gltf`, -6.35, -5.55, Math.PI / 2, 1.15, [1.05, 2.15]),
    p(`${D}/shelf_large.gltf`, -4.55, -5.35, 0, 1.1, [2, 1]),
    p(`${D}/box_stacked.gltf`, -6.2, -3.65, 0, 1.1, [1.15, .95]),
    p(`${D}/barrel_small_stack.gltf`, -4.9, -3.55, .15, 1.08),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.45, -2.35, 0, 1.08),

    p(`${F}/shelf_A_big.gltf`, 6.25, -5.5, -Math.PI / 2, 1.15, [1.05, 2.15]),
    p(`${D}/trunk_medium_A.gltf`, 4.55, -4.7, -.1, 1.12, [1.35, .8]),
    p(`${D}/barrel_large_decorated.gltf`, 6.2, -3.35, 0, 1.1, [1, 1]),
    p(`${D}/box_stacked.gltf`, 4.75, -2.65, Math.PI / 2, 1.08),

    p(`${R}/Pallet_Wood.gltf`, -5.8, .7, .08, 1.1),
    p(`${D}/box_stacked.gltf`, -4.5, 1.05, 0, 1.08, [1.15, .95]),
    p(`${D}/barrel_small_stack.gltf`, -6.25, 2.2, -.1, 1.06),
    p(`${D}/box_stacked.gltf`, 5.5, 1.2, Math.PI / 2, 1.08, [1.15, .95]),
    p(`${D}/barrel_small_stack.gltf`, 6.45, 2.45, .12, 1.06),
  ],

  // ROOM 02 · Wachstube — Kommandotisch, Waffenplatz und freie Portalachse
  2: [
    p(`${D}/table_long_decorated_A.gltf`, -4.85, -4.5, .05, 1.14, [2.4, 1]),
    p(`${D}/chair.gltf`, -6.05, -3.15, .15, 1.05),
    p(`${D}/chair.gltf`, -3.65, -3.2, -.15, 1.05),
    p(`${F}/shelf_B_large_decorated.gltf`, -6.6, -5.65, Math.PI / 2, 1.08, [1, 2.1]),

    p(`${D}/pillar.gltf`, 4.65, -4.75, 0, 1.18, [.85, .85]),
    p(`${D}/sword_shield_gold.gltf`, 4.65, -5.25, 0, 1.24),
    p(`${F}/shelf_A_big.gltf`, 6.4, -4.45, -Math.PI / 2, 1.1, [1, 2.1]),
    p(`${D}/box_stacked.gltf`, 5.3, -2.65, 0, 1.08, [1.15, .95]),
    p(`${D}/barrel_large.gltf`, 6.55, -2.25, 0, 1.08),

    p(`${D}/pillar.gltf`, -5.5, .55, 0, 1.12, [.82, .82]),
    p(`${D}/pillar.gltf`, 5.5, .55, 0, 1.12, [.82, .82]),
    p(`${D}/trunk_medium_A.gltf`, -4.55, 2.25, .12, 1.08, [1.3, .78]),
    p(`${D}/box_stacked.gltf`, 4.65, 2.35, -.12, 1.08, [1.15, .95]),
    p(`${D}/barrel_small_stack.gltf`, 6.05, 3.15, .12, 1.04),
  ],

  // ROOM 03 · Säulenhalle — echte Kolonnade statt T-Mauer
  3: [
    p(`${D}/column.gltf`, -5.75, -5.55, 0, 1.3, [.86, .86]),
    p(`${D}/column.gltf`, 5.75, -5.55, 0, 1.3, [.86, .86]),
    p(`${D}/column.gltf`, -5.75, -1.55, 0, 1.3, [.86, .86]),
    p(`${D}/column.gltf`, 5.75, -1.55, 0, 1.3, [.86, .86]),
    p(`${D}/column.gltf`, -5.75, 2.55, 0, 1.3, [.86, .86]),
    p(`${D}/column.gltf`, 5.75, 2.55, 0, 1.3, [.86, .86]),

    p(`${D}/barrier_column.gltf`, 0, -4.25, 0, 1.18, [.95, .95]),
    p(`${D}/sword_shield_gold.gltf`, 0, -4.8, 0, 1.22),
    p(`${D}/torch_lit.gltf`, -1.2, -4.1, 0, 1.22),
    p(`${D}/torch_lit.gltf`, 1.2, -4.1, 0, 1.22),

    p(`${D}/rubble_half.gltf`, 6.15, 4.9, -.2, .82, [1.25, .85]),
    p(`${D}/rubble_half.gltf`, -6.1, 4.65, .2, .78, [1.25, .85]),
    p(`${D}/barrel_small_stack.gltf`, -4.35, 4.55, .1, 1.02),
    p(`${D}/box_stacked.gltf`, 4.25, 4.4, -.1, 1.04),
  ],

  // ROOM 04 · Bergarbeiterlager — Materialinseln statt eingemauerter Boxen
  4: [
    p(`${D}/table_medium_decorated_A.gltf`, -5.25, -4.55, .06, 1.12, [1.75, .95]),
    p(`${D}/box_stacked.gltf`, -6.55, -3.2, 0, 1.1, [1.15, .95]),
    p(`${D}/barrel_small_stack.gltf`, -4.7, -2.95, .1, 1.06),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.55, -1.7, -.08, 1.08),

    p(`${R}/Iron_Bars_Stack_Medium.gltf`, 4.45, -4.55, .08, 1.12, [1.2, .75]),
    p(`${D}/barrel_large.gltf`, 6.1, -4.05, 0, 1.1, [1, 1]),
    p(`${D}/box_stacked.gltf`, 5.1, -2.65, Math.PI / 2, 1.08, [1.15, .95]),
    p(`${R}/Pallet_Wood.gltf`, 6.25, -1.55, .1, 1.08),

    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -5.35, 1.75, -.08, 1.08, [1.2, .75]),
    p(`${D}/barrel_large_decorated.gltf`, -6.45, 2.65, 0, 1.06),
    p(`${D}/box_stacked.gltf`, 4.55, 1.95, .1, 1.08, [1.15, .95]),
    p(`${D}/barrel_small_stack.gltf`, 6.05, 2.85, -.08, 1.04),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 5.25, 4.05, 0, 1.06),
  ],

  // ROOM 05 · Werkstatt — drei Arbeitsstationen, kein riesiger Fels
  5: [
    p(`${D}/table_long_decorated_A.gltf`, -5.2, -4.65, .04, 1.13, [2.35, .95]),
    p(`${F}/shelf_B_large_decorated.gltf`, -6.55, -2.75, Math.PI / 2, 1.08, [1, 2.05]),
    p(`${D}/box_stacked.gltf`, -4.55, -2.35, 0, 1.06),

    p(`${D}/table_long_decorated_A.gltf`, 4.95, -4.7, -.04, 1.13, [2.35, .95]),
    p(`${F}/shelf_A_big.gltf`, 6.45, -2.75, -Math.PI / 2, 1.08, [1, 2.05]),
    p(`${D}/barrel_small_stack.gltf`, 4.75, -2.15, .1, 1.04),

    p(`${T}/grindstone.gltf`, -4.7, .65, -.1, 1.42, [1, 1.15]),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.05, 1.2, .08, 1.08),
    p(`${D}/trunk_medium_A.gltf`, 4.55, .95, .1, 1.08, [1.3, .78]),
    p(`${D}/box_stacked.gltf`, 6.05, 1.55, 0, 1.06),

    p(`${R}/Pallet_Wood.gltf`, -5.4, 4.05, .1, 1.06),
    p(`${D}/barrel_large.gltf`, -3.95, 4.15, 0, 1.04),
    p(`${D}/box_stacked.gltf`, 4.85, 4.1, -.08, 1.06),
    p(`${D}/barrel_small_stack.gltf`, 6.2, 4.25, .08, 1.04),
  ],

  // ROOM 06 · Schmiede — Anvil, Schleifplatz und Materiallager ohne Sperrwände
  6: [
    p(`${T}/anvil.gltf`, -5.15, -4.45, -.08, 1.58, [1, .8]),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.45, -3.75, .08, 1.12),
    p(`${D}/barrel_large.gltf`, -3.85, -3.75, 0, 1.08),
    p(`${D}/torch_lit.gltf`, -5.1, -5.75, 0, 1.28),

    p(`${T}/grindstone.gltf`, 5.15, -4.45, .08, 1.52, [1, 1.15]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.45, -3.8, -.08, 1.12),
    p(`${D}/box_stacked.gltf`, 3.95, -3.55, 0, 1.08),
    p(`${D}/torch_lit.gltf`, 5.1, -5.75, 0, 1.28),

    p(`${D}/table_medium_decorated_A.gltf`, 0, -1.05, 0, 1.08, [1.7, .9]),
    p(`${D}/barrel_small_stack.gltf`, -4.85, 1.45, .08, 1.04),
    p(`${D}/box_stacked.gltf`, -6.1, 2.15, 0, 1.06),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, 4.8, 1.55, -.08, 1.08),
    p(`${D}/barrel_large_decorated.gltf`, 6.15, 2.2, 0, 1.05),

    p(`${R}/Pallet_Wood.gltf`, -5.1, 4.15, .1, 1.06),
    p(`${D}/box_stacked.gltf`, 5.05, 4.05, -.08, 1.06),
  ],
};

export function calibratedRoomSetpieces(room: number): RoomSetpiece[] {
  const key = Math.max(1, Math.min(20, room));
  return CALIBRATED_MOBILE_ROOMS[key] ?? canvaRoomSetpieces(key);
}
