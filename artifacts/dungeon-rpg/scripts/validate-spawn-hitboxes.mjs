import { createServer } from 'vite';

const ROOT = process.cwd();
const MAP_WIDTH = 24;
const MAP_HEIGHT = 32;
const PORTAL_CLEARANCE = 3.1;
const RUNTIME_PADDING = 0.22;
const ENEMY_SIZES = {
  slime: 32,
  goblin: 30,
  skeleton: 26,
  orc: 30,
  spider: 38,
  vampire: 34,
  demon: 36,
  golem: 34,
  boss: 74,
};
const errors = [];

function fail(room, message) {
  errors.push(`Room ${room}: ${message}`);
}

function portalStage(spec) {
  return { x: spec.portal.x, z: spec.portal.z < -8 ? -8.5 : spec.portal.z };
}

function pointBlocked(point, colliders, radius) {
  return colliders.some(collider =>
    Math.abs(point.x - collider.x) < collider.halfW + radius &&
    Math.abs(point.z - collider.z) < collider.halfH + radius
  );
}

function hasCollider(colliders, x, z, halfW, halfH) {
  return colliders.some(collider =>
    Math.abs(collider.x - x) < 0.05 &&
    Math.abs(collider.z - z) < 0.05 &&
    collider.halfW >= halfW &&
    collider.halfH >= halfH
  );
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
  const spawns = await server.ssrLoadModule('/src/game/roomSpawn3D.ts');

  for (let room = 1; room <= chapter.CHAPTER_ROOMS; room++) {
    const spec = bible.roomBibleSpec(room);
    const portal = portalStage(spec);
    const pieces = layouts.logicalRoomSetpieces(room);
    const colliders = Array.from(collision.roomPropColliders(room));
    const runtimeSpawns = spawns.getRoomSpawnPoints(room);
    const plan = encounters.getEncounterPlan(room);
    const boss = chapter.isBossRoom(room);

    if (room === 1) {
      if (!hasCollider(colliders, 0, -5.65, 0.9, 0.78)) fail(room, 'grand entrance shrine collider is missing or undersized');
      if (!hasCollider(colliders, -4.25, -8.2, 0.78, 0.78)) fail(room, 'left grand entrance pillar collider is missing or undersized');
      if (!hasCollider(colliders, 4.25, -8.2, 0.78, 0.78)) fail(room, 'right grand entrance pillar collider is missing or undersized');
      if (colliders.some(collider => Math.abs(collider.x) < 1.2 && collider.z < -9.2)) fail(room, 'grand entrance gate opening is blocked by a central collider');
    }

    for (const piece of pieces) {
      const footprint = presentation.roomPropColliderFootprint(piece);
      if (!footprint) continue;
      const distance = Math.hypot(piece.x - portal.x, piece.z - portal.z);
      if (distance <= PORTAL_CLEARANCE) {
        fail(room, `solid prop ${piece.model} sits inside portal clearance and would lose collision`);
      }
    }

    if (boss) {
      if (runtimeSpawns.length !== 1) fail(room, `expected one boss spawn, got ${runtimeSpawns.length}`);
    } else if (runtimeSpawns.length < plan.length) {
      fail(room, `encounter needs ${plan.length} spawns, runtime only provides ${runtimeSpawns.length}`);
    }

    const types = boss ? ['boss'] : plan;
    types.forEach((type, index) => {
      const point = runtimeSpawns[index];
      if (!point) return;

      const size = ENEMY_SIZES[type];
      if (!size) {
        fail(room, `missing hitbox size for enemy type ${type}`);
        return;
      }

      const radius = size / 80 + RUNTIME_PADDING;
      if (Math.abs(point.x) > 8.8 || point.z < -7.8 || point.z > 6.5) {
        fail(room, `${type} spawn ${index + 1} lies outside the combat zone`);
      }
      if (pointBlocked(point, colliders, radius)) {
        fail(room, `${type} spawn ${index + 1} overlaps a collider with its full runtime hitbox`);
      }

      const game = spawns.sceneSpawnToGame(point, MAP_WIDTH, MAP_HEIGHT, size);
      if (collision.collidesWithRoomProp(room, MAP_WIDTH, MAP_HEIGHT, game.x, game.y, size, size, RUNTIME_PADDING)) {
        fail(room, `${type} spawn ${index + 1} is rejected by the runtime collision function`);
      }
    });
  }

  if (errors.length) {
    console.error(`Spawn and portal validation failed with ${errors.length} error(s):`);
    errors.forEach(message => console.error(`  - ${message}`));
    process.exitCode = 1;
  } else {
    console.log('Spawn and portal validation passed: all 50 rooms keep solid hero props, room-one entrance footprints, full-size enemy hitboxes and safe boss starts.');
  }
} finally {
  await server.close();
}
