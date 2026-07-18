import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const lifecycle = read('src/game/coopLifeCycle.ts');
const realtime = read('src/game/coopRealtimePresence.ts');
const bridge = read('src/components/CoopRunRealtimeBridge.tsx');
const page = read('src/pages/game.tsx');
const engine = read('src/game/runEngine.ts');

assert(lifecycle.includes('COOP_DOWNED_DURATION_MS = 20_000'), 'Downed window is not exactly 20 seconds.');
assert(lifecycle.includes('COOP_REVIVE_HOLD_MS = 3_000'), 'Revive hold is not exactly three seconds.');
assert(lifecycle.includes('COOP_REVIVE_RANGE = 112'), 'Revive range is not explicitly bounded.');
assert(lifecycle.includes('COOP_REVIVE_HP_RATIO = 0.35'), 'Direct revive does not restore 35 percent HP.');
assert(lifecycle.includes('COOP_ROOM_RESPAWN_HP_RATIO = 0.25'), 'Next-room recovery does not restore 25 percent HP.');
assert(lifecycle.includes('COOP_MAX_REVIVES_PER_ROOM = 1'), 'Per-room direct revives are not capped at one.');
assert(lifecycle.includes('COOP_REVIVE_INVULNERABLE_MS = 2_000'), 'Revived players lack the two-second protection window.');
assert(lifecycle.includes("CoopLifeState = 'alive' | 'downed' | 'fallen'"), 'Lifecycle states are incomplete.');
assert(lifecycle.includes("local !== 'alive' && remote !== 'alive'"), 'Team defeat does not require both players to be non-alive.');
assert(lifecycle.includes('Math.hypot(reviver.x - target.x') && lifecycle.includes('target.revivesUsed >= COOP_MAX_REVIVES_PER_ROOM'), 'Revive validation ignores range or per-room cap.');

for (const event of ['revive_request', 'revive_confirm', 'team_game_over', 'team_retry', 'room_advance_request']) {
  assert(realtime.includes(`'${event}'`), `Realtime transport lacks ${event}.`);
}
assert(realtime.includes("this.options.context.role !== 'guest'") && realtime.includes("this.options.context.role !== 'host'"), 'Lifecycle messages are not role-gated.');
assert(realtime.includes('latestRemoteReviveRequestSequence') && realtime.includes('latestRemoteReviveConfirmSequence'), 'Revive messages lack independent sequence protection.');
assert(realtime.includes('latestRemoteTeamGameOverSequence') && realtime.includes('latestRemoteTeamRetrySequence'), 'Team defeat or retry lacks sequence protection.');
assert(realtime.includes('latestRemoteRoomAdvanceSequence'), 'Room advance requests lack sequence protection.');
assert(realtime.includes('lifeState: presence.lifeState') && realtime.includes('revivesUsed: presence.revivesUsed') && realtime.includes('downedUntil: presence.downedUntil'), 'Player presence does not carry the lifecycle contract.');

assert(bridge.includes('installDuoLifeCycle') && bridge.includes('restoreLifeCycle()'), 'Duo lifecycle interception is not installed and fully restored.');
assert(bridge.includes("state.status === 'gameover'") && bridge.includes('onDowned()'), 'Local duo death is not converted into a downed state.');
assert(bridge.includes("if (revivesUsedRef.current >= COOP_MAX_REVIVES_PER_ROOM) setLife('fallen')"), 'A second death in the same room does not become fallen.');
assert(bridge.includes("if (remaining <= 0) setLife('fallen')"), 'Expired downed state does not become fallen.');
assert(bridge.includes('coopReviveHp(player.maxHp)') && bridge.includes('coopRoomRespawnHp(player.maxHp)'), 'Direct and next-room recovery use the wrong HP contracts.');
assert(bridge.includes('player.invincibleUntil = performance.now() + COOP_REVIVE_INVULNERABLE_MS'), 'Revive protection is not applied.');
assert(bridge.includes('data-testid="coop-revive-control"') && bridge.includes('onPointerDown={startReviveHold}'), 'Mobile hold-to-revive control is missing.');
assert(bridge.includes('COOP_REVIVE_HOLD_MS') && bridge.includes('canReviveCurrentRemote()'), 'Revive hold is not continuously range-validated.');
assert(bridge.includes('data-testid="coop-local-life-state"') && bridge.includes('data-testid="coop-team-game-over"'), 'Downed/fallen or shared defeat UI is missing.');
assert(bridge.includes("context.role === 'host'") && bridge.includes('data-testid="coop-team-retry"'), 'Only the host is not clearly responsible for shared retry.');
assert(bridge.includes('publishTeamRetry') && bridge.includes('onTeamRetry'), 'Shared retry is not synchronized.');
assert(bridge.includes('publishRoomAdvanceRequest') && bridge.includes('onRoomAdvanceRequest'), 'Guest-to-host room advance is missing.');
assert(bridge.includes('playerAtExit(engine.state, remote.x, remote.y)'), 'Host accepts room advance without verifying the guest at the exit.');
assert(bridge.includes('advanceGuestForSnapshot') && bridge.includes('coopNextRoom'), 'Guest does not follow the host into the next room.');
assert(bridge.includes('clearEngineInput(engine)') && bridge.includes("localLifeRef.current !== 'alive'"), 'Downed/fallen players can still fight or move.');

