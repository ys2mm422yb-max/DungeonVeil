import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const requireText = (source, token, message) => {
  if (!source.includes(token)) throw new Error(message);
};

const loadingScreen = read('src/components/LoadingScreen.tsx');
const globalLayer = read('src/components/GlobalLoadingLayer.tsx');
const timing = read('src/game/loadingTiming.ts');
const main = read('src/main.tsx');
const characterCreation = read('src/components/screens/CharacterCreationModern.tsx');
const worldBoss = read('src/components/WorldBossBattleScreen.tsx');
const worldBossStage = read('src/components/WorldBossCombatBandStage.tsx');

for (const variant of ["'boot'", "'run'", "'worldBoss'"]) {
  requireText(loadingScreen, variant, `LoadingScreen is missing ${variant}`);
}
requireText(loadingScreen, 'role="status"', 'LoadingScreen must expose an accessible status role');
requireText(loadingScreen, 'flex h-full w-full flex-col', 'LoadingScreen has regressed to an oversized centered card');
requireText(globalLayer, 'preloadKayKitOuterWorld()', 'Boot loading does not warm the menu world');
requireText(globalLayer, 'preloadKayKitDungeonRoom(1)', 'Boot loading does not warm the first dungeon room');
requireText(globalLayer, "dungeon-veil-room-preparing", 'Room loading does not listen for preparation');
requireText(globalLayer, "dungeon-veil-room-ready", 'Room loading does not wait for the ready event');
requireText(globalLayer, 'app-boot-loading-screen', 'Boot loading test hook is missing');
requireText(globalLayer, 'run-room-loading-screen', 'Run loading test hook is missing');
requireText(timing, 'bootMinimumMs: 1800', 'Boot loader minimum duration is too short');
requireText(timing, 'runEntryMinimumMs: 1350', 'Run loader minimum duration is too short');
requireText(timing, 'worldBossMinimumMs: 1800', 'World-boss loader minimum duration is too short');
requireText(timing, 'roomShowDelayMs: 280', 'Fast preloaded room changes are not filtered');
requireText(timing, 'roomMinimumVisibleMs: 800', 'Visible room loaders still flash too briefly');
requireText(globalLayer, 'consumeRunLoadingRemainingMs()', 'Run loader handoff can double-wait or flash');
requireText(main, '<GlobalLoadingLayer />', 'Global loading layer is not mounted');
requireText(characterCreation, 'markRunLoadingStarted()', 'New-run loading handoff is missing');
requireText(characterCreation, 'new-run-loading-screen', 'New-run full-screen loader is missing');
requireText(worldBoss, 'BOSSARENA WIRD GELADEN', 'World-boss arena loader was removed');
requireText(worldBossStage, 'LOADING_TIMING.worldBossMinimumMs', 'World-boss loader does not honor its minimum duration');

console.log('Loading transitions verified: cleaner full-screen visual plus readable boot, new-run, room and world-boss timing.');
