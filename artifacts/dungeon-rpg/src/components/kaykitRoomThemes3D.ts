import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

type ThemeLibrary = {
  forest: any[];
  halloween: any[];
};

type LoadedGltf = {
  scene: any;
};

let themePromise: Promise<ThemeLibrary> | null = null;

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

async function loadThemes() {
  if (!themePromise) {
    themePromise = (async () => {
      const manifest = await loadKayKitManifest();
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();

      const forestPaths = findKayKitModels(manifest, 'forest', /\.(?:gltf|glb)$/i)
        .map(path => ({ path, score: scoreForest(path) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 28)
        .map(entry => entry.path);
      const halloweenPaths = findKayKitModels(manifest, 'halloween', /\.(?:gltf|glb)$/i)
        .map(path => ({ path, score: scoreHalloween(path) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 28)
        .map(entry => entry.path);

      const [forest, halloween] = await Promise.all([
        Promise.all(forestPaths.map(path => loader.loadAsync(modelUrl(manifest, path)).then((gltf: LoadedGltf) => gltf.scene))),
        Promise.all(halloweenPaths.map(path => loader.loadAsync(modelUrl(manifest, path)).then((gltf: LoadedGltf) => gltf.scene))),
      ]);
      return { forest, halloween };
    })();
  }
  return themePromise;
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

  loadThemes().then(library => {
    if (!active) return;
    const pool = room >= 8 ? library.halloween : room >= 6 ? library.forest : [];
    if (!pool.length) return;

    EDGE_POSITIONS.forEach(([x, z, rotation], index) => {
      const prototype = pool[(index * 5 + room * 3) % pool.length];
      const object = prototype.clone(true);
      object.position.set(x, 0, z);
      object.rotation.y = rotation;
      object.scale.setScalar(0.78 + ((index + room) % 4) * 0.08);
      object.traverse((node: any) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
      });
      root.add(object);
    });
  }).catch(error => console.error('KayKit room theme failed', error));

  root.userData.dispose = () => { active = false; };
  return root;
}
