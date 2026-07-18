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

  const [engineSource, hostCanvasSource, rendererSource, overlaySource, enemyVisualFacadeSource, enemyVisualBaseSource, viteSource] = await Promise.all([
    readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/GameCanvas.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/GameCanvasKayKit3D.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/CombatFeedbackOverlay.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/kaykitEnemy3D.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/kaykitEnemyBase3D.ts', import.meta.url), 'utf8'),
    readFile(new URL('../vite.config.ts', import.meta.url), 'utf8'),
  ]);
  const enemyVisualSource = `${enemyVisualFacadeSource}\n${enemyVisualBaseSource}`;

  const playerDamageWrites = engineSource.match(/\bp\.hp\s*-=/g) ?? [];
  if (playerDamageWrites.length !== 1) fail(`expected exactly one player damage write, found ${playerDamageWrites.length}`);

  const lineOfSightGuard = engineSource.indexOf('if (this.shotPathBlocked(attackFromX, attackFromY, attackTargetX, attackTargetY, 0.08)) return;');
  const damageWrite = engineSource.indexOf('p.hp -= damage;');
  if (lineOfSightGuard < 0 || damageWrite < 0 || lineOfSightGuard > damageWrite) fail('enemy damage lacks the final room-geometry line-of-sight check');

  for (const required of [
    'const visualSpawnGracePassed = time - enemy.spawnTime >= 900;',
    'const canAttackFromHere = dist <= plan.attackRange && hasLineOfSight && visualSpawnGracePassed;',
    'if (canAttackFromHere && time > enemy.nextAttackTime)',
  ]) {
    if (!engineSource.includes(required)) fail(`missing global enemy attack guard: ${required}`);
  }

  for (const required of [
    "const renderedRoomKeyRef = useRef('');",
    'const [renderState, setRenderState] = useState(gameState);',
    'currentRoomEnemyTypes(gameState)',
    'preloadKayKitEnemyVisuals(requiredEnemyTypes)',
    'preloadKayKitEnemyVisuals(plannedRoomEnemyTypes(nextFloor))',
    'keeping previous room visible',
  ]) {
    if (!hostCanvasSource.includes(required)) fail(`missing complete-room enemy staging guard: ${required}`);
  }
  if (hostCanvasSource.includes('useState<GameState | null>(null)')) fail('whole 3D canvas is hidden while models load');

  for (const required of [
    "name: 'dungeon-veil-dedicated-enemy-models-only'",
    ".replace(safetyNeedle, '        const requiresPermanentSafety = false;')",
    '.replace(ENEMY_FALLBACK_BLOCK, ENEMY_DEDICATED_MODEL_BLOCK)',
    "throw new Error('Enemy fallback creation contract changed; refusing to build generic enemy bodies')",
  ]) {
    if (!viteSource.includes(required)) fail(`missing dedicated-model-only build guard: ${required}`);
  }
  if (!rendererSource.includes('const createEnemyFallback = (enemy:')) fail('renderer fallback source changed without updating the fail-closed build transform');

  if (!enemyVisualSource.includes('node.frustumCulled = false;')) fail('enemy meshes can disappear through stale mobile frustum bounds');
  if (!enemyVisualSource.includes('new URL(normalized, document.baseURI).toString()')) fail('enemy assets are not resolved against the GitHub Pages base path');
  if (enemyVisualSource.includes('loadAsync(config.path)')) fail('imported enemies still use root-relative asset URLs');

  if (!overlaySource.includes("kind: 'fire' | 'ice' | 'attack'")) fail('attack-source overlay marker is missing');
  if (!overlaySource.includes('dv-attack-warning')) fail('attack-source overlay styling is missing');

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
      if (!profile?.family || !profile?.role) fail(`room ${room} enemy ${index + 1} (${type}) has no visual profile`);
      if (Math.abs(point.x) > (boss ? 7.2 : 4.25) || point.z < -6.6 || point.z > 5.5) fail(`room ${room} enemy ${index + 1} (${type}) spawns outside the visible combat zone`);

      const game = spawns.sceneSpawnToGame(point, map.width, map.height, size);
      if (!Number.isFinite(game.x) || !Number.isFinite(game.y)) {
        fail(`room ${room} enemy ${index + 1} has non-finite runtime coordinates`);
        return;
      }
      if (collision.collidesWithRoomProp(room, map.width, map.height, game.x, game.y, size, size, 0.22)) fail(`room ${room} enemy ${index + 1} starts inside collision geometry`);

      const playerX = map.startX * 40 + 20;
      const playerY = map.startY * 40 + 20;
      const enemyX = game.x + size / 2;
      const enemyY = game.y + size / 2;
      if (collision.shotBlockedByRoomProp(room, map.width, map.height, enemyX, enemyY, playerX, playerY, 0.08)) {
        initiallyOccluded++;
        roomOccluded++;
      }
    });

    if (room === 15 || room === 16) focusRooms.push(`room ${room}: ${plan.length} enemies, ${points.length} safe spawns, ${roomOccluded} initially occluded, dedicated models staged before activation`);
  }

  if (checkedRooms !== 50) fail(`expected 50 audited rooms, checked ${checkedRooms}`);
  if (focusRooms.length !== 2) fail('rooms 15 and 16 were not both audited');
  focusRooms.forEach(summary => console.log(`Enemy visibility focus: ${summary}`));

  if (errors.length) {
    console.error(`Enemy visibility audit failed with ${errors.length} error(s):`);
    errors.forEach(message => console.error(`  - ${message}`));
    process.exitCode = 1;
  } else {
    console.log(`Enemy visibility audit passed: ${checkedRooms} rooms and ${checkedEnemies} enemy starts retain safe spawns, LOS guards, non-culled meshes, an always-mounted canvas and a production build without colored enemy bodies.`);
  }
} finally {
  await server.close();
}
