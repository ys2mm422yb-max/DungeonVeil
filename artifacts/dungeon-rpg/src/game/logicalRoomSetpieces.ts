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

const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';
const A = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf';

const ROOM_OVERRIDES: Partial<Record<number, LogicalRoomSetpiece[]>> = {
  // 1 — Lagerdepot: zwei lesbare Warenbuchten, freie Lieferachse in der Mitte.
  1: [
    imported('Shelf_Simple', `${F}/shelf_B_large_decorated.gltf`, -8.4, -5.8, Math.PI / 2, 1.02, [1, 2]),
    imported('Crate_Wooden', `${D}/box_stacked.gltf`, -6.5, -5.1, 0.08, 0.96, [1.05, 0.9]),
    imported('Barrel_Holder', `${D}/barrel_small_stack.gltf`, -7.4, -3.2, -0.06, 0.96, [1.1, 0.9]),
    imported('Shelf_Small_Bottles', `${D}/shelf_large.gltf`, 8.4, -5.8, -Math.PI / 2, 1.02, [1, 2]),
    imported('Crate_Metal', `${D}/trunk_medium_A.gltf`, 6.5, -5.1, -0.08, 0.98, [1.2, 0.85]),
    imported('Barrel_Apples', `${D}/barrel_large_decorated.gltf`, 7.5, -3.2, 0.05, 0.96, [1, 1]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -7.1, 2.9, 0.08, 1.0, [1.45, 0.9]),
    p(`${D}/chest.gltf`, 7.1, 2.8, -0.1, 1.02, [1.3, 0.85]),
  ],

  // 2 — Kommandoraum: großer Tisch als Heldobjekt, klare Seitenwände und Rückweg.
  2: [
    imported('Table_Large', `${D}/table_long_decorated_A.gltf`, 0, -5.1, 0, 1.08, [2.45, 1.05]),
    imported('Chair_1', `${D}/chair.gltf`, -1.6, -3.55, 0.12, 1.0),
    imported('Chair_1', `${D}/chair.gltf`, 1.6, -3.55, -0.12, 1.0),
    imported('Table_Plate', `${T}/map.gltf`, -0.55, -4.9, 0.08, 0.92),
    imported('Table_Fork', `${T}/file.gltf`, 0.35, -4.72, -0.15, 0.88),
    imported('CandleStick_Triple', `${D}/candle_lit.gltf`, 0.7, -4.85, 0, 0.78, undefined, 0.82),
    wallTop(`${D}/banner_shield_red.gltf`, -5.8, 1.06),
    wallTop(`${D}/banner_patternC_red.gltf`, 5.8, 1.06),
    wallSide(`${D}/sword_shield_gold.gltf`, -1, -4.8, 1.1),
    wallSide(`${D}/sword_shield_gold.gltf`, 1, -4.8, 1.1),
    p(`${D}/chest_gold.gltf`, 7.5, 2.8, -Math.PI / 2, 1.03, [1.3, 0.85]),
  ],

  // 3 — Säulenhalle: drei Kampfspuren bleiben frei, Inszenierung sitzt an den Wänden.
  3: [
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.18),
    wallTop(`${D}/banner_patternB_blue.gltf`, -6.2, 1.04),
    wallTop(`${D}/banner_patternA_green.gltf`, 6.2, 1.04),
    imported('Torch_Metal', `${D}/torch_lit.gltf`, -9.0, -5.1, Math.PI / 2, 1.05),
    imported('Torch_Metal', `${D}/torch_lit.gltf`, 9.0, -5.1, -Math.PI / 2, 1.05),
    imported('CandleStick_Triple', `${D}/candle_lit.gltf`, -8.5, 3.9, Math.PI / 2, 0.9),
    imported('CandleStick_Triple', `${D}/candle_lit.gltf`, 8.5, 3.9, -Math.PI / 2, 0.9),
    p(`${D}/rubble_half.gltf`, -7.2, 5.0, 0.18, 0.68, [1.2, 0.75]),
    p(`${D}/rubble_half.gltf`, 7.2, 4.7, -0.18, 0.68, [1.2, 0.75]),
  ],

  // 4 — Minencamp: Werkzeugstation links, Erzsortierung rechts, freie Kampfmitte.
  4: [
    imported('Table_Large', `${F}/table_low.gltf`, -7.2, -5.5, Math.PI / 2, 0.9, [1.7, 1]),
    p(`${T}/pickaxe.gltf`, -6.7, -5.35, 0.2, 1.26),
    p(`${T}/shovel.gltf`, -7.45, -4.85, -0.18, 1.22),
    imported('Crate_Wooden', `${D}/box_small_decorated.gltf`, -5.5, -3.6, 0.08, 0.94, [0.95, 0.85]),
    p(`${D}/rubble_large.gltf`, -7.0, 3.8, 0.2, 0.8, [1.85, 1.25]),
    p(`${R}/Pallet_Wood.gltf`, 6.9, -5.4, 0, 0.98, [1.55, 1]),
    p(`${R}/Iron_Nuggets.gltf`, 6.15, -5.05, 0.2, 1.08),
    p(`${R}/Copper_Nuggets.gltf`, 7.45, -4.8, -0.2, 1.08),
    imported('Crate_Metal', `${D}/box_large.gltf`, 6.2, -3.35, -0.08, 0.98, [1.15, 0.95]),
    p(`${T}/lantern.gltf`, 4.8, -3.85, 0, 1.16),
  ],

  // 5 — Werkstatt: drei zusammenhängende Arbeitszonen statt zufälligem Prop-Spam.
  5: [
    imported('Anvil_Log', `${T}/anvil.gltf`, -7.5, -5.25, Math.PI / 2, 1.02, [1.2, 0.9]),
    imported('Table_Large', `${D}/table_long_decorated_C.gltf`, -4.6, -5.45, 0, 0.92, [2.2, 1]),
    p(`${T}/blueprint_stacked.gltf`, -5.1, -5.3, 0.1, 1.08),
    p(`${T}/handdrill.gltf`, -4.15, -5.1, -0.25, 1.12),
    imported('Shelf_Small_Bottles', `${D}/shelves.gltf`, -8.5, -2.15, Math.PI / 2, 0.98, [1, 1.9]),
    imported('Anvil', `${T}/anvil.gltf`, 6.0, -5.0, -Math.PI / 2, 1.08, [1.1, 0.85]),
    p(`${T}/grindstone.gltf`, 8.0, -4.55, -Math.PI / 2, 1.22, [1, 1.1]),
    imported('Crate_Metal', `${D}/box_stacked.gltf`, 7.2, -2.25, 0.08, 0.94, [1.05, 0.9]),
    imported('Shelf_Simple', `${D}/shelf_small.gltf`, 8.6, 1.7, -Math.PI / 2, 0.96, [1, 1.55]),
    imported('Torch_Metal', `${D}/torch_lit.gltf`, -9.0, 2.8, Math.PI / 2, 1.02),
    imported('Torch_Metal', `${D}/torch_lit.gltf`, 9.0, 2.8, -Math.PI / 2, 1.02),
  ],

  // 6 — Große Schmiede: Referenzraum mit zentralem Amboss und vier klaren Arbeitsinseln.
  6: [
    imported('Anvil', `${T}/anvil.gltf`, 0, -1.0, 0, 1.52, [1.15, 0.9]),
    p(`${T}/grindstone.gltf`, 5.1, -4.4, 0.08, 1.42, [1, 1.15]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, -5.4, -4.2, -0.08, 1.08, [1.3, 0.8]),
    p(`${R}/Copper_Bars_Stack_Medium.gltf`, 5.4, 2.9, 0.1, 1.08, [1.2, 0.75]),
    p(`${R}/Iron_Nuggets.gltf`, -5.4, 2.9, -0.1, 1.08, [1, 0.85]),
    p(`${D}/torch_lit.gltf`, -2.8, -2.8, 0, 1.3),
    p(`${D}/torch_lit.gltf`, 2.8, -2.8, 0, 1.3),
    p(`${D}/torch_lit.gltf`, -2.8, 1.1, 0, 1.3),
    p(`${D}/torch_lit.gltf`, 2.8, 1.1, 0, 1.3),
  ],

  // 7 — Krankenlager: Betten an den Wänden, zentrale Behandlungsschneise bleibt frei.
  7: [
    p(`${F}/bed_single_A.gltf`, -7.8, -5.5, Math.PI / 2, 1.02, [1.1, 2.15]),
    p(`${F}/bed_single_B.gltf`, 7.8, -5.5, -Math.PI / 2, 1.02, [1.1, 2.15]),
    p(`${F}/bed_single_B.gltf`, -8.0, 0.2, Math.PI / 2, 1.02, [1.1, 2.15]),
    p(`${F}/bed_single_A.gltf`, 8.0, 0.2, -Math.PI / 2, 1.02, [1.1, 2.15]),
    imported('Table_Large', `${F}/table_low.gltf`, 0, -5.2, 0, 0.82, [1.7, 0.95]),
    imported('Shelf_Small_Bottles', `${F}/cabinet_small_decorated.gltf`, -2.2, -5.35, 0, 0.86, [0.9, 0.75]),
    p(`${T}/lantern.gltf`, 2.0, -5.0, 0, 1.1),
    p(`${D}/trunk_medium_A.gltf`, 6.9, 4.0, -0.12, 1.0, [1.3, 0.8]),
    p(`${F}/book_set.gltf`, -6.7, 4.0, 0.08, 1.05),
  ],

  // 8 — Archiv: U-förmige Regalwände, Lesetisch als Heldobjekt, offene Mitte.
  8: [
    imported('Shelf_Simple', `${F}/shelf_B_large_decorated.gltf`, -8.3, -5.6, Math.PI / 2, 1.0, [1, 2]),
    imported('Shelf_Small_Bottles', `${D}/shelf_large.gltf`, 8.3, -5.6, -Math.PI / 2, 1.0, [1, 2]),
    p(`${F}/shelf_A_big.gltf`, -6.0, -6.8, 0, 1.0, [2, 1]),
    p(`${D}/shelf_large.gltf`, 6.0, -6.8, 0, 1.0, [2, 1]),
    imported('Table_Large', `${F}/table_medium_long.gltf`, 0, -3.8, 0, 0.9, [2.0, 0.95]),
    imported('Book_5', `${F}/book_single.gltf`, -0.45, -3.72, -0.15, 0.82, undefined, 0.83),
    p(`${F}/book_set.gltf`, 0.55, -3.75, 0.2, 0.9),
    imported('Chair_1', `${F}/chair_A_wood.gltf`, 0, -2.2, Math.PI, 0.95),
    imported('CandleStick_Triple', `${D}/candle_lit.gltf`, 2.2, -3.55, 0, 0.82, undefined, 0.8),
  ],

  // 9 — Ritualkammer: ein dominanter Schrein, symmetrische Lichtpunkte, freier Ringkampf.
  9: [
    p(`${H}/shrine_candles.gltf`, 0, -2.0, 0, 1.82, [1.55, 1.55]),
    imported('Book_7', `${A}/spellbook_open.gltf`, 0, -1.95, 0, 0.82, undefined, 1.0),
    p(`${H}/candle_triple.gltf`, -3.2, -4.4, 0, 1.2),
    p(`${H}/candle_triple.gltf`, 3.2, -4.4, 0, 1.2),
    p(`${H}/candle_triple.gltf`, -3.2, 1.0, 0, 1.2),
    p(`${H}/candle_triple.gltf`, 3.2, 1.0, 0, 1.2),
    p(`${D}/barrier_column.gltf`, -6.8, -5.0, 0, 1.12, [0.95, 0.95]),
    p(`${D}/barrier_column.gltf`, 6.8, -5.0, 0, 1.12, [0.95, 0.95]),
    wallTop(`${D}/banner_patternB_blue.gltf`, -5.8, 1.02),
    wallTop(`${D}/banner_patternA_green.gltf`, 5.8, 1.02),
  ],

  // 10 — Krypta: Sarkophage an den Seiten, zentrale Totenbahre, breite Kampfmitte.
  10: [
    p(`${H}/crypt.gltf`, -8.0, -5.7, Math.PI / 2, 1.08, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, -8.0, -1.7, Math.PI / 2, 1.08, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 8.0, -5.7, -Math.PI / 2, 1.08, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 8.0, -1.7, -Math.PI / 2, 1.08, [1.6, 1.25]),
    p(`${H}/coffin.gltf`, 0, -5.2, 0, 1.06, [1.15, 2]),
    p(`${H}/candle_triple.gltf`, -2.4, -4.9, 0, 1.08),
    p(`${H}/candle_triple.gltf`, 2.4, -4.9, 0, 1.08),
    p(`${H}/grave_A.gltf`, -6.2, 4.2, 0.1, 1.08, [1.3, 1.7]),
    p(`${H}/grave_B.gltf`, 6.2, 4.2, -0.1, 1.08, [1.3, 1.7]),
  ],

  // 11 — Reliquiar: goldene Truhe und Metallschlüssel als Fokus, Säulen rahmen die Arena.
  11: [
    p(`${D}/chest_gold.gltf`, 0, -4.8, Math.PI, 1.14, [1.35, 0.9]),
    imported('Key_Metal', `${D}/key.gltf`, 0, -4.65, 0.1, 0.76, undefined, 1.05),
    p(`${D}/column.gltf`, -5.8, -4.2, 0, 1.16, [0.85, 0.85]),
    p(`${D}/column.gltf`, 5.8, -4.2, 0, 1.16, [0.85, 0.85]),
    p(`${D}/column.gltf`, -5.8, 3.9, 0, 1.16, [0.85, 0.85]),
    p(`${D}/column.gltf`, 5.8, 3.9, 0, 1.16, [0.85, 0.85]),
    p(`${H}/candle_triple.gltf`, -2.4, -3.9, 0, 1.12),
    p(`${H}/candle_triple.gltf`, 2.4, -3.9, 0, 1.12),
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.18),
  ],

  // 12 — Kriegssaal: Ratstisch, Bannerachsen und zwei freie Flanken.
  12: [
    imported('Table_Large', `${D}/table_long_decorated_A.gltf`, 0, -4.7, 0, 1.04, [2.4, 1.0]),
    p(`${D}/pillar.gltf`, -5.8, -4.8, 0, 1.18, [0.9, 0.9]),
    p(`${D}/pillar.gltf`, 5.8, -4.8, 0, 1.18, [0.9, 0.9]),
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.24),
    wallSide(`${D}/banner_patternB_blue.gltf`, -1, -4.2, 1.08),
    wallSide(`${D}/banner_patternA_green.gltf`, 1, -4.2, 1.08),
    wallSide(`${D}/banner_shield_red.gltf`, -1, 1.1, 1.08),
    wallSide(`${D}/banner_patternC_red.gltf`, 1, 1.1, 1.08),
    p(`${D}/chest_gold.gltf`, 0, 4.4, Math.PI, 1.02, [1.3, 0.85]),
  ],

  // 13 — Kerkergewölbe: vergitterte Seitennischen und klarer Beutealtar.
  13: [
    p(`${D}/wall_corner_gated.gltf`, -8.0, -5.2, Math.PI / 2, 0.86, [1.8, 1.8]),
    p(`${D}/wall_corner_gated.gltf`, -8.0, 1.8, Math.PI / 2, 0.86, [1.8, 1.8]),
    p(`${D}/wall_corner_gated.gltf`, 8.0, -5.2, -Math.PI / 2, 0.86, [1.8, 1.8]),
    p(`${D}/wall_corner_gated.gltf`, 8.0, 1.8, -Math.PI / 2, 0.86, [1.8, 1.8]),
    p(`${H}/coffin.gltf`, -6.5, -4.1, Math.PI / 2, 1.02, [1.15, 2]),
    p(`${H}/coffin.gltf`, 6.5, -4.1, -Math.PI / 2, 1.02, [1.15, 2]),
    p(`${D}/chest_gold.gltf`, 0, -2.0, 0, 1.08, [1.3, 0.85]),
    p(`${D}/torch_lit.gltf`, -2.2, -2.0, 0, 1.18),
    p(`${D}/torch_lit.gltf`, 2.2, -2.0, 0, 1.18),
  ],

  // 14 — Ossarium: Knocheninseln an den Rändern, Schrein als eindeutiger Fokus.
  14: [
    p(`${H}/shrine_candles.gltf`, 0, -4.0, 0, 1.45, [1.35, 1.35]),
    p(`${H}/grave_A_destroyed.gltf`, -7.0, -5.0, 0.18, 1.06, [1.25, 1.65]),
    p(`${H}/grave_A_destroyed.gltf`, 7.0, -5.0, -0.18, 1.06, [1.25, 1.65]),
    p(`${H}/skull.gltf`, -5.7, -2.8, 0, 1.2),
    p(`${H}/bone_A.gltf`, -6.4, -1.5, 0.4, 1.18),
    p(`${H}/skull.gltf`, 5.7, -2.8, 0, 1.2),
    p(`${H}/bone_A.gltf`, 6.4, -1.5, -0.4, 1.18),
    p(`${D}/rubble_half.gltf`, -7.0, 4.8, 0.2, 0.68, [1.2, 0.8]),
    p(`${D}/rubble_half.gltf`, 7.0, 4.8, -0.2, 0.68, [1.2, 0.8]),
  ],

  // 15 — Großritual: Buchaltar im Zentrum, vier Pfeiler markieren den Kampfkreis.
  15: [
    p(`${H}/shrine_candles.gltf`, 0, -1.8, 0, 1.9, [1.65, 1.65]),
    imported('Book_7', `${A}/spellbook_open.gltf`, 0, -1.75, 0, 0.86, undefined, 1.02),
    p(`${D}/barrier_column.gltf`, -6.0, -5.0, 0, 1.18, [0.95, 0.95]),
    p(`${D}/barrier_column.gltf`, 6.0, -5.0, 0, 1.18, [0.95, 0.95]),
    p(`${D}/barrier_column.gltf`, -6.0, 4.7, 0, 1.18, [0.95, 0.95]),
    p(`${D}/barrier_column.gltf`, 6.0, 4.7, 0, 1.18, [0.95, 0.95]),
    p(`${H}/candle_triple.gltf`, -3.0, -3.9, 0, 1.18),
    p(`${H}/candle_triple.gltf`, 3.0, -3.9, 0, 1.18),
    p(`${H}/candle_triple.gltf`, -3.0, 1.1, 0, 1.18),
    p(`${H}/candle_triple.gltf`, 3.0, 1.1, 0, 1.18),
  ],

  // 16 — Waffenkammer: Wächterembleme, schwere Truhen und freie Mittelachse.
  16: [
    p(`${D}/pillar.gltf`, -5.8, -4.8, 0, 1.24, [0.9, 0.9]),
    p(`${D}/pillar.gltf`, 5.8, -4.8, 0, 1.24, [0.9, 0.9]),
    wallTop(`${D}/sword_shield_gold.gltf`, -5.8, 1.24),
    wallTop(`${D}/sword_shield_gold.gltf`, 5.8, 1.24),
    wallSide(`${D}/banner_shield_red.gltf`, -1, -2.2, 1.12),
    wallSide(`${D}/banner_shield_red.gltf`, 1, -2.2, 1.12),
    p(`${D}/chest_gold.gltf`, 0, -5.0, Math.PI, 1.08, [1.3, 0.85]),
    imported('Crate_Metal', `${D}/box_stacked.gltf`, -7.0, 3.5, 0.08, 0.98, [1.1, 0.9]),
    imported('Crate_Metal', `${D}/box_stacked.gltf`, 7.0, 3.5, -0.08, 0.98, [1.1, 0.9]),
  ],

  // 17 — Eingestürzte Galerie: zwei massive Bruchzonen, dazwischen eine lesbare S-Route.
  17: [
    p(`${D}/rubble_large.gltf`, -7.1, -5.2, 0.24, 1.02, [1.8, 1.25]),
    p(`${D}/rubble_half.gltf`, -5.2, -3.3, 0.18, 0.8, [1.25, 0.8]),
    p(`${D}/rubble_half.gltf`, -7.0, 2.8, -0.18, 0.8, [1.25, 0.8]),
    p(`${D}/rubble_large.gltf`, 7.1, 4.8, -0.24, 1.02, [1.8, 1.25]),
    p(`${D}/rubble_half.gltf`, 5.1, 2.9, -0.18, 0.8, [1.25, 0.8]),
    p(`${D}/rubble_half.gltf`, 7.0, -2.9, 0.18, 0.8, [1.25, 0.8]),
    p(`${H}/candle_melted.gltf`, -3.0, -1.4, 0.4, 1.14),
    p(`${H}/candle_melted.gltf`, 3.0, 1.3, -0.4, 1.14),
    p(`${H}/bone_A.gltf`, 0, -0.1, 0.6, 1.12),
  ],

  // 18 — Steinkapelle: vier Materialinseln rahmen einen ruhigen Schrein.
  18: [
    p(`${R}/Stone_Chunks_Large.gltf`, -6.3, -4.6, 0.2, 1.05, [1.3, 0.95]),
    p(`${R}/Stone_Bricks_Stack_Medium.gltf`, 6.3, -4.6, -0.2, 1.04, [1.25, 0.85]),
    p(`${R}/Stone_Chunks_Large.gltf`, -6.3, 4.4, -0.2, 1.05, [1.3, 0.95]),
    p(`${R}/Stone_Bricks_Stack_Medium.gltf`, 6.3, 4.4, 0.2, 1.04, [1.25, 0.85]),
    p(`${H}/shrine_candles.gltf`, 0, -2.2, 0, 1.5, [1.4, 1.4]),
    p(`${H}/candle_triple.gltf`, -2.8, -2.0, 0, 1.18),
    p(`${H}/candle_triple.gltf`, 2.8, -2.0, 0, 1.18),
    p(`${D}/column.gltf`, -6.8, 0, 0, 1.12, [0.85, 0.85]),
    p(`${D}/column.gltf`, 6.8, 0, 0, 1.12, [0.85, 0.85]),
  ],

  // 19 — Wächtervorhalle: monumentale Rückwand, klarer Vorplatz und freie Bosszufahrt.
  19: [
    p(`${D}/pillar.gltf`, -6.0, -5.0, 0, 1.34, [0.95, 0.95]),
    p(`${D}/pillar.gltf`, 6.0, -5.0, 0, 1.34, [0.95, 0.95]),
    wallTop(`${D}/sword_shield_gold.gltf`, -6.0, 1.34),
    wallTop(`${D}/sword_shield_gold.gltf`, 6.0, 1.34),
    wallSide(`${D}/banner_shield_red.gltf`, -1, -0.8, 1.2),
    wallSide(`${D}/banner_shield_red.gltf`, 1, -0.8, 1.2),
    p(`${D}/column.gltf`, -4.5, 4.5, 0, 1.22, [0.9, 0.9]),
    p(`${D}/column.gltf`, 4.5, 4.5, 0, 1.22, [0.9, 0.9]),
    p(`${D}/chest_gold.gltf`, 0, -4.9, Math.PI, 1.08, [1.3, 0.85]),
  ],

  // 20 — Bossheiligtum: maximal offene Arena, vier Eckpfeiler und ein eindeutiger Altar.
  20: [
    p(`${D}/barrier_column.gltf`, -6.3, -5.2, 0, 1.38, [1, 1]),
    p(`${D}/barrier_column.gltf`, 6.3, -5.2, 0, 1.38, [1, 1]),
    p(`${D}/barrier_column.gltf`, -6.3, 5.0, 0, 1.38, [1, 1]),
    p(`${D}/barrier_column.gltf`, 6.3, 5.0, 0, 1.38, [1, 1]),
    p(`${H}/shrine_candles.gltf`, 0, -4.3, 0, 1.55, [1.45, 1.45]),
    wallSide(`${D}/banner_shield_red.gltf`, -1, 0, 1.22),
    wallSide(`${D}/banner_shield_red.gltf`, 1, 0, 1.22),
    p(`${D}/torch_lit.gltf`, -3.2, -3.2, 0, 1.28),
    p(`${D}/torch_lit.gltf`, 3.2, -3.2, 0, 1.28),
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
