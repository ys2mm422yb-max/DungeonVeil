import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  root: fileURLToPath(new URL('../../../', import.meta.url)),
  configFile: false,
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true },
});
after(async () => server.close());

const [browserFactory, edgeFactory, kernel, manifestModule] = await Promise.all([
  server.ssrLoadModule('/artifacts/dungeon-rpg/src/game/duoCanonicalEncounterFactory.ts'),
  server.ssrLoadModule('/supabase/functions/_shared/duo_authority_factory.ts'),
  server.ssrLoadModule('/supabase/functions/_shared/duo_authority_kernel.ts'),
  server.ssrLoadModule('/supabase/functions/_shared/duo_authority_room_manifest.ts'),
]);

const actorInput = (x, y, classKey = 'warrior') => ({
  actorId: 'host',
  classKey,
  spawnX: x,
  spawnY: y,
});
const enemyInput = (x, y) => ({ enemyType: 'slime', x, y });
const stateAt = (room, actor, enemy) => kernel.createCanonicalEncounterState({
  runId: 'geometry-contract',
  runAttempt: 1,
  chapter: 1,
  room,
  seed: 1,
  authorityStartedAtMs: 1000,
  actors: [actor],
  enemies: [enemy],
});

test('checked-in Edge manifest matches all 100 authored browser room factories', () => {
  for (let room = 1; room <= 100; room += 1) {
    const input = {
      runId: 'manifest-parity',
      runAttempt: 1,
      chapter: 1,
      room,
      seed: 7,
      authorityStartedAtMs: 1000,
      actors: [
        { actorId: 'host', classKey: 'warrior' },
        { actorId: 'guest', classKey: 'archer' },
      ],
    };
    const browser = browserFactory.createRoomBoundCanonicalEncounterState(input);
    const edge = edgeFactory.createRoomBoundCanonicalEncounterState(input);
    assert.deepEqual(
      edge.actors.map(({ actorId, classKey, x, y, width, height }) => ({ actorId, classKey, x, y, width, height })),
      browser.actors.map(({ actorId, classKey, x, y, width, height }) => ({ actorId, classKey, x, y, width, height })),
      `actor manifest drift in room ${room}`,
    );
    assert.deepEqual(
      edge.enemies.map(({ enemyType, x, y, width, height }) => ({ enemyType, x, y, width, height })),
      browser.enemies.map(({ enemyType, x, y, width, height }) => ({ enemyType, x, y, width, height })),
      `enemy manifest drift in room ${room}`,
    );
  }
});

test('legal movement remains available inside the authored room', () => {
  const state = edgeFactory.createRoomBoundCanonicalEncounterState({
    runId: 'legal-move',
    runAttempt: 1,
    chapter: 1,
    room: 1,
    seed: 1,
    authorityStartedAtMs: 1000,
    actors: [{ actorId: 'host', classKey: 'warrior' }],
  });
  const moved = kernel.reduceAuthorityIntent(
    state,
    { kind: 'move', actorId: 'host', directionX: -1, directionY: 0, clientSeq: 1 },
    1100,
  );
  assert.equal(moved.state.actors[0].x, state.actors[0].x - 11.8);
});

test('repeated legal-direction movement cannot leave the outer walkable bounds', () => {
  const room = 1;
  const bounds = manifestModule.DUO_AUTHORITY_ROOM_MANIFEST[room].walkableBounds;
  const state = stateAt(room, actorInput(bounds.minX, 100), enemyInput(300, 100));
  assert.throws(
    () => kernel.reduceAuthorityIntent(
      state,
      { kind: 'move', actorId: 'host', directionX: -1, directionY: 0, clientSeq: 1 },
      1100,
    ),
    /blocked by canonical room geometry/,
  );
});

test('a legal-direction movement segment cannot tunnel through an authored prop', () => {
  const room = 1;
  const entry = manifestModule.DUO_AUTHORITY_ROOM_MANIFEST[room];
  const collider = entry.colliders.find(candidate => candidate.halfW < 0.7 && candidate.z > -8);
  assert.ok(collider, 'room 1 must expose a representative authored prop');
  const actorSize = 32;
  const actorHalfScene = actorSize / 80;
  const centerX = collider.x - collider.halfW - actorHalfScene - 0.14;
  const originX = (centerX + entry.mapWidth / 2 - 0.5) * 40 - actorSize / 2;
  const originY = (collider.z + entry.mapHeight / 2 - 0.5) * 40 - actorSize / 2;
  const state = stateAt(room, actorInput(originX, originY), enemyInput(600, 600));
  assert.throws(
    () => kernel.reduceAuthorityIntent(
      state,
      { kind: 'move', actorId: 'host', directionX: 1, directionY: 0, clientSeq: 1 },
      1250,
    ),
    /blocked by canonical room geometry/,
  );
});

test('basic attacks cannot reach through authored prop occlusion', () => {
  const room = 1;
  const entry = manifestModule.DUO_AUTHORITY_ROOM_MANIFEST[room];
  const collider = entry.colliders.find(candidate => candidate.halfW < 0.7 && candidate.z > -8);
  assert.ok(collider, 'room 1 must expose a representative authored prop');
  const size = 32;
  const actorCenterX = collider.x - collider.halfW - 0.04;
  const enemyCenterX = collider.x + collider.halfW + 0.04;
  const toOrigin = (scene, mapTiles) => (scene + mapTiles / 2 - 0.5) * 40 - size / 2;
  const y = toOrigin(collider.z, entry.mapHeight);
  const state = stateAt(
    room,
    actorInput(toOrigin(actorCenterX, entry.mapWidth), y),
    enemyInput(toOrigin(enemyCenterX, entry.mapWidth), y),
  );
  assert.ok(Math.abs(state.actors[0].x - state.enemies[0].x) < state.actors[0].attackRange);
  assert.throws(
    () => kernel.reduceAuthorityIntent(
      state,
      { kind: 'basic-hit', actorId: 'host', targetEnemyId: state.enemies[0].enemyId, clientSeq: 1 },
      1000,
    ),
    /occluded by canonical room geometry/,
  );
});
