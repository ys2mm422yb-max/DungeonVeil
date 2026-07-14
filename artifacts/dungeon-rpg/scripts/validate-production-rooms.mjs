import path from 'node:path';
import { createServer } from 'vite';

const ROOT = process.cwd();
const errors = [];
const notes = [];

function fail(room, message) {
  errors.push(`${room ? `Room ${room}: ` : ''}${message}`);
}

function note(message) {
  notes.push(message);
}

function includesModel(pieces, token) {
  return pieces.some(piece => piece.model.toLowerCase().includes(token.toLowerCase()));
}

function countModels(pieces, token) {
  return pieces.filter(piece => piece.model.toLowerCase().includes(token.toLowerCase())).length;
}

function basename(model) {
  return path.basename(model).toLowerCase();
}

function distanceToRect(point, collider) {
  const dx = Math.max(Math.abs(point.x - collider.x) - collider.halfW, 0);
  const dz = Math.max(Math.abs(point.z - collider.z) - collider.halfH, 0);
  return Math.hypot(dx, dz);
}

const server = await createServer({
  root: ROOT,
  configFile: false,
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const layouts = await server.ssrLoadModule('/src/game/logicalRoomSetpieces.ts');
  const bible = await server.ssrLoadModule('/src/game/roomBible.ts');
  const collision = await server.ssrLoadModule('/src/game/roomCollision3D.ts');
  const presentation = await server.ssrLoadModule('/src/game/propPresentation3D.ts');
  const chapter = await server.ssrLoadModule('/src/game/chapterRun.ts');
  const runEngineSource = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'));

  const fingerprints = new Map();
  const regionAnchorFingerprints = new Map();

  const requiredTokens = new Map([
    [1, ['shelf', 'pallet']],
    [2, ['table_long', 'sword_shield']],
    [3, ['torch']],
    [4, ['pallet', 'pickaxe', 'bars_stack']],
    [5, ['table_long', 'anvil', 'grindstone']],
    [6, ['anvil', 'grindstone']],
    [7, ['bed_single', 'cabinet']],
    [8, ['shelf', 'bars_stack', 'pallet']],
    [9, ['shrine_candles', 'spellbook']],
    [10, ['coffin', 'grave_']],
    [11, ['shrine_candles', 'column']],
    [12, ['pillar', 'sword_shield']],
    [13, ['wall_corner_gated', '/key.']],
    [14, ['grave_', 'skull']],
    [15, ['shrine_candles', 'barrier_column']],
    [16, ['pillar', 'sword_shield']],
    [17, ['rubble_large', 'rubble_half']],
    [18, ['stone_chunks', 'column']],
    [19, ['pillar', 'banner_shield']],
    [20, ['barrier_column', 'shrine_candles']],
  ]);

  for (let room = 1; room <= 50; room++) {
    const pieces = layouts.logicalRoomSetpieces(room);
    const spec = bible.roomBibleSpec(room);
    const colliders = Array.from(collision.roomPropColliders(room));
    const models = pieces.map(piece => basename(piece.model));
    const fingerprint = pieces
      .map(piece => `${basename(piece.model)}:${piece.x.toFixed(1)}:${piece.z.toFixed(1)}:${(piece.rotation ?? 0).toFixed(2)}`)
      .sort()
      .join('|');

    if (fingerprints.has(fingerprint)) fail(room, `duplicates the complete composition of room ${fingerprints.get(fingerprint)}`);
    fingerprints.set(fingerprint, room);

    if (new Set(models).size < 3) fail(room, 'uses fewer than three distinct model silhouettes');

    if (room <= 20) {
      for (const token of requiredTokens.get(room) ?? []) {
        if (!includesModel(pieces, token)) fail(room, `missing production identity asset: ${token}`);
      }
    }

    if (room === 6) {
      const innerWalls = pieces.filter(piece => /wall|barrier/i.test(piece.model) && Math.abs(piece.x) < 4.8 && piece.z > -5 && piece.z < 4);
      if (innerWalls.length) fail(room, 'forge contains the forbidden four-wall inner block again');
      if (spec.silhouette === 'ring' || spec.silhouette === 'orbit' || spec.silhouette === 'cross') {
        fail(room, 'forge silhouette would regenerate four automatic architecture blocks');
      }
    }

    if (room === 7) {
      if (countModels(pieces, 'bed_single') < 4) fail(room, 'sleeping quarters need four perimeter beds');
      const centralBlockers = colliders.filter(collider => Math.abs(collider.x) < 3.2 && collider.z > -4 && collider.z < 3);
      if (centralBlockers.length > 1) fail(room, 'sleeping-quarter chase route is cluttered');
    }

    if (room === 8) {
      if (countModels(pieces, 'shelf') < 2) fail(room, 'material vault needs two readable storage walls');
      if (new Set(models.filter(model => /pallet|bars|brick|box|shelf/.test(model))).size < 5) fail(room, 'material vault lacks resource variety');
    }

    if (room === 9 && countModels(pieces, 'candle') < 4) fail(room, 'ritual chamber lost its four-point candle ring');

    if (room >= 21) {
      if (pieces.length < 5) fail(room, 'regional room needs at least five authored setpieces');
      const anchors = pieces.slice(0, 4)
        .map(piece => `${basename(piece.model)}:${piece.x.toFixed(1)}:${piece.z.toFixed(1)}`)
        .sort()
        .join('|');
      const region = room <= 30 ? 'meadow' : room <= 40 ? 'darkwood' : 'fortress';
      const key = `${region}:${anchors}`;
      if (regionAnchorFingerprints.has(key)) fail(room, `reuses the same regional frame as room ${regionAnchorFingerprints.get(key)}`);
      regionAnchorFingerprints.set(key, room);
    }

    if (room >= 21 && room <= 30 && countModels(pieces, 'forest/') < 3) {
      fail(room, 'meadow room underuses the forest pack');
    }

    if (room >= 31 && room <= 40) {
      if (countModels(pieces, 'halloween/') < 2) fail(room, 'darkwood room needs at least two graveyard/village assets');
      if (countModels(pieces, 'forest/') < 1) fail(room, 'darkwood room needs a forest anchor without reusing the meadow frame');
    }

    if (room >= 41 && room <= 50 && countModels(pieces, 'dungeon/') < 2) {
      fail(room, 'fortress room needs at least two structural dungeon assets');
    }

    if (chapter.isBossRoom(room)) {
      const spawn = spec.enemySpawns[0];
      if (!spawn) fail(room, 'boss spawn is missing');
      else {
        const nearest = colliders.reduce((best, collider) => Math.min(best, distanceToRect(spawn, collider)), Number.POSITIVE_INFINITY);
        if (nearest < 0.35) fail(room, `boss spawn is too close to a solid prop (${nearest.toFixed(2)})`);
      }
      const authoredBlockers = pieces.filter(piece => presentation.roomPropColliderFootprint(piece)).length;
      if (authoredBlockers > 8) fail(room, 'boss arena contains too many visible blocking props');
    }
  }

  if (!runEngineSource.includes('getRoomExitCenter') || !runEngineSource.includes('TILE_SIZE * 0.92') || !runEngineSource.includes('playerWithinOpenExit')) fail(0, 'portal priority regression');
  if (/canExitRoom\(\)[\s\S]{0,240}state\.items/.test(runEngineSource)) fail(0, 'optional loot blocks room exit');
  note('Rooms 1–20 retain their authored identities and known mobile fixes.');
  note('Rooms 21–50 use thirty separate compositions without shared boundary templates.');
  note('Boss arenas keep bounded collider counts and clear authored spawn points.');

  if (errors.length) {
    console.error(`Production room validation failed with ${errors.length} error(s):`);
    errors.forEach(message => console.error(`  - ${message}`));
    process.exitCode = 1;
  } else {
    notes.forEach(message => console.log(`  - ${message}`));
    console.log('Production room validation passed: identities, regional differentiation, chase lanes and boss clearances.');
  }
} finally {
  await server.close();
}
