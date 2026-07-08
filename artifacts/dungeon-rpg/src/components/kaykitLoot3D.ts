import type { Item } from '../game/entities';
import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

type LootLibrary = {
  xp: any[];
  potion: any[];
};

type LoadedGltf = {
  scene: any;
};

let libraryPromise: Promise<LootLibrary> | null = null;

function scoreXp(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/crystal/.test(name)) score += 120;
  if (/gem/.test(name)) score += 80;
  if (/(blue|cyan|amethyst|sapphire)/.test(name)) score += 45;
  if (/(ore|shard)/.test(name)) score += 15;
  if (/(bundle|pile|stack|cluster|texture|sample|preview)/.test(name)) score -= 250;
  return score;
}

function scorePotion(path: string) {
  const name = path.toLowerCase();
  let score = 0;
  if (/potion/.test(name)) score += 120;
  if (/(bottle|flask)/.test(name)) score += 70;
  if (/(red|health|life)/.test(name)) score += 45;
  if (/(bundle|pile|stack|texture|sample|preview)/.test(name)) score -= 250;
  return score;
}

async function loadLibrary() {
  if (!libraryPromise) {
    libraryPromise = (async () => {
      const manifest = await loadKayKitManifest();
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();

      const resourceModels = findKayKitModels(manifest, 'resources', /\.(?:gltf|glb)$/i);
      const dungeonModels = findKayKitModels(manifest, 'dungeon', /\.(?:gltf|glb)$/i);
      const xpPaths = resourceModels
        .map(path => ({ path, score: scoreXp(path) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
        .slice(0, 1)
        .map(entry => entry.path);
      const potionPaths = [...resourceModels, ...dungeonModels]
        .map(path => ({ path, score: scorePotion(path) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
        .slice(0, 1)
        .map(entry => entry.path);

      const [xp, potion] = await Promise.all([
        Promise.all(xpPaths.map(path => loader.loadAsync(modelUrl(manifest, path)).then((gltf: LoadedGltf) => gltf.scene))),
        Promise.all(potionPaths.map(path => loader.loadAsync(modelUrl(manifest, path)).then((gltf: LoadedGltf) => gltf.scene))),
      ]);

      return { xp, potion };
    })();
  }
  return libraryPromise;
}

export async function createKayKitLootVisual(item: Item) {
  const library = await loadLibrary();
  const candidates = item.itemType === 'potion' ? library.potion : library.xp;
  if (!candidates.length) return null;
  const object = candidates[0].clone(true);
  object.name = `KayKitLoot_${item.itemType}_${item.id}`;
  object.scale.setScalar(item.itemType === 'potion' ? 0.28 : 0.2);
  object.traverse((node: any) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
  });
  return object;
}
