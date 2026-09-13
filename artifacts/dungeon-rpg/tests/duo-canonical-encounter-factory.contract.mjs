import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const source = fs.readFileSync(new URL('../src/game/duoCanonicalEncounterFactory.ts', import.meta.url), 'utf8');
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const inputType = source.match(/export type CreateRoomBoundCanonicalEncounterInput = Readonly<\{([\s\S]*?)\}>;/)?.[1] ?? '';
const actorIdentityType = source.match(/export type CanonicalDuoActorIdentity = Readonly<\{([\s\S]*?)\}>;/)?.[1] ?? '';

const servers = [];
let runtimePromise;

async function createRuntime(extra = {}) {
  const server = await createServer({
    root: projectRoot,
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
    ...extra,
  });
  servers.push(server);
  return {
    server,
    factory: await server.ssrLoadModule('/src/game/duoCanonicalEncounterFactory.ts'),
    chapterRun: await server.ssrLoadModule('/src/game/chapterRun.ts'),
    encounterPlan: await server.ssrLoadModule('/src/game/encounterPlan.ts'),
    roomSpawn3D: await server.ssrLoadModule('/src/game/roomSpawn3D.ts'),
    dungeon: await server.ssrLoadModule('/src/game/dungeon.ts'),
    roomCollision3D: await server.ssrLoadModule('/src/game/roomCollision3D.ts'),
    kernel: await server.ssrLoadModule('/src/game/duoEncounterAuthorityKernel.ts'),
  };
}

async function runtime() {
  runtimePromise ??= createRuntime();
  return runtimePromise;
}

after(async () => {
  await Promise.all(servers.map(server => server.close()));
});

function encounterInput(room, actors) {
  return {
    runId: 'factory-functional-proof',
    runAttempt: 1,
    chapter: 1,
    room,
    seed: 424242,
    authorityStartedAtMs: 1000,
    actors,
  };
}

function findRepresentativeRoom({ boss, encounterPlan, chapterRun, roomSpawn3D }) {
  for (let room = 1; room <= 50; room += 1) {
    if (chapterRun.isBossRoom(room) !== boss) continue;
    const planLength = boss ? 1 : encounterPlan.getEncounterPlan(room).length;
    if (planLength > 0 && roomSpawn3D.getRoomSpawnPoints(room).length >= planLength) return room;
  }
  throw new Error(`no representative ${boss ? 'boss' : 'normal'} room with sufficient authored spawns`);
}

function assertWalkableAndNonCollidingActor(actor, room, map, modules) {
  const combat = modules.kernel.CANONICAL_CLASS_COMBAT_MANIFEST[actor.classKey];
  assert.equal(modules.dungeon.isWalkable(map, actor.x + combat.actorSize / 2, actor.y + combat.actorSize / 2), true);
  assert.equal(modules.roomCollision3D.collidesWithRoomProp(room, map.width, map.height, actor.x, actor.y, combat.actorSize, combat.actorSize, 0.12), false);
}

function assertEnemyMatchesAuthoredSpawn(enemy, enemyType, point, room, map, modules) {
  const combat = modules.kernel.CANONICAL_ENEMY_COMBAT_MANIFEST[enemyType];
  const expected = modules.roomSpawn3D.sceneSpawnToGame(point, map.width, map.height, combat.size);
  assert.equal(enemy.enemyType, enemyType);
  assert.equal(enemy.x, expected.x);
  assert.equal(enemy.y, expected.y);
  assert.equal(modules.dungeon.isWalkable(map, expected.x + combat.size / 2, expected.y + combat.size / 2), true);
  assert.equal(modules.roomCollision3D.collidesWithRoomProp(room, map.width, map.height, expected.x, expected.y, combat.size, combat.size, 0.22), false);
}

test('producer boundary does not accept caller-owned encounter geometry or combat stats', () => {
  for (const forbidden of ['enemies', 'spawnX', 'spawnY', 'attack', 'speed', 'width', 'height', 'x', 'y']) {
    const field = new RegExp(`(?:^|\\n)\\s*${forbidden}\\??\\s*:`);
    assert.equal(field.test(inputType), false, `producer input must not trust ${forbidden}`);
    assert.equal(field.test(actorIdentityType), false, `actor identity must not trust ${forbidden}`);
  }
});

