import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const guard = read('src/game/versionGuard.ts');
const globalLayer = read('src/components/GlobalLoadingLayer.tsx');
const loading = read('src/components/LoadingScreen.tsx');
const game = read('src/pages/game.tsx');
const canvas = read('src/components/GameCanvasKayKit3D.tsx');
const config = read('playwright.regression.config.mjs');

assert(guard.includes('activeRunProtected()') && guard.includes("dungeonVeilActiveRun === '1'") && guard.includes('PENDING_BUILD_KEY'), 'Deployment updates can still reload an active run.');
assert(guard.includes('rememberPendingBuild(deployedCommit)') && guard.includes('window.addEventListener(RUN_ACTIVE_EVENT'), 'Deferred deployments do not resume at the next safe menu state.');
assert(game.includes("dataset.dungeonVeilActiveRun = active ? '1' : '0'") && game.includes('dungeon-veil-run-active-changed'), 'The game page does not expose active-run protection to the version guard.');
assert(globalLayer.includes('ROOM_LOADING_SHOW_AFTER_MS = 760') && globalLayer.includes('ROOM_LOADING_MIN_VISIBLE_MS = 240'), 'Room transition timing still forces a loader on fast swaps.');
assert(globalLayer.includes('data-transition-presentation="seamless-violet-veil"') && globalLayer.includes('BOOT_SESSION_KEY'), 'Room and boot loading are not visually or temporally separated.');
assert(loading.includes('data-boot-visual="violet-d-monogram-v2"') && loading.includes('dungeon-veil-d-mark') && loading.includes('dv-stone'), 'The start loader does not use the Dungeon Veil violet D identity.');
assert(canvas.includes("presentationContract = 'dungeon-veil-violet-arch-v2'") && canvas.includes('stoneArch') && canvas.includes('vortexLayers') && canvas.includes('energyRibbons') && canvas.includes('runeDiamonds'), 'The room exit portal lacks the layered Dungeon Veil presentation.');
assert(canvas.includes("host.setAttribute('data-portal-contract', presentationContract)"), 'Portal visual diagnostics are missing from the shared run renderer.');
assert(config.includes('loading-continuity'), 'Four-device browser regression does not cover loading continuity.');

console.log('Loading continuity passed: deployments defer during runs, fast rooms stay seamless, the boot screen uses the violet D identity, and portals use the layered veil arch.');
