import path from 'node:path';
import { createServer } from 'vite';

const ROOT = process.cwd();
const failures = [];
const summaries = [];

function basename(model) {
  return path.basename(model).toLowerCase();
}

function distanceToRect(point, collider) {
  const dx = Math.max(Math.abs(point.x - collider.x) - collider.halfW, 0);
  const dz = Math.max(Math.abs(point.z - collider.z) - collider.halfH, 0);
  return Math.hypot(dx, dz);
}

function overlapDepth(a, b) {
  const x = Math.min(a.x + a.halfW, b.x + b.halfW) - Math.max(a.x - a.halfW, b.x - b.halfW);
  const z = Math.min(a.z + a.halfH, b.z + b.halfH) - Math.max(a.z - a.halfH, b.z - b.halfH);
  return { x, z };
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
  const chapter = await server.ssrLoadModule('/src/game/chapterRun.ts');

  const fingerprints = new Map();

  for (let room = 6; room <= 50; room++) {
    const pieces = layouts.logicalRoomSetpieces(room);
    const spec = bible.roomBibleSpec(room);
    const colliders = Array.from(collision.roomPropColliders(room));
    const models = pieces.map(piece => basename(piece.model));
    const distinct = new Set(models).size;
    const portal = spec.portal ?? { x: 0, z: -13.7 };
    const portalClearance = colliders.reduce((best, collider) => Math.min(best, distanceToRect(portal, collider)), Number.POSITIVE_INFINITY);
    const spawnClearance = (spec.enemySpawns ?? []).reduce((best, spawn) => {
      const nearest = colliders.reduce((distance, collider) => Math.min(distance, distanceToRect(spawn, collider)), Number.POSITIVE_INFINITY);
      return Math.min(best, nearest);
    }, Number.POSITIVE_INFINITY);
    const centerBlockers = colliders.filter(collider => Math.abs(collider.x) < 2.35 && collider.z > -10.8 && collider.z < 5.4);
    const left = pieces.filter(piece => piece.x < -1.2).length;
    const right = pieces.filter(piece => piece.x > 1.2).length;
    const fingerprint = pieces
      .map(piece => `${basename(piece.model)}:${piece.x.toFixed(1)}:${piece.z.toFixed(1)}:${(piece.rotation ?? 0).toFixed(2)}`)
      .sort()
      .join('|');

    const roomFailures = [];
    if (pieces.length < 5) roomFailures.push('fewer than five authored setpieces');
    if (pieces.length > 18) roomFailures.push(`mobile setpiece budget exceeded (${pieces.length}/18)`);
    if (distinct < 3) roomFailures.push('fewer than three distinct silhouettes');
    if (colliders.length > (chapter.isBossRoom(room) ? 10 : 12)) roomFailures.push(`solid-prop budget exceeded (${colliders.length})`);
    if (portalClearance < 1.25) roomFailures.push(`portal clearance too small (${portalClearance.toFixed(2)})`);
    if (spawnClearance < 0.3) roomFailures.push(`enemy spawn clearance too small (${spawnClearance.toFixed(2)})`);
    if (!chapter.isBossRoom(room) && centerBlockers.length > 4) roomFailures.push(`central combat lane has ${centerBlockers.length} blockers`);
    if (left === 0 || right === 0) roomFailures.push('composition has no readable left/right depth');
    if (fingerprints.has(fingerprint)) roomFailures.push(`duplicates room ${fingerprints.get(fingerprint)}`);
    fingerprints.set(fingerprint, room);

    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const depth = overlapDepth(colliders[i], colliders[j]);
        if (depth.x > 0.75 && depth.z > 0.75) {
          roomFailures.push(`large collider overlap between props ${i + 1} and ${j + 1}`);
          i = colliders.length;
          break;
        }
      }
    }

    if (room >= 21 && room <= 30 && models.filter(model => model.includes('tree') || model.includes('bush') || model.includes('grass') || model.includes('rock')).length < 3) {
      roomFailures.push('meadow identity is too weak');
    }
    if (room >= 31 && room <= 40 && models.filter(model => /grave|shrine|coffin|candle|skull|bone|lantern/.test(model)).length < 2) {
      roomFailures.push('darkwood identity is too weak');
    }
    if (room >= 41 && room <= 50 && models.filter(model => /wall|pillar|barrier|shield|gate|anvil|torch|brazier/.test(model)).length < 2) {
      roomFailures.push('fortress identity is too weak');
    }

    const name = spec.nameDe ?? `Raum ${room}`;
    summaries.push(`Room ${String(room).padStart(2, '0')} · ${name} · pieces=${pieces.length} · solids=${colliders.length} · portal=${Number.isFinite(portalClearance) ? portalClearance.toFixed(2) : 'frei'} · spawns=${Number.isFinite(spawnClearance) ? spawnClearance.toFixed(2) : 'frei'} · ${roomFailures.length ? 'FAIL' : 'PASS'}`);
    roomFailures.forEach(message => failures.push(`Room ${room} (${name}): ${message}`));
  }

  if (summaries.length !== 45) failures.push(`expected 45 audited rooms, received ${summaries.length}`);
  summaries.forEach(summary => console.log(summary));
  if (failures.length) {
    console.error(`Room quality audit failed with ${failures.length} error(s):`);
    failures.forEach(message => console.error(`  - ${message}`));
    process.exitCode = 1;
  } else {
    console.log('Room quality audit passed: all 45 rooms from 6–50 have unique themes, bounded mobile complexity, clear portals and safe enemy spawns.');
  }
} finally {
  await server.close();
}
