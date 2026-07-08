import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { EQUIPMENT, loadMetaProgression } from '../game/metaProgression';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

export type KayKitRangerWeapons = {
  bow: any;
  arrow: any;
};

const rangerWeaponCache = new Map<string, Promise<KayKitRangerWeapons | null>>();
let bossWeaponPromise: Promise<any | null> | null = null;

function rank(path: string, terms: string[]) {
  const name = path.toLowerCase();
  return terms.reduce((score, term, index) => score + (name.includes(term) ? 100 - index * 12 : 0), 0);
}

function best(paths: string[], terms: string[], reject?: RegExp) {
  return paths
    .filter(path => !reject || !reject.test(path))
    .map(path => ({ path, score: rank(path, terms) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))[0]?.path ?? null;
}

function equippedBowPath() {
  const meta = loadMetaProgression();
  const bowId = meta.equipped.bow;
  const definition = EQUIPMENT[bowId];
  return definition?.slot === 'bow' ? { bowId, path: definition.assetPath } : null;
}

async function loadRangerWeaponPrototype(cacheKey: string, preferredBowPath: string | null): Promise<KayKitRangerWeapons | null> {
  if (!rangerWeaponCache.has(cacheKey)) {
    rangerWeaponCache.set(cacheKey, (async () => {
      const manifest = await loadKayKitManifest();
      const weaponModels = findKayKitModels(manifest, 'weapons', /\.(?:gltf|glb)$/i);
      const adventurerModels = findKayKitModels(manifest, 'adventurers', /\/assets\/gltf\/.*\.(?:gltf|glb)$/i);
      const allModels = [...adventurerModels, ...weaponModels];
      const exactPreferred = preferredBowPath && allModels.includes(preferredBowPath) ? preferredBowPath : null;

      const bowPath = exactPreferred
        ?? best(adventurerModels, ['bow_withstring', 'bow'], /crossbow/i)
        ?? best(weaponModels, ['bow', 'wood'], /crossbow/i);
      const arrowPath = best(adventurerModels, ['arrow_bow', 'arrow'], /crossbow/i)
        ?? best(weaponModels, ['arrow'], /crossbow/i);
      if (!bowPath || !arrowPath) return null;

      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();
      const [bowGltf, arrowGltf] = await Promise.all([
        loader.loadAsync(modelUrl(manifest, bowPath)),
        loader.loadAsync(modelUrl(manifest, arrowPath)),
      ]);
      return { bow: bowGltf.scene, arrow: arrowGltf.scene };
    })());
  }
  return rangerWeaponCache.get(cacheKey)!;
}

export async function loadKayKitRangerWeapons(): Promise<KayKitRangerWeapons | null> {
  const equipped = equippedBowPath();
  const cacheKey = equipped?.bowId ?? 'default-ranger-bow';
  const prototype = await loadRangerWeaponPrototype(cacheKey, equipped?.path ?? null);
  if (!prototype) return null;
  return {
    bow: prototype.bow.clone(true),
    arrow: prototype.arrow.clone(true),
  };
}

export async function loadKayKitBossWeapon() {
  if (!bossWeaponPromise) {
    bossWeaponPromise = (async () => {
      const manifest = await loadKayKitManifest();
      const weaponModels = findKayKitModels(manifest, 'weapons', /\/assets\/gltf\/.*\.(?:gltf|glb)$/i);
      const path = best(weaponModels, ['halberd'])
        ?? best(weaponModels, ['hammer_c', 'hammer'])
        ?? best(weaponModels, ['axe_c', 'axe']);
      if (!path) return null;
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(modelUrl(manifest, path));
      return gltf.scene;
    })();
  }
  const prototype = await bossWeaponPromise;
  return prototype?.clone?.(true) ?? prototype;
}
