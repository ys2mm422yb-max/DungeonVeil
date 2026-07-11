import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'artifacts/dungeon-rpg/src';
const files = {
  engine: `${ROOT}/game/runEngine.ts`,
  collision: `${ROOT}/game/roomCollision3D.ts`,
  camera: `${ROOT}/components/RunCameraRig.ts`,
  canvas: `${ROOT}/components/GameCanvasKayKit3D.tsx`,
  room3d: `${ROOT}/components/kaykitRoom3D.ts`,
  themes: `${ROOT}/components/kaykitRoomThemes3D.ts`,
  enemies: `${ROOT}/components/kaykitEnemy3D.ts`,
  rooms: `${ROOT}/game/logicalRoomSetpieces.ts`,
  hud: `${ROOT}/components/HUD.tsx`,
  stage: `${ROOT}/components/CombatStage.tsx`,
};

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content);
}

function replaceExact(content, before, after, label) {
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: erwartete genau 1 Fundstelle, gefunden ${count}`);
  return content.replace(before, after);
}

function replaceRegex(content, regex, replacement, label) {
  const matches = content.match(regex);
  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: erwartete genau 1 Fundstelle, gefunden ${matches?.length ?? 0}`);
  }
  return content.replace(regex, replacement);
}

const roomBlock = String.raw`const ROOM_OVERRIDES: Partial<Record<number, LogicalRoomSetpiece[]>> = {
  // 1 — Versorgungsposten: markierter Lieferplatz, zwei Warenbuchten, freie Mittelachse.
  1: [
    p(\`${F}/shelf_B_large_decorated.gltf\`, -8.1, -4.8, Math.PI / 2, 1.04, [1.0, 2.0]),
    p(\`${D}/shelf_large.gltf\`, 8.1, -4.8, -Math.PI / 2, 1.04, [1.0, 2.0]),
    p(\`${R}/Pallet_Wood_Covered_A.gltf\`, 0, -1.7, 0, 1.12, [1.55, 0.95]),
    p(\`${D}/box_stacked.gltf\`, -5.7, -1.0, 0.08, 1.0, [1.15, 0.9]),
    p(\`${D}/trunk_medium_A.gltf\`, 5.7, -1.0, -0.08, 1.02, [1.25, 0.85]),
    p(\`${D}/barrel_small_stack.gltf\`, -6.7, 3.4, 0.06, 1.0, [1.15, 0.9]),
    p(\`${D}/barrel_large_decorated.gltf\`, 6.7, 3.4, -0.06, 1.0, [1.0, 1.0]),
    p(\`${D}/torch_lit.gltf\`, -3.0, -4.4, 0, 1.18),
    p(\`${D}/torch_lit.gltf\`, 3.0, -4.4, 0, 1.18),
  ],

  // 2 — Wachstube: Kommandotisch als Fokus, Waffen- und Truhenzonen an den Flanken.
  2: [
    p(\`${D}/table_long_decorated_A.gltf\`, 0, -1.9, 0, 1.08, [2.4, 1.0]),
    p(\`${D}/chair.gltf\`, -1.55, -0.45, 0.12, 1.0),
    p(\`${D}/chair.gltf\`, 1.55, -0.45, -0.12, 1.0),
    p(\`${T}/map.gltf\`, -0.5, -1.72, 0.08, 1.05, undefined, 0.82),
    p(\`${D}/candle_lit.gltf\`, 0.65, -1.7, 0, 0.82, undefined, 0.8),
    p(\`${D}/chest_gold.gltf\`, -6.5, 3.6, Math.PI / 2, 1.04, [1.3, 0.85]),
    p(\`${D}/trunk_medium_A.gltf\`, 6.5, 3.6, -Math.PI / 2, 1.04, [1.3, 0.85]),
    wallTop(\`${D}/banner_shield_red.gltf\`, -5.8, 1.08),
    wallTop(\`${D}/banner_patternC_red.gltf\`, 5.8, 1.08),
    wallSide(\`${D}/sword_shield_gold.gltf\`, -1, -1.4, 1.12),
    wallSide(\`${D}/sword_shield_gold.gltf\`, 1, -1.4, 1.12),
  ],

  // 3 — Säulenhalle: die Architektur bildet drei saubere Kampfspuren, Dekor nur an den Wänden.
  3: [
    wallTop(\`${D}/sword_shield_gold.gltf\`, 0, 1.22),
    wallTop(\`${D}/banner_patternB_blue.gltf\`, -6.2, 1.06),
    wallTop(\`${D}/banner_patternA_green.gltf\`, 6.2, 1.06),
    p(\`${D}/torch_lit.gltf\`, -3.0, -4.2, 0, 1.24),
    p(\`${D}/torch_lit.gltf\`, 3.0, -4.2, 0, 1.24),
    p(\`${D}/candle_lit.gltf\`, -8.1, 4.5, 0, 0.92),
    p(\`${D}/candle_lit.gltf\`, 8.1, 4.5, 0, 0.92),
  ],

  // 4 — Bergarbeiterlager: zentrale Erzsortierung, Werkzeug links, Material rechts.
  4: [
    p(\`${R}/Pallet_Wood.gltf\`, 0, -1.4, 0, 1.08, [1.55, 0.95]),
    p(\`${R}/Iron_Nuggets.gltf\`, -0.65, -1.25, 0.12, 1.18),
    p(\`${R}/Copper_Nuggets.gltf\`, 0.7, -1.15, -0.12, 1.18),
    p(\`${F}/table_low.gltf\`, -6.4, -4.0, Math.PI / 2, 0.96, [1.6, 0.9]),
    p(\`${T}/pickaxe.gltf\`, -6.0, -3.86, 0.25, 1.32),
    p(\`${T}/shovel.gltf\`, -6.9, -3.62, -0.22, 1.28),
    p(\`${R}/Iron_Bars_Stack_Large.gltf\`, 6.3, -3.8, -0.08, 1.08, [1.3, 0.8]),
    p(\`${R}/Copper_Bars_Stack_Medium.gltf\`, 6.5, 2.9, 0.1, 1.08, [1.2, 0.75]),
    p(\`${D}/box_large.gltf\`, -6.2, 3.0, 0.08, 1.0, [1.15, 0.95]),
    p(\`${T}/lantern.gltf\`, -2.8, -3.0, 0, 1.2),
    p(\`${T}/lantern.gltf\`, 2.8, -3.0, 0, 1.2),
  ],

  // 5 — Werkstatt: eine echte Arbeitsinsel, Amboss und Schleifstein bilden klare Seitenzonen.
  5: [
    p(\`${D}/table_long_decorated_C.gltf\`, 0, -1.5, 0, 1.0, [2.25, 1.0]),
    p(\`${T}/blueprint_stacked.gltf\`, -0.6, -1.34, 0.1, 1.12, undefined, 0.82),
    p(\`${T}/handdrill.gltf\`, 0.65, -1.2, -0.25, 1.16, undefined, 0.82),
    p(\`${T}/anvil.gltf\`, -6.1, -3.8, Math.PI / 2, 1.18, [1.2, 0.9]),
    p(\`${T}/grindstone.gltf\`, 6.1, -3.7, -Math.PI / 2, 1.3, [1.0, 1.1]),
    p(\`${D}/shelves.gltf\`, -8.3, 2.3, Math.PI / 2, 1.0, [1.0, 1.9]),
    p(\`${D}/shelf_small.gltf\`, 8.3, 2.3, -Math.PI / 2, 1.0, [1.0, 1.55]),
    p(\`${D}/box_stacked.gltf\`, -5.9, 3.4, 0.08, 0.98, [1.05, 0.9]),
    p(\`${D}/box_large.gltf\`, 5.9, 3.4, -0.08, 0.98, [1.1, 0.9]),
    p(\`${D}/torch_lit.gltf\`, -3.0, -4.3, 0, 1.22),
    p(\`${D}/torch_lit.gltf\`, 3.0, -4.3, 0, 1.22),
  ],

  // 6 — Schmiede: Referenzraum mit zentralem Amboss und vier lesbaren Arbeitsinseln.
  6: [
    p(\`${T}/anvil.gltf\`, 0, -1.0, 0, 1.52, [1.15, 0.9]),
    p(\`${T}/grindstone.gltf\`, 5.1, -4.4, 0.08, 1.42, [1, 1.15]),
    p(\`${R}/Iron_Bars_Stack_Large.gltf\`, -5.4, -4.2, -0.08, 1.08, [1.3, 0.8]),
    p(\`${R}/Copper_Bars_Stack_Medium.gltf\`, 5.4, 2.9, 0.1, 1.08, [1.2, 0.75]),
    p(\`${R}/Iron_Nuggets.gltf\`, -5.4, 2.9, -0.1, 1.08, [1, 0.85]),
    p(\`${D}/torch_lit.gltf\`, -2.8, -2.8, 0, 1.3),
    p(\`${D}/torch_lit.gltf\`, 2.8, -2.8, 0, 1.3),
    p(\`${D}/torch_lit.gltf\`, -2.8, 1.1, 0, 1.3),
    p(\`${D}/torch_lit.gltf\`, 2.8, 1.1, 0, 1.3),
  ],

  // 7 — Schlafquartier: Betten bleiben an den Außenwänden, die Gemeinschaftszone ist frei.
  7: [
    p(\`${F}/bed_single_A.gltf\`, -7.8, -4.7, Math.PI / 2, 1.02, [1.1, 2.15]),
    p(\`${F}/bed_single_B.gltf\`, 7.8, -4.7, -Math.PI / 2, 1.02, [1.1, 2.15]),
    p(\`${F}/bed_single_B.gltf\`, -7.8, 2.5, Math.PI / 2, 1.02, [1.1, 2.15]),
    p(\`${F}/bed_single_A.gltf\`, 7.8, 2.5, -Math.PI / 2, 1.02, [1.1, 2.15]),
    p(\`${F}/table_low.gltf\`, 0, -1.2, 0, 0.9, [1.7, 0.95]),
    p(\`${T}/lantern.gltf\`, 0, -1.0, 0, 1.12, undefined, 0.82),
    p(\`${F}/cabinet_small_decorated.gltf\`, -4.8, -4.3, 0, 0.92, [0.9, 0.8]),
    p(\`${F}/cabinet_small_decorated.gltf\`, 4.8, -4.3, 0, 0.92, [0.9, 0.8]),
    p(\`${D}/trunk_medium_A.gltf\`, -5.5, 4.4, 0.08, 1.0, [1.3, 0.8]),
    p(\`${D}/trunk_medium_A.gltf\`, 5.5, 4.4, -0.08, 1.0, [1.3, 0.8]),
  ],

  // 8 — Materiallager: Hochregale und Rohstoffinseln statt leerer Archivkulisse.
  8: [
    p(\`${F}/shelf_B_large_decorated.gltf\`, -8.2, -4.8, Math.PI / 2, 1.04, [1.0, 2.0]),
    p(\`${D}/shelf_large.gltf\`, 8.2, -4.8, -Math.PI / 2, 1.04, [1.0, 2.0]),
    p(\`${R}/Iron_Bars_Stack_Large.gltf\`, 0, -1.7, 0, 1.16, [1.3, 0.82]),
    p(\`${R}/Pallet_Wood_Covered_A.gltf\`, -5.2, -1.2, 0.08, 1.06, [1.5, 0.92]),
    p(\`${R}/Pallet_Wood.gltf\`, 5.2, -1.2, -0.08, 1.06, [1.5, 0.92]),
    p(\`${R}/Stone_Bricks_Stack_Medium.gltf\`, -5.8, 3.4, 0.12, 1.08, [1.25, 0.85]),
    p(\`${R}/Copper_Bars_Stack_Medium.gltf\`, 5.8, 3.4, -0.12, 1.08, [1.2, 0.75]),
    p(\`${D}/box_stacked.gltf\`, -8.0, 2.4, 0.08, 0.98, [1.05, 0.9]),
    p(\`${D}/box_large.gltf\`, 8.0, 2.4, -0.08, 0.98, [1.1, 0.9]),
    p(\`${T}/lantern.gltf\`, -2.7, -3.2, 0, 1.18),
    p(\`${T}/lantern.gltf\`, 2.7, -3.2, 0, 1.18),
  ],

  // 9 — Ritualkammer: dominanter Schrein, symmetrischer Lichtkreis, freie Ringarena.
  9: [
    p(\`${H}/shrine_candles.gltf\`, 0, -1.2, 0, 1.78, [1.5, 1.5]),
    p(\`${A}/spellbook_open.gltf\`, 0, -1.15, 0, 0.86, undefined, 1.02),
    p(\`${H}/candle_triple.gltf\`, -3.1, -3.8, 0, 1.18),
    p(\`${H}/candle_triple.gltf\`, 3.1, -3.8, 0, 1.18),
    p(\`${H}/candle_triple.gltf\`, -3.1, 1.8, 0, 1.18),
    p(\`${H}/candle_triple.gltf\`, 3.1, 1.8, 0, 1.18),
    p(\`${H}/skull.gltf\`, -6.6, 3.8, 0.1, 1.15),
    p(\`${H}/bone_A.gltf\`, 6.6, 3.8, -0.1, 1.15),
    wallTop(\`${D}/banner_patternB_blue.gltf\`, -5.8, 1.04),
    wallTop(\`${D}/banner_patternA_green.gltf\`, 5.8, 1.04),
  ],

  // 10 — Grabwächterhalle: offene Bossarena; Sarkophag und Gräber liegen nur am Rand.
  10: [
    p(\`${H}/coffin.gltf\`, -7.2, -0.4, Math.PI / 2, 1.0, [1.1, 1.9]),
    p(\`${H}/coffin.gltf\`, 7.2, -0.4, -Math.PI / 2, 1.0, [1.1, 1.9]),
    p(\`${H}/grave_A.gltf\`, -7.2, -4.1, 0.08, 0.98, [1.2, 1.55]),
    p(\`${H}/grave_B.gltf\`, 7.2, -4.1, -0.08, 0.98, [1.2, 1.55]),
    p(\`${H}/grave_A_destroyed.gltf\`, -7.3, 4.2, 0.14, 0.94, [1.15, 1.45]),
    p(\`${H}/grave_A_destroyed.gltf\`, 7.3, 4.2, -0.14, 0.94, [1.15, 1.45]),
    p(\`${H}/candle_triple.gltf\`, -3.0, -4.8, 0, 1.12),
    p(\`${H}/candle_triple.gltf\`, 3.0, -4.8, 0, 1.12),
    wallTop(\`${D}/sword_shield_gold.gltf\`, 0, 1.18),
  ],

  // 11 — Kreuzgang: kleiner Schrein, vier ruhige Eckstationen, freie Kreuzachse.
  11: [
    p(\`${H}/shrine_candles.gltf\`, 0, -1.4, 0, 1.48, [1.35, 1.35]),
    p(\`${D}/column.gltf\`, -5.8, -4.3, 0, 1.12, [0.85, 0.85]),
    p(\`${D}/column.gltf\`, 5.8, -4.3, 0, 1.12, [0.85, 0.85]),
    p(\`${D}/column.gltf\`, -5.8, 4.2, 0, 1.12, [0.85, 0.85]),
    p(\`${D}/column.gltf\`, 5.8, 4.2, 0, 1.12, [0.85, 0.85]),
    p(\`${H}/candle_triple.gltf\`, -2.5, -3.4, 0, 1.1),
    p(\`${H}/candle_triple.gltf\`, 2.5, -3.4, 0, 1.1),
    p(\`${D}/chest_gold.gltf\`, 0, 4.4, Math.PI, 1.02, [1.3, 0.85]),
  ],

  // 12 — Galerie: monumentale Schaustücke an den Wänden, klare zentrale Promenade.
  12: [
    p(\`${D}/pillar.gltf\`, -5.8, -4.4, 0, 1.22, [0.9, 0.9]),
    p(\`${D}/pillar.gltf\`, 5.8, -4.4, 0, 1.22, [0.9, 0.9]),
    p(\`${D}/pillar.gltf\`, -5.8, 4.2, 0, 1.18, [0.9, 0.9]),
    p(\`${D}/pillar.gltf\`, 5.8, 4.2, 0, 1.18, [0.9, 0.9]),
    p(\`${D}/chest_gold.gltf\`, 0, -1.8, 0, 1.08, [1.3, 0.85]),
    wallTop(\`${D}/sword_shield_gold.gltf\`, 0, 1.28),
    wallSide(\`${D}/banner_patternB_blue.gltf\`, -1, -1.4, 1.12),
    wallSide(\`${D}/banner_patternA_green.gltf\`, 1, -1.4, 1.12),
    p(\`${H}/candle_triple.gltf\`, -2.5, -1.8, 0, 1.08),
    p(\`${H}/candle_triple.gltf\`, 2.5, -1.8, 0, 1.08),
  ],

  // 13 — Gefängnisring: vier vergitterte Nischen und ein eindeutiger Schlüsselaltar.
  13: [
    p(\`${D}/wall_corner_gated.gltf\`, -8.0, -4.2, Math.PI / 2, 0.86, [1.8, 1.8]),
    p(\`${D}/wall_corner_gated.gltf\`, 8.0, -4.2, -Math.PI / 2, 0.86, [1.8, 1.8]),
    p(\`${D}/wall_corner_gated.gltf\`, -8.0, 3.7, Math.PI / 2, 0.86, [1.8, 1.8]),
    p(\`${D}/wall_corner_gated.gltf\`, 8.0, 3.7, -Math.PI / 2, 0.86, [1.8, 1.8]),
    p(\`${D}/chest_gold.gltf\`, 0, -1.5, 0, 1.08, [1.3, 0.85]),
    p(\`${D}/key.gltf\`, 0, -1.42, Math.PI / 2, 1.15, undefined, 1.0),
    p(\`${D}/torch_lit.gltf\`, -2.5, -2.8, 0, 1.18),
    p(\`${D}/torch_lit.gltf\`, 2.5, -2.8, 0, 1.18),
  ],

  // 14 — Knochenhof: Schrein als Fokus, Knochen- und Grabinseln nur an den Rändern.
  14: [
    p(\`${H}/shrine_candles.gltf\`, 0, -1.8, 0, 1.48, [1.35, 1.35]),
    p(\`${H}/grave_A_destroyed.gltf\`, -7.0, -4.2, 0.14, 1.02, [1.25, 1.6]),
    p(\`${H}/grave_A_destroyed.gltf\`, 7.0, -4.2, -0.14, 1.02, [1.25, 1.6]),
    p(\`${H}/grave_A.gltf\`, -7.0, 4.2, 0.08, 1.0, [1.25, 1.6]),
    p(\`${H}/grave_B.gltf\`, 7.0, 4.2, -0.08, 1.0, [1.25, 1.6]),
    p(\`${H}/skull.gltf\`, -5.0, -0.2, 0.1, 1.18),
    p(\`${H}/bone_A.gltf\`, -5.8, 1.4, 0.4, 1.15),
    p(\`${H}/skull.gltf\`, 5.0, -0.2, -0.1, 1.18),
    p(\`${H}/bone_A.gltf\`, 5.8, 1.4, -0.4, 1.15),
  ],

  // 15 — Ritualarena: großer Buchaltar und vier Pfeiler definieren den Kampfkreis.
  15: [
    p(\`${H}/shrine_candles.gltf\`, 0, -1.2, 0, 1.86, [1.6, 1.6]),
    p(\`${A}/spellbook_open.gltf\`, 0, -1.15, 0, 0.9, undefined, 1.05),
    p(\`${D}/barrier_column.gltf\`, -6.0, -4.8, 0, 1.18, [0.95, 0.95]),
    p(\`${D}/barrier_column.gltf\`, 6.0, -4.8, 0, 1.18, [0.95, 0.95]),
    p(\`${D}/barrier_column.gltf\`, -6.0, 4.8, 0, 1.18, [0.95, 0.95]),
    p(\`${D}/barrier_column.gltf\`, 6.0, 4.8, 0, 1.18, [0.95, 0.95]),
    p(\`${H}/candle_triple.gltf\`, -3.0, -3.7, 0, 1.15),
    p(\`${H}/candle_triple.gltf\`, 3.0, -3.7, 0, 1.15),
    p(\`${H}/candle_triple.gltf\`, -3.0, 1.4, 0, 1.15),
    p(\`${H}/candle_triple.gltf\`, 3.0, 1.4, 0, 1.15),
  ],

  // 16 — Wächterpassage: schwere Embleme, Truhen und eine freie monumentale Achse.
  16: [
    p(\`${D}/chest_gold.gltf\`, 0, -1.8, Math.PI, 1.1, [1.3, 0.85]),
    p(\`${D}/pillar.gltf\`, -5.8, -4.5, 0, 1.25, [0.9, 0.9]),
    p(\`${D}/pillar.gltf\`, 5.8, -4.5, 0, 1.25, [0.9, 0.9]),
    p(\`${D}/pillar.gltf\`, -5.8, 4.3, 0, 1.2, [0.9, 0.9]),
    p(\`${D}/pillar.gltf\`, 5.8, 4.3, 0, 1.2, [0.9, 0.9]),
    wallTop(\`${D}/sword_shield_gold.gltf\`, -5.8, 1.26),
    wallTop(\`${D}/sword_shield_gold.gltf\`, 5.8, 1.26),
    wallSide(\`${D}/banner_shield_red.gltf\`, -1, -1.3, 1.14),
    wallSide(\`${D}/banner_shield_red.gltf\`, 1, -1.3, 1.14),
    p(\`${D}/box_stacked.gltf\`, -7.4, 2.3, 0.08, 1.0, [1.1, 0.9]),
    p(\`${D}/box_stacked.gltf\`, 7.4, 2.3, -0.08, 1.0, [1.1, 0.9]),
  ],

  // 17 — Eingestürztes Gewölbe: zwei massive Bruchzonen, dazwischen bleibt eine klare S-Route.
  17: [
    p(\`${D}/rubble_large.gltf\`, -7.2, -4.7, 0.22, 0.9, [1.7, 1.2]),
    p(\`${D}/rubble_half.gltf\`, -6.0, 1.8, -0.14, 0.72, [1.2, 0.8]),
    p(\`${D}/rubble_large.gltf\`, 7.2, 4.5, -0.22, 0.9, [1.7, 1.2]),
    p(\`${D}/rubble_half.gltf\`, 6.0, -1.8, 0.14, 0.72, [1.2, 0.8]),
    p(\`${D}/chest.gltf\`, 0, -2.8, 0, 1.02, [1.3, 0.85]),
    p(\`${H}/candle_melted.gltf\`, -3.0, -1.0, 0.35, 1.12),
    p(\`${H}/candle_melted.gltf\`, 3.0, 1.0, -0.35, 1.12),
  ],

  // 18 — Schleier-Riss: der zentrale Riss bleibt frei, Stein- und Kristallrahmen sitzen außen.
  18: [
    p(\`${R}/Stone_Chunks_Large.gltf\`, -6.4, -4.5, 0.18, 1.04, [1.3, 0.95]),
    p(\`${R}/Stone_Bricks_Stack_Medium.gltf\`, 6.4, -4.5, -0.18, 1.04, [1.25, 0.85]),
    p(\`${R}/Stone_Chunks_Large.gltf\`, -6.4, 4.4, -0.18, 1.04, [1.3, 0.95]),
    p(\`${R}/Stone_Bricks_Stack_Medium.gltf\`, 6.4, 4.4, 0.18, 1.04, [1.25, 0.85]),
    p(\`${D}/column.gltf\`, -7.2, 0, 0, 1.14, [0.85, 0.85]),
    p(\`${D}/column.gltf\`, 7.2, 0, 0, 1.14, [0.85, 0.85]),
    p(\`${H}/candle_triple.gltf\`, -3.0, -3.2, 0, 1.14),
    p(\`${H}/candle_triple.gltf\`, 3.0, -3.2, 0, 1.14),
  ],

  // 19 — Wächtervorhalle: monumentale Rückwand, klarer Vorplatz und freie Bosszufahrt.
  19: [
    p(\`${D}/chest_gold.gltf\`, 0, -3.4, Math.PI, 1.12, [1.3, 0.85]),
    p(\`${D}/pillar.gltf\`, -6.0, -4.8, 0, 1.34, [0.95, 0.95]),
    p(\`${D}/pillar.gltf\`, 6.0, -4.8, 0, 1.34, [0.95, 0.95]),
    p(\`${D}/column.gltf\`, -5.0, 4.5, 0, 1.22, [0.9, 0.9]),
    p(\`${D}/column.gltf\`, 5.0, 4.5, 0, 1.22, [0.9, 0.9]),
    wallTop(\`${D}/sword_shield_gold.gltf\`, -5.8, 1.3),
    wallTop(\`${D}/sword_shield_gold.gltf\`, 5.8, 1.3),
    wallSide(\`${D}/banner_shield_red.gltf\`, -1, -0.8, 1.22),
    wallSide(\`${D}/banner_shield_red.gltf\`, 1, -0.8, 1.22),
  ],

  // 20 — Bossheiligtum: maximal offene Arena, Altar nur an der Rückkante, vier Eckpfeiler.
  20: [
    p(\`${D}/barrier_column.gltf\`, -6.5, -5.0, 0, 1.38, [1.0, 1.0]),
    p(\`${D}/barrier_column.gltf\`, 6.5, -5.0, 0, 1.38, [1.0, 1.0]),
    p(\`${D}/barrier_column.gltf\`, -6.5, 5.0, 0, 1.38, [1.0, 1.0]),
    p(\`${D}/barrier_column.gltf\`, 6.5, 5.0, 0, 1.38, [1.0, 1.0]),
    p(\`${H}/shrine_candles.gltf\`, 0, -5.2, 0, 1.52, [1.42, 1.42]),
    p(\`${D}/torch_lit.gltf\`, -3.2, -4.0, 0, 1.28),
    p(\`${D}/torch_lit.gltf\`, 3.2, -4.0, 0, 1.28),
    wallSide(\`${D}/banner_shield_red.gltf\`, -1, 0, 1.22),
    wallSide(\`${D}/banner_shield_red.gltf\`, 1, 0, 1.22),
  ],
};`;

