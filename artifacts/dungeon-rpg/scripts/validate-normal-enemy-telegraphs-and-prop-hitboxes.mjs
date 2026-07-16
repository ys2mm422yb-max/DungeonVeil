import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const sourceRoot = path.join(projectRoot, 'src');
const normalTelegraphs = fs.readFileSync(path.join(sourceRoot, 'game/normalEnemyAttackTelegraphs.ts'), 'utf8');
const bridge = fs.readFileSync(path.join(sourceRoot, 'components/GameSessionBridge.tsx'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(normalTelegraphs.includes('return range * 1.18;'), 'Normal enemy presentation must preserve the existing 1.18 runtime hit reach.');
assert(normalTelegraphs.includes('effect.maxRadius = normalEnemyDamageRadius(windup.range);'), 'Normal warning radius must match the real hit radius.');
assert(normalTelegraphs.includes('effect.maxLifeTime = Math.max(1, windup.hitAt - enemy.lastAttackTime);'), 'Normal warning lifetime must match the existing windup.');
assert(normalTelegraphs.includes("enemy.enemyType === 'boss'"), 'Normal enemy adapter must leave boss attacks to their dedicated system.');
assert(!normalTelegraphs.includes('enemy.attack ='), 'Presentation adapter must not alter enemy attack values.');
assert(!normalTelegraphs.includes('enemy.speed ='), 'Presentation adapter must not alter enemy speed.');
assert(!normalTelegraphs.includes('enemy.nextAttackTime ='), 'Presentation adapter must not alter attack cadence.');
assert(!normalTelegraphs.includes('enemy.hp =') && !normalTelegraphs.includes('enemy.maxHp ='), 'Presentation adapter must not alter health balance.');
assert(bridge.includes('installNormalEnemyAttackTelegraphs(initialEngine)'), 'Normal enemy telegraph adapter must be installed.');
assert(bridge.indexOf('disposeBossAttacks();') < bridge.indexOf('disposeNormalAttacks();'), 'Nested attack adapters must be disposed in reverse order.');

const server = await createServer({
  root: projectRoot,
  configFile: false,
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const chapter = await server.ssrLoadModule('/src/game/chapterRun.ts');
  const layouts = await server.ssrLoadModule('/src/game/logicalRoomSetpieces.ts');
  const presentation = await server.ssrLoadModule('/src/game/propPresentation3D.ts');
  let checked = 0;

  for (let room = 1; room <= chapter.CHAPTER_ROOMS; room++) {
    for (const piece of layouts.logicalRoomSetpieces(room)) {
      const collider = presentation.roomPropColliderFootprint(piece);
      if (!collider) continue;
      const visual = presentation.roomPropVisualFootprint(piece);
      assert(visual, `Room ${room}: solid prop has no visible footprint: ${piece.model}`);
      assert(collider.inset >= 0.96, `Room ${room}: collider remains too far inside ${piece.model}`);
      assert(collider.inset <= presentation.MAX_ROOM_PROP_COLLIDER_INSET, `Room ${room}: collider exceeds hard ceiling for ${piece.model}`);
      assert(collider.width <= visual.width + 1e-9, `Room ${room}: collider is wider than visible prop ${piece.model}`);
      assert(collider.height <= visual.height + 1e-9, `Room ${room}: collider is deeper than visible prop ${piece.model}`);
      checked += 1;
    }
  }

  assert(checked > 100, `Expected broad 50-room collider coverage, checked only ${checked}.`);
  console.log(`Normal enemy telegraph and prop hitbox audit passed: ${checked} solid props checked across all rooms.`);
} finally {
  await server.close();
}
