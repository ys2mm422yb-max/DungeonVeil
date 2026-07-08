export type KayKitPackName =
  | 'adventurers'
  | 'animations'
  | 'dungeon'
  | 'weapons'
  | 'forest'
  | 'halloween'
  | 'resources'
  | 'skeletons';

export type KayKitManifestPack = {
  fileCount: number;
  modelCount: number;
  textureCount: number;
  bufferCount: number;
  files: string[];
  models: string[];
  textures: string[];
  buffers: string[];
};

export type KayKitManifest = {
  generatedAt: string;
  root: string;
  packs: Record<KayKitPackName, KayKitManifestPack>;
};

let manifestPromise: Promise<KayKitManifest> | null = null;

export function loadKayKitManifest(): Promise<KayKitManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch('/assets/kaykit/manifest.json', { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`KayKit manifest ${response.status}`);
        return response.json();
      });
  }
  return manifestPromise;
}

export function modelUrl(manifest: KayKitManifest, relativePath: string) {
  return `${manifest.root}/${relativePath}`;
}

export function findKayKitModels(
  manifest: KayKitManifest,
  pack: KayKitPackName,
  include: RegExp,
  exclude?: RegExp,
) {
  return manifest.packs[pack].models.filter(path => include.test(path) && (!exclude || !exclude.test(path)));
}

export function firstKayKitModel(
  manifest: KayKitManifest,
  pack: KayKitPackName,
  include: RegExp,
  exclude?: RegExp,
) {
  return findKayKitModels(manifest, pack, include, exclude)[0] ?? null;
}
