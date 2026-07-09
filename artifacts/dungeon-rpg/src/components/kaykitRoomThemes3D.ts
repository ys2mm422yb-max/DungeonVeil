import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { buildKayKitOuterWorld, preloadKayKitOuterWorld } from './kaykitOuterWorld3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const LOW_GPU_KEY = 'dungeon-veil-low-gpu';

type LoadedGltf = { scene: any };
type ThemePosition = readonly [number, number, number, number?];
type ThemePack = 'forest' | 'halloween' | 'resources';
let forestPromise: Promise<any[]> | null = null;
let halloweenPromise: Promise<any[]> | null = null;
let resourcesPromise: Promise<any[]> | null = null;

function lowGpuSession() {
  try { return IS_ANDROID || sessionStorage.getItem(LOW_GPU_KEY) === '1'; } catch { return IS_ANDROID; }
}

function keepCachedResource(resource: any) {
  if (!resource || resource.userData?.kayKitPersistent) return;
  resource.userData = { ...(resource.userData ?? {}), kayKitPersistent: true };
  resource.dispose = () => undefined;
}

function scoreForest(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/(root|stump|mushroom|rock|bush|fern)/.test(name)) score += 70;
  if (/(tree|branch|grass|flower|log)/.test(name)) score += 35;
  if (/(large|huge)/.test(name)) score -= 12;
  if (/(texture|sample|preview)/.test(name)) score -= 200;
  return score;
}

function scoreHalloween(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/(grave|tomb|coffin|skull|bone|candle|pumpkin|crypt)/.test(name)) score += 75;
  if (/(web|spider|ghost|cauldron|lantern|cross|fence)/.test(name)) score += 45;
  if (/(texture|sample|preview)/.test(name)) score -= 200;
  return score;
}

function scoreResources(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/(ore|crystal|gem|ingot|coal|stone|rock|metal)/.test(name)) score += 80;
  if (/(log|wood|plank|rope|cloth|leather|sack|bundle)/.test(name)) score += 55;
  if (/(coin|gold|silver|copper)/.test(name)) score += 30;
  if (/(texture|sample|preview)/.test(name)) score -= 200;
  return score;
}