let rooms = read(files.rooms);
const roomStart = rooms.indexOf('const ROOM_OVERRIDES:');
const roomEnd = rooms.indexOf('\n\nfunction genericWallAnchor', roomStart);
if (roomStart < 0 || roomEnd < 0) throw new Error('ROOM_OVERRIDES-Block nicht eindeutig gefunden');
rooms = rooms.slice(0, roomStart) + roomBlock + rooms.slice(roomEnd);
write(files.rooms, rooms);

let themes = read(files.themes);
themes = replaceExact(
  themes,
  `async function prototypeForPiece(piece: LogicalRoomSetpiece) {
  try {
    return await prototypeFor(piece.model);
  } catch (primaryError) {
    if (!piece.fallbackModel || piece.fallbackModel === piece.model) throw primaryError;
    return prototypeFor(piece.fallbackModel);
  }
}`,
  `async function prototypeForPiece(piece: LogicalRoomSetpiece) {
  const prefersNativeFallback = piece.model.startsWith('/assets/imported/fantasy-props/') && Boolean(piece.fallbackModel);
  const primary = prefersNativeFallback ? piece.fallbackModel! : piece.model;
  const secondary = prefersNativeFallback ? piece.model : piece.fallbackModel;
  try {
    return await prototypeFor(primary);
  } catch (primaryError) {
    if (!secondary || secondary === primary) throw primaryError;
    return prototypeFor(secondary);
  }
}`,
  'Raum-Asset-Fallback',
);
themes = replaceExact(
  themes,
  `    depthWrite: false,
    blending: THREE.AdditiveBlending,`,
  `    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,`,
  'Additive Raum-Materialien',
);
write(files.themes, themes);

