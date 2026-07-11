import { roomSetpieces as legacyRoomSetpieces, type RoomSetpiece } from './roomSetpieceLayout';

const F = 'furniture/Assets/gltf';
const T = 'tools/Assets/gltf';
const H = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';
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
  const count = Math.max(1, Math.ceil(length / 3.1));
  const step = length / count;
  const scale = Math.max(.72, Math.min(1.02, step / 3.3));
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
  const count = Math.max(1, Math.ceil(length / 2.4));
  const step = length / count;
  const scale = Math.max(.78, Math.min(1.08, step / 2.6));
  return Array.from({ length: count }, (_, index) => {
    const offset = (index - (count - 1) / 2) * step;
    return p(
      index % 2 ? `${D}/barrier_half.gltf` : `${D}/barrier.gltf`,
      x + Math.cos(rotation) * offset,
      z + Math.sin(rotation) * offset,
      rotation + (index % 2 ? Math.PI : 0),
      scale,
      index % 2 ? [2.0, .75] : [2.6, .8],
    );
  });
};

const shelfSpan = (
  x: number,
  z: number,
  length: number,
  rotation = 0,
  model = `${D}/shelf_large.gltf`,
): RoomSetpiece[] => {
  const count = Math.max(1, Math.ceil(length / 2.2));
  const step = length / count;
  return Array.from({ length: count }, (_, index) => {
    const offset = (index - (count - 1) / 2) * step;
    return p(
      model,
      x + Math.cos(rotation) * offset,
      z + Math.sin(rotation) * offset,
      rotation,
      1.08,
      [1.0, 2.0],
    );
  });
};

/**
 * Direct runtime translation of the 20 individually reviewed Canva V3 mobile room pages.
 * Large structural masses shape combat lanes first; decoration only reinforces identity.
 * Every room remains dash-readable and uses visible geometry as its collision source.
 */
