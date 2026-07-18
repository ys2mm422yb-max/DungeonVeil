import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const duo = read('src/game/coopDuoBalance.ts');
const authority = read('src/game/coopEnemyAuthority.ts');
const rewards = read('src/game/chapterRewardContract.ts');
const session = read('src/components/GameSessionBridge.tsx');
const spawns = read('src/game/roomSpawn3D.ts');
const engine = read('src/game/runEngine.ts');

assert(duo.includes('DUO_NORMAL_HP_MULTIPLIER = 1.65'), 'Normal duo enemy HP multiplier is not 1.65.');
assert(duo.includes('DUO_ELITE_HP_MULTIPLIER = 1.8'), 'Elite duo enemy HP multiplier is not 1.8.');
assert(duo.includes('DUO_BOSS_HP_MULTIPLIER = 2'), 'Boss duo HP multiplier is not 2.0.');
assert(duo.includes('DUO_ENEMY_ATTACK_MULTIPLIER = 1.12'), 'Duo enemy attack multiplier is not 1.12.');
assert(duo.includes('DUO_ENEMY_COUNT_MULTIPLIER = 1.25'), 'Duo enemy count multiplier is not 1.25.');
assert(duo.includes('DUO_MOBILE_ENEMY_CAP = 12'), 'Duo mobile enemy cap is not 12.');
assert(duo.includes('DUO_BOSS_SUPPORT_COUNT = 2'), 'Boss support wave is not limited to two enemies.');
assert(duo.includes('DUO_CURRENCY_MULTIPLIER = 1.25'), 'Duo currency multiplier is not 1.25.');
assert(duo.includes('balanceMemory = new WeakMap') && duo.includes('scaledEnemyIds'), 'Duo balance is not idempotent per state, room and enemy.');
assert(duo.includes('getDuoRoomSpawnPoints') && duo.includes('collidesWithRoomProp') && duo.includes('isWalkable'), 'Extra enemies do not use the mobile-safe collision-checked spawn path.');
assert(spawns.includes('export function getDuoRoomSpawnPoints') && spawns.includes('requestedCount ?? (boss ? 1 : 8)'), 'Separate duo spawn capacity changed the solo spawn contract.');
assert(authority.includes('ensureDuoRoomBalance(state, context.runSeed)') && authority.indexOf('ensureDuoRoomBalance(state, context.runSeed)') < authority.indexOf('enemies: state.enemies'), 'Host snapshot does not apply duo balance before serialization.');

assert(rewards.includes('currencyMultiplier?: number') && rewards.includes('rewardRunId?: string'), 'Room rewards lack optional duo scaling and isolated ledger options.');
assert(rewards.includes('const multiplier = Math.max(1, Math.min(2') && rewards.includes('normalized.rewardRunId || meta.currentRunId'), 'Reward options are not bounded or ledger-isolated.');
assert(rewards.includes('xp: baseAmounts.xp') && rewards.includes('dust: Math.round(baseAmounts.dust * normalized.multiplier)') && rewards.includes('gold: Math.round(baseAmounts.gold * normalized.multiplier)'), 'Duo reward scaling changes XP or fails to scale currency.');
assert(session.includes("dataset.dungeonVeilRunMode === 'duo'") && session.includes('currencyMultiplier: DUO_CURRENCY_MULTIPLIER'), 'Game session does not select duo rewards only in duo mode.');
assert(session.includes('rewardRunId: duoRewardRunIdRef.current') && session.includes('spawnRoomEquipmentReward'), 'Duo rewards do not use an isolated ledger or individual equipment delivery.');

assert(!engine.includes('DUO_NORMAL_HP_MULTIPLIER') && !engine.includes('DUO_CURRENCY_MULTIPLIER'), 'Duo balance leaked into the solo engine.');
assert(!duo.includes('player.attack *=') && !duo.includes('player.maxHp *='), 'Duo balance changes player or solo stats.');