let collision = read(files.collision);
collision = replaceExact(
  collision,
  `    case 'diagonal':
      add(-7.2, -4.9, 1.3, 0.95); add(6.9, 4.7, 1.0, 0.75);
      break;
    case 'zigzag':
    case 's-curve':
    case 's-lane':
      add(-7.2, 5.4, 0.95, 0.72); add(7.1, -5.2, 0.95, 0.72);
      break;`,
  `    case 'diagonal':
    case 'zigzag':
    case 's-curve':
    case 's-lane':
      // Diese Silhouetten werden ausschließlich durch die tatsächlich sichtbaren
      // Setpiece-Collider definiert. Unsichtbare Standard-Felsen würden Schüsse
      // und Bewegung blockieren, obwohl im Raum nichts zu sehen ist.
      break;`,
  'Unsichtbare Architektur-Collider',
);
write(files.collision, collision);

const cameraContent = `export const RUN_CAMERA = {
  fov: 50,
  height: 19.2,
  distance: 24.4,
  lookHeight: 0.66,
  followLerp: 0.1,
  minFollowX: -4.65,
  maxFollowX: 4.65,
  minFollowZ: -3.1,
  maxFollowZ: 5.65,
  clearMinFollowZ: -3.4,
  clearMaxFollowZ: 3.8,
  safeHalfX: 4.25,
  safeForwardZ: 4.4,
  safeRearZ: 5.8,
  playerCenterOffset: 0.4,
} as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Die Kamera folgt der Mitte der Spieler-Hitbox, bleibt aber innerhalb einer
 * festen Hochformat-Komposition. Nach Raumabschluss wird die Z-Bewegung enger,
 * damit der Gang zum Portal weder wie ein Zoom wirkt noch die Außenkulisse zeigt.
 */
export function updateRunCamera(
  camera: any,
  cameraGoal: any,
  playerX: number,
  playerZ: number,
  roomClearReady = false,
) {
  const centeredPlayerX = playerX + RUN_CAMERA.playerCenterOffset;
  const centeredPlayerZ = playerZ + RUN_CAMERA.playerCenterOffset;
  const minZ = roomClearReady ? RUN_CAMERA.clearMinFollowZ : RUN_CAMERA.minFollowZ;
  const maxZ = roomClearReady ? RUN_CAMERA.clearMaxFollowZ : RUN_CAMERA.maxFollowZ;

  let focusX = clamp(centeredPlayerX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  let focusZ = clamp(centeredPlayerZ - 0.7, minZ, maxZ);

  const offsetX = centeredPlayerX - focusX;
  if (offsetX > RUN_CAMERA.safeHalfX) focusX += offsetX - RUN_CAMERA.safeHalfX;
  else if (offsetX < -RUN_CAMERA.safeHalfX) focusX += offsetX + RUN_CAMERA.safeHalfX;

  const offsetZ = centeredPlayerZ - focusZ;
  if (offsetZ > RUN_CAMERA.safeForwardZ) focusZ += offsetZ - RUN_CAMERA.safeForwardZ;
  else if (offsetZ < -RUN_CAMERA.safeRearZ) focusZ += offsetZ + RUN_CAMERA.safeRearZ;

  focusX = clamp(focusX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  focusZ = clamp(focusZ, minZ, maxZ);

  cameraGoal.set(focusX, RUN_CAMERA.height, focusZ + RUN_CAMERA.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(focusX, RUN_CAMERA.lookHeight, focusZ - 2.85);
}
`;
write(files.camera, cameraContent);

