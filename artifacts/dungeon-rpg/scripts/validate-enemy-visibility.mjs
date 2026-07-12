import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const ROOT = process.cwd();
const MAP_WIDTH = 24;
const MAP_HEIGHT = 32;
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
const fail = message => errors.push(message);

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
  const encounters = await server.ssrLoadModule('/src/game/encounterPlan.ts');
  const spawns = await server.ssrLoadModule('/src/game/roomSpawn3D.ts');
  const collision = await server.ssrLoadModule('/src/game/roomCollision3D.ts');

  const [engineSource, canvasSource, overlaySource] = await Promise.all([
    readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/GameCanvas.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/CombatFeedbackOverlay.tsx', import.meta.url), 'utf8'),
  ]);

  const playerDamageWrites = engineSource.match(/\bp\.hp\s*-=/g) ?? [];
  if (playerDamageWrites.length !== 1) {
    fail(`expected exactly one player damage write in runEngine, found ${playerDamageWrites.length}`);
  }

  const lineOfSightGuard = engineSource.indexOf('if (this.shotPathBlocked(attackFromX, attackFromY, attackTargetX, attackTargetY, 0.08)) return;');
  const damageWrite = engineSource.indexOf('p.hp -= damage;');
  if (lineOfSightGuard < 0 || damageWrite < 0 || lineOfSightGuard > damageWrite) {
    fail('enemy damage is not protected by a final room-geometry line-of-sight check');
  }

  for (const required of [
    'const visualSpawnGracePassed = time - enemy.spawnTime >= 900;',
    'const canAttackFromHere = dist <= plan.attackRange && hasLineOfSight && visualSpawnGracePassed;',
    'if (canAttackFromHere && time > enemy.nextAttackTime)',
  ]) {
    if (!engineSource.includes(required)) fail(`missing global enemy attack guard: ${required}`);
  }

  if (!canvasSource.includes("const renderedRoomKeyRef = useRef('');")) {
    fail('initial continued rooms can begin before their visual staging pass');
  }
  const enemyPreloads = canvasSource.match(/preloadKayKitEnemyVisuals\(\)/g) ?? [];
  if (enemyPreloads.length < 2) {
    fail(`enemy library is not preloaded for initial and next-room staging (found ${enemyPreloads.length} calls)`);
  }
  if (!overlaySource.includes("kind: 'fire' | 'ice' | 'attack'")) {
    fail('attack-source overlay marker is missing');
  }
  if (!overlaySource.includes('dv-attack-warning')) {
    fail('attack-source overlay styling is missing');
  }

  let checkedRooms = 0;
  let checkedEnemies = 0;
  let initiallyOccluded = 0;

  for (let room = 14; room <= chapter.CHAPTER_ROOMS; room++) {
    checkedRooms++;
    const boss = chapter.isBossRoom(room);
    const plan = boss ? ['boss'] : encounters.getEncounterPlan(room);
    const points = spawns.getRoomSpawnPoints(room);
    if (points.length < plan.length) {
      fail(`room ${room} requires ${plan.length} enemies but has only ${points.length} safe spawns`);
      continue;
    }

    plan.forEach((type, index) => {
      checkedEnemies++;
      const size = ENEMY_SIZES[type];
      const point = points[index];
      if (!size || !point) {
        fail(`room ${room} enemy ${index + 1} has no validated hitbox or spawn`);
        return;
      }
      const game = spawns.sceneSpawnToGame(point, MAP_WIDTH, MAP_HEIGHT, size);
      if (collision.collidesWithRoomProp(room, MAP_WIDTH, MAP_HEIGHT, game.x, game.y, size, size, 0.22)) {
        fail(`room ${room} enemy ${index + 1} starts inside visible collision geometry`);
      }

      const playerX = 12 * 40 + 20;
      const playerY = 28 * 40 + 20;
      const enemyX = game.x + size / 2;
      const enemyY = game.y + size / 2;
      if (collision.shotBlockedByRoomProp(room, MAP_WIDTH, MAP_HEIGHT, enemyX, enemyY, playerX, playerY, 0.08)) {
        initiallyOccluded++;
      }
    });
  }

  if (errors.length) {
    console.error(`Enemy visibility audit failed with ${errors.length} error(s):`);
    errors.forEach(message => console.error(`  - ${message}`));
    process.exitCode = 1;
  } else {
    console.log(`Enemy visibility audit passed: rooms 14-${chapter.CHAPTER_ROOMS}, ${checkedEnemies} enemy starts, ${initiallyOccluded} initially occluded starts protected by global line-of-sight, room-ready and attack-marker guards.`);
  }
} finally {
  await server.close();
}
