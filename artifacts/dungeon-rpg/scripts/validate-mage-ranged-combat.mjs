import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const mageSource = read('src/game/mageRangedCombat.ts');
const normalSource = read('src/game/normalEnemyAttackTelegraphs.ts');
const engineSource = read('src/game/runEngine.ts');
const canvasSource = read('src/components/GameCanvasKayKit3D.tsx');
const bossSource = read('src/game/bossAttackTelegraphs.ts');

assert(mageSource.includes("profile.family === 'adventurer' && profile.role === 'mage'"), 'Ranged combat is not limited to visible hat-mage models.');
assert(mageSource.includes("if (enemy.enemyType === 'boss') return false"), 'Bosses can be accidentally converted to the normal mage projectile contract.');
assert(mageSource.includes('shot-mage-') && mageSource.includes("type: 'beam'") && mageSource.includes("element: 'arcane'"), 'Hat mages lack a renderer-visible arcane projectile.');
assert(mageSource.includes('Math.hypot(target.x - projectile.x, target.y - projectile.y) <= hitRadius'), 'Mage damage is not tied to projectile collision.');
assert(mageSource.includes('time > player.invincibleUntil'), 'Dash invulnerability does not protect against mage projectiles.');
assert(mageSource.includes('runtime.shotPathBlocked(previousX, previousY, projectile.x, projectile.y'), 'Mage projectiles can pass through room geometry.');
assert(normalSource.includes('installMageRangedCombat(engine)') && normalSource.includes('disposeMageRangedCombat()'), 'Mage runtime is not installed and disposed with normal enemy combat.');
assert(canvasSource.includes("effect.id.startsWith('shot-')"), 'The established projectile renderer no longer accepts shot-mage effects.');
assert(!engineSource.includes('MAGE_PROJECTILE_SPEED'), 'Core runEngine was modified instead of keeping mage combat isolated.');
assert(bossSource.includes('bossAttackContract(engine.state.floor)'), 'Existing boss attack contracts were changed or removed.');

const server = await createServer({
  root,
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const mage = await server.ssrLoadModule('/src/game/mageRangedCombat.ts');
  const runtime = await server.ssrLoadModule('/src/game/runEngine.ts');

  const enemy = (room, index, enemyType = 'skeleton') => ({
    id: `audit-${room}-${index}`,
    type: 'enemy',
    enemyType,
    x: 0,
    y: 0,
    width: 26,
    height: 26,
    vx: 0,
    vy: 0,
    hp: 50,
    maxHp: 50,
    attack: 8,
    defense: 2,
    speed: 72,
    color: '#ffffff',
    state: 'chase',
    isDead: false,
    targetX: 0,
    targetY: 0,
    nextAttackTime: 0,
    flashUntil: 0,
    spawnTime: 0,
    lastAttackTime: 0,
    deathTime: 0,
  });

  assert(mage.isHatMageEnemy(11, enemy(11, 0)) === true, 'Room 11 visible hat mage is not ranged.');
  assert(mage.isHatMageEnemy(11, enemy(11, 1)) === false, 'Room 11 rogue was incorrectly converted to a mage.');
  assert(mage.isHatMageEnemy(1, enemy(1, 0, 'vampire')) === false, 'A creature/bat mage role was incorrectly treated as a hat mage.');
  assert(mage.isHatMageEnemy(20, enemy(20, 0, 'boss')) === false, 'Room 20 boss was removed from its existing boss contract.');
  assert(mage.isHatMageEnemy(35, enemy(35, 0)) === true, 'Later visible hat mages are not ranged.');

  const far = mage.mageMovementVector(0, 0, 300, 0, 1);
  const near = mage.mageMovementVector(0, 0, 60, 0, 1);
  assert(far.x > 0, 'A distant hat mage no longer approaches casting range.');
  assert(near.x < 0, 'A nearby hat mage no longer retreats from the player.');
  assert(mage.mageAttackDelay(1) === mage.MAGE_ATTACK_DELAY_MS, 'Room 1 mage cadence changed unexpectedly.');
  assert(mage.mageAttackDelay(50) >= 1040, 'Late mage cadence became too fast.');

  const game = new runtime.GameEngine();
  game.state.floor = 11;
  game.state.chapter = 1;
  const player = game.state.player;
  player.hp = 100;
  player.maxHp = 100;
  player.defense = 0;
  player.invincibleUntil = 0;
  const testMage = enemy(11, 0);
  testMage.x = player.x + 92;
  testMage.y = player.y;
  testMage.spawnTime = 0;
  game.state.enemies = [testMage];

  const internal = game;
  internal.shotPathBlocked = () => false;
  const dispose = mage.installMageRangedCombat(game);
  try {
    internal.updateEnemies(16, 1000);
    internal.updateEnemies(16, 1500);
    assert(testMage.lastAttackTime === 1500, 'Hat mage did not enter its cast animation.');
    assert(game.state.effects.some(effect => effect.id.startsWith('mage-cast-')), 'Hat mage cast has no visible warning.');
    const hpAtCast = player.hp;

    internal.updateEnemies(16, 1950);
    assert(player.hp === hpAtCast, 'Mage dealt damage immediately when the spell was released.');
    assert(game.state.effects.some(effect => effect.id.startsWith('shot-mage-')), 'Travelling mage projectile was not created.');

    player.invincibleUntil = 3000;
    for (let time = 2000; time <= 2600; time += 50) internal.updateEnemies(50, time);
    assert(player.hp === hpAtCast, 'Dash invulnerability failed to avoid a mage projectile.');
    assert(!game.state.effects.some(effect => effect.id.startsWith('shot-mage-')), 'Dodged mage projectile remained alive after contact.');

    player.invincibleUntil = 0;
    for (let time = 2750; time <= 3800; time += 50) internal.updateEnemies(50, time);
    assert(player.hp < hpAtCast, 'Mage projectile collision did not damage a non-invincible player.');
  } finally {
    dispose();
  }
} finally {
  await server.close();
}

console.log('Hat mages keep range, cast visible travelling projectiles, damage only on collision, and respect dash invulnerability.');