let canvas = read(files.canvas);
canvas = replaceExact(
  canvas,
  `      updateRunCamera(camera, cameraGoal, playerX, playerZ);`,
  `      camera.userData.dungeonPlayerX = playerX + RUN_CAMERA.playerCenterOffset;
      camera.userData.dungeonPlayerZ = playerZ + RUN_CAMERA.playerCenterOffset;
      updateRunCamera(camera, cameraGoal, playerX, playerZ, state.roomClearReady);`,
  'Kamera-Aufruf und Spielerposition',
);
write(files.canvas, canvas);

let room3d = read(files.room3d);
{
  const start = room3d.indexOf('function occlusionPressure(');
  const end = room3d.indexOf('\n\nfunction tagOccluder', start);
  if (start < 0 || end < 0) throw new Error('Lokale Wand-Ausblendung: Funktionsblock nicht gefunden');
  room3d = room3d.slice(0, start) + `function occlusionPressure(role: RoomOccluderRole, camera: any, worldX: number, worldZ: number) {
  if (role === 'back-wall') return 0;
  const playerX = Number(camera.userData?.dungeonPlayerX ?? camera.position.x);
  const playerZ = Number(camera.userData?.dungeonPlayerZ ?? camera.position.z - RUN_CAMERA.distance);

  if (role === 'front-wall') {
    const nearFront = clamp01((playerZ - 3.8) / 5.2);
    const localSegment = clamp01(1 - Math.abs(worldX - playerX) / 2.15);
    return nearFront * localSegment;
  }

  const sameSide = Math.sign(worldX || 1) === Math.sign(playerX || 1);
  if (!sameSide) return 0;
  const nearSide = clamp01((Math.abs(playerX) - 4.7) / 3.0);
  const localSegment = clamp01(1 - Math.abs(worldZ - playerZ) / 2.3);
  return nearSide * localSegment;
}` + room3d.slice(end);
}
room3d = replaceExact(
  room3d,
  `      const target = 1 - pressure * (role === 'front-wall' ? 0.84 : 0.78);`,
  `      const target = 1 - pressure * (role === 'front-wall' ? 0.98 : 0.94);`,
  'Wand-Zieltransparenz',
);
room3d = replaceExact(
  room3d,
  `        material.depthWrite = Boolean(material.userData?.roomBaseDepthWrite) && next > 0.56;`,
  `        material.depthWrite = Boolean(material.userData?.roomBaseDepthWrite) && next > 0.42;`,
  'Wand-Depthwrite',
);
room3d = replaceExact(
  room3d,
  `    case 'diagonal':
      addObject(root, loaded.rubble, -7.2, 0, -4.9, 0.28, 0.82);
      addObject(root, loaded.rubbleHalf, 6.9, 0, 4.7, -0.32, 0.78);
      break;
    case 'zigzag':
    case 's-curve':
    case 's-lane':
      if (loaded.rubbleHalf) {
        addObject(root, loaded.rubbleHalf, -7.2, 0, 5.4, 0.18, 0.68);
        addObject(root, loaded.rubbleHalf, 7.1, 0, -5.2, -0.18, 0.68);
      }
      break;`,
  `    case 'diagonal':
    case 'zigzag':
    case 's-curve':
    case 's-lane':
      // Keine automatisch wiederholten Felsen. Die sichtbare Raumidentität
      // wird ausschließlich durch die kuratierten Setpieces aufgebaut.
      break;`,
  'Automatische Felskulissen',
);
write(files.room3d, room3d);

