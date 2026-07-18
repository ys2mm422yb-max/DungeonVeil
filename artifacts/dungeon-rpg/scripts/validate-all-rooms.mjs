import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_ROOT = path.join(ROOT, 'public');
const MAP_WIDTH = 24;
const MAP_HEIGHT = 32;
const PLAYER_RADIUS = 0.42;
const PORTAL_CLEARANCE = 3.1;
const NON_BLOCKING_CLASSES = new Set(['lighting', 'small-prop', 'tool-weapon', 'wall-decoration', 'foliage']);
const errors = [];
const warnings = [];

function error(room, message) {
  errors.push((room ? 'Room ' + room + ': ' : '') + message);
}

function warning(room, message) {
  warnings.push((room ? 'Room ' + room + ': ' : '') + message);
}

function portalStage(spec) {
  return { x: spec.portal.x, z: spec.portal.z < -8 ? -8.5 : spec.portal.z };
}

function colliderFromPiece(piece, presentation) {
  const footprint = presentation.roomPropColliderFootprint(piece);
  if (!footprint) return null;
  return {
    x: piece.x,
    z: piece.z,
    halfW: footprint.width / 2,
    halfH: footprint.height / 2,
  };
}

function modelPath(model) {
  if (model.startsWith('/')) return path.join(PUBLIC_ROOT, model.slice(1));
  return path.join(PUBLIC_ROOT, 'assets/kaykit', model);
}

function pointBlocked(point, colliders, radius) {
  return colliders.some(collider =>
    Math.abs(point.x - collider.x) < collider.halfW + radius &&
    Math.abs(point.z - collider.z) < collider.halfH + radius
  );
}

