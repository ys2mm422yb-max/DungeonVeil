import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const requireText = (source, token, message) => {
  if (!source.includes(token)) throw new Error(message);
};

const loadingScreen = read('src/components/LoadingScreen.tsx');
const globalLayer = read('src/components/GlobalLoadingLayer.tsx');
const main = read('src/main.tsx');
const roomReadyFailureGuard = read('src/game/roomReadyFailureGuard.ts');
const gameCanvas = read('src/components/GameCanvasKayKit3D.tsx');
const loadingContinuity = read('tests/loading-continuity.spec.mjs');
const characterCreation = read('src/components/screens/CharacterCreationModern.tsx');
const worldBoss = read('src/components/WorldBossBattleScreenV4.tsx');

for (const variant of ["'boot'", "'run'", "'worldBoss'"]) {
  requireText(loadingScreen, variant, `LoadingScreen is missing ${variant}`);
}
requireText(loadingScreen, 'role="status"', 'LoadingScreen must expose an accessible status role');
requireText(globalLayer, 'preloadKayKitOuterWorld()', 'Boot loading does not warm the menu world');
requireText(globalLayer, 'preloadKayKitDungeonRoom(1)', 'Boot loading does not warm the first dungeon room');
requireText(globalLayer, 'BOOT_LOADING_MAX_MS', 'Boot loading has no hard upper bound');
requireText(globalLayer, 'Promise.race([warmup, delay(BOOT_LOADING_MAX_MS)])', 'Boot loading can still wait indefinitely for fonts or assets');
requireText(globalLayer, "dungeon-veil-room-preparing", 'Room loading does not listen for preparation');
requireText(globalLayer, "dungeon-veil-room-ready", 'Room loading does not wait for the ready event');
requireText(globalLayer, 'app-boot-loading-screen', 'Boot loading test hook is missing');
requireText(globalLayer, 'run-room-loading-screen', 'Run loading test hook is missing');
requireText(globalLayer, 'ROOM_LOADING_SHOW_AFTER_MS', 'Fast room swaps still show a full-screen loader immediately');
requireText(globalLayer, 'seamless-violet-veil', 'Slow room swaps do not use the lightweight veil transition');
requireText(globalLayer, 'BOOT_SESSION_KEY', 'The boot presentation can replay repeatedly in one tab session');
requireText(main, '<GlobalLoadingLayer />', 'Global loading layer is not mounted');
requireText(main, 'installRoomReadyFailureGuard();', 'Room readiness lifecycle guard is not installed');
requireText(roomReadyFailureGuard, "dungeonVeilRoomBuildState = 'ready'", 'Room readiness dataset has no successful lifecycle producer');
requireText(gameCanvas, "new CustomEvent('dungeon-veil-room-preparing'", 'Room canvas no longer emits the preparing lifecycle');
requireText(gameCanvas, "new CustomEvent('dungeon-veil-room-ready'", 'Room canvas no longer emits the ready lifecycle');
requireText(loadingContinuity, 'await startActualRun(page);', 'Loading continuity consumes room readiness before starting a real run');
requireText(loadingContinuity, 'document.documentElement.dataset.dungeonVeilRoomBuildState', 'Loading continuity no longer consumes the source-backed room readiness state');
const runStartIndex = loadingContinuity.indexOf('await startActualRun(page);');
const readinessConsumerIndex = loadingContinuity.indexOf('document.documentElement.dataset.dungeonVeilRoomBuildState');
if (runStartIndex < 0 || readinessConsumerIndex < 0 || runStartIndex > readinessConsumerIndex) {
  throw new Error('Loading continuity must start a real run before consuming room readiness');
}
const guardInstallIndex = main.indexOf('installRoomReadyFailureGuard();');
const reactMountIndex = main.indexOf("createRoot(document.getElementById('root')!).render(appView);");
if (guardInstallIndex < 0 || reactMountIndex < 0 || guardInstallIndex > reactMountIndex) {
  throw new Error('Room readiness lifecycle guard must be installed before React mount');
}
requireText(characterCreation, 'new-run-loading-screen', 'New-run full-screen loader is missing');
requireText(characterCreation, 'RUN_PRELOAD_MAX_MS', 'New-run asset loading has no hard deadline');
requireText(characterCreation, 'Promise.race([preloadRun(), delay(RUN_PRELOAD_MAX_MS)])', 'A stalled optional model can still block a new run indefinitely');
requireText(characterCreation, 'let runPreloadPromise', 'New-run preloading can still be started repeatedly');
requireText(worldBoss, '<WorldBossLiteStage engineRef={engineRef} onReady={handleReady} onLoadError={handleLoadError} />', 'World-boss readiness and load-error bridge was removed');
requireText(worldBoss, 'worldboss-dragon-loading', 'Neutral original-dragon loading state was removed');
requireText(worldBoss, 'worldboss-dragon-load-error', 'Bounded world-boss load failure state was removed');
requireText(worldBoss, "ready && !loadError && phase === 'fighting'", 'World-boss controls can appear before the original dragon is ready');
requireText(worldBoss, "loadError ? (de ? 'FEHLER' : 'ERROR') : ready ? `${seconds}s`", 'World-boss status no longer distinguishes loading, ready and failed states');

console.log('Loading transitions verified: boot is session-scoped, fast room swaps remain seamless, slow swaps use the violet veil, and world-boss loading stays bounded.');

await import('./validate-loading-portal-continuity.mjs');
