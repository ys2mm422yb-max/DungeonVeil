import { expandedWorldSetpieces } from './expandedWorldRooms';
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
  // 1 — Versorgungsposten: markierter Lieferplatz, zwei Warenbuchten, freie Mittelachse.
  1: [
    p(`${F}/shelf_B_large_decorated.gltf`, -8.1, -4.8, Math.PI / 2, 1.04, [1.0, 2.0]),
    p(`${D}/shelf_large.gltf`, 8.1, -4.8, -Math.PI / 2, 1.04, [1.0, 2.0]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 0, -1.7, 0, 1.12, [1.55, 0.95]),
    p(`${D}/box_stacked.gltf`, -5.7, -1.0, 0.08, 1.0, [1.15, 0.9]),
    p(`${D}/trunk_medium_A.gltf`, 5.7, -1.0, -0.08, 1.02, [1.25, 0.85]),
    p(`${D}/barrel_small_stack.gltf`, -6.7, 3.4, 0.06, 1.0, [1.15, 0.9]),
    p(`${D}/barrel_large_decorated.gltf`, 6.7, 3.4, -0.06, 1.0, [1.0, 1.0]),
    p(`${D}/torch_lit.gltf`, -3.0, -4.4, 0, 1.18),
    p(`${D}/torch_lit.gltf`, 3.0, -4.4, 0, 1.18),
  ],

  // 2 — Wachstube: Kommandotisch als Fokus, Waffen- und Truhenzonen an den Flanken.
  2: [
    p(`${D}/table_long_decorated_A.gltf`, 0, -1.9, 0, 1.08, [2.4, 1.0]),
    p(`${D}/chair.gltf`, -1.55, -0.45, 0.12, 1.0),
    p(`${D}/chair.gltf`, 1.55, -0.45, -0.12, 1.0),
    p(`${T}/map.gltf`, -0.5, -1.72, 0.08, 1.05, undefined, 0.82),
    p(`${D}/candle_lit.gltf`, 0.65, -1.7, 0, 0.82, undefined, 0.8),
    p(`${D}/chest_gold.gltf`, -6.5, 3.6, Math.PI / 2, 1.04, [1.3, 0.85]),
    p(`${D}/trunk_medium_A.gltf`, 6.5, 3.6, -Math.PI / 2, 1.04, [1.3, 0.85]),
    wallTop(`${D}/banner_shield_red.gltf`, -5.8, 1.08),
    wallTop(`${D}/banner_patternC_red.gltf`, 5.8, 1.08),
    wallSide(`${D}/sword_shield_gold.gltf`, -1, -1.4, 1.12),
    wallSide(`${D}/sword_shield_gold.gltf`, 1, -1.4, 1.12),
  ],

  // 3 — Säulenhalle: die Architektur bildet drei saubere Kampfspuren, Dekor nur an den Wänden.
  3: [
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.22),
    wallTop(`${D}/banner_patternB_blue.gltf`, -6.2, 1.06),
    wallTop(`${D}/banner_patternA_green.gltf`, 6.2, 1.06),
    p(`${D}/torch_lit.gltf`, -3.0, -4.2, 0, 1.24),
    p(`${D}/torch_lit.gltf`, 3.0, -4.2, 0, 1.24),
    p(`${D}/candle_lit.gltf`, -8.1, 4.5, 0, 0.92),
    p(`${D}/candle_lit.gltf`, 8.1, 4.5, 0, 0.92),
  ],

  // 4 — Erzlogistik: zwei klar getrennte Stationen, markierte Lieferachse und freier Portalweg.
  4: [
    p(`${F}/table_low.gltf`, -6.8, -3.8, Math.PI / 2, 0.98, [1.55, 0.9]),
    p(`${T}/pickaxe.gltf`, -6.35, -3.62, 0.24, 1.34),
    p(`${T}/shovel.gltf`, -7.15, -3.44, -0.22, 1.28),
    p(`${T}/lantern.gltf`, -5.45, -4.65, 0, 1.2),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, 6.65, -3.7, -0.08, 1.12, [1.35, 0.82]),
    p(`${R}/Copper_Bars_Stack_Medium.gltf`, 7.25, -1.55, 0.1, 1.08, [1.2, 0.75]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 5.9, 2.9, 0.04, 1.08, [1.45, 0.92]),
    p(`${R}/Iron_Nuggets.gltf`, 5.25, 2.95, 0.12, 1.18),
    p(`${R}/Copper_Nuggets.gltf`, 6.35, 2.8, -0.12, 1.18),
    p(`${D}/box_large.gltf`, -6.4, 3.15, 0.08, 1.0, [1.15, 0.95]),
    p(`${D}/torch_lit.gltf`, -2.9, -4.8, 0, 1.22),
    p(`${D}/torch_lit.gltf`, 2.9, -4.8, 0, 1.22),
    wallTop(`${D}/banner_patternC_red.gltf`, 0, 1.05),
  ],

  // 5 — Werkstatt: hintere Montagebank, getrennte Schmiedeplätze und eine freie Kampfmitte.
  5: [
    p(`${D}/table_long_decorated_C.gltf`, 0, -5.15, 0, 1.04, [2.35, 0.95]),
    p(`${T}/blueprint_stacked.gltf`, -0.72, -5.0, 0.1, 1.12, undefined, 0.82),
    p(`${T}/handdrill.gltf`, 0.72, -4.88, -0.25, 1.16, undefined, 0.82),
    p(`${T}/anvil.gltf`, -6.45, -1.55, Math.PI / 2, 1.22, [1.2, 0.9]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, -7.0, 1.1, 0.08, 1.04, [1.25, 0.78]),
    p(`${T}/grindstone.gltf`, 6.45, -1.55, -Math.PI / 2, 1.34, [1.0, 1.1]),
    p(`${D}/box_stacked.gltf`, 6.9, 1.1, -0.08, 0.98, [1.05, 0.9]),
    p(`${D}/shelves.gltf`, -8.35, 3.6, Math.PI / 2, 1.0, [1.0, 1.9]),
    p(`${D}/shelf_small.gltf`, 8.35, 3.6, -Math.PI / 2, 1.0, [1.0, 1.55]),
    p(`${D}/torch_lit.gltf`, -3.0, -4.1, 0, 1.22),
    p(`${D}/torch_lit.gltf`, 3.0, -4.1, 0, 1.22),
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.16),
  ],

  // 6 — Schmiede: Referenzraum mit zentralem Amboss und vier lesbaren Arbeitsinseln.
  6: [
    p(`${T}/anvil.gltf`, 0, -1.0, 0, 1.52, [1.15, 0.9]),
    p(`${T}/grindstone.gltf`, 5.1, -4.4, 0.08, 1.42, [1, 1.15]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, -5.4, -4.2, -0.08, 1.08, [1.3, 0.8]),
    p(`${R}/Copper_Bars_Stack_Medium.gltf`, 5.4, 2.9, 0.1, 1.08, [1.2, 0.75]),
    p(`${R}/Iron_Nuggets.gltf`, -5.4, 2.9, -0.1, 1.08, [1, 0.85]),
    p(`${D}/torch_lit.gltf`, -2.8, -2.8, 0, 1.3),
    p(`${D}/torch_lit.gltf`, 2.8, -2.8, 0, 1.3),
    p(`${D}/torch_lit.gltf`, -2.8, 1.1, 0, 1.3),
    p(`${D}/torch_lit.gltf`, 2.8, 1.1, 0, 1.3),
  ],

  // 7 — Schlafquartier: Betten bleiben an den Außenwänden, die Gemeinschaftszone ist frei.
  7: [
    p(`${F}/bed_single_A.gltf`, -7.8, -4.7, Math.PI / 2, 1.02, [1.1, 2.15]),
    p(`${F}/bed_single_B.gltf`, 7.8, -4.7, -Math.PI / 2, 1.02, [1.1, 2.15]),
    p(`${F}/bed_single_B.gltf`, -7.8, 2.5, Math.PI / 2, 1.02, [1.1, 2.15]),
    p(`${F}/bed_single_A.gltf`, 7.8, 2.5, -Math.PI / 2, 1.02, [1.1, 2.15]),
    p(`${F}/table_low.gltf`, 0, -1.2, 0, 0.9, [1.7, 0.95]),
    p(`${T}/lantern.gltf`, 0, -1.0, 0, 1.12, undefined, 0.82),
    p(`${F}/cabinet_small_decorated.gltf`, -4.8, -4.3, 0, 0.92, [0.9, 0.8]),
    p(`${F}/cabinet_small_decorated.gltf`, 4.8, -4.3, 0, 0.92, [0.9, 0.8]),
    p(`${D}/trunk_medium_A.gltf`, -5.5, 4.4, 0.08, 1.0, [1.3, 0.8]),
    p(`${D}/trunk_medium_A.gltf`, 5.5, 4.4, -0.08, 1.0, [1.3, 0.8]),
  ],

  // 8 — Materiallager: Hochregale und Rohstoffinseln statt leerer Archivkulisse.
  8: [
    p(`${F}/shelf_B_large_decorated.gltf`, -8.2, -4.8, Math.PI / 2, 1.04, [1.0, 2.0]),
    p(`${D}/shelf_large.gltf`, 8.2, -4.8, -Math.PI / 2, 1.04, [1.0, 2.0]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, 0, -1.7, 0, 1.16, [1.3, 0.82]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.2, -1.2, 0.08, 1.06, [1.5, 0.92]),
    p(`${R}/Pallet_Wood.gltf`, 5.2, -1.2, -0.08, 1.06, [1.5, 0.92]),
    p(`${R}/Stone_Bricks_Stack_Medium.gltf`, -5.8, 3.4, 0.12, 1.08, [1.25, 0.85]),
    p(`${R}/Copper_Bars_Stack_Medium.gltf`, 5.8, 3.4, -0.12, 1.08, [1.2, 0.75]),
    p(`${D}/box_stacked.gltf`, -8.0, 2.4, 0.08, 0.98, [1.05, 0.9]),
    p(`${D}/box_large.gltf`, 8.0, 2.4, -0.08, 0.98, [1.1, 0.9]),
    p(`${T}/lantern.gltf`, -2.7, -3.2, 0, 1.18),
    p(`${T}/lantern.gltf`, 2.7, -3.2, 0, 1.18),
  ],

  // 9 — Ritualkammer: dominanter Schrein, symmetrischer Lichtkreis, freie Ringarena.
  9: [
    p(`${H}/shrine_candles.gltf`, 0, -1.2, 0, 1.78, [1.5, 1.5]),
    p(`${A}/spellbook_open.gltf`, 0, -1.15, 0, 0.86, undefined, 1.02),
    p(`${H}/candle_triple.gltf`, -3.1, -3.8, 0, 1.18),
    p(`${H}/candle_triple.gltf`, 3.1, -3.8, 0, 1.18),
    p(`${H}/candle_triple.gltf`, -3.1, 1.8, 0, 1.18),
    p(`${H}/candle_triple.gltf`, 3.1, 1.8, 0, 1.18),
    p(`${H}/skull.gltf`, -6.6, 3.8, 0.1, 1.15),
    p(`${H}/bone_A.gltf`, 6.6, 3.8, -0.1, 1.15),
    wallTop(`${D}/banner_patternB_blue.gltf`, -5.8, 1.04),
    wallTop(`${D}/banner_patternA_green.gltf`, 5.8, 1.04),
  ],

  // 10 — Grabwächterhalle: offene Bossarena; Sarkophag und Gräber liegen nur am Rand.
  10: [
    p(`${H}/coffin.gltf`, -7.2, -0.4, Math.PI / 2, 1.0, [1.1, 1.9]),
    p(`${H}/coffin.gltf`, 7.2, -0.4, -Math.PI / 2, 1.0, [1.1, 1.9]),
    p(`${H}/grave_A.gltf`, -7.2, -4.1, 0.08, 0.98, [1.2, 1.55]),
    p(`${H}/grave_B.gltf`, 7.2, -4.1, -0.08, 0.98, [1.2, 1.55]),
    p(`${H}/grave_A_destroyed.gltf`, -7.3, 4.2, 0.14, 0.94, [1.15, 1.45]),
    p(`${H}/grave_A_destroyed.gltf`, 7.3, 4.2, -0.14, 0.94, [1.15, 1.45]),
    p(`${H}/candle_triple.gltf`, -3.0, -4.8, 0, 1.12),
    p(`${H}/candle_triple.gltf`, 3.0, -4.8, 0, 1.12),
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.18),
  ],

  // 11 — Kreuzgang: kleiner Schrein, vier ruhige Eckstationen, freie Kreuzachse.
  11: [
    p(`${H}/shrine_candles.gltf`, 0, -1.4, 0, 1.48, [1.35, 1.35]),
    p(`${D}/column.gltf`, -5.8, -4.3, 0, 1.12, [0.85, 0.85]),
    p(`${D}/column.gltf`, 5.8, -4.3, 0, 1.12, [0.85, 0.85]),
    p(`${D}/column.gltf`, -5.8, 4.2, 0, 1.12, [0.85, 0.85]),
    p(`${D}/column.gltf`, 5.8, 4.2, 0, 1.12, [0.85, 0.85]),
    p(`${H}/candle_triple.gltf`, -2.5, -3.4, 0, 1.1),
    p(`${H}/candle_triple.gltf`, 2.5, -3.4, 0, 1.1),
    p(`${D}/chest_gold.gltf`, 0, 4.4, Math.PI, 1.02, [1.3, 0.85]),
  ],

  // 12 — Galerie: monumentale Schaustücke an den Wänden, klare zentrale Promenade.
  12: [
    p(`${D}/pillar.gltf`, -5.8, -4.4, 0, 1.22, [0.9, 0.9]),
    p(`${D}/pillar.gltf`, 5.8, -4.4, 0, 1.22, [0.9, 0.9]),
    p(`${D}/pillar.gltf`, -5.8, 4.2, 0, 1.18, [0.9, 0.9]),
    p(`${D}/pillar.gltf`, 5.8, 4.2, 0, 1.18, [0.9, 0.9]),
    p(`${D}/chest_gold.gltf`, 0, -1.8, 0, 1.08, [1.3, 0.85]),
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.28),
    wallSide(`${D}/banner_patternB_blue.gltf`, -1, -1.4, 1.12),
    wallSide(`${D}/banner_patternA_green.gltf`, 1, -1.4, 1.12),
    p(`${H}/candle_triple.gltf`, -2.5, -1.8, 0, 1.08),
    p(`${H}/candle_triple.gltf`, 2.5, -1.8, 0, 1.08),
  ],

  // 13 — Gefängnisring: vier vergitterte Nischen und ein eindeutiger Schlüsselaltar.
  13: [
    p(`${D}/wall_corner_gated.gltf`, -8.0, -4.2, Math.PI / 2, 0.86, [1.8, 1.8]),
    p(`${D}/wall_corner_gated.gltf`, 8.0, -4.2, -Math.PI / 2, 0.86, [1.8, 1.8]),
    p(`${D}/wall_corner_gated.gltf`, -8.0, 3.7, Math.PI / 2, 0.86, [1.8, 1.8]),
    p(`${D}/wall_corner_gated.gltf`, 8.0, 3.7, -Math.PI / 2, 0.86, [1.8, 1.8]),
    p(`${D}/chest_gold.gltf`, 0, -1.5, 0, 1.08, [1.3, 0.85]),
    p(`${D}/key.gltf`, 0, -1.42, Math.PI / 2, 1.15, undefined, 1.0),
    p(`${D}/torch_lit.gltf`, -2.5, -2.8, 0, 1.18),
    p(`${D}/torch_lit.gltf`, 2.5, -2.8, 0, 1.18),
  ],

  // 14 — Knochenhof: Schrein als Fokus, Knochen- und Grabinseln nur an den Rändern.
  14: [
    p(`${H}/shrine_candles.gltf`, 0, -1.8, 0, 1.48, [1.35, 1.35]),
    p(`${H}/grave_A_destroyed.gltf`, -7.0, -4.2, 0.14, 1.02, [1.25, 1.6]),
    p(`${H}/grave_A_destroyed.gltf`, 7.0, -4.2, -0.14, 1.02, [1.25, 1.6]),
    p(`${H}/grave_A.gltf`, -7.0, 4.2, 0.08, 1.0, [1.25, 1.6]),
    p(`${H}/grave_B.gltf`, 7.0, 4.2, -0.08, 1.0, [1.25, 1.6]),
    p(`${H}/skull.gltf`, -5.0, -0.2, 0.1, 1.18),
    p(`${H}/bone_A.gltf`, -5.8, 1.4, 0.4, 1.15),
    p(`${H}/skull.gltf`, 5.0, -0.2, -0.1, 1.18),
    p(`${H}/bone_A.gltf`, 5.8, 1.4, -0.4, 1.15),
  ],

  // 15 — Ritualarena: großer Buchaltar und vier Pfeiler definieren den Kampfkreis.
  15: [
    p(`${H}/shrine_candles.gltf`, 0, -1.2, 0, 1.86, [1.6, 1.6]),
    p(`${A}/spellbook_open.gltf`, 0, -1.15, 0, 0.9, undefined, 1.05),
    p(`${D}/barrier_column.gltf`, -6.0, -4.8, 0, 1.18, [0.95, 0.95]),
    p(`${D}/barrier_column.gltf`, 6.0, -4.8, 0, 1.18, [0.95, 0.95]),
    p(`${D}/barrier_column.gltf`, -6.0, 4.8, 0, 1.18, [0.95, 0.95]),
    p(`${D}/barrier_column.gltf`, 6.0, 4.8, 0, 1.18, [0.95, 0.95]),
    p(`${H}/candle_triple.gltf`, -3.0, -3.7, 0, 1.15),
    p(`${H}/candle_triple.gltf`, 3.0, -3.7, 0, 1.15),
    p(`${H}/candle_triple.gltf`, -3.0, 1.4, 0, 1.15),
    p(`${H}/candle_triple.gltf`, 3.0, 1.4, 0, 1.15),
  ],

  // 16 — Wächterpassage: schwere Embleme, Truhen und eine freie monumentale Achse.
  16: [
    p(`${D}/chest_gold.gltf`, 0, -1.8, Math.PI, 1.1, [1.3, 0.85]),
    p(`${D}/pillar.gltf`, -5.8, -4.5, 0, 1.25, [0.9, 0.9]),
    p(`${D}/pillar.gltf`, 5.8, -4.5, 0, 1.25, [0.9, 0.9]),
    p(`${D}/pillar.gltf`, -5.8, 4.3, 0, 1.2, [0.9, 0.9]),
    p(`${D}/pillar.gltf`, 5.8, 4.3, 0, 1.2, [0.9, 0.9]),
    wallTop(`${D}/sword_shield_gold.gltf`, -5.8, 1.26),
    wallTop(`${D}/sword_shield_gold.gltf`, 5.8, 1.26),
    wallSide(`${D}/banner_shield_red.gltf`, -1, -1.3, 1.14),
    wallSide(`${D}/banner_shield_red.gltf`, 1, -1.3, 1.14),
    p(`${D}/box_stacked.gltf`, -7.4, 2.3, 0.08, 1.0, [1.1, 0.9]),
    p(`${D}/box_stacked.gltf`, 7.4, 2.3, -0.08, 1.0, [1.1, 0.9]),
  ],

  // 17 — Eingestürztes Gewölbe: zwei massive Bruchzonen, dazwischen bleibt eine klare S-Route.
  17: [
    p(`${D}/rubble_large.gltf`, -7.2, -4.7, 0.22, 0.9, [1.7, 1.2]),
    p(`${D}/rubble_half.gltf`, -6.0, 1.8, -0.14, 0.72, [1.2, 0.8]),
    p(`${D}/rubble_large.gltf`, 7.2, 4.5, -0.22, 0.9, [1.7, 1.2]),
    p(`${D}/rubble_half.gltf`, 6.0, -1.8, 0.14, 0.72, [1.2, 0.8]),
    p(`${D}/chest.gltf`, 0, -2.8, 0, 1.02, [1.3, 0.85]),
    p(`${H}/candle_melted.gltf`, -3.0, -1.0, 0.35, 1.12),
    p(`${H}/candle_melted.gltf`, 3.0, 1.0, -0.35, 1.12),
  ],

  // 18 — Schleier-Riss: der zentrale Riss bleibt frei, Stein- und Kristallrahmen sitzen außen.
  18: [
    p(`${R}/Stone_Chunks_Large.gltf`, -6.4, -4.5, 0.18, 1.04, [1.3, 0.95]),
    p(`${R}/Stone_Bricks_Stack_Medium.gltf`, 6.4, -4.5, -0.18, 1.04, [1.25, 0.85]),
    p(`${R}/Stone_Chunks_Large.gltf`, -6.4, 4.4, -0.18, 1.04, [1.3, 0.95]),
    p(`${R}/Stone_Bricks_Stack_Medium.gltf`, 6.4, 4.4, 0.18, 1.04, [1.25, 0.85]),
    p(`${D}/column.gltf`, -7.2, 0, 0, 1.14, [0.85, 0.85]),
    p(`${D}/column.gltf`, 7.2, 0, 0, 1.14, [0.85, 0.85]),
    p(`${H}/candle_triple.gltf`, -3.0, -3.2, 0, 1.14),
    p(`${H}/candle_triple.gltf`, 3.0, -3.2, 0, 1.14),
  ],

  // 19 — Wächtervorhalle: monumentale Rückwand, klarer Vorplatz und freie Bosszufahrt.
  19: [
    p(`${D}/chest_gold.gltf`, 0, -3.4, Math.PI, 1.12, [1.3, 0.85]),
    p(`${D}/pillar.gltf`, -6.0, -4.8, 0, 1.34, [0.95, 0.95]),
    p(`${D}/pillar.gltf`, 6.0, -4.8, 0, 1.34, [0.95, 0.95]),
    p(`${D}/column.gltf`, -5.0, 4.5, 0, 1.22, [0.9, 0.9]),
    p(`${D}/column.gltf`, 5.0, 4.5, 0, 1.22, [0.9, 0.9]),
    wallTop(`${D}/sword_shield_gold.gltf`, -5.8, 1.3),
    wallTop(`${D}/sword_shield_gold.gltf`, 5.8, 1.3),
    wallSide(`${D}/banner_shield_red.gltf`, -1, -0.8, 1.22),
    wallSide(`${D}/banner_shield_red.gltf`, 1, -0.8, 1.22),
  ],

  // 20 — Bossheiligtum: maximal offene Arena, Altar nur an der Rückkante, vier Eckpfeiler.
  20: [
    p(`${D}/barrier_column.gltf`, -6.5, -5.0, 0, 1.38, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 6.5, -5.0, 0, 1.38, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, -6.5, 5.0, 0, 1.38, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 6.5, 5.0, 0, 1.38, [1.0, 1.0]),
    p(`${H}/shrine_candles.gltf`, 0, -5.2, 0, 1.52, [1.42, 1.42]),
    p(`${D}/torch_lit.gltf`, -3.2, -4.0, 0, 1.28),
    p(`${D}/torch_lit.gltf`, 3.2, -4.0, 0, 1.28),
    wallSide(`${D}/banner_shield_red.gltf`, -1, 0, 1.22),
    wallSide(`${D}/banner_shield_red.gltf`, 1, 0, 1.22),
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
  const safeRoom = Math.max(1, Math.min(50, room));
  const expanded = expandedWorldSetpieces(safeRoom);
  if (expanded.length) return expanded.map(piece => ({ ...piece }));
  const key = Math.min(20, safeRoom);
  const override = ROOM_OVERRIDES[key];
  if (override) return override.map(piece => ({ ...piece }));

  let wallDecorIndex = 0;
  return calibratedRoomSetpieces(key).map(piece => {
    const wallDecor = piece.model.includes('/banner_') || piece.model.includes('/sword_shield');
    return anchorWallDecoration(key, piece, wallDecor ? wallDecorIndex++ : 0);
  });
}
