import type { Item } from '../game/entities';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type LoadedGltf = { scene: any };
let potionPromise: Promise<any | null> | null = null;

function scorePotion(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/potion/.test(name)) score += 140;
  if (/(bottle|flask)/.test(name)) score += 70;
  if (/(red|health|life|heal)/.test(name)) score += 55;
  if (/(blue|green|purple|mana|poison)/.test(name)) score -= 35;
  if (/(bundle|pile|stack|texture|sample|preview)/.test(name)) score -= 250;
  return score;
}

async function loadPotion() {
  if (!potionPromise) {
    potionPromise = (async () => {
      const manifest = await loadKayKitManifest();
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();
      const path = [...findKayKitModels(manifest, 'resources', /\.(?:gltf|glb)$/i), ...findKayKitModels(manifest, 'dungeon', /\.(?:gltf|glb)$/i)]
        .map(candidate => ({ path: candidate, score: scorePotion(candidate) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))[0]?.path;
      if (!path) return null;
      const gltf: LoadedGltf = await loader.loadAsync(modelUrl(manifest, path));
      return gltf.scene;
    })();
  }
  return potionPromise;
}

export function preloadKayKitHealingPotion() {
  return loadPotion().then(() => undefined);
}

export async function createKayKitLootVisual(item: Item) {
  if (item.itemType !== 'potion') return null;
  const [prototype, THREE] = await Promise.all([
    loadPotion(),
    import(/* @vite-ignore */ THREE_URL) as any,
  ]);
  if (!prototype) return null;

  const root = new THREE.Group();
  root.name = `KayKitHealingPotion_${item.id}`;

  const object = prototype.clone(true);
  object.scale.setScalar(0.9);
  object.position.y = 0.04;
  object.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = true;
  });
  root.add(object);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.54, 32),
    new THREE.MeshBasicMaterial({ color: 0xff6b4a, transparent: true, opacity: 0.46, depthWrite: false, side: THREE.DoubleSide }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.14;
  root.add(halo);

  const innerHalo = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 28),
    new THREE.MeshBasicMaterial({ color: 0xff4f35, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
  );
  innerHalo.rotation.x = -Math.PI / 2;
  innerHalo.position.y = -0.145;
  root.add(innerHalo);

  const glow = new THREE.PointLight(0xff5a38, IS_MOBILE ? 2.1 : 2.8, 3.4, 2);
  glow.position.y = 0.32;
  root.add(glow);

  root.userData.halo = halo;
  root.userData.innerHalo = innerHalo;
  root.userData.glow = glow;
  return root;
}
