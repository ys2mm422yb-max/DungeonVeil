export type KayKitPackName =
  | 'adventurers'
  | 'animations'
  | 'dungeon'
  | 'weapons'
  | 'forest'
  | 'halloween'
  | 'resources'
  | 'skeletons'
  | 'furniture'
  | 'tools';

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

type RawManifestPack = Partial<KayKitManifestPack> & { files?: unknown };
type RawManifest = {
  generatedAt?: unknown;
  root?: unknown;
  packs?: Record<string, RawManifestPack>;
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
const SKELETON_EXTRA_ROOT = 'extras/KayKit_Skeletons_1.1_EXTRA';
const SKELETON_EXTRA_MODELS = [
  'Necromancer',
  'Skeleton_Golem',
  'Skeleton_Mage',
  'Skeleton_Minion',
  'Skeleton_Rogue',
  'Skeleton_Warrior',
].map(name => `${SKELETON_EXTRA_ROOT}/characters/gltf/${name}.glb`);
const SKELETON_EXTRA_TEXTURES = [`${SKELETON_EXTRA_ROOT}/assets/gltf/skeleton_texture_A.png`];
const SKELETON_EXTRA_FILES = [
  ...SKELETON_EXTRA_MODELS,
  ...SKELETON_EXTRA_TEXTURES,
  `${SKELETON_EXTRA_ROOT}/License.txt`,
];
const PACK_NAMES: KayKitPackName[] = ['adventurers', 'animations', 'dungeon', 'weapons', 'forest', 'halloween', 'resources', 'skeletons', 'furniture', 'tools'];
const APP_BASE_URL = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_APP_BASE_URL = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;

let manifestPromise: Promise<KayKitManifest> | null = null;

function appAssetUrl(path: string): string {
  return `${NORMALIZED_APP_BASE_URL}${path.replace(/^\/+/, '')}`;
}

function isRootRelativeAssetPath(value: string): boolean {
  return value.charCodeAt(0) === 47 && value.slice(1).startsWith('assets/');
}

function normalizeManifestRoot(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return appAssetUrl('assets/kaykit').replace(/\/$/, '');
  const root = value.trim().replace(/\/$/, '');
  if (isRootRelativeAssetPath(root) || root.startsWith('assets/')) return appAssetUrl(root).replace(/\/$/, '');
  return root;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function normalizePack(raw: RawManifestPack | undefined): KayKitManifestPack {
  const files = asStringArray(raw?.files);
  const models = asStringArray(raw?.models);
  const textures = asStringArray(raw?.textures);
  const buffers = asStringArray(raw?.buffers);

  const normalizedModels = models.length ? models : files.filter(path => /\.(?:gltf|glb)$/i.test(path));
  const normalizedTextures = textures.length ? textures : files.filter(path => /\.(?:png|jpe?g|webp)$/i.test(path));
  const normalizedBuffers = buffers.length ? buffers : files.filter(path => /\.bin$/i.test(path));

  return {
    fileCount: files.length,
    modelCount: normalizedModels.length,
    textureCount: normalizedTextures.length,
    bufferCount: normalizedBuffers.length,
    files: [...files],
    models: normalizedModels,
    textures: normalizedTextures,
    buffers: normalizedBuffers,
  };
}

function normalizeManifest(raw: RawManifest): KayKitManifest {
  const packs = {} as Record<KayKitPackName, KayKitManifestPack>;
  for (const pack of PACK_NAMES) packs[pack] = normalizePack(raw.packs?.[pack]);
  return {
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date(0).toISOString(),
    root: normalizeManifestRoot(raw.root),
    packs,
  };
}

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

function includeSkeletonExtras(manifest: KayKitManifest): KayKitManifest {
  const skeletons = manifest.packs.skeletons;
  const missingModels = SKELETON_EXTRA_MODELS.filter(path => !skeletons.models.includes(path));
  const missingTextures = SKELETON_EXTRA_TEXTURES.filter(path => !skeletons.textures.includes(path));
  const missingFiles = SKELETON_EXTRA_FILES.filter(path => !skeletons.files.includes(path));
  if (!missingModels.length && !missingTextures.length && !missingFiles.length) return manifest;

  skeletons.models.push(...missingModels);
  skeletons.textures.push(...missingTextures);
  skeletons.files.push(...missingFiles);
  skeletons.modelCount = skeletons.models.length;
  skeletons.textureCount = skeletons.textures.length;
  skeletons.fileCount = skeletons.files.length;
  return manifest;
}

export function loadKayKitManifest(): Promise<KayKitManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(appAssetUrl('assets/kaykit/manifest.json'), { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`KayKit manifest ${response.status}`);
        return response.json();
      })
      .then((raw: RawManifest) => includeSkeletonExtras(includeNinthPack(normalizeManifest(raw))));
  }
  return manifestPromise;
}

export function modelUrl(manifest: KayKitManifest, relativePath: string) {
  return `${manifest.root.replace(/\/$/, '')}/${relativePath.replace(/^\/+/, '')}`;
}

export function findKayKitModels(
  manifest: KayKitManifest,
  pack: KayKitPackName,
  include: RegExp,
  exclude?: RegExp,
) {
  return (manifest.packs[pack]?.models ?? []).filter(path => include.test(path) && (!exclude || !exclude.test(path)));
}

export function firstKayKitModel(
  manifest: KayKitManifest,
  pack: KayKitPackName,
  include: RegExp,
  exclude?: RegExp,
) {
  return findKayKitModels(manifest, pack, include, exclude)[0] ?? null;
}