let engine = read(files.engine);
engine = replaceExact(engine, `const NORMAL_DEATH_MS = 920;`, `const NORMAL_DEATH_MS = 680;`, 'Todesdauer');
engine = replaceExact(engine, `  slime: { hp: 24, attack: 4, defense: 0, speed: 42, size: 24, xp: 18, color: '#43c968' },`, `  slime: { hp: 24, attack: 4, defense: 0, speed: 42, size: 32, xp: 18, color: '#43c968' },`, 'Slime-Hitbox');
engine = replaceExact(engine, `  goblin: { hp: 34, attack: 6, defense: 1, speed: 68, size: 23, xp: 24, color: '#89a94b' },`, `  goblin: { hp: 34, attack: 6, defense: 1, speed: 68, size: 30, xp: 24, color: '#89a94b' },`, 'Ratten-Hitbox');
engine = replaceExact(engine, `  spider: { hp: 38, attack: 7, defense: 1, speed: 88, size: 22, xp: 28, color: '#342d42' },`, `  spider: { hp: 38, attack: 7, defense: 1, speed: 88, size: 38, xp: 28, color: '#342d42' },`, 'Spinnen-Hitbox');
engine = replaceExact(engine, `  vampire: { hp: 82, attack: 14, defense: 3, speed: 82, size: 28, xp: 48, color: '#9e304b' },`, `  vampire: { hp: 82, attack: 14, defense: 3, speed: 82, size: 34, xp: 48, color: '#9e304b' },`, 'Fledermaus-Hitbox');
engine = replaceExact(engine, `  demon: { hp: 128, attack: 18, defense: 4, speed: 76, size: 32, xp: 58, color: '#c53827' },`, `  demon: { hp: 128, attack: 18, defense: 4, speed: 76, size: 36, xp: 58, color: '#c53827' },`, 'Schlangen-Hitbox');
engine = replaceExact(engine, `  boss: { hp: 520, attack: 24, defense: 7, speed: 54, size: 44, xp: 180, color: '#ff493a' },`, `  boss: { hp: 520, attack: 24, defense: 7, speed: 54, size: 74, xp: 180, color: '#ff493a' },`, 'Boss-Hitbox');
engine = replaceExact(engine, `    const roomScale = 1 + (room - 1) * 0.07;`, `    const roomScale = 1 + (room - 1) * 0.055;`, 'Raum-Skalierung');
engine = replaceExact(
  engine,
  `    const base = ENEMY_STATS[type];
    return {`,
  `    const base = ENEMY_STATS[type];
    const attackScale = 1 + Math.max(0, scale - 1) * 0.62;
    return {`,
  'Angriffsskalierung vorbereiten',
);
engine = replaceExact(
  engine,
  `      hp: Math.round(base.hp * scale), maxHp: Math.round(base.hp * scale), attack: Math.round(base.attack * scale), defense: base.defense,`,
  `      hp: Math.round(base.hp * scale), maxHp: Math.round(base.hp * scale), attack: Math.round(base.attack * attackScale), defense: base.defense,`,
  'Angriffsskalierung anwenden',
);
engine = replaceExact(engine, `    enemy.flashUntil = time + 140;`, `    enemy.flashUntil = time + 80;`, 'Trefferflash-Dauer');
engine = replaceExact(
  engine,
  `  private visibleEnemiesFrom(x: number, y: number, excluded = new Set<string>()) {`,
  `  private shotPathBlocked(fromX: number, fromY: number, toX: number, toY: number, padding = 0.035) {
    if (shotBlockedByRoomProp(this.state.floor, this.state.map.width, this.state.map.height, fromX, fromY, toX, toY, padding)) return true;
    const length = Math.hypot(toX - fromX, toY - fromY);
    const steps = Math.max(2, Math.ceil(length / 7));
    for (let step = 1; step < steps; step++) {
      const progress = step / steps;
      const x = fromX + (toX - fromX) * progress;
      const y = fromY + (toY - fromY) * progress;
      if (!isWalkable(this.state.map, x, y)) return true;
    }
    return false;
  }

  private visibleEnemiesFrom(x: number, y: number, excluded = new Set<string>()) {`,
  'Segmentierte Projektilprüfung',
);
engine = replaceExact(
  engine,
  `        return !shotBlockedByRoomProp(this.state.floor, this.state.map.width, this.state.map.height, x, y, ex, ey);`,
  `        return !this.shotPathBlocked(x, y, ex, ey);`,
  'Sichtprüfung',
);
engine = replaceExact(
  engine,
  `      .filter(hit => !shotBlockedByRoomProp(this.state.floor, this.state.map.width, this.state.map.height, x, y, hit.enemy.x + hit.enemy.width / 2, hit.enemy.y + hit.enemy.height / 2))`,
  `      .filter(hit => !this.shotPathBlocked(x, y, hit.enemy.x + hit.enemy.width / 2, hit.enemy.y + hit.enemy.height / 2))`,
  'Strahlprüfung',
);
engine = replaceExact(
  engine,
  `      const element = this.state.floor === 20 ? 'arcane' as const : 'fire' as const;
      this.addShotEffect(\`boss-shot-\${time}-\${windup.index}\`, ex, ey, targetX, targetY, angle, color, element, 7);`,
  `      const element = this.state.floor === 20 ? 'arcane' as const : 'fire' as const;
      if (this.shotPathBlocked(ex, ey, targetX, targetY, 0.08)) return;
      this.addShotEffect(\`boss-shot-\${time}-\${windup.index}\`, ex, ey, targetX, targetY, angle, color, element, 7);`,
  'Bossgeschosse gegen Wände',
);
write(files.engine, engine);