const server = await createServer({ root, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const balance = await server.ssrLoadModule('/src/game/coopDuoBalance.ts');
  const chapter = await server.ssrLoadModule('/src/game/chapterRun.ts');
  const spawnModule = await server.ssrLoadModule('/src/game/roomSpawn3D.ts');

  const makeEnemy = (id, type, hp = 100, attack = 10, elite = false) => ({
    id, type: 'enemy', enemyType: type, x: 160, y: 160, width: 30, height: 30, vx: 0, vy: 0,
    hp, maxHp: hp, attack, defense: 1, speed: 60, color: '#fff', state: 'chase', targetX: 160, targetY: 160,
    nextAttackTime: 0, flashUntil: 0, spawnTime: 0, lastAttackTime: 0, deathTime: 0, deathDuration: 680,
    isDead: false, isElite: elite, lastHitTime: 0, burnUntil: 0, nextBurnTick: 0, frostUntil: 0, frostSlow: 0,
    lastProgressX: 160, lastProgressY: 160, lastProgressTime: 0,
  });
  const stateFor = (floor, enemies) => ({
    status: 'playing', floor, chapter: 1, map: chapter.generateRunRoom(floor), inDungeon: true,
    player: { x: 0, y: 0 }, enemies, items: [], chests: [], damageNumbers: [], particles: [], effects: [],
    upgradeChoices: [], runSkills: {}, killCount: 0, camera: { x: 0, y: 0 }, roomClearReady: false,
    roomClearAt: 0, exitHintUntil: 0, exitHintCount: 0,
  });

  const normal = stateFor(1, [0, 1, 2, 3].map(index => makeEnemy(`normal-${index}`, 'goblin')));
  const firstNormal = balance.ensureDuoRoomBalance(normal, 91);
  assert(normal.enemies[0].maxHp === 165 && normal.enemies[0].attack === 11, 'Normal enemy duo scaling is incorrect.');
  assert(firstNormal.originalEnemyCount === 4 && firstNormal.finalEnemyCount === 5, 'Normal room does not add approximately 25 percent enemies.');
  const supportBefore = normal.enemies.at(-1).maxHp;
  balance.ensureDuoRoomBalance(normal, 91);
  assert(normal.enemies.at(-1).maxHp > supportBefore, 'Added support enemy is not scaled after its baseline pass.');
  const stableHp = normal.enemies.map(enemy => enemy.maxHp).join(',');
  balance.ensureDuoRoomBalance(normal, 91);
  assert(normal.enemies.map(enemy => enemy.maxHp).join(',') === stableHp && normal.enemies.length === 5, 'Duo scaling compounds on repeated updates.');

  const elite = stateFor(8, [makeEnemy('elite-0', 'orc', 100, 10, true)]);
  balance.ensureDuoRoomBalance(elite, 92);
  assert(elite.enemies[0].maxHp === 180, 'Elite enemy duo HP scaling is incorrect.');

  const boss = stateFor(10, [makeEnemy('boss-0', 'boss', 100, 10)]);
  const firstBoss = balance.ensureDuoRoomBalance(boss, 93);
  assert(boss.enemies[0].maxHp === 200 && firstBoss.finalEnemyCount === 3, 'Boss HP or limited support wave is incorrect.');
  balance.ensureDuoRoomBalance(boss, 93);
  assert(boss.enemies.length === 3, 'Boss support wave compounds.');

  const crowded = stateFor(9, Array.from({ length: 11 }, (_, index) => makeEnemy(`crowded-${index}`, 'skeleton')));
  balance.ensureDuoRoomBalance(crowded, 94);
  assert(crowded.enemies.length <= 12, 'Duo enemy count exceeds the mobile cap.');

  assert(balance.duoCurrencyReward(100) === 125 && balance.duoCurrencyReward(5) === 6, 'Duo currency rounding is incorrect.');
  assert(balance.createDuoRewardRunId().startsWith('duo-'), 'Duo reward ledger id is not isolated.');

  const soloPoints = spawnModule.getRoomSpawnPoints(1);
  const duoPoints = spawnModule.getDuoRoomSpawnPoints(1, 12);
  assert(soloPoints.length === 8 && duoPoints.length === 12, 'Duo spawn capacity changes the solo point count or misses its cap.');
} finally {
  await server.close();
}

console.log('Coop block 6 applies bounded host-authoritative HP, attack, count and boss pressure with isolated +25% currency and individual equipment rewards while solo stays unchanged.');
