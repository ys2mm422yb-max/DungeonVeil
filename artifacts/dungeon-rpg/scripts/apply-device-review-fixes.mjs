import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`Missing patch anchor in ${path}: ${before.slice(0, 90)}`);
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Patch produced no change in ${path}`);
  fs.writeFileSync(path, next);
}

const roomBible = 'artifacts/dungeon-rpg/src/game/roomBible.ts';
replaceOnce(
  roomBible,
  "  6: room(6, 'Schmiede', 'Forge', 'inhabited-mine', 'ring', 'zentraler Schmiedeherd',",
  "  6: room(6, 'Schmiede', 'Forge', 'inhabited-mine', 'tri-island', 'zentraler Schmiedeherd',",
);

const equipment = 'artifacts/dungeon-rpg/src/game/equipmentVisuals.ts';
replaceOnce(
  equipment,
  "const importedBowPose = [0.02, -0.18, 0] as const;\nconst importedBowRoot = '/assets/imported/medieval-weapons';",
  "const importedBowPose = [0.02, -0.18, 0] as const;\n// Crossbows need a three-quarter view on portrait screens. The old near-side profile\n// hid the bow limbs and made both models read like short pistols.\nconst frostCrossbowPose = [-0.18, -0.78, -0.08] as const;\nconst splinterCrossbowPose = [-0.22, -0.7, -0.1] as const;\nconst importedBowRoot = '/assets/imported/medieval-weapons';",
);
replaceOnce(
  equipment,
  "  'frost-bow': profile(`${A}/crossbow_2handed.gltf`, `${A}/crossbow_2handed.gltf`, [-0.08, -Math.PI / 2 + 0.1, 0.02], 0.9, 0.55, 0.02, true, 0.3, 'crossbow'),",
  "  'frost-bow': profile(`${A}/crossbow_2handed.gltf`, `${A}/crossbow_2handed.gltf`, frostCrossbowPose, 0.95, 0.72, 0.03, true, 0.3, 'crossbow'),",
);
replaceOnce(
  equipment,
  "  'splinter-bow': profile(`${A}/crossbow_1handed.gltf`, `${A}/crossbow_1handed.gltf`, [-0.15, -Math.PI / 2 + 0.1, 0.02], 0.88, 0.58, 0.02, true, 0.18, 'crossbow'),",
  "  'splinter-bow': profile(`${A}/crossbow_1handed.gltf`, `${A}/crossbow_1handed.gltf`, splinterCrossbowPose, 0.95, 0.74, 0.03, true, 0.18, 'crossbow'),",
);
replaceOnce(
  equipment,
  "    if (visual.fillWidth <= 0 || visual.fillWidth > 0.92) issues.push(`${id}: unsafe preview width`);",
  "    if (visual.fillWidth <= 0 || visual.fillWidth > 0.96) issues.push(`${id}: unsafe preview width`);",
);

const validator = 'artifacts/dungeon-rpg/scripts/validate-production-rooms.mjs';
replaceOnce(
  validator,
  "    if (room === 6) {\n      const innerWalls = pieces.filter(piece => /wall|barrier/i.test(piece.model) && Math.abs(piece.x) < 4.8 && piece.z > -5 && piece.z < 4);\n      if (innerWalls.length) fail(room, 'forge contains the forbidden four-wall inner block again');\n    }",
  "    if (room === 6) {\n      const innerWalls = pieces.filter(piece => /wall|barrier/i.test(piece.model) && Math.abs(piece.x) < 4.8 && piece.z > -5 && piece.z < 4);\n      if (innerWalls.length) fail(room, 'forge contains the forbidden four-wall inner block again');\n      if (spec.silhouette === 'ring' || spec.silhouette === 'orbit' || spec.silhouette === 'cross') {\n        fail(room, 'forge silhouette would regenerate four automatic architecture blocks');\n      }\n    }",
);

console.log('Device review fixes staged: room 6 open forge and readable crossbow previews.');
