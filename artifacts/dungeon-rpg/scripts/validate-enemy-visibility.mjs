import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const ROOT = process.cwd();
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
  const identities = await server.ssrLoadModule('/src/game/enemyRegionalIdentity.ts');

  const [engineSource, hostCanvasSource, rendererSource, overlaySource, enemyVisualSource] = await Promise.all([
    readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/GameCanvas.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/GameCanvasKayKit3D.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/CombatFeedbackOverlay.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/kaykitEnemy3D.ts', import.meta.url), 'utf8'),
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
    'const canAttackFromHere = dist <= attackRange && hasLineOfSight && visualSpawnGracePassed;',
    'if (canAttackFromHere && time > enemy.nextAttackTime)',
  ]) {
    if (!engineSource.includes(required)) fail(`missing global enemy attack guard: ${required}`);
  }

  if (!hostCanvasSource.includes("const renderedRoomKeyRef = useRef('');")) {
    fail('initial continued rooms can begin before their visual staging pass');
  }
  const enemyPreloads = hostCanvasSource.match(/preloadKayKitEnemyVisuals\(\)/g) ?? [];
  if (enemyPreloads.length < 2) {
    fail(`enemy library is not preloaded for initial and next-room staging (found ${enemyPreloads.length} calls)`);
  }

  for (const required of [
    'const enemyFallbacks = new Map<string, any>();',
    'const createEnemyFallback = (enemy:',
    'EnemyVisibilityFallback_',
    'EnemyVisibilitySafety_',
    'const enemySafetyShells = new Map<string, any>();',
    'const requiresPermanentSafety = state.floor >= 13 && !enemy.isDead;',
    'shell.userData.visibilitySafety = true;',
    'KayKit enemy failed; keeping visibility fallback',
  ]) {
    if (!rendererSource.includes(required)) fail(`missing global enemy visibility fallback guard: ${required}`);
  }

  if (!enemyVisualSource.includes('node.frustumCulled = false;')) {
    fail('enemy meshes can still disappear through stale Chrome/iPad frustum bounds');
  }
  if (!enemyVisualSource.includes('new URL(normalized, document.baseURI).toString()')) {
    fail('imported enemy assets are not resolved against the GitHub Pages base path');
  }
  if (enemyVisualSource.includes('loadAsync(config.path)')) {
    fail('imported enemies still use a root-relative asset URL');
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
  const focusRooms = [];

  for (let room = 1; room <= chapter.CHAPTER_ROOMS; room++) {
    checkedRooms++;
    const map = chapter.generateRunRoom(room);
    const boss = chapter.isBossRoom(room);
    const plan = boss ? ['boss'] : encounters.getEncounterPlan(room);
    const points = spawns.getRoomSpawnPoints(room);
    if (points.length < plan.length) {
      fail(`room ${room} requires ${plan.length} enemies but has only ${points.length} safe spawns`);
      continue;
    }

    let roomOccluded = 0;
    plan.forEach((type, index) => {
      checkedEnemies++;
      const size = ENEMY_SIZES[type];
      const point = points[index];
      const profile = identities.enemyVisualProfile(room, type, index);
      if (!size || !point) {
        fail(`room ${room} enemy ${index + 1} has no validated hitbox or spawn`);
        return;
      }
      if (!profile?.family || !profile?.role) {
        fail(`room ${room} enemy ${index + 1} (${type}) has no visual profile`);
      }
      if (Math.abs(point.x) > (boss ? 7.2 : 4.25) || point.z < -6.6 || point.z > 5.5) {
        fail(`room ${room} enemy ${index + 1} (${type}) spawns outside the visible combat staging zone`);
      }

      const game = spawns.sceneSpawnToGame(point, map.width, map.height, size);
      if (!Number.isFinite(game.x) || !Number.isFinite(game.y)) {
        fail(`room ${room} enemy ${index + 1} has non-finite runtime coordinates`);
        return;
      }
      if (collision.collidesWithRoomProp(room, map.width, map.height, game.x, game.y, size, size, 0.22)) {
        fail(`room ${room} enemy ${index + 1} starts inside visible collision geometry`);
      }

      const playerX = map.startX * 40 + 20;
      const playerY = map.startY * 40 + 20;
      const enemyX = game.x + size / 2;
      const enemyY = game.y + size / 2;
      if (collision.shotBlockedByRoomProp(room, map.width, map.height, enemyX, enemyY, playerX, playerY, 0.08)) {
        initiallyOccluded++;
        roomOccluded++;
      }
    });

    if (room === 15 || room === 16) {
      focusRooms.push(`room ${room}: ${plan.length} enemies, ${points.length} safe spawns, ${roomOccluded} initially occluded, fallback guaranteed during model load/failure`);
    }
  }

  if (checkedRooms !== 50) fail(`expected 50 audited rooms, checked ${checkedRooms}`);
  if (focusRooms.length !== 2) fail('rooms 15 and 16 were not both included in the visibility audit');

  focusRooms.forEach(summary => console.log(`Enemy visibility focus: ${summary}`));

  if (errors.length) {
    console.error(`Enemy visibility audit failed with ${errors.length} error(s):`);
    errors.forEach(message => console.error(`  - ${message}`));
    process.exitCode = 1;
  } else {
    console.log(`Enemy visibility audit passed: all ${checkedRooms} rooms, ${checkedEnemies} enemy starts and ${initiallyOccluded} initially occluded starts are protected by safe spawns, line-of-sight guards, non-culled meshes, permanent room 13+ safety shells and visible loading/error fallbacks.`);
  }
} finally {
  await server.close();
}
