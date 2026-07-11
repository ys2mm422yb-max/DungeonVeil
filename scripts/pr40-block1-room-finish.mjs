import fs from 'node:fs';

const ROOT = 'artifacts/dungeon-rpg/src';
const files = {
  room3d: `${ROOT}/components/kaykitRoom3D.ts`,
  bible: `${ROOT}/game/roomBible.ts`,
  engine: `${ROOT}/game/runEngine.ts`,
};

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOne(content, before, after, label) {
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: erwartete genau 1 Fundstelle, gefunden ${count}`);
  return content.replace(before, after);
}

let room3d = read(files.room3d);
room3d = replaceOne(
  room3d,
  "  if (spec.silhouette === 'diagonal' || spec.shell === 'abandoned' || spec.shell === 'veil') {",
  "  if (spec.silhouette === 'diagonal' || spec.shell === 'veil') {",
  'Unnoetige Fels-Assets in verlassenen Raeumen',
);
room3d = replaceOne(
  room3d,
  `  scale = 1,\n  occluderRole?: RoomOccluderRole,\n) {\n  if (!prototype) return null;\n  const object = prototype.clone(true);\n  object.position.set(x, y, z);\n  object.rotation.y = rotation;\n  object.scale.setScalar(scale);`,
  `  scale = 1,\n  occluderRole?: RoomOccluderRole,\n  verticalScale = scale,\n) {\n  if (!prototype) return null;\n  const object = prototype.clone(true);\n  object.position.set(x, y, z);\n  object.rotation.y = rotation;\n  object.scale.set(scale, verticalScale, scale);`,
  'Getrennte vertikale Architektur-Skalierung',
);
room3d = replaceOne(
  room3d,
  `    case 'three-lane':\n      for (const z of [-5.5, -0.8, 4.1]) {\n        addObject(root, column, -6.6, 0, z, 0, 1.16);\n        addObject(root, column, 6.6, 0, z, 0, 1.16);\n      }\n      break;`,
  `    case 'three-lane': {\n      const horizontalScale = spec.room === 3 ? 1.22 : 1.16;\n      const verticalScale = spec.room === 3 ? 2.75 : 1.16;\n      for (const z of [-5.5, -0.8, 4.1]) {\n        addObject(root, column, -6.6, 0, z, 0, horizontalScale, undefined, verticalScale);\n        addObject(root, column, 6.6, 0, z, 0, horizontalScale, undefined, verticalScale);\n      }\n      break;\n    }`,
  'Raum 3 deckenhohe Saeulen',
);
room3d = replaceOne(
  room3d,
  `    const floorStep = 4;\n    let tileIndex = 0;`,
  `    const floorStep = 4;\n    let tileIndex = 0;\n    const cleanFloorRoom = [7, 8, 9, 10].includes(spec.room);`,
  'Saubere Bodenraeume markieren',
);
room3d = replaceOne(
  room3d,
  `        const broken = spec.shell !== 'intact' && loaded.floorBroken && (tileIndex + room * 3) % (spec.shell === 'veil' ? 3 : 6) === 0;`,
  `        const broken = !cleanFloorRoom && spec.shell !== 'intact' && loaded.floorBroken && (tileIndex + room * 3) % (spec.shell === 'veil' ? 3 : 6) === 0;`,
  'Felsige Bodenkacheln aus Raeumen 7 bis 10 entfernen',
);
write(files.room3d, room3d);

let bible = read(files.bible);
bible = replaceOne(
  bible,
  "  9: room(9, 'Ritualkammer', 'Ritual Chamber', 'abandoned-quarters', 'ring', 'zentraler Runenkreis', ['halloween', 'resources'], ['candle', 'crystal', 'skull', 'cauldron', 'rune'], ['table', 'barrel', 'shelf', 'bed'], 3, 'abandoned', P(0, -1.0),",
  "  9: room(9, 'Ritualkammer', 'Ritual Chamber', 'abandoned-quarters', 'ring', 'zentraler Runenkreis', ['halloween', 'resources'], ['candle', 'crystal', 'skull', 'cauldron', 'rune'], ['table', 'barrel', 'shelf', 'bed'], 3, 'abandoned', P(0, -13.7),",
  'Portal und Ritualzentrum in Raum 9 trennen',
);
write(files.bible, bible);

let engine = read(files.engine);
engine = replaceOne(
  engine,
  "      this.state.effects.push({ id: `clear-wave-${time}`, x: this.state.player.x + 16, y: this.state.player.y + 16, radius: 0, maxRadius: 100, color: '#b693ff', lifeTime: 0, maxLifeTime: 520, type: 'circle', element: 'arcane' });",
  "      this.state.effects.push({ id: `clear-wave-${time}`, x: this.state.player.x + 16, y: this.state.player.y + 16, radius: 0, maxRadius: 64, color: '#b693ff', lifeTime: 0, maxLifeTime: 360, type: 'circle', element: 'arcane' });",
  'Raum-frei-Welle verkleinern',
);
write(files.engine, engine);

for (const [path, markers] of [
  [files.room3d, ['verticalScale = spec.room === 3 ? 2.75', 'cleanFloorRoom']],
  [files.bible, ["'Ritualkammer'", "P(0, -13.7)"]],
  [files.engine, ['maxRadius: 64', 'maxLifeTime: 360']],
]) {
  const content = read(path);
  for (const marker of markers) {
    if (!content.includes(marker)) throw new Error(`Audit fehlgeschlagen: ${marker} fehlt in ${path}`);
  }
}

console.log('Block 1 Raum-Finish geschrieben und statisch geprueft.');