async function loadThemePack(pack: ThemePack) {
  const manifest = await loadKayKitManifest();
  const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
  const loader = new GLTFLoader();
  const score = pack === 'forest' ? scoreForest : pack === 'halloween' ? scoreHalloween : scoreResources;
  const paths = findKayKitModels(manifest, pack, /\.(?:gltf|glb)$/i)
    .map(path => ({ path, score: score(path) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 24)
    .map(entry => entry.path);
  return Promise.all(paths.map(path => loader.loadAsync(modelUrl(manifest, path)).then((gltf: LoadedGltf) => gltf.scene)));
}

function loadForest() {
  if (!forestPromise) forestPromise = loadThemePack('forest');
  return forestPromise;
}

function loadHalloween() {
  if (!halloweenPromise) halloweenPromise = loadThemePack('halloween');
  return halloweenPromise;
}

function loadResources() {
  if (!resourcesPromise) resourcesPromise = loadThemePack('resources');
  return resourcesPromise;
}

function themeLoader(room: number) {
  if ([1, 2, 4, 6, 16, 18].includes(room)) return loadResources;
  if (room === 7 || (room >= 11 && room <= 15)) return loadForest;
  return loadHalloween;
}

function addArchitectureLights(THREE: any, root: any, room: number) {
  const chapterTwo = room >= 11;
  const warm = chapterTwo ? 0xc88b62 : room >= 9 ? 0xd98a58 : 0xffb86d;
  const gateColor = room === 7 || room === 17 ? 0x8a7de8 : room >= 16 ? 0x9b5368 : room >= 9 ? 0xb06c58 : 0xe6b27a;

  if (IS_MOBILE) {
    const light = new THREE.PointLight(gateColor, lowGpuSession() ? 1.9 : 3.4, chapterTwo ? 14 : 15.5, 2);
    light.position.set(0, 4.2, -11.8);
    root.add(light);
    root.userData.architectureLights = [light];
    return;
  }

  const left = new THREE.PointLight(warm, chapterTwo ? 2.9 : 3.15, 10.5, 2);
  left.position.set(-5.8, 3.8, -11.4);
  root.add(left);
  const right = new THREE.PointLight(warm, chapterTwo ? 2.9 : 3.15, 10.5, 2);
  right.position.set(5.8, 3.8, -11.4);
  root.add(right);
  const gate = new THREE.PointLight(gateColor, 3.6, 9.5, 2);
  gate.position.set(0, 3.0, -14.1);
  root.add(gate);
  root.userData.architectureLights = [left, right, gate];
}

const ROOM_THEME_POSITIONS: Partial<Record<number, ThemePosition[]>> = {
  1: [[-9.4, -1.8, 0.3, 0.78], [9.5, 1.8, 2.8, 0.78], [-8.8, 8.4, 1.2, 0.72], [8.7, 8.8, 2.0, 0.72]],
  2: [[-9.6, -7.7, 0.5, 0.82], [9.6, -7.4, 2.6, 0.82], [-8.8, 2.0, 1.2, 0.74], [8.9, 2.4, 1.9, 0.74], [0, 9.2, 2.7, 0.68]],
  3: [[-9.2, -8.5, 0.4, 0.76], [9.2, -8.5, 2.7, 0.76], [-9.0, 2.8, 1.2, 0.7], [9.0, 3.2, 1.9, 0.7]],
  4: [[-9.6, -9.2, 0.3, 0.82], [9.4, -8.0, 2.8, 0.78], [-8.8, 1.0, 1.1, 0.72], [8.9, 6.8, 2.0, 0.74], [-1.5, 9.0, 2.4, 0.66]],
  5: [[-9.1, -10.2, 0.5, 0.74], [9.2, -10.0, 2.6, 0.74], [-8.9, 7.8, 1.3, 0.7], [8.8, 7.6, 1.9, 0.7]],
  6: [[-9.5, -9.8, 0.4, 0.82], [9.5, -9.8, 2.7, 0.82], [-9.0, -1.4, 1.2, 0.74], [9.0, -1.4, 1.9, 0.74], [0, 8.4, 2.5, 0.7]],
  7: [[-9.3, -9.5, 0.25, 0.9], [9.3, -9.5, 2.8, 0.9], [-9.4, -2.8, 1.2, 0.82], [9.4, -2.8, 1.9, 0.82], [-9.2, 5.6, 2.2, 0.88], [9.2, 5.6, 0.8, 0.88]],
  8: [[-10.0, -11.0, 0.4, 0.72], [10.0, -11.0, 2.7, 0.72], [-10.1, 1.8, 1.3, 0.68], [10.1, 1.8, 1.9, 0.68], [-9.8, 9.0, 2.2, 0.7], [9.8, 9.0, 0.8, 0.7]],
  9: [[-9.5, -10.2, 0.3, 0.86], [9.5, -10.2, 2.8, 0.86], [-9.8, -3.8, 1.2, 0.78], [9.8, -3.8, 1.9, 0.78], [-9.5, 4.5, 2.25, 0.8], [9.5, 4.5, 0.85, 0.8]],
  10: [[-9.4, -10.2, 0.35, 1.02], [9.4, -10.2, 2.75, 1.02], [-9.6, -3.0, 1.15, 0.9], [9.6, -3.0, 1.95, 0.9], [-9.4, 5.0, 2.2, 0.88], [9.4, 5.0, 0.85, 0.88]],
  11: [[-9.7, -10.2, 0.3, 0.92], [9.5, -9.5, 2.7, 0.9], [-9.4, -1.5, 1.4, 0.82], [9.7, 2.8, 1.9, 0.86], [-9.0, 8.2, 2.2, 0.92]],
  12: [[-9.8, -8.8, 0.6, 0.88], [9.8, -7.8, 2.4, 0.84], [-9.5, 0.5, 1.1, 0.8], [9.6, 4.6, 2.0, 0.86], [-8.8, 8.5, 2.7, 0.9]],
  13: [[-9.4, -10.5, 0.2, 1.0], [9.4, -9.4, 2.9, 0.96], [-9.7, -2.0, 1.0, 0.86], [9.4, 2.4, 2.1, 0.9], [-9.2, 8.0, 2.5, 0.96]],
  14: [[-9.8, -10.0, 0.4, 0.88], [9.8, -9.0, 2.5, 0.88], [-9.6, -0.8, 1.3, 0.82], [9.6, 5.2, 1.8, 0.86], [-8.9, 8.7, 2.6, 0.9]],
  15: [[-9.5, -10.4, 0.25, 1.02], [9.5, -10.4, 2.85, 1.02], [-9.6, -2.6, 1.2, 0.9], [9.6, -1.4, 1.95, 0.9], [-9.0, 7.8, 2.4, 0.98]],
  16: [[-9.8, -10.5, 0.4, 0.9], [9.8, -9.4, 2.7, 0.9], [-9.8, -1.6, 1.1, 0.86], [9.8, 2.6, 2.0, 0.86], [-9.2, 8.3, 2.6, 0.92]],
  17: [[-9.5, -10.0, 0.3, 1.02], [9.5, -10.0, 2.8, 1.02], [-9.8, -2.0, 1.2, 0.92], [9.8, -0.5, 1.9, 0.92], [-9.1, 7.8, 2.5, 0.96]],
  18: [[-9.8, -10.4, 0.4, 0.92], [9.8, -9.6, 2.7, 0.92], [-9.7, -1.0, 1.2, 0.86], [9.7, 3.5, 1.9, 0.88], [-9.0, 8.4, 2.5, 0.94]],
  19: [[-9.5, -10.2, 0.3, 1.05], [9.5, -10.2, 2.8, 1.05], [-9.8, -3.0, 1.2, 0.94], [9.8, -3.0, 1.95, 0.94], [-9.2, 6.8, 2.5, 1.0]],
  20: [[-9.3, -10.4, 0.25, 1.12], [9.3, -10.4, 2.85, 1.12], [-9.6, -2.8, 1.15, 1.0], [9.6, -2.8, 1.95, 1.0], [-9.0, 6.5, 2.5, 1.02]],
};

export async function preloadKayKitRoomTheme(room: number) {
  await preloadKayKitOuterWorld();
  const positions = ROOM_THEME_POSITIONS[room];
  if (!positions?.length) return;
  await themeLoader(room)();
}

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `KayKitThemeRoom${room}`;
  let active = true;

  const outer = buildKayKitOuterWorld(THREE, 24, 32);
  root.add(outer);
  addArchitectureLights(THREE, root, room);

  const positions = ROOM_THEME_POSITIONS[room];
  const themeReady = !positions?.length
    ? Promise.resolve()
    : themeLoader(room)().then(pool => {
        if (!active || !pool.length) return;
        const mobileLimit = lowGpuSession() ? (IS_ANDROID ? 3 : 4) : 6;
        const visiblePositions = IS_MOBILE ? positions.slice(0, mobileLimit) : positions;
        visiblePositions.forEach(([x, z, rotation, scale], index) => {
          const prototype = pool[(index * 7 + room * 11) % pool.length];
          const object = prototype.clone(true);
          object.position.set(x, 0, z);
          object.rotation.y = rotation;
          object.scale.setScalar(scale ?? 0.82);
          object.traverse((node: any) => {
            if (!node.isMesh) return;
            keepCachedResource(node.geometry);
            if (Array.isArray(node.material)) node.material.forEach(keepCachedResource);
            else keepCachedResource(node.material);
            node.castShadow = false;
            node.receiveShadow = !IS_MOBILE;
            node.frustumCulled = true;
          });
          root.add(object);
        });
      });

  const ready = Promise.all([outer.userData?.ready ?? Promise.resolve(), themeReady]).then(() => undefined).catch(error => {
    console.error('KayKit room theme failed', error);
    throw error;
  });

  root.userData.ready = ready;
  root.userData.dispose = () => { active = false; outer.userData?.dispose?.(); };
  return root;
}
