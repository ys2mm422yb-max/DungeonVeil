import { findKayKitModels, loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

export type KayKitRangerWeapons = {
  bow: any;
  arrow: any;
};

let weaponPromise: Promise<KayKitRangerWeapons | null> | null = null;

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

export async function loadKayKitRangerWeapons(): Promise<KayKitRangerWeapons | null> {
  if (!weaponPromise) {
    weaponPromise = (async () => {
      const manifest = await loadKayKitManifest();
      const weaponModels = findKayKitModels(manifest, 'weapons', /\.(?:gltf|glb)$/i);
      const adventurerModels = findKayKitModels(manifest, 'adventurers', /\/assets\/gltf\/.*\.(?:gltf|glb)$/i);

      const bowPath = best(adventurerModels, ['bow_withstring', 'bow'], /crossbow/i)
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
    })();
  }
  return weaponPromise;
}