function routeExists(start, target, colliders) {
  const step = 0.5;
  const minX = -10.0;
  const maxX = 10.0;
  const minZ = -13.8;
  const maxZ = 13.5;
  const toCell = value => Math.round(value / step);
  const fromCell = value => value * step;
  const startCell = [toCell(start.x), toCell(start.z)];
  const queue = [startCell];
  const seen = new Set([startCell[0] + ',' + startCell[1]]);
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const x = fromCell(current[0]);
    const z = fromCell(current[1]);
    if (Math.hypot(x - target.x, z - target.z) <= 0.8) return true;
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const delta of neighbors) {
      const next = [current[0] + delta[0], current[1] + delta[1]];
      const nx = fromCell(next[0]);
      const nz = fromCell(next[1]);
      if (nx < minX || nx > maxX || nz < minZ || nz > maxZ) continue;
      const key = next[0] + ',' + next[1];
      if (seen.has(key)) continue;
      if (pointBlocked({ x: nx, z: nz }, colliders, PLAYER_RADIUS)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

function sceneToGameX(value) {
  return (value + MAP_WIDTH / 2 - 0.5) * 40;
}

function sceneToGameY(value) {
  return (value + MAP_HEIGHT / 2 - 0.5) * 40;
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
  const chapter = await server.ssrLoadModule('/src/game/chapterRun.ts');
  const bible = await server.ssrLoadModule('/src/game/roomBible.ts');
  const layouts = await server.ssrLoadModule('/src/game/logicalRoomSetpieces.ts');
  const encounters = await server.ssrLoadModule('/src/game/encounterPlan.ts');
  const collision = await server.ssrLoadModule('/src/game/roomCollision3D.ts');
  const presentation = await server.ssrLoadModule('/src/game/propPresentation3D.ts');

  if (chapter.CHAPTER_ROOMS !== 50) error(null, 'CHAPTER_ROOMS must be 50');
  const expectedBosses = [10, 20, 30, 40, 50];
  for (let room = 1; room <= 50; room++) {
    const expectedBoss = expectedBosses.includes(room);
    if (chapter.isBossRoom(room) !== expectedBoss) error(room, 'boss-room detection is wrong');
  }

  const names = new Set();
  const fingerprints = new Set();
  const classCounts = new Map();
  for (let room = 1; room <= 50; room++) {
    const spec = bible.roomBibleSpec(room);
    const pieces = layouts.logicalRoomSetpieces(room);
    const plan = encounters.getEncounterPlan(room);
    const colliders = Array.from(collision.roomPropColliders(room));
    const portal = portalStage(spec);
    const outdoor = spec.phase === 'meadow-forest' || spec.phase === 'darkwood-village';

    if (spec.room !== room) error(room, 'room bible returned room ' + spec.room);
    if (!spec.nameDe || names.has(spec.nameDe)) error(room, 'room name is missing or duplicated: ' + spec.nameDe);
    names.add(spec.nameDe);
    if (pieces.length < 3) error(room, 'fewer than three authored setpieces');
    if (pieces.length > 18) warning(room, 'high setpiece count: ' + pieces.length);
    if (Math.abs(portal.x) > 9.5 || portal.z < -9.2 || portal.z > 6.5) error(room, 'portal stage is outside the playable composition');

    const fingerprint = pieces.map(piece => [piece.model, piece.x, piece.z, piece.scale || 1].join(':')).sort().join('|');
    if (fingerprints.has(fingerprint)) error(room, 'duplicates another room layout exactly');
    fingerprints.add(fingerprint);

    const hasForest = pieces.some(piece => piece.model.includes('forest/'));
    const hasDungeon = pieces.some(piece => piece.model.includes('dungeon/'));
    const hasHalloween = pieces.some(piece => piece.model.includes('halloween/'));
    if (room >= 21 && room <= 30 && !hasForest) error(room, 'meadow room has no forest assets');
    if (room >= 31 && room <= 40 && (!hasForest || !hasHalloween)) error(room, 'darkwood room needs forest and dark-set assets');
    if (room >= 41 && room <= 50 && !hasDungeon) error(room, 'fortress room has no fortress/dungeon assets');

    for (const piece of pieces) {
      const primaryExists = fs.existsSync(modelPath(piece.model));
      const fallbackExists = piece.fallbackModel ? fs.existsSync(modelPath(piece.fallbackModel)) : false;
      if (!primaryExists && !fallbackExists) error(room, 'missing model and fallback: ' + piece.model);
      if (Math.abs(piece.x) > 11.2 || piece.z < -15.6 || piece.z > 7.0) error(room, 'setpiece outside authored bounds: ' + piece.model);

      const displayScale = presentation.roomPropDisplayScale(piece);
      if (!Number.isFinite(displayScale) || displayScale <= 0) error(room, 'invalid display scale for ' + piece.model);
      const propClass = presentation.roomPropScaleClass(piece);
      classCounts.set(propClass, (classCounts.get(propClass) || 0) + 1);
    }

    const authoredColliders = pieces
      .map(piece => colliderFromPiece(piece, presentation))
      .filter(Boolean);
    if (authoredColliders.length !== colliders.length) error(room, 'authored and runtime collider counts differ');

    const start = { x: 0, z: 11.5 };
    if (!routeExists(start, portal, colliders)) error(room, 'no collision-safe route from spawn to portal');
    if (colliders.some(collider => Math.hypot(collider.x - portal.x, collider.z - portal.z) < PORTAL_CLEARANCE)) {
      error(room, 'portal clearance is obstructed');
    }

    const map = chapter.generateRunRoom(room);
    if (map.width !== MAP_WIDTH || map.height !== MAP_HEIGHT) error(room, 'generated map dimensions changed');
    const exit = map.exit;
    if (!exit) error(room, 'generated map has no exit');
    else {
      const exitScene = {
        x: (exit.x - MAP_WIDTH / 2 + 0.5),
        z: (exit.y - MAP_HEIGHT / 2 + 0.5),
      };
      if (Math.hypot(exitScene.x - portal.x, exitScene.z - portal.z) > 0.2) error(room, 'tile exit and authored portal differ');
      if (sceneToGameX(exitScene.x) !== exit.x * 40 || sceneToGameY(exitScene.z) !== exit.y * 40) error(room, 'scene/tile conversion drifted');
    }

    if (plan.room !== room) error(room, 'encounter plan returned room ' + plan.room);
    if (plan.boss !== expectedBosses.includes(room)) error(room, 'encounter boss flag is wrong');
    if (!plan.enemyKinds?.length) error(room, 'encounter plan has no enemy kinds');
    if (outdoor && plan.arena !== 'outdoor') error(room, 'outdoor room uses non-outdoor encounter arena');
  }

  if ((classCounts.get('architecture') || 0) < 50) error(null, 'room compositions do not contain enough architecture-class structures');
  if ((classCounts.get('wall-decoration') || 0) < 20) warning(null, 'room compositions contain few wall decorations');
  if ((classCounts.get('foliage') || 0) < 20) warning(null, 'room compositions contain few foliage props');
  if (NON_BLOCKING_CLASSES.size !== 5) error(null, 'non-blocking class contract changed unexpectedly');

  for (const message of warnings) console.warn('WARN ' + message);
  if (errors.length) {
    console.error(`Room validation failed with ${errors.length} error(s):`);
    for (const message of errors) console.error('  - ' + message);
    process.exitCode = 1;
  } else {
    console.log('Room validation passed: all 50 rooms are distinct, collision-safe, asset-backed and aligned with encounter and portal contracts.');
  }
} finally {
  await server.close();
}
