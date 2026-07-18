import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const authority = read('src/game/coopEnemyAuthority.ts');
const realtime = read('src/game/coopRealtimePresence.ts');
const bridge = read('src/components/CoopRunRealtimeBridge.tsx');
const page = read('src/pages/game.tsx');
const engine = read('src/game/runEngine.ts');

assert(authority.includes('MAX_ENEMY_SNAPSHOT_COUNT = 32'), 'Enemy snapshots are not bounded for mobile clients.');
assert(authority.includes('MAX_GUEST_HIT_DAMAGE = 500') && authority.includes('MAX_GUEST_ATTACK_RANGE = 760'), 'Guest hit validation lacks explicit damage or range limits.');
assert(authority.includes('intent.chapter !== state.chapter') && authority.includes('intent.room !== state.floor'), 'Guest hits are not isolated by chapter and room.');
assert(authority.includes('remote.userId !== intent.userId') && authority.includes('MAX_GUEST_POSITION_DRIFT'), 'Guest hit origin is not tied to the latest authenticated presence.');
assert(authority.includes('candidate.id === intent.targetId') && authority.includes('candidate.hp > 0') && authority.includes('!candidate.isDead'), 'Guest hit target validation accepts absent or dead enemies.');
assert(authority.includes('applyCoopEnemySnapshot') && authority.includes('snapshot.chapter !== state.chapter'), 'Guest enemy snapshots are not room-scoped.');

assert(realtime.includes("sendBroadcast('enemy_snapshot'") && realtime.includes("sendBroadcast('enemy_hit_intent'") && realtime.includes("sendBroadcast('player_damage'"), 'Realtime transport lacks the enemy authority messages.');
assert(realtime.includes("this.options.context.role !== 'host'") && realtime.includes("this.options.context.role !== 'guest'"), 'Enemy messages are not role-gated.');
assert(realtime.includes('latestRemoteEnemySequence') && realtime.includes('latestRemoteHitSequence') && realtime.includes('latestRemoteDamageSequence'), 'Enemy messages lack independent sequence protection.');
assert(realtime.includes("event === 'enemy_snapshot'") && realtime.includes("event === 'enemy_hit_intent'") && realtime.includes("event === 'player_damage'"), 'Enemy messages are not consumed by the realtime client.');

assert(bridge.includes('const ENEMY_PUBLISH_MS = 100'), 'Host enemy snapshots are not published at 10 Hz.');
assert(bridge.includes("context.role === 'guest'") && bridge.includes('installGuestEnemyAuthority'), 'Guest authority mode is not installed only for guests.');
assert(bridge.includes('internals.updateEnemies = () => {}') && bridge.includes('internals.updateRoomFlow = () => {}'), 'Guest still simulates enemies or advances rooms locally.');
assert(bridge.includes('enemy.hp = hp') && bridge.includes('publishEnemyHitIntent'), 'Guest attacks can still mutate local enemy HP.');
assert(bridge.includes('restoreAuthority()') && bridge.includes('internals.updateEnemies = originalUpdateEnemies'), 'Private engine overrides are not fully restored when leaving duo.');
assert(bridge.includes('installHostRemoteTargeting') && bridge.includes('remotePlayerProxy'), 'Host does not include the remote player in enemy target selection.');
assert(bridge.includes("remote.lifeState === 'alive'"), 'Host can target a downed or fallen remote player.');
assert(bridge.includes('publishPlayerDamage') && bridge.includes('applyGuestDamage'), 'Host-authoritative attacks cannot damage the selected guest.');
assert(bridge.includes('validateCoopEnemyHitIntent') && bridge.includes('internals.damageEnemy.call'), 'Host does not validate and apply guest hit intents.');
assert(bridge.includes('createCoopEnemySnapshot') && bridge.includes('applyCoopEnemySnapshot'), 'Host snapshots are not created and applied.');

assert(page.includes("active={uiState === 'game' && Boolean(duoContext)}"), 'Enemy authority bridge can activate outside a duo run.');
assert(engine.includes('const ENEMY_STATS') && !authority.includes('ENEMY_STATS') && !bridge.includes('chapterScale') && !bridge.includes('roomScale'), 'Coop authority changes solo enemy balance instead of only authority.');
assert(!realtime.includes("sendBroadcast('loot"), 'Enemy/lifecycle transport must not synchronize loot.');

const server = await createServer({ root, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const module = await server.ssrLoadModule('/src/game/coopEnemyAuthority.ts');
  const expected = { lobbyId: 'duo-a', runSeed: 77 };
  const enemy = {
    id: 'spawn-1-0', enemyType: 'goblin', x: 180, y: 160, width: 30, height: 30, vx: 1, vy: 0,
    hp: 100, maxHp: 100, attack: 8, defense: 1, speed: 68, color: '#89a94b', state: 'chase', isDead: false,
    targetX: 180, targetY: 160, nextAttackTime: 0, flashUntil: 0, spawnTime: 1, lastAttackTime: 0, deathTime: 0,
  };
  const snapshot = module.normalizeCoopEnemySnapshot({
    version: 1, lobbyId: 'duo-a', runSeed: 77, userId: 'host', chapter: 1, room: 1,
    roomClearReady: false, enemies: [enemy], sequence: 4, sentAt: 1000,
  }, expected, 'guest');
  assert(snapshot?.enemies.length === 1 && snapshot.enemies[0].id === enemy.id, 'Valid host enemy snapshot was rejected.');
  assert(module.normalizeCoopEnemySnapshot({ ...snapshot, lobbyId: 'foreign' }, expected, 'guest') === null, 'Foreign lobby enemy snapshot was accepted.');

  const intent = module.normalizeCoopEnemyHitIntent({
    version: 1, lobbyId: 'duo-a', runSeed: 77, userId: 'guest', chapter: 1, room: 1,
    targetId: enemy.id, damage: 9999, element: 'fire', playerX: 116, playerY: 116, sequence: 3, sentAt: 1200,
  }, expected, 'host');
  assert(intent?.damage === 500, 'Guest hit normalization does not enforce the hard damage cap.');
  const state = { chapter: 1, floor: 1, enemies: [{ ...enemy, type: 'enemy' }], roomClearReady: false };
  const remote = { userId: 'guest', chapter: 1, room: 1, x: 100, y: 100, receivedAt: Date.now() };
  const accepted = module.validateCoopEnemyHitIntent(intent, state, remote);
  assert(accepted?.enemy.id === enemy.id && accepted.damage === 45, 'Host validation does not clamp damage against target max HP.');
  assert(module.validateCoopEnemyHitIntent({ ...intent, playerX: 900 }, state, remote) === null, 'Spoofed guest attack origin was accepted.');

  const guestState = { chapter: 1, floor: 1, enemies: [], roomClearReady: false };
  assert(module.applyCoopEnemySnapshot(guestState, snapshot) === true && guestState.enemies.length === 1, 'Guest did not adopt the host enemy snapshot.');
  assert(module.applyCoopEnemySnapshot({ ...guestState, floor: 2 }, snapshot) === false, 'Guest applied an enemy snapshot from another room.');
} finally {
  await server.close();
}

console.log('The host remains authoritative for duo enemies while the separate lifecycle block owns player defeat and revival.');