let enemies = read(files.enemies);
enemies = replaceRegex(
  enemies,
  /const IMPORTED_CREATURES:[\s\S]*?\n\};/,
  `const IMPORTED_CREATURES: Partial<Record<EnemyType, { path: string; targetHeight: number; widthWeight: number; rotationY?: number }>> = {
  slime: { path: '/assets/imported/enemies/Slime.glb', targetHeight: 1.22, widthWeight: 0.55 },
  goblin: { path: '/assets/imported/enemies/Rat.glb', targetHeight: 1.08, widthWeight: 0.52 },
  spider: { path: '/assets/imported/enemies/Spider.glb', targetHeight: 1.16, widthWeight: 0.74 },
  vampire: { path: '/assets/imported/enemies/Bat.glb', targetHeight: 1.22, widthWeight: 0.48 },
  demon: { path: '/assets/imported/enemies/Snake_angry.glb', targetHeight: 1.12, widthWeight: 0.62 },
};`,
  'Monster-Proportionen',
);
enemies = replaceExact(enemies, `  targetHeight?: number;
  rotationY?: number;`, `  targetHeight?: number;
  widthWeight?: number;
  rotationY?: number;`, 'Prototype-Breitengewicht');
enemies = replaceExact(
  enemies,
  `        targetHeight: config.targetHeight,
        rotationY: config.rotationY ?? 0,`,
  `        targetHeight: config.targetHeight,
        widthWeight: config.widthWeight,
        rotationY: config.rotationY ?? 0,`,
  'Import-Breitengewicht',
);
enemies = replaceExact(
  enemies,
  `function importedScale(THREE: any, scene: any, targetHeight: number) {
  scene.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  const visualReference = Math.max(size.y, size.x * 0.38, size.z * 0.38, 0.001);
  return targetHeight / visualReference;
}`,
  `function centerSceneOnRoot(THREE: any, scene: any) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) return;
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x -= center.x;
  scene.position.z -= center.z;
  scene.position.y -= box.min.y;
  scene.updateMatrixWorld(true);
}

function importedScale(THREE: any, scene: any, targetHeight: number, widthWeight: number) {
  scene.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  const visualReference = Math.max(size.y, size.x * widthWeight, size.z * widthWeight, 0.001);
  return targetHeight / visualReference;
}`,
  'Monsterzentrierung und Skalierung',
);
enemies = replaceExact(
  enemies,
  `  scene.rotation.y = prototype.rotationY ?? 0;
  root.add(scene);
  prepareModel(scene);`,
  `  scene.rotation.y = prototype.rotationY ?? 0;
  prepareModel(scene);
  centerSceneOnRoot(THREE, scene);
  root.add(scene);

  const shadowRadius = enemy.enemyType === 'boss' ? 0.92 : enemy.enemyType === 'spider' ? 0.68 : enemy.enemyType === 'vampire' ? 0.52 : 0.48;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(shadowRadius, IS_MOBILE ? 18 : 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: enemy.enemyType === 'boss' ? 0.32 : 0.24, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);`,
  'Monsterursprung und Bodenschatten',
);
enemies = replaceExact(
  enemies,
  `  const importedBase = prototype.imported ? importedScale(THREE, scene, prototype.targetHeight ?? 0.7) : 1;`,
  `  const importedBase = prototype.imported ? importedScale(THREE, scene, prototype.targetHeight ?? 0.7, prototype.widthWeight ?? 0.55) : 1;`,
  'Importierte Skalierung verwenden',
);
enemies = replaceExact(enemies, `    * (enemy.isElite ? 1.22 : 1);`, `    * (enemy.isElite ? 1.16 : 1);`, 'Elite-Proportion');
enemies = replaceExact(
  enemies,
  `    const phaseSeconds = enemy.enemyType === 'boss' ? 1.65 : 0.92;`,
  `    const phaseSeconds = enemy.enemyType === 'boss' ? 1.65 : 0.68;`,
  'Todesanimation synchronisieren',
);
enemies = replaceExact(
  enemies,
  `        material.emissiveIntensity = Math.max(base.intensity, intensity);`,
  `        material.emissiveIntensity = intensity;`,
  'Tint-Intensität',
);
enemies = replaceExact(
  enemies,
  `  if (enemy.enemyType === 'boss') setMeshTint(visual.scene, null, 0);
  else if (burning) setMeshTint(visual.scene, 0xff3b16, 0.08);
  else if (frozen) setMeshTint(visual.scene, 0x46bfff, 0.07);
  else setMeshTint(visual.scene, null, 0);`,
  `  const hitFlash = Boolean(enemy.flashUntil && now < enemy.flashUntil);
  if (hitFlash) setMeshTint(visual.scene, 0xffd6bd, enemy.enemyType === 'boss' ? 0.035 : 0.065);
  else if (frozen) setMeshTint(visual.scene, 0x46bfff, 0.045);
  else setMeshTint(visual.scene, null, 0);`,
  'Dezentes Trefferfeedback',
);
write(files.enemies, enemies);

