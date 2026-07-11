import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const ROOT = process.cwd();
const PUBLIC_ROOT = path.join(ROOT, 'public');
const MAP_WIDTH = 24;
const MAP_HEIGHT = 32;
const PLAYER_RADIUS = 0.42;
const PORTAL_CLEARANCE = 3.1;
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

function rotatedCollider(piece) {
  if (!piece.collider) return null;
  const scale = (piece.scale || 1) * 0.9;
  const localW = piece.collider[0] * scale;
  const localH = piece.collider[1] * scale;
  const angle = piece.rotation || 0;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  return {
    x: piece.x,
    z: piece.z,
    halfW: (localW * cos + localH * sin) / 2,
    halfH: (localW * sin + localH * cos) / 2,
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
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const chapter = await server.ssrLoadModule('/src/game/chapterRun.ts');
  const bible = await server.ssrLoadModule('/src/game/roomBible.ts');
  const layouts = await server.ssrLoadModule('/src/game/logicalRoomSetpieces.ts');
  const encounters = await server.ssrLoadModule('/src/game/encounterPlan.ts');
  const collision = await server.ssrLoadModule('/src/game/roomCollision3D.ts');

  if (chapter.CHAPTER_ROOMS !== 50) error(null, 'CHAPTER_ROOMS must be 50');
  const expectedBosses = [10, 20, 30, 40, 50];
  for (let room = 1; room <= 50; room++) {
    const expectedBoss = expectedBosses.includes(room);
    if (chapter.isBossRoom(room) !== expectedBoss) error(room, 'boss-room detection is wrong');
  }

  const names = new Set();
  const fingerprints = new Set();
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
    }

    const expectedProps = pieces
      .filter(piece => piece.collider)
      .filter(piece => Math.hypot(piece.x - portal.x, piece.z - portal.z) > PORTAL_CLEARANCE)
      .map(rotatedCollider)
      .filter(Boolean);

    for (const expected of expectedProps) {
      const found = colliders.some(actual => Math.abs(actual.x - expected.x) < 0.01 && Math.abs(actual.z - expected.z) < 0.01);
      if (!found) error(room, 'a visible prop collider is missing from gameplay collision');
    }
    if (outdoor && colliders.length !== expectedProps.length) {
      error(room, 'outdoor room contains invisible architecture colliders: expected ' + expectedProps.length + ', got ' + colliders.length);
    }

    if (pointBlocked(portal, colliders, 0.25)) error(room, 'portal itself is blocked');
    if (!routeExists({ x: 1.0, z: 13.0 }, portal, colliders)) error(room, 'no walkable route from player spawn to portal');

    const boss = chapter.isBossRoom(room);
    if (boss) {
      if (plan.length !== 0) error(room, 'boss room also contains a normal encounter plan');
      if (spec.enemySpawns.length !== 1) error(room, 'boss room must have exactly one authored boss spawn');
    } else {
      if (!plan.length) error(room, 'normal room has no encounter');
      if (plan.length > spec.enemySpawns.length) error(room, 'encounter has ' + plan.length + ' enemies but only ' + spec.enemySpawns.length + ' spawn points');
    }

    spec.enemySpawns.forEach((spawn, index) => {
      if (Math.abs(spawn.x) > 8.8 || spawn.z < -7.8 || spawn.z > 6.5) error(room, 'enemy spawn ' + (index + 1) + ' is outside the combat zone');
      if (pointBlocked(spawn, colliders, 0.2)) error(room, 'enemy spawn ' + (index + 1) + ' overlaps a collider');
    });

    for (const collider of colliders.slice(0, 4)) {
      const fromX = sceneToGameX(collider.x - collider.halfW - 0.7);
      const toX = sceneToGameX(collider.x + collider.halfW + 0.7);
      const gameY = sceneToGameY(collider.z);
      if (!collision.shotBlockedByRoomProp(room, MAP_WIDTH, MAP_HEIGHT, fromX, gameY, toX, gameY, 0.02)) {
        error(room, 'projectile sweep failed to detect a collider');
        break;
      }
    }
  }

  if (warnings.length) {
    console.log('Room validation warnings:');
    warnings.forEach(message => console.log('  - ' + message));
  }
  if (errors.length) {
    console.error('Room validation failed with ' + errors.length + ' error(s):');
    errors.forEach(message => console.error('  - ' + message));
    process.exitCode = 1;
  } else {
    console.log('Room validation passed: 50/50 rooms, 5 boss rooms, assets, spawns, portal routes and projectile colliders.');
  }
} finally {
  await server.close();
}