assert(page.includes("active={uiState === 'game' && Boolean(duoContext)}"), 'Lifecycle bridge can activate outside a duo run.');
assert(engine.includes("status: 'playing' | 'gameover' | 'levelup' | 'paused'"), 'Solo engine status contract was modified for duo lifecycle.');
assert(!engine.includes('COOP_DOWNED_DURATION_MS') && !engine.includes('COOP_REVIVE_HOLD_MS'), 'Duo lifecycle leaked into the solo engine.');
assert(!realtime.includes("sendBroadcast('loot"), 'Lifecycle block must not synchronize loot or rewards.');

const server = await createServer({ root, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const module = await server.ssrLoadModule('/src/game/coopLifeCycle.ts');
  assert(module.coopReviveHp(100) === 35, '35 percent revive HP calculation is wrong.');
  assert(module.coopRoomRespawnHp(100) === 25, '25 percent room recovery calculation is wrong.');
  assert(module.coopDownedUntil(1000) === 21_000, 'Downed timeout calculation is wrong.');
  assert(JSON.stringify(module.coopNextRoom(49, 2)) === JSON.stringify({ room: 50, chapter: 2 }), 'Normal room progression is wrong.');
  assert(JSON.stringify(module.coopNextRoom(50, 2)) === JSON.stringify({ room: 1, chapter: 3 }), 'Chapter progression is wrong.');

  const reviver = { userId: 'host', chapter: 1, room: 8, x: 100, y: 100, lifeState: 'alive', revivesUsed: 0 };
  const target = { userId: 'guest', chapter: 1, room: 8, x: 180, y: 100, lifeState: 'downed', revivesUsed: 0 };
  assert(module.canCoopRevive(reviver, target) === true, 'Valid nearby revive was rejected.');
  assert(module.canCoopRevive(reviver, { ...target, x: 260 }) === false, 'Out-of-range revive was accepted.');
  assert(module.canCoopRevive(reviver, { ...target, revivesUsed: 1 }) === false, 'Second direct revive in one room was accepted.');
  assert(module.canCoopRevive({ ...reviver, lifeState: 'downed' }, target) === false, 'Downed player can revive a teammate.');
  assert(module.coopTeamIsDefeated('downed', 'fallen') === true, 'Two non-alive players do not end the run.');
  assert(module.coopTeamIsDefeated('alive', 'fallen') === false, 'Living teammate incorrectly triggers team defeat.');
  assert(module.coopTeamIsDefeated('fallen', null) === false, 'Disconnected/unknown teammate incorrectly triggers team defeat.');

  const expected = { lobbyId: 'duo-a', runSeed: 77 };
  const reviveRequest = module.normalizeCoopReviveRequest({
    lobbyId: 'duo-a', runSeed: 77, userId: 'guest', targetUserId: 'host', chapter: 1, room: 8, sequence: 2, sentAt: 50,
  }, expected, 'host');
  assert(reviveRequest?.targetUserId === 'host', 'Valid revive request was rejected.');
  assert(module.normalizeCoopReviveConfirm({ ...reviveRequest, userId: 'host', targetUserId: 'guest' }, expected, 'guest')?.targetUserId === 'guest', 'Valid revive confirmation was rejected.');
  assert(module.normalizeCoopReviveConfirm({ ...reviveRequest, userId: 'host', targetUserId: 'other' }, expected, 'guest') === null, 'Revive confirmation for another player was accepted.');
  assert(module.normalizeCoopTeamRetryEvent({ ...reviveRequest, userId: 'host' }, expected, 'guest')?.room === 8, 'Valid host retry was rejected.');
  assert(module.normalizeCoopRoomAdvanceRequest({ ...reviveRequest, targetUserId: undefined }, expected, 'host')?.userId === 'guest', 'Valid room advance request was rejected.');
} finally {
  await server.close();
}

console.log('Coop block 5 provides one bounded revive per room, fallen recovery, shared defeat, host retry and authoritative room progression without changing solo or rewards.');
