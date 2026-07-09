import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { buildKayKitOuterWorld } from './kaykitOuterWorld3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type LoadedGltf = { scene: any };
type ThemePosition = readonly [number, number, number, number?];
let forestPromise: Promise<any[]> | null = null;
let halloweenPromise: Promise<any[]> | null = null;

function keepCachedResource(resource: any) {
  if (!resource || resource.userData?.kayKitPersistent) return;
  resource.userData = { ...(resource.userData ?? {}), kayKitPersistent: true };
  resource.dispose = () => undefined;
}

function scoreForest(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/(root|stump|mushroom|rock|bush|fern)/.test(name)) score += 70;
  if (/(tree|branch|grass)/.test(name)) score += 35;
  if (/(large|huge)/.test(name)) score -= 12;
  if (/(texture|sample|preview)/.test(name)) score -= 200;
  return score;
}

function scoreHalloween(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/(grave|tomb|coffin|skull|bone|candle|pumpkin|crypt)/.test(name)) score += 75;
  if (/(web|spider|ghost|cauldron|lantern)/.test(name)) score += 45;
  if (/(texture|sample|preview)/.test(name)) score -= 200;
  return score;
}

async function loadThemePack(pack: 'forest' | 'halloween') {
  const manifest = await loadKayKitManifest();
  const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
  const loader = new GLTFLoader();
  const score = pack === 'forest' ? scoreForest : scoreHalloween;
  const paths = findKayKitModels(manifest, pack, /\.(?:gltf|glb)$/i)
    .map(path => ({ path, score: score(path) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 10)
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

const ROOM_THEME_POSITIONS: Partial<Record<number, ThemePosition[]>> = {
  // Ritual hall: organic growth is kept to the outer ring and corners.
  7: [
    [-9.3, -9.5, 0.25, 0.9], [9.3, -9.5, 2.8, 0.9],
    [-9.4, -2.8, 1.2, 0.82], [9.4, -2.8, 1.9, 0.82],
    [-9.2, 5.6, 2.2, 0.88], [9.2, 5.6, 0.8, 0.88],
  ],
  // Storage vault: first signs of the crypt appear at the far walls only.
  8: [
    [-10.0, -11.0, 0.4, 0.72], [10.0, -11.0, 2.7, 0.72],
    [-10.1, 1.8, 1.3, 0.68], [10.1, 1.8, 1.9, 0.68],
    [-9.8, 9.0, 2.2, 0.7], [9.8, 9.0, 0.8, 0.7],
  ],
  // Guardian antechamber: crypt debris is symmetrical and subordinate to the candle route.
  9: [
    [-9.5, -10.2, 0.3, 0.86], [9.5, -10.2, 2.8, 0.86],
    [-9.8, -3.8, 1.2, 0.78], [9.8, -3.8, 1.9, 0.78],
    [-9.5, 4.5, 2.25, 0.8], [9.5, 4.5, 0.85, 0.8],
  ],
  // Boss chamber: heavier Halloween silhouettes sit behind the side pillar axes.
  10: [
    [-9.4, -10.2, 0.35, 1.02], [9.4, -10.2, 2.75, 1.02],
    [-9.6, -3.0, 1.15, 0.9], [9.6, -3.0, 1.95, 0.9],
    [-9.4, 5.0, 2.2, 0.88], [9.4, 5.0, 0.85, 0.88],
  ],
};

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `KayKitThemeRoom${room}`;
  let active = true;

  const outer = buildKayKitOuterWorld(THREE, 24, 32);
  root.add(outer);

  const positions = ROOM_THEME_POSITIONS[room];
  if (!positions?.length) {
    root.userData.dispose = () => { active = false; outer.userData?.dispose?.(); };
    return root;
  }

  const loadPool = room === 7 ? loadForest : loadHalloween;
  loadPool().then(pool => {
    if (!active || !pool.length) return;
    const visiblePositions = IS_MOBILE ? positions.slice(0, 6) : positions;
    visiblePositions.forEach(([x, z, rotation, scale], index) => {
      const prototype = pool[(index * 5 + room * 3) % pool.length];
      const object = prototype.clone(true);
      object.position.set(x, 0, z);
      object.rotation.y = rotation;
      object.scale.setScalar(scale ?? 0.82);
      object.traverse((node: any) => {
        if (!node.isMesh) return;
        keepCachedResource(node.geometry);
        if (Array.isArray(node.material)) node.material.forEach(keepCachedResource);
        else keepCachedResource(node.material);
        node.castShadow = !IS_MOBILE;
        node.receiveShadow = !IS_MOBILE;
        node.frustumCulled = true;
      });
      root.add(object);
    });
  }).catch(error => console.error('KayKit room theme failed', error));

  root.userData.dispose = () => { active = false; outer.userData?.dispose?.(); };
  return root;
}