test('factory derives canonical room, encounter, spawn, walkability and collision state from repository sources', () => {
  assert.match(source, /generateRunRoom\(room\)/);
  assert.match(source, /isBossRoom\(room\)/);
  assert.match(source, /getEncounterPlan\(room\)/);
  assert.match(source, /getRoomSpawnPoints\(room\)/);
  assert.match(source, /sceneSpawnToGame\(/);
  assert.match(source, /isWalkable\(/);
  assert.match(source, /collidesWithRoomProp\(/);
  assert.match(source, /CANONICAL_ENEMY_COMBAT_MANIFEST\[enemyType\]/);
});

test('factory derives actor starts from canonical map start and class size instead of caller coordinates', () => {
  assert.match(source, /map\.startX/);
  assert.match(source, /map\.startY/);
  assert.match(source, /CANONICAL_CLASS_COMBAT_MANIFEST\[actor\.classKey\]/);
  assert.match(source, /canonicalActorSpawn\(input\.room, actor, slot\)/);
});

test('only the derived actor and enemy lists reach the canonical reducer state constructor', () => {
  assert.match(source, /const actors = input\.actors\.map/);
  assert.match(source, /const enemies = canonicalEnemyInputs\(input\.room\)/);
  assert.match(source, /createCanonicalEncounterState\(\{ \.\.\.input, actors, enemies \}\)/);
});

test('normal room executes the real factory and matches authored encounter types and exact spawn conversion', async () => {
  const modules = await runtime();
  const room = findRepresentativeRoom({ boss: false, ...modules });
  const forgedActor = { actorId: 'p1', classKey: 'warrior', active: true, spawnX: 999999, spawnY: -999999, attack: 999999, speed: 999999 };
  const state = modules.factory.createRoomBoundCanonicalEncounterState({ ...encounterInput(room, [forgedActor]), enemies: [{ enemyType: 'boss', x: 1, y: 1 }] });
  const map = modules.chapterRun.generateRunRoom(room);
  const plan = modules.encounterPlan.getEncounterPlan(room);
  const points = modules.roomSpawn3D.getRoomSpawnPoints(room);

  assert.deepEqual(state.enemies.map(enemy => enemy.enemyType), plan);
  assert.equal(state.actors[0].attack, modules.kernel.CANONICAL_CLASS_COMBAT_MANIFEST.warrior.attack);
  assert.notEqual(state.actors[0].x, forgedActor.spawnX);
  assert.notEqual(state.actors[0].y, forgedActor.spawnY);
  assertWalkableAndNonCollidingActor(state.actors[0], room, map, modules);
  state.enemies.forEach((enemy, index) => assertEnemyMatchesAuthoredSpawn(enemy, plan[index], points[index], room, map, modules));
});

test('boss room executes the real factory and derives exactly the canonical boss from authored spawn data', async () => {
  const modules = await runtime();
  const room = findRepresentativeRoom({ boss: true, ...modules });
  const state = modules.factory.createRoomBoundCanonicalEncounterState(encounterInput(room, [{ actorId: 'p1', classKey: 'mage' }]));
  const map = modules.chapterRun.generateRunRoom(room);
  const points = modules.roomSpawn3D.getRoomSpawnPoints(room);

  assert.deepEqual(state.enemies.map(enemy => enemy.enemyType), ['boss']);
  assertEnemyMatchesAuthoredSpawn(state.enemies[0], 'boss', points[0], room, map, modules);
});

test('one and two actor cases execute with canonical walkable non-colliding starts', async () => {
  const modules = await runtime();
  const room = findRepresentativeRoom({ boss: false, ...modules });
  const map = modules.chapterRun.generateRunRoom(room);
  const one = modules.factory.createRoomBoundCanonicalEncounterState(encounterInput(room, [{ actorId: 'p1', classKey: 'archer' }]));
  const two = modules.factory.createRoomBoundCanonicalEncounterState(encounterInput(room, [
    { actorId: 'p1', classKey: 'archer' },
    { actorId: 'p2', classKey: 'mage' },
  ]));

  assert.equal(one.actors.length, 1);
  assert.equal(two.actors.length, 2);
  one.actors.forEach(actor => assertWalkableAndNonCollidingActor(actor, room, map, modules));
  two.actors.forEach(actor => assertWalkableAndNonCollidingActor(actor, room, map, modules));
});

test('invalid actor cardinality fails closed in the real factory', async () => {
  const modules = await runtime();
  const room = findRepresentativeRoom({ boss: false, ...modules });
  assert.throws(() => modules.factory.createRoomBoundCanonicalEncounterState(encounterInput(room, [])), /one or two actor identities/);
  assert.throws(() => modules.factory.createRoomBoundCanonicalEncounterState(encounterInput(room, [
    { actorId: 'p1', classKey: 'warrior' },
    { actorId: 'p2', classKey: 'mage' },
    { actorId: 'p3', classKey: 'archer' },
  ])), /one or two actor identities/);
});

test('insufficient authored enemy spawn data fails closed before any synthetic spawn can be fabricated', async () => {
  const base = await runtime();
  const room = findRepresentativeRoom({ boss: false, ...base });
  const mocked = await createRuntime({
    plugins: [{
      name: 'factory-insufficient-spawn-proof',
      enforce: 'pre',
      resolveId(id, importer) {
        if (id === './roomSpawn3D' && importer?.endsWith('/duoCanonicalEncounterFactory.ts')) return '\0factory-empty-room-spawns';
        return null;
      },
      load(id) {
        if (id === '\0factory-empty-room-spawns') {
          return 'export function getRoomSpawnPoints(){ return []; }\nexport function sceneSpawnToGame(){ throw new Error("sceneSpawnToGame must not run when authored spawns are insufficient"); }';
        }
        return null;
      },
    }],
  });

  assert.throws(() => mocked.factory.createRoomBoundCanonicalEncounterState(encounterInput(room, [{ actorId: 'p1', classKey: 'warrior' }])), /insufficient canonical enemy spawn points/);
});
