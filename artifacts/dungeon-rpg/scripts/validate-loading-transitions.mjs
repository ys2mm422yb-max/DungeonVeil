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
const characterCreation = read('src/components/screens/CharacterCreationModern.tsx');
const worldBoss = read('src/components/WorldBossBattleScreen.tsx');

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
requireText(main, '<GlobalLoadingLayer />', 'Global loading layer is not mounted');
requireText(characterCreation, 'new-run-loading-screen', 'New-run full-screen loader is missing');
requireText(worldBoss, 'BOSSARENA WIRD GELADEN', 'World-boss arena loader was removed');

console.log('Loading transitions verified: boot has a hard deadline; new run, room entry and world boss remain covered.');