let hud = read(files.hud);
hud = replaceExact(
  hud,
  ` const enemyText=g.roomClearReady?'RAUM FREI':boss?'BOSSRAUM':hunt?\`JAGD · \${hunt.huntName??'GEZEICHNETE BEUTE'}\`:living>0?\`\${living} GEGNER\`:'RAUM WIRD FREIGEGEBEN';`,
  ` const visibleEnemyCount=living+pending;
 const enemyText=g.roomClearReady?'RAUM FREI':boss?'BOSSRAUM':hunt?\`JAGD · \${hunt.huntName??'GEZEICHNETE BEUTE'}\`:visibleEnemyCount>0?\`\${visibleEnemyCount} GEGNER\`:'RAUM WIRD FREIGEGEBEN';`,
  'Gegnerzähler-Synchronität',
);
write(files.hud, hud);

let stage = read(files.stage);
stage = replaceRegex(
  stage,
  /const ROOM_NAMES = \[[\s\S]*?\] as const;/,
  `const ROOM_NAMES = [
  'VERSORGUNGSPOSTEN', 'WACHSTUBE', 'SÄULENHALLE', 'BERGARBEITERLAGER', 'WERKSTATT',
  'SCHMIEDE', 'SCHLAFQUARTIER', 'MATERIALLAGER', 'RITUALKAMMER', 'GRABWÄCHTERHALLE',
  'KREUZGANG', 'GALERIE', 'GEFÄNGNISRING', 'KNOCHENHOF', 'RITUALARENA',
  'WÄCHTERPASSAGE', 'EINGESTÜRZTES GEWÖLBE', 'SCHLEIER-RISS', 'WÄCHTERVORHALLE', 'BOSSHEILIGTUM',
] as const;`,
  'Raumnamen 1 bis 20',
);
stage = replaceExact(
  stage,
  `  const [roomTitle, setRoomTitle] = useState(() => ROOM_NAMES[Math.max(0, Math.min(9, gameState.floor - 1))]);`,
  `  const [roomTitle, setRoomTitle] = useState(() => ROOM_NAMES[Math.max(0, Math.min(19, gameState.floor - 1))]);`,
  'Initialer Raumtitel',
);
stage = replaceExact(
  stage,
  `    setRoomTitle(ROOM_NAMES[Math.max(0, Math.min(9, gameState.floor - 1))]);`,
  `    setRoomTitle(ROOM_NAMES[Math.max(0, Math.min(19, gameState.floor - 1))]);`,
  'Raumtitel beim Wechsel',
);
stage = replaceExact(
  stage,
  `  useEffect(() => () => {
    if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current);
  }, []);`,
  `  useEffect(() => () => {
    if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current);
  }, []);

  useEffect(() => {
    const compactSynergyBanner = () => {
      const labels = Array.from(document.querySelectorAll<HTMLElement>('div,span'))
        .filter(node => node.childElementCount === 0 && node.textContent?.trim().includes('SYNERGIE ERWACHT'));
      labels.forEach(label => {
        let panel: HTMLElement | null = label.parentElement;
        for (let depth = 0; panel && depth < 4; depth++) {
          const rect = panel.getBoundingClientRect();
          if (rect.width >= 240 && rect.height <= 210) break;
          panel = panel.parentElement;
        }
        if (!panel || panel.dataset.dvCompactSynergy === '1') return;
        panel.dataset.dvCompactSynergy = '1';
        panel.style.setProperty('left', '50%', 'important');
        panel.style.setProperty('right', 'auto', 'important');
        panel.style.setProperty('top', 'max(5.4rem, calc(env(safe-area-inset-top) + 4.4rem))', 'important');
        panel.style.setProperty('bottom', 'auto', 'important');
        panel.style.setProperty('width', 'min(86vw, 390px)', 'important');
        panel.style.setProperty('max-width', '390px', 'important');
        panel.style.setProperty('min-height', '0', 'important');
        panel.style.setProperty('padding', '10px 14px', 'important');
        panel.style.setProperty('transform', 'translateX(-50%)', 'important');
        panel.style.setProperty('border-radius', '16px', 'important');
        panel.style.setProperty('z-index', '46', 'important');
        panel.querySelectorAll<HTMLElement>('div,p,span').forEach(child => {
          child.style.setProperty('line-height', '1.25', 'important');
          if (child !== label && child.textContent && child.textContent.length > 24) {
            child.style.setProperty('font-size', '12px', 'important');
          }
        });
        label.style.setProperty('font-size', '7px', 'important');
      });
    };
    compactSynergyBanner();
    const observer = new MutationObserver(compactSynergyBanner);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);`,
  'Kompaktes Synergie-Popup',
);
write(files.stage, stage);

