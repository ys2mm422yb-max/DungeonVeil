import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const realtime = read('src/game/coopRealtimePresence.ts');
const bridge = read('src/components/CoopRunRealtimeBridge.tsx');
const overlay = read('src/components/CoopTeammateOverlay.tsx');
const lobby = read('src/components/CoopLobbyPanel.tsx');
const menu = read('src/components/screens/MainMenuScreen.tsx');
const page = read('src/pages/game.tsx');
const combat = read('src/components/CombatStage.tsx');

assert(realtime.includes("realtime:duo-run:${options.context.lobbyId}"), 'Duo realtime channel is not isolated by lobby id.');
assert(realtime.includes("event: 'phx_join'") && realtime.includes("event: 'heartbeat'"), 'Duo transport lacks Phoenix join or heartbeat.');
assert(realtime.includes("event: 'player_state'") && realtime.includes("event: 'player_left'"), 'Duo transport lacks player state or clean leave messages.');
assert(realtime.includes('normalized.sequence <= previousSequence'), 'Out-of-order duo packets are not rejected.');
assert(realtime.includes("this.setStatus('reconnecting')") && realtime.includes('MAX_RECONNECT_MS'), 'Short connection interruptions do not enter bounded reconnect mode.');
assert(bridge.includes('const PUBLISH_MS = 100'), 'Local player state is not published at the intended 10 Hz rate.');
assert(bridge.includes('remotePresenceIsFresh') && bridge.includes('onRemotePlayerRef.current(null)'), 'Stale or departed teammates are not removed.');
assert(overlay.includes('interpolateCoopPresence') && overlay.includes('requestAnimationFrame(tick)'), 'Remote movement is not smoothly interpolated.');
assert(overlay.includes('data-testid="coop-remote-player"') && overlay.includes('lastAttackTime') && overlay.includes('lastDodgeTime'), 'Remote player movement/action presentation is incomplete.');
assert(combat.includes('<CoopTeammateOverlay gameState={gameState} remotePlayer={remotePlayer} />'), 'Combat stage does not display the synced teammate.');
assert(lobby.includes('startCoopLobby') && lobby.includes('data-testid="coop-start-run"'), 'Host cannot start the ready duo lobby.');
assert(lobby.includes("next.status === 'in_run'") && lobby.includes('onStartRun(next)'), 'Guest does not automatically enter the host-started run.');
assert(menu.includes('onStartCoop') && menu.includes('onStartRun={lobby =>'), 'Main menu does not forward the started lobby into the game.');
assert(page.includes('createDuoRunContext') && page.includes('runSeed'), 'Game page does not preserve the shared duo run context.');
assert(page.includes('engine.saveNow = () => false'), 'Duo mode can overwrite the existing solo save.');
assert(page.includes('markActiveRun(false)') && page.includes("dataset.dungeonVeilRunMode = 'duo'"), 'Duo run is not isolated from solo session restoration.');
assert(page.includes('<CoopRunRealtimeBridge') && page.includes('remotePlayer={duoContext ? remotePlayer : null}'), 'Realtime bridge is not connected to the visible run.');
assert(!realtime.includes('enemy') && !realtime.includes('damage') && !realtime.includes('loot'), 'Block 3 must not synchronize enemies, damage, or loot yet.');

const server = await createServer({ root, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const module = await server.ssrLoadModule('/src/game/coopRealtimePresence.ts');
  const expected = { lobbyId: 'lobby-a', runSeed: 42 };
  const valid = module.normalizeCoopPlayerPresence({
    lobbyId: 'lobby-a', runSeed: 42, userId: 'guest', displayName: 'Gast', chapter: 1, room: 1,
    x: 120, y: 80, facingX: 1, facingY: 0, state: 'moving', lastAttackTime: 10,
    lastDodgeTime: 20, sequence: 7, sentAt: 1000,
  }, expected, 'host');
  assert(valid?.userId === 'guest' && valid.sequence === 7, 'Valid teammate presence was rejected.');
  assert(module.normalizeCoopPlayerPresence({ ...valid, lobbyId: 'other' }, expected, 'host') === null, 'Foreign lobby packet was accepted.');
  assert(module.normalizeCoopPlayerPresence({ ...valid, runSeed: 99 }, expected, 'host') === null, 'Foreign seed packet was accepted.');
  assert(module.normalizeCoopPlayerPresence({ ...valid, userId: 'host' }, expected, 'host') === null, 'Local echo packet was accepted.');
  const interpolated = module.interpolateCoopPresence(
    { x: 0, y: 0, facingX: 0, facingY: -1 },
    { x: 100, y: 50, facingX: 1, facingY: 0 },
    0.25,
  );
  assert(interpolated.x === 25 && interpolated.y === 12.5, 'Remote position interpolation is incorrect.');
  assert(module.remotePresenceIsFresh({ ...valid, receivedAt: Date.now() }) === true, 'Fresh teammate presence is treated as stale.');
  assert(module.remotePresenceIsFresh({ ...valid, receivedAt: Date.now() - 6000 }) === false, 'Stale teammate presence remains visible.');
} finally {
  await server.close();
}

console.log('Coop block 3 starts both players, isolates solo saves, synchronizes player presence, interpolates movement and reconnects without syncing combat state.');
