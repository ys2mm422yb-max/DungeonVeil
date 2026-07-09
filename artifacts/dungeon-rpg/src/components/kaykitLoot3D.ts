import type { Item } from '../game/entities';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type LoadedGltf = { scene: any };
let potionPromise: Promise<any | null> | null = null;
let relicPromise: Promise<any | null> | null = null;

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

function scoreRelic(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/(crystal|gem)/.test(name)) score += 180;
  if (/(purple|violet|blue)/.test(name)) score += 25;
  if (/(ore|rock|stone)/.test(name)) score += 20;
  if (/(bundle|pile|stack|texture|sample|preview)/.test(name)) score -= 250;
  return score;
}

async function loadBest(score: (path: string) => number) {
  const manifest = await loadKayKitManifest();
  const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
  const loader = new GLTFLoader();
  const path = [...findKayKitModels(manifest, 'resources', /\.(?:gltf|glb)$/i), ...findKayKitModels(manifest, 'dungeon', /\.(?:gltf|glb)$/i)]
    .map(candidate => ({ path: candidate, score: score(candidate) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))[0]?.path;
  if (!path) return null;
  const gltf: LoadedGltf = await loader.loadAsync(modelUrl(manifest, path));
  return gltf.scene;
}

function loadPotion() {
  if (!potionPromise) potionPromise = loadBest(scorePotion);
  return potionPromise;
}

function loadRelic() {
  if (!relicPromise) relicPromise = loadBest(scoreRelic);
  return relicPromise;
}

export function preloadKayKitHealingPotion() {
  return Promise.all([loadPotion(), loadRelic()]).then(() => undefined);
}

export async function createKayKitLootVisual(item: Item) {
  if (item.itemType !== 'potion' && item.itemType !== 'relic') return null;
  const relic = item.itemType === 'relic';
  const [prototype, THREE] = await Promise.all([relic ? loadRelic() : loadPotion(), import(/* @vite-ignore */ THREE_URL) as any]);
  if (!prototype) return null;

  const root = new THREE.Group();
  root.name = relic ? `KayKitVeilRelic_${item.id}` : `KayKitHealingPotion_${item.id}`;

  const object = prototype.clone(true);
  object.scale.setScalar(relic ? 1.15 : 0.9);
  object.position.y = relic ? 0.16 : 0.04;
  object.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = true;
  });
  root.add(object);

  const color = relic ? 0xa978ff : 0xff6b4a;
  const halo = new THREE.Mesh(new THREE.RingGeometry(relic ? 0.38 : 0.3, relic ? 0.7 : 0.54, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: relic ? 0.65 : 0.46, depthWrite: false, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.14;
  root.add(halo);

  const innerHalo = new THREE.Mesh(new THREE.CircleGeometry(relic ? 0.36 : 0.28, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: relic ? 0.22 : 0.16, depthWrite: false, side: THREE.DoubleSide }));
  innerHalo.rotation.x = -Math.PI / 2;
  innerHalo.position.y = -0.145;
  root.add(innerHalo);

  const glow = new THREE.PointLight(color, IS_MOBILE ? (relic ? 3.1 : 2.1) : (relic ? 4.2 : 2.8), relic ? 4.8 : 3.4, 2);
  glow.position.y = relic ? 0.55 : 0.32;
  root.add(glow);

  root.userData.halo = halo;
  root.userData.innerHalo = innerHalo;
  root.userData.glow = glow;
  root.userData.relic = relic;
  return root;
}