const requiredChecks = [
  [files.rooms, '20: ['],
  [files.rooms, 'GRABWÄCHTERHALLE'],
  [files.engine, 'private shotPathBlocked'],
  [files.engine, 'size: 74'],
  [files.enemies, 'centerSceneOnRoot'],
  [files.camera, 'roomClearReady = false'],
  [files.stage, 'dvCompactSynergy'],
];

for (const [file, marker] of requiredChecks) {
  if (!read(file).includes(marker)) throw new Error(`Audit fehlgeschlagen: ${marker} fehlt in ${file}`);
}

function roomSection(roomNumber) {
  const start = roomText.indexOf(`  ${roomNumber}: [`);
  if (start < 0) throw new Error(`Raum ${roomNumber} fehlt`);
  const end = roomText.indexOf('\n  ],', start);
  if (end < 0) throw new Error(`Raum ${roomNumber} ist nicht abgeschlossen`);
  return roomText.slice(start, end);
}
const roomText = read(files.rooms);
for (const roomNumber of [3, 7, 8]) {
  if (/rubble_/i.test(roomSection(roomNumber))) throw new Error(`Raum-Audit: unerwünschte Felsen in Raum ${roomNumber}`);
}
if (/crypt\.gltf/i.test(roomSection(10))) throw new Error('Raum-Audit: Krypta blockiert Bossraum 10');

console.log('Master-Pass geschrieben und statisch geprüft.');
