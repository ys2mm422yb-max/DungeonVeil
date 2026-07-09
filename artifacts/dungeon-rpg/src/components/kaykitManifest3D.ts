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

const NINTH_PACK_GLTF_ROOT = 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf';
const NINTH_PACK_MODEL_NAMES = [
  'arrow_A', 'arrow_B',
  'axe_A', 'axe_B', 'axe_C',
  'bow_A', 'bow_A_withString', 'bow_B', 'bow_B_withString',
  'dagger_A', 'dagger_B',
  'fistweapon_A', 'fistweapon_A_stacked', 'fistweapon_B', 'fistweapon_B_stacked',
  'halberd',
  'hammer_A', 'hammer_B', 'hammer_C',
  'shield_A', 'shield_B', 'shield_C',
  'spear_A',
  'staff_A', 'staff_B',
  'sword_A', 'sword_B', 'sword_C', 'sword_D', 'sword_E',
  'wand_A',
] as const;

const NINTH_PACK_MODELS = NINTH_PACK_MODEL_NAMES.map(name => `${NINTH_PACK_GLTF_ROOT}/${name}.gltf`);

let manifestPromise: Promise<KayKitManifest> | null = null;

function includeNinthPack(manifest: KayKitManifest): KayKitManifest {
  const weapons = manifest.packs.weapons;
  const missingModels = NINTH_PACK_MODELS.filter(path => !weapons.models.includes(path));
  if (!missingModels.length) return manifest;

  weapons.models.push(...missingModels);
  weapons.files.push(...missingModels.filter(path => !weapons.files.includes(path)));
  weapons.modelCount = weapons.models.length;
  weapons.fileCount = weapons.files.length;
  return manifest;
}

export function loadKayKitManifest(): Promise<KayKitManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch('/assets/kaykit/manifest.json', { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`KayKit manifest ${response.status}`);
        return response.json();
      })
      .then((manifest: KayKitManifest) => includeNinthPack(manifest));
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