const CANVA_V3_ROOMS: Partial<Record<number, RoomSetpiece[]>> = {
  // ROOM 01 · Verlassener Versorgungsposten — Gebrochene Querwand, zwei volle Lagerflügel, enge Hauptachse
  1: [
    ...shelfSpan(-7, -6.1, 4.1, Math.PI, `${D}/shelf_large.gltf`),
    ...shelfSpan(-5.3, -6.6, 2.2, 0, `${F}/shelf_B_large_decorated.gltf`),
    p(`${D}/box_stacked.gltf`, -6.15, -4.4, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, -5.05, -4.05, 0, 1.06, [1.0, .9]),
    p(`${D}/box_stacked.gltf`, -7.45, -1.1, Math.PI / 2, 1.08, [1.2, 1.0]),
    ...shelfSpan(6.9, -5.9, 4, Math.PI, `${D}/shelf_large.gltf`),
    p(`${D}/box_stacked.gltf`, 4.75, -6, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 5.85, -5.65, 0, 1.06, [1.0, .9]),
    p(`${D}/box_stacked.gltf`, 5.75, -3.9, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 6.85, -3.55, 0, 1.06, [1.0, .9]),
    ...wallSpan(5.7, 2.5, 4.2, 0, `${D}/wall_cracked.gltf`),
    p(`${D}/box_stacked.gltf`, -6.35, 4.6, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, -5.25, 4.95, 0, 1.06, [1.0, .9]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, -5.65, 3.95, 0, 1.04, [1.5, 1.0]),
    ...wallSpan(-5.1, -2.6, 5.8, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(5.05, -2.6, 5.9, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(6.15, 5.1, 3.7, 0, `${D}/wall_broken.gltf`),
  ],

  // ROOM 02 · Wachstube — Kommandonische links, Waffenbucht rechts, mittlere Barrikade mit zwei Öffnungen
  2: [
    p(`${D}/table_long_decorated_A.gltf`, -4.7, -4.3, 0, 1.1, [2.5, 1.0]),
    p(`${D}/chair.gltf`, -5.8, -3.2, 0, 1.03),
    p(`${D}/chair.gltf`, -3.6, -3.2, 0, 1.03),
    ...shelfSpan(-7, -1.6, 2.7, Math.PI, `${D}/shelf_large.gltf`),
    ...shelfSpan(6.9, -4, 3, Math.PI, `${F}/shelf_B_large_decorated.gltf`),
    p(`${D}/box_stacked.gltf`, 4.25, -3.8, 0, 1.08, [1.2, 1.0]),
    ...barrierSpan(-6.2, .3, 3.2, 0),
    ...barrierSpan(0, .3, 2.7, 0),
    ...barrierSpan(5.9, .3, 3, 0),
    p(`${D}/pillar.gltf`, -7.2, 4.3, 0, 1.22, [.9, .9]),
    p(`${D}/pillar.gltf`, 7.2, 4.3, 0, 1.22, [.9, .9]),
    p(`${D}/wall_arched.gltf`, 0, -7.6, 0, 1.08, [3.2, .8]),
    p(`${D}/wall_broken.gltf`, -.9, -7.6, 0, .85, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, .9, -7.6, 0, .85, [3.3, .7]),
    ...wallSpan(-4.7, -5.8, 6.6, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(-8, -3.4, 4.8, 1.571, `${D}/wall_broken.gltf`),
    ...wallSpan(4.7, -5.8, 6.6, 0, `${D}/wall_broken.gltf`),
  ],

  // ROOM 03 · Alte Säulenhalle — Drei Säulenbuchten, kollabierte Ostseite, zentrale Zeremonialachse
  3: [
    p(`${D}/barrier_column.gltf`, 0, -4, 0, 1.22, [1.0, 1.0]),
    p(`${D}/sword_shield_gold.gltf`, 0, -4.5, 0, 1.2),
    p(`${D}/rubble_large.gltf`, 6.6, 3.4, 0.349, 1.11, [2.0, 1.4]),
    ...wallSpan(0, 0, 4.4, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(5.6, 6.2, 4.8, 0, `${D}/wall_broken.gltf`),
    p(`${D}/column.gltf`, -5.6, -6, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, -6, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, -5.6, -2.2, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, -2.2, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, -5.6, 1.8, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, 5.6, 1.8, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, -5.6, 5.7, 0, 1.29, [.9, .9]),
    p(`${D}/rubble_large.gltf`, 5.7, 5.4, .18, 1.2, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, 6.6, 6, -.2, 1.08, [1.5, 1.0]),
  ],

  // ROOM 04 · Bergarbeiterlager — Werkzeuglager links, Erzsortierung rechts, diagonale Schienenbarriere
  4: [
    p(`${D}/table_medium_decorated_A.gltf`, -5.4, -4.2, 0, 1.1, [1.8, 1.0]),
    p(`${D}/box_stacked.gltf`, -7.15, -1.8, 0, 1.08, [1.2, 1.0]),
    p(`${D}/box_stacked.gltf`, 5.25, -5.3, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 6.35, -4.95, 0, 1.06, [1.0, .9]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 5.95, -5.95, 0, 1.04, [1.5, 1.0]),
    ...shelfSpan(7, -2.6, 2.4, Math.PI, `${D}/shelf_large.gltf`),
    ...barrierSpan(-4.8, 4.6, 3.7, 0.14),
    p(`${D}/box_stacked.gltf`, 4.35, 5, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 5.45, 5.35, 0, 1.06, [1.0, .9]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 5.05, 4.35, 0, 1.04, [1.5, 1.0]),
    ...wallSpan(-5.05, -5.9, 5.9, 0, `${D}/wall_cracked.gltf`),
    ...wallSpan(-8, -3.5, 4.8, 1.571, `${D}/wall_cracked.gltf`),
    ...barrierSpan(-.8, .3, 12.96, -0.155),
    p(`${D}/rubble_large.gltf`, 6, 2.2, -.18, 1.21, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, 6.9, 2.8, -.2, 1.08, [1.5, 1.0]),
  ],

  // ROOM 05 · Verlassene Werkstatt — Drei Werkbuchten und eine Hakenroute statt einzelner Möbelinseln
  5: [
    p(`${D}/table_long_decorated_A.gltf`, -5.1, -4.5, 0, 1.1, [2.5, 1.0]),
    ...shelfSpan(-6.8, -2, 2.8, Math.PI, `${F}/shelf_B_large_decorated.gltf`),
    p(`${D}/table_long_decorated_A.gltf`, 4.9, -4.9, 0, 1.1, [2.5, 1.0]),
    ...shelfSpan(7, -2.8, 3.2, Math.PI, `${F}/shelf_B_large_decorated.gltf`),
    p(`${D}/box_stacked.gltf`, 4.85, -1.1, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 5.95, -.75, 0, 1.06, [1.0, .9]),
    p(`${D}/box_stacked.gltf`, 5.45, 5, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 6.55, 5.35, 0, 1.06, [1.0, .9]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 6.15, 4.35, 0, 1.04, [1.5, 1.0]),
    p(`${D}/rubble_large.gltf`, -6, 5, 0.175, 1.15, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, -5.1, 5.7, 0.175, 1.05, [1.5, 1.0]),
    ...wallSpan(-5.15, -6, 5.7, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(-8, -3.9, 4.2, 1.571, `${D}/wall_broken.gltf`),
    ...wallSpan(-3, 1.2, 4.4, 1.571, `${D}/wall_broken.gltf`),
    ...wallSpan(4.65, 2, 6.3, 0, `${D}/wall_broken.gltf`),
  ],

  // ROOM 06 · Schmiede — Große Schmiedebucht, Materialseite, Hitzeachse und drei Öffnungen
  6: [
    p(`${T}/anvil.gltf`, -5.3, -4.2, 0, 1.58, [1.0, .8]),
    p(`${R}/Iron_Bars_Stack_Medium.gltf`, -6.6, -3.6, 0, 1.14, [1.25, .8]),
    p(`${D}/barrel_large.gltf`, -4, -3.7, 0, 1.08, [1.0, 1.0]),
    p(`${D}/box_stacked.gltf`, -6.65, -.7, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, -5.55, -.35, 0, 1.06, [1.0, .9]),
    ...barrierSpan(-3.7, 1.1, 2.2, 0),
    ...barrierSpan(0, 1.1, 1.8, 0),
    ...barrierSpan(3.8, 1.1, 2.2, 0),
    p(`${T}/grindstone.gltf`, 5.4, -4.3, 0, 1.55, [1.0, 1.25]),
    p(`${R}/Copper_Bars_Stack_Small.gltf`, 6.6, -3.9, 0, 1.12, [1.0, .7]),
    p(`${D}/box_stacked.gltf`, 5.85, -1, 0, 1.08, [1.2, 1.0]),
    ...wallSpan(-5.8, 5, 4, 0, `${D}/wall_cracked.gltf`),
    ...wallSpan(5.8, 5, 4, 0, `${D}/wall_cracked.gltf`),
    p(`${D}/barrier_column.gltf`, 0, -3.7, 0, 1.28, [1.0, 1.0]),
    p(`${D}/torch_lit.gltf`, -.8, -4.5, 0, 1.3),
    p(`${D}/torch_lit.gltf`, .8, -2.9, 0, 1.3),
    ...wallSpan(-5.25, -5.9, 5.5, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(-8, -2.7, 6.4, 1.571, `${D}/wall_broken.gltf`),
  ],

  // ROOM 07 · Schlafquartier — Vier echte Bettbuchten mit kurzen Wänden und zentralem Gemeinschaftsbereich
  7: [
    p(`${F}/bed_single_B.gltf`, -6, -4.2, Math.PI / 2, 1.08, [1.15, 2.2]),
    p(`${F}/bed_single_A.gltf`, -5.9, -1.8, Math.PI / 2, 1.08, [1.15, 2.2]),
    p(`${F}/bed_single_B.gltf`, 5.9, -4.2, Math.PI / 2, 1.08, [1.15, 2.2]),
    p(`${F}/bed_single_A.gltf`, 5.9, -1.8, Math.PI / 2, 1.08, [1.15, 2.2]),
    p(`${D}/table_medium_decorated_A.gltf`, 0, -2, 0, 1.1, [1.8, 1.0]),
    p(`${D}/chair.gltf`, -1.1, -.9, 0, 1.03),
    p(`${D}/chair.gltf`, 1.1, -.9, 0, 1.03),
    p(`${D}/box_stacked.gltf`, -6.75, 3.4, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, -5.65, 3.75, 0, 1.06, [1.0, .9]),
    p(`${D}/box_stacked.gltf`, 5.85, 3.4, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 6.95, 3.75, 0, 1.06, [1.0, .9]),
    ...wallSpan(0, 5.2, 5, 0, `${D}/wall_cracked.gltf`),
    ...wallSpan(-5.6, -5.9, 4.8, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(-3.2, -3.55, 4.7, 1.571, `${D}/wall_broken.gltf`),
    ...wallSpan(5.6, -5.9, 4.8, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(3.2, -3.55, 4.7, 1.571, `${D}/wall_broken.gltf`),
  ],

  // ROOM 08 · Materiallager — Regalgassen formen eine S-Route, Jagdtasche im oberen Drittel
  8: [
    ...shelfSpan(-6.3, -6.2, 4.4, Math.PI, `${F}/shelf_B_large_decorated.gltf`),
    ...shelfSpan(-2.8, -4.8, 5, Math.PI, `${D}/shelf_large.gltf`),
    ...shelfSpan(1.2, -6, 4.4, Math.PI, `${F}/shelf_B_large_decorated.gltf`),
    ...shelfSpan(5.8, -4.6, 5, Math.PI, `${D}/shelf_large.gltf`),
    ...shelfSpan(-5.6, .7, 4, Math.PI, `${F}/shelf_B_large_decorated.gltf`),
    ...shelfSpan(-1, 2.1, 4.6, Math.PI, `${D}/shelf_large.gltf`),
    ...shelfSpan(3.2, .6, 4, Math.PI, `${F}/shelf_B_large_decorated.gltf`),
    p(`${D}/box_stacked.gltf`, 5.85, 2.8, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 6.95, 3.15, 0, 1.06, [1.0, .9]),
    ...barrierSpan(0, 5.3, 3, 0),
    ...wallSpan(5.6, 6, 4, 0, `${D}/wall_broken.gltf`),
    p(`${D}/rubble_large.gltf`, -6.4, 5.5, 0, 1.2, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, -5.5, 6.1, -.2, 1.08, [1.5, 1.0]),
  ],

  // ROOM 09 · Ritualkammer — Gebrochener Ritualring mit vier Ankern und umlaufender Kampfroute
  9: [
    p(`${D}/pillar.gltf`, 0, -6.6, 0, 1.22, [.9, .9]),
    p(`${D}/pillar.gltf`, 0, 6, 0, 1.22, [.9, .9]),
    ...wallSpan(-5.5, -4, 3.84, -0.675, `${D}/wall_broken.gltf`),
    ...wallSpan(5.5, -4, 3.84, 0.675, `${D}/wall_broken.gltf`),
    ...wallSpan(-5.5, 4, 3.84, 0.675, `${D}/wall_broken.gltf`),
    ...wallSpan(5.5, 4, 3.84, -0.675, `${D}/wall_broken.gltf`),
    p(`${H}/shrine_candles.gltf`, 0, -.3, 0, 1.94, [1.6, 1.6]),
    p(`${H}/candle_triple.gltf`, -2.1, -.3, 0, 1.3),
    p(`${H}/candle_triple.gltf`, 2.1, -.3, 0, 1.3),
    p(`${D}/barrier_column.gltf`, -5.2, -4.6, 0, 1.28, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 5.2, -4.6, 0, 1.28, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, -5.2, 4.1, 0, 1.28, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 5.2, 4.1, 0, 1.28, [1.0, 1.0]),
  ],

  // ROOM 10 · Grabwächterhalle — Schwere Kryptenflügel, Grabinseln und bewachte Mittelavenue
  10: [
    p(`${H}/crypt.gltf`, -6.7, -6.3, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, -6.7, -4.7, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, -6.7, -2, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, -6.7, -.4, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 6.7, -6.3, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 6.7, -4.7, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 6.7, -2, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/crypt.gltf`, 6.7, -.4, Math.PI / 2, 1.18, [1.6, 1.25]),
    p(`${H}/grave_A.gltf`, -4, 3, 0, 1.18, [1.3, 1.8]),
    p(`${H}/grave_B.gltf`, 4, 3, 0, 1.18, [1.3, 1.8]),
    p(`${H}/grave_A.gltf`, -4, 5.5, 0, 1.18, [1.3, 1.8]),
    p(`${H}/grave_B.gltf`, 4, 5.5, 0, 1.18, [1.3, 1.8]),
    p(`${D}/wall_arched.gltf`, 0, -7.3, 0, 1.08, [3.2, .8]),
    p(`${D}/wall_broken.gltf`, -.85, -7.3, 0, .85, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, .85, -7.3, 0, .85, [3.3, .7]),
    p(`${D}/barrier_column.gltf`, 0, -3, 0, 1.22, [1.0, 1.0]),
    p(`${D}/column.gltf`, -2, -5.7, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, 2, -5.7, 0, 1.29, [.9, .9]),
  ],

  // ROOM 11 · Kreuzgang Der Wachen — Vier belegte Quadranten und echte Kreuz-Zirkulation
  11: [
    ...wallSpan(-5.8, -5.2, 4.1, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(-5.8, -5.2, 3.9, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(5.8, -5.2, 4.1, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(5.8, -5.2, 3.9, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(-5.8, 4.7, 4.1, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(-5.8, 4.7, 3.7, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(5.8, 4.7, 4.1, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(5.8, 4.7, 3.7, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...barrierSpan(-5, -1, 2.5, 0),
    ...barrierSpan(5, 1, 2.5, 0),
    p(`${D}/column.gltf`, -4.2, -3.8, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, 4.2, -3.8, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, -4.2, 3.4, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, 4.2, 3.4, 0, 1.29, [.9, .9]),
  ],

  // ROOM 12 · Gefallene Galerie — Drei diagonale Ruinenbänder brechen Sichtlinien in gestaffelte Kampfzonen
  12: [
    ...wallSpan(-4.9, -5.4, 7, 0.314, `${D}/wall_cracked.gltf`),
    p(`${D}/rubble_large.gltf`, -6.2, -3.5, 0.209, 1.15, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, -5.3, -2.8, 0.209, 1.05, [1.5, 1.0]),
    ...wallSpan(3.7, -1.8, 7, -0.279, `${D}/wall_cracked.gltf`),
    ...shelfSpan(6.2, -.3, 3.4, Math.PI, `${D}/shelf_large.gltf`),
    ...wallSpan(-3.8, 2.1, 6.8, 0.297, `${D}/wall_cracked.gltf`),
    p(`${D}/rubble_large.gltf`, -5.8, 4.2, -0.175, 1.15, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, -4.9, 4.9, -0.175, 1.05, [1.5, 1.0]),
    p(`${D}/box_stacked.gltf`, 5.35, 4.7, 0, 1.08, [1.2, 1.0]),
    p(`${D}/barrel_small_stack.gltf`, 6.45, 5.05, 0, 1.06, [1.0, .9]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 6.05, 4.05, 0, 1.04, [1.5, 1.0]),
    p(`${D}/column.gltf`, 0, -4.5, 0, 1.3, [.9, .9]),
    p(`${D}/column.gltf`, 0, 3.4, 0, 1.3, [.9, .9]),
  ],

  // ROOM 13 · Gefangenenring — Zwei schwere Zellenflügel, Mittelbarrieren und ringförmige Route
  13: [
    p(`${D}/wall_corner_gated.gltf`, -6.5, -5.6, Math.PI / 2, .9, [2.0, 2.0]),
    p(`${D}/wall_corner_gated.gltf`, -6.5, -3.9, Math.PI / 2, .9, [2.0, 2.0]),
    p(`${H}/coffin.gltf`, -6.5, -4.8, Math.PI / 2, 1.08, [1.2, 2.2]),
    p(`${D}/wall_corner_gated.gltf`, -6.5, 1.4, Math.PI / 2, .9, [2.0, 2.0]),
    p(`${D}/wall_corner_gated.gltf`, -6.5, 3.1, Math.PI / 2, .9, [2.0, 2.0]),
    p(`${H}/coffin.gltf`, -6.5, 2.2, Math.PI / 2, 1.08, [1.2, 2.2]),
    p(`${D}/wall_corner_gated.gltf`, 6.5, -5.6, Math.PI / 2, .9, [2.0, 2.0]),
    p(`${D}/wall_corner_gated.gltf`, 6.5, -3.9, Math.PI / 2, .9, [2.0, 2.0]),
    p(`${H}/coffin.gltf`, 6.5, -4.8, Math.PI / 2, 1.08, [1.2, 2.2]),
    p(`${D}/wall_corner_gated.gltf`, 6.5, 1.4, Math.PI / 2, .9, [2.0, 2.0]),
    p(`${D}/wall_corner_gated.gltf`, 6.5, 3.1, Math.PI / 2, .9, [2.0, 2.0]),
    p(`${H}/coffin.gltf`, 6.5, 2.2, Math.PI / 2, 1.08, [1.2, 2.2]),
    p(`${D}/wall_arched.gltf`, -3.5, -1.2, 0, 1.08, [3.2, .8]),
    p(`${D}/wall_arched.gltf`, 3.5, 1.3, 0, 1.08, [3.2, .8]),
    ...barrierSpan(0, -3.2, 2.6, Math.PI / 2),
    ...barrierSpan(0, 2.2, 2.6, Math.PI / 2),
    p(`${D}/wall_arched.gltf`, 0, -7.2, 0, 1.08, [3.2, .8]),
    p(`${D}/column.gltf`, -2.3, 5.3, 0, 1.29, [.9, .9]),
    p(`${D}/column.gltf`, 2.3, 5.3, 0, 1.29, [.9, .9]),
  ],

  // ROOM 14 · Knochenhof — Vier niedrige Ruinenquadranten und ein offenes Kreuz ohne leere Fußballfläche
  14: [
    ...wallSpan(-5.5, -4.8, 4, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(-7, -3.3, 3, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(5.5, -4.8, 4, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(7, -3.3, 3, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(-5.5, 4.2, 4, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(-7, 2.8, 3, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(5.5, 4.2, 4, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(7, 2.8, 3, Math.PI / 2, `${D}/wall_broken.gltf`),
    p(`${D}/rubble_large.gltf`, -2, -1.8, 0.349, 1.07, [2.0, 1.4]),
    p(`${D}/rubble_large.gltf`, 2, 1.8, -0.349, 1.07, [2.0, 1.4]),
    p(`${H}/grave_A_destroyed.gltf`, -5.2, -3.1, 0, 1.15, [1.3, 1.8]),
    p(`${H}/skull.gltf`, -4.65, -2.75, 0, 1.25),
    p(`${H}/bone_A.gltf`, -5.75, -3.35, .4, 1.25),
    p(`${H}/grave_A_destroyed.gltf`, 5.2, -3.1, .18, 1.15, [1.3, 1.8]),
    p(`${H}/skull.gltf`, 5.75, -2.75, 0, 1.25),
    p(`${H}/bone_A.gltf`, 4.65, -3.35, .4, 1.25),
    p(`${H}/grave_A_destroyed.gltf`, -5.2, 2.8, -.18, 1.15, [1.3, 1.8]),
    p(`${H}/skull.gltf`, -4.65, 3.15, 0, 1.25),
    p(`${H}/bone_A.gltf`, -5.75, 2.55, .4, 1.25),
    p(`${H}/grave_A_destroyed.gltf`, 5.2, 2.8, 0, 1.15, [1.3, 1.8]),
    p(`${H}/skull.gltf`, 5.75, 3.15, 0, 1.25),
    p(`${H}/bone_A.gltf`, 4.65, 2.55, .4, 1.25),
  ],

  // ROOM 15 · Ritualarena — Dominanter Ritualkern, drei radiale Kampfsegmente und starke Außenanker
  15: [
    ...barrierSpan(-5.5, 1.8, 2.6, 0.436),
    ...barrierSpan(5.5, 1.8, 2.6, -0.436),
    ...wallSpan(-6.15, -2.7, 3.61, -0.727, `${D}/wall_broken.gltf`),
    ...wallSpan(6.15, -2.7, 3.61, 0.727, `${D}/wall_broken.gltf`),
    ...wallSpan(-2.5, 5.95, 2.82, 0.4, `${D}/wall_broken.gltf`),
    ...wallSpan(2.5, 5.95, 2.82, -0.4, `${D}/wall_broken.gltf`),
    p(`${H}/shrine_candles.gltf`, 0, 0, 0, 1.95, [1.6, 1.6]),
    p(`${H}/candle_triple.gltf`, -2.1, 0, 0, 1.3),
    p(`${H}/candle_triple.gltf`, 2.1, 0, 0, 1.3),
    p(`${D}/barrier_column.gltf`, -6.2, -4.7, 0, 1.28, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 6.2, -4.7, 0, 1.28, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 0, 5.8, 0, 1.28, [1.0, 1.0]),
  ],

  // ROOM 16 · Warden-Passage — Monumentale Seitenwände, alternierende Zähne und vier Wächternischen
  16: [
    ...wallSpan(-7.3, -4.8, 8.4, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(7.3, -4.8, 8.4, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(-7.3, 4.8, 6, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(7.3, 4.8, 6, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...barrierSpan(-4.6, -4.9, 3.7, 0),
    ...barrierSpan(4.6, -2.3, 3.7, 0),
    ...barrierSpan(-4.6, .4, 3.7, 0),
    ...barrierSpan(4.6, 3.1, 3.7, 0),
    p(`${D}/barrier_column.gltf`, -5.8, -6.2, 0, 1.22, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 5.8, -3.6, 0, 1.22, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, -5.8, -.9, 0, 1.22, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 5.8, 1.8, 0, 1.22, [1.0, 1.0]),
    p(`${D}/wall_arched.gltf`, 0, -7.5, 0, 1.08, [3.2, .8]),
  ],

  // ROOM 17 · Eingestürztes Gewölbe — Drei große Trümmermassen, sichtbarer Bruch und drei verbundene Kampfbereiche
  17: [
    p(`${D}/pillar.gltf`, 5.9, 4.9, 0, 1.22, [.9, .9]),
    ...wallSpan(4.8, 6, 5, -0.175, `${D}/wall_cracked.gltf`),
    ...wallSpan(-5.2, -6.1, 5.6, 0, `${D}/wall_cracked.gltf`),
    ...wallSpan(5.4, -5.2, 5.2, 0, `${D}/wall_cracked.gltf`),
    ...wallSpan(-5, 5.6, 6, 0, `${D}/wall_cracked.gltf`),
    p(`${H}/candle_melted.gltf`, -1, -7, 1.366, 1.18),
    p(`${H}/bone_A.gltf`, -.55, -4.83, 1.366, 1.18),
    p(`${H}/candle_melted.gltf`, -.1, -2.67, 1.366, 1.18),
    p(`${H}/bone_A.gltf`, .35, -.5, 1.366, 1.18),
    p(`${H}/candle_melted.gltf`, .8, 1.67, 1.366, 1.18),
    p(`${H}/bone_A.gltf`, 1.25, 3.83, 1.366, 1.18),
    p(`${H}/candle_melted.gltf`, 1.7, 6, 1.366, 1.18),
    p(`${H}/shrine_candles.gltf`, .35, -.5, 1.366, 1.35),
    p(`${D}/rubble_large.gltf`, -5.8, -4.8, -.18, 1.25, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, -4.9, -4.2, -.2, 1.08, [1.5, 1.0]),
    p(`${D}/rubble_large.gltf`, 5.6, -2.2, 0, 1.25, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, 6.5, -1.6, -.2, 1.08, [1.5, 1.0]),
    p(`${D}/rubble_large.gltf`, -4.8, 3.8, .18, 1.25, [2.0, 1.4]),
    p(`${D}/rubble_half.gltf`, -3.9, 4.4, -.2, 1.08, [1.5, 1.0]),
  ],

  // ROOM 18 · Veil-Riss — Asymmetrischer Mauerring um den Schleierbruch, Außenloop und zwei Innenquerungen
  18: [
    ...barrierSpan(-3.3, 0, 2.5, 0),
    ...barrierSpan(3.4, .4, 2.5, 0),
    p(`${H}/candle_melted.gltf`, -1.2, -4.7, 1.341, 1.18),
    p(`${H}/bone_A.gltf`, -.65, -2.35, 1.341, 1.18),
    p(`${H}/candle_melted.gltf`, -.1, 0, 1.341, 1.18),
    p(`${H}/bone_A.gltf`, .45, 2.35, 1.341, 1.18),
    p(`${H}/candle_melted.gltf`, 1, 4.7, 1.341, 1.18),
    p(`${H}/shrine_candles.gltf`, -.1, 0, 1.341, 1.35),
    ...wallSpan(-5.75, -3.8, 4.18, -0.735, `${D}/wall_cracked.gltf`),
    ...wallSpan(5.35, -4.1, 4.2, 0.667, `${D}/wall_cracked.gltf`),
    ...wallSpan(-5.55, 3.9, 4.18, 0.735, `${D}/wall_cracked.gltf`),
    ...wallSpan(5.65, 3.85, 4.11, -0.717, `${D}/wall_cracked.gltf`),
    p(`${D}/barrier_column.gltf`, -6, -4.8, 0, 1.28, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 5.8, -4.2, 0, 1.28, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, -5.2, 4.5, 0, 1.28, [1.0, 1.0]),
    p(`${D}/barrier_column.gltf`, 6.2, 4.8, 0, 1.28, [1.0, 1.0]),
  ],

  // ROOM 19 · Vorhalle Des Wächters — Monumentales Tor, zwei Torhausmassen und gestaffelte Elite-Linien
  19: [
    p(`${D}/wall_arched.gltf`, 0, -7.4, 0, 1.08, [3.2, .8]),
    p(`${D}/wall_broken.gltf`, -2, -7.4, 0, .85, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 2, -7.4, 0, .85, [3.3, .7]),
    ...wallSpan(-7.4, -5.2, 6, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(7.4, -5.2, 6, Math.PI / 2, `${D}/wall_broken.gltf`),
    ...wallSpan(-5.3, -2.3, 4.2, 0, `${D}/wall_broken.gltf`),
    ...wallSpan(5.3, -2.3, 4.2, 0, `${D}/wall_broken.gltf`),
    ...barrierSpan(-2.7, 1.4, 2.8, 0),
    ...barrierSpan(2.7, 3.4, 2.8, 0),
    p(`${D}/barrier_column.gltf`, 0, -4.5, 0, 1.22, [1.0, 1.0]),
    p(`${D}/sword_shield_gold.gltf`, 0, -5, 0, 1.2),
    p(`${D}/column.gltf`, -6.2, 2, 0, 1.3, [.9, .9]),
    p(`${D}/column.gltf`, 6.2, 2, 0, 1.3, [.9, .9]),
    p(`${D}/column.gltf`, -6.2, 5.4, 0, 1.3, [.9, .9]),
    p(`${D}/column.gltf`, 6.2, 5.4, 0, 1.3, [.9, .9]),
  ],

  // ROOM 20 · Kapitelboss-Arena — Offener Bosskern, dichter Arenarand, vier Phasenanker und freie Telegraphenfläche
  20: [
    p(`${D}/rubble_large.gltf`, -5.8, 0, 0, 1.11, [2.0, 1.4]),
    p(`${D}/rubble_large.gltf`, 5.8, 0, 0, 1.11, [2.0, 1.4]),
    p(`${D}/wall_arched.gltf`, 0, -7.6, 0, 1.08, [3.2, .8]),
    p(`${D}/wall_broken.gltf`, -1, -7.6, 0, .85, [3.3, .7]),
    p(`${D}/wall_broken.gltf`, 1, -7.6, 0, .85, [3.3, .7]),
    ...wallSpan(-6.9, -2.9, 2.51, -1.071, `${D}/wall_cracked.gltf`),
    ...wallSpan(-6.9, 2.9, 2.51, 1.071, `${D}/wall_cracked.gltf`),
    ...wallSpan(6.9, -2.9, 2.51, -2.07, `${D}/wall_cracked.gltf`),
    ...wallSpan(6.9, 2.9, 2.51, 2.07, `${D}/wall_cracked.gltf`),
    p(`${D}/barrier_column.gltf`, -6.2, -5, 0, 1.28, [1.0, 1.0]),
    p(`${D}/sword_shield_gold.gltf`, -6.2, -5.55, 0, 1.32),
    p(`${H}/candle_triple.gltf`, -5.55, -4.65, 0, 1.22),
    p(`${D}/barrier_column.gltf`, 6.2, -5, 0, 1.28, [1.0, 1.0]),
    p(`${D}/sword_shield_gold.gltf`, 6.2, -5.55, 0, 1.32),
    p(`${H}/candle_triple.gltf`, 6.85, -4.65, 0, 1.22),
    p(`${D}/barrier_column.gltf`, -6.2, 4.8, 0, 1.28, [1.0, 1.0]),
    p(`${D}/sword_shield_gold.gltf`, -6.2, 4.25, 0, 1.32),
    p(`${H}/candle_triple.gltf`, -5.55, 5.15, 0, 1.22),
    p(`${D}/barrier_column.gltf`, 6.2, 4.8, 0, 1.28, [1.0, 1.0]),
    p(`${D}/sword_shield_gold.gltf`, 6.2, 4.25, 0, 1.32),
    p(`${H}/candle_triple.gltf`, 6.85, 5.15, 0, 1.22),
  ],

};

export function runtimeRoomSetpieces(room: number): RoomSetpiece[] {
  const key = Math.max(1, Math.min(20, room));
  return CANVA_V3_ROOMS[key] ?? legacyRoomSetpieces(key);
}
