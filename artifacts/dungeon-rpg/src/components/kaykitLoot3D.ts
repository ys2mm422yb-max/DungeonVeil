import type { Item } from '../game/entities';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

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
  const prototype = await loadPotion();
  if (!prototype) return null;
  const object = prototype.clone(true);
  object.name = `KayKitHealingPotion_${item.id}`;
  object.scale.setScalar(0.34);
  object.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = true;
  });
  return object;
}
