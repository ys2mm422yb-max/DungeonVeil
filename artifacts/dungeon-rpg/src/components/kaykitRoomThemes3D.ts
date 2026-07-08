import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { buildKayKitOuterWorld } from './kaykitOuterWorld3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type LoadedGltf = { scene: any };
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

const EDGE_POSITIONS = [
  [-6.5, -6.7, 0.15], [-5.7, -3.0, 1.25], [-6.3, 1.5, 0.55], [-5.7, 5.6, 2.2],
  [6.5, -6.7, 2.8], [5.7, -3.0, 1.85], [6.3, 1.5, 2.5], [5.7, 5.6, 0.8],
  [-3.8, -8.5, 0.4], [3.8, -8.5, 2.6], [-3.8, 7.4, 1.2], [3.8, 7.4, 2.1],
] as const;

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `KayKitThemeRoom${room}`;
  let active = true;

  const outer = buildKayKitOuterWorld(THREE, 24, 32);
  root.add(outer);

  if (room < 6) {
    root.userData.dispose = () => { active = false; outer.userData?.dispose?.(); };
    return root;
  }

  const loadPool = room >= 8 ? loadHalloween : loadForest;
  loadPool().then(pool => {
    if (!active || !pool.length) return;
    const positions = IS_MOBILE ? EDGE_POSITIONS.slice(0, 8) : EDGE_POSITIONS;
    positions.forEach(([x, z, rotation], index) => {
      const prototype = pool[(index * 5 + room * 3) % pool.length];
      const object = prototype.clone(true);
      object.position.set(x, 0, z);
      object.rotation.y = rotation;
      object.scale.setScalar(0.78 + ((index + room) % 4) * 0.08);
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
