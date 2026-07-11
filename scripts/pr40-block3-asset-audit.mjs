import fs from 'node:fs';
import path from 'node:path';

const REPO = process.cwd();
const APP = path.join(REPO, 'artifacts/dungeon-rpg');

function write(relativePath, content) {
  const target = path.join(APP, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

const catalog = String.raw`export type WorldAssetPack =
  | 'adventurers'
  | 'animations'
  | 'dungeon'
  | 'weapons'
  | 'forest'
  | 'halloween'
  | 'resources'
  | 'skeletons'
  | 'furniture'
  | 'tools'
  | 'imported-enemies'
  | 'imported-props'
  | 'imported-weapons';

export type WorldAssetCategory =
  | 'architecture'
  | 'floors'
  | 'interiors'
  | 'tools'
  | 'resources'
  | 'nature'
  | 'graveyard'
  | 'ritual'
  | 'lighting'
  | 'weapons'
  | 'characters';

export type WorldBiomeId =
  | 'inhabited-dungeon'
  | 'ancient-ruins'
  | 'meadow-forest'
  | 'darkwood-village'
  | 'fortress-ember';

export type WorldBiomePlan = {
  id: WorldBiomeId;
  nameDe: string;
  roomRange: readonly [number, number];
  outdoor: boolean;
  packs: readonly WorldAssetPack[];
  floorKeywords: readonly string[];
  architectureKeywords: readonly string[];
  propKeywords: readonly string[];
  avoidKeywords: readonly string[];
  light: {
    background: number;
    fog: number;
    ambient: number;
    key: number;
    fill: number;
    exposure: number;
  };
};

export const WORLD_ASSET_CATEGORY_RULES: Record<WorldAssetCategory, readonly string[]> = {
  architecture: ['wall', 'pillar', 'column', 'arch', 'gate', 'door', 'stairs', 'bridge', 'fence', 'tower', 'roof'],
  floors: ['floor', 'tile', 'ground', 'path', 'road', 'platform'],
  interiors: ['table', 'chair', 'shelf', 'bed', 'cabinet', 'chest', 'barrel', 'crate', 'box', 'bench', 'rug'],
  tools: ['anvil', 'grindstone', 'pickaxe', 'shovel', 'hammer', 'saw', 'drill', 'blueprint', 'bucket', 'rope'],
  resources: ['ore', 'nugget', 'ingot', 'bars', 'wood', 'pallet', 'stone', 'coal', 'crystal', 'gem'],
  nature: ['tree', 'bush', 'grass', 'flower', 'mushroom', 'stump', 'log', 'plant', 'root', 'hedge'],
  graveyard: ['grave', 'tomb', 'coffin', 'skull', 'bone', 'crypt', 'casket'],
  ritual: ['shrine', 'altar', 'cauldron', 'rune', 'sigil', 'statue', 'obelisk', 'pedestal'],
  lighting: ['torch', 'lantern', 'candle', 'fire', 'brazier', 'lamp'],
  weapons: ['bow', 'crossbow', 'sword', 'axe', 'spear', 'dagger', 'staff', 'wand', 'shield', 'hammer', 'halberd'],
  characters: ['character', 'skeleton', 'knight', 'mage', 'ranger', 'rogue', 'barbarian', 'warrior'],
};

export const WORLD_BIOME_PLANS: readonly WorldBiomePlan[] = [
  {
    id: 'inhabited-dungeon',
    nameDe: 'Bewohnter Dungeon',
    roomRange: [1, 10],
    outdoor: false,
    packs: ['dungeon', 'furniture', 'tools', 'resources', 'halloween'],
    floorKeywords: ['floor_tile', 'stone_floor', 'platform'],
    architectureKeywords: ['wall', 'pillar', 'column', 'gate'],
    propKeywords: ['table', 'shelf', 'bed', 'anvil', 'ore', 'barrel', 'torch'],
    avoidKeywords: ['tree', 'grass', 'flower'],
    light: { background: 0x17130f, fog: 0x17130f, ambient: 0xd7c8b2, key: 0xffb96d, fill: 0x64548e, exposure: 1.12 },
  },
  {
    id: 'ancient-ruins',
    nameDe: 'Alte Ruinen und Krypta',
    roomRange: [11, 20],
    outdoor: false,
    packs: ['dungeon', 'halloween', 'forest', 'resources'],
    floorKeywords: ['floor', 'rock', 'broken', 'rubble'],
    architectureKeywords: ['broken', 'ruin', 'pillar', 'column', 'grave', 'crypt'],
    propKeywords: ['grave', 'coffin', 'statue', 'shrine', 'bone', 'candle', 'crystal'],
    avoidKeywords: ['bed_single', 'workbench', 'pallet_wood'],
    light: { background: 0x141218, fog: 0x141218, ambient: 0xc4bccd, key: 0xd1b17d, fill: 0x76529c, exposure: 1.1 },
  },
  {
    id: 'meadow-forest',
    nameDe: 'Wiese und heller Wald',
    roomRange: [21, 30],
    outdoor: true,
    packs: ['forest', 'resources', 'tools', 'furniture'],
    floorKeywords: ['grass', 'ground', 'path', 'dirt', 'stone'],
    architectureKeywords: ['tree', 'bridge', 'fence', 'log', 'camp'],
    propKeywords: ['tree', 'bush', 'grass', 'flower', 'mushroom', 'stump', 'campfire', 'barrel'],
    avoidKeywords: ['crypt', 'coffin', 'lava', 'dungeon_wall'],
    light: { background: 0x7aa0a0, fog: 0x8fb0a8, ambient: 0xdde7c6, key: 0xffe2a8, fill: 0x8fc8cf, exposure: 1.18 },
  },
  {
    id: 'darkwood-village',
    nameDe: 'Dunkler Wald und verfallene Siedlung',
    roomRange: [31, 40],
    outdoor: true,
    packs: ['forest', 'halloween', 'furniture', 'tools', 'resources'],
    floorKeywords: ['grass', 'ground', 'path', 'mud', 'stone'],
    architectureKeywords: ['tree', 'fence', 'gate', 'grave', 'bridge', 'ruin'],
    propKeywords: ['stump', 'root', 'mushroom', 'grave', 'lantern', 'crate', 'bench', 'candle'],
    avoidKeywords: ['bright_flower', 'gold_chest', 'clean_table'],
    light: { background: 0x0e1820, fog: 0x101923, ambient: 0x91a1a7, key: 0x8fa7c8, fill: 0x5b477c, exposure: 1.04 },
  },
  {
    id: 'fortress-ember',
    nameDe: 'Festung und Glutgewölbe',
    roomRange: [41, 50],
    outdoor: false,
    packs: ['dungeon', 'weapons', 'resources', 'halloween', 'tools'],
    floorKeywords: ['floor', 'tile', 'stone', 'cracked'],
    architectureKeywords: ['wall', 'gate', 'pillar', 'barrier', 'tower'],
    propKeywords: ['weapon', 'shield', 'spear', 'brazier', 'torch', 'anvil', 'coal', 'crystal'],
    avoidKeywords: ['bed', 'flower', 'mushroom', 'pillow'],
    light: { background: 0x1d0e0a, fog: 0x1b0b08, ambient: 0xc5a090, key: 0xff7042, fill: 0x6d3458, exposure: 1.12 },
  },
] as const;

export function worldBiomeForRoom(room: number): WorldBiomePlan {
  const safeRoom = Math.max(1, Math.floor(room));
  const direct = WORLD_BIOME_PLANS.find(plan => safeRoom >= plan.roomRange[0] && safeRoom <= plan.roomRange[1]);
  if (direct) return direct;
  const chapterIndex = Math.floor((safeRoom - 1) / 10) % WORLD_BIOME_PLANS.length;
  return WORLD_BIOME_PLANS[chapterIndex];
}

export function assetMatchesKeywords(assetPath: string, keywords: readonly string[], avoid: readonly string[] = []): boolean {
  const normalized = assetPath.toLowerCase();
  return keywords.some(keyword => normalized.includes(keyword.toLowerCase()))
    && !avoid.some(keyword => normalized.includes(keyword.toLowerCase()));
}
`;

const auditScript = String.raw`import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const KAYKIT_ROOT = path.join(ROOT, 'public/assets/kaykit');
const IMPORTED_ROOT = path.join(ROOT, 'public/assets/imported');
const SOURCE_ROOT = path.join(ROOT, 'src');
const OUTPUT = path.join(KAYKIT_ROOT, 'asset-audit.json');

const CATEGORY_RULES = {
  architecture: ['wall', 'pillar', 'column', 'arch', 'gate', 'door', 'stairs', 'bridge', 'fence', 'tower', 'roof'],
  floors: ['floor', 'tile', 'ground', 'path', 'road', 'platform'],
  interiors: ['table', 'chair', 'shelf', 'bed', 'cabinet', 'chest', 'barrel', 'crate', 'box', 'bench', 'rug'],
  tools: ['anvil', 'grindstone', 'pickaxe', 'shovel', 'hammer', 'saw', 'drill', 'blueprint', 'bucket', 'rope'],
  resources: ['ore', 'nugget', 'ingot', 'bars', 'wood', 'pallet', 'stone', 'coal', 'crystal', 'gem'],
  nature: ['tree', 'bush', 'grass', 'flower', 'mushroom', 'stump', 'log', 'plant', 'root', 'hedge'],
  graveyard: ['grave', 'tomb', 'coffin', 'skull', 'bone', 'crypt', 'casket'],
  ritual: ['shrine', 'altar', 'cauldron', 'rune', 'sigil', 'statue', 'obelisk', 'pedestal'],
  lighting: ['torch', 'lantern', 'candle', 'fire', 'brazier', 'lamp'],
  weapons: ['bow', 'crossbow', 'sword', 'axe', 'spear', 'dagger', 'staff', 'wand', 'shield', 'hammer', 'halberd'],
  characters: ['character', 'skeleton', 'knight', 'mage', 'ranger', 'rogue', 'barbarian', 'warrior'],
};

const BIOMES = [
  { id: 'inhabited-dungeon', rooms: [1, 10], keywords: ['wall', 'floor', 'pillar', 'table', 'shelf', 'bed', 'anvil', 'ore', 'barrel', 'torch'], avoid: ['tree', 'grass', 'flower'] },
  { id: 'ancient-ruins', rooms: [11, 20], keywords: ['broken', 'ruin', 'pillar', 'grave', 'crypt', 'coffin', 'statue', 'shrine', 'bone', 'candle', 'crystal'], avoid: ['bed_single', 'workbench'] },
  { id: 'meadow-forest', rooms: [21, 30], keywords: ['grass', 'ground', 'path', 'tree', 'bridge', 'fence', 'log', 'bush', 'flower', 'mushroom', 'stump', 'campfire'], avoid: ['crypt', 'coffin', 'lava'] },
  { id: 'darkwood-village', rooms: [31, 40], keywords: ['grass', 'path', 'tree', 'fence', 'gate', 'grave', 'bridge', 'stump', 'root', 'mushroom', 'lantern', 'crate', 'bench'], avoid: ['bright_flower', 'gold_chest'] },
  { id: 'fortress-ember', rooms: [41, 50], keywords: ['floor', 'tile', 'stone', 'wall', 'gate', 'pillar', 'barrier', 'weapon', 'shield', 'spear', 'brazier', 'torch', 'anvil', 'coal', 'crystal'], avoid: ['bed', 'flower', 'pillow'] },
];

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}

function relativeModel(file) {
  if (file.startsWith(KAYKIT_ROOT)) return 'kaykit/' + path.relative(KAYKIT_ROOT, file).replaceAll(path.sep, '/');
  return 'imported/' + path.relative(IMPORTED_ROOT, file).replaceAll(path.sep, '/');
}

const kaykitModels = walk(KAYKIT_ROOT).filter(file => /\.(?:gltf|glb)$/i.test(file));
const importedModels = walk(IMPORTED_ROOT).filter(file => /\.(?:gltf|glb)$/i.test(file));
const models = [...kaykitModels, ...importedModels].map(relativeModel).sort();

const sourceText = walk(SOURCE_ROOT)
  .filter(file => /\.(?:ts|tsx|js|jsx|json)$/i.test(file))
  .map(file => fs.readFileSync(file, 'utf8'))
  .join('\n');
const referencedNames = new Set(Array.from(sourceText.matchAll(/[A-Za-z0-9_./-]+\.(?:gltf|glb)/gi)).map(match => path.basename(match[0]).toLowerCase()));

const categories = {};
for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
  categories[category] = models.filter(model => keywords.some(keyword => model.toLowerCase().includes(keyword)));
}

const byPack = {};
for (const model of models) {
  const parts = model.split('/');
  const pack = parts[0] === 'kaykit' ? parts[1] : 'imported-' + (parts[1] || 'misc');
  byPack[pack] = (byPack[pack] || 0) + 1;
}

const usedModels = models.filter(model => referencedNames.has(path.basename(model).toLowerCase()));
const unusedModels = models.filter(model => !referencedNames.has(path.basename(model).toLowerCase()));
const biomeCandidates = {};
for (const biome of BIOMES) {
  biomeCandidates[biome.id] = models.filter(model => {
    const normalized = model.toLowerCase();
    return biome.keywords.some(keyword => normalized.includes(keyword)) && !biome.avoid.some(keyword => normalized.includes(keyword));
  });
}

const requiredCategories = ['architecture', 'floors', 'interiors', 'tools', 'resources', 'nature', 'graveyard', 'ritual', 'lighting', 'weapons', 'characters'];
for (const category of requiredCategories) {
  if (!categories[category] || categories[category].length === 0) throw new Error('Asset audit: category without models: ' + category);
}
if (importedModels.length === 0) throw new Error('Asset audit: imported GLB models are missing');
for (const biome of BIOMES) {
  if (biomeCandidates[biome.id].length < 8) throw new Error('Asset audit: insufficient candidates for ' + biome.id);
}

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    models: models.length,
    kaykitModels: kaykitModels.length,
    importedModels: importedModels.length,
    referencedBasenames: referencedNames.size,
    directlyReferencedModels: usedModels.length,
    candidatePoolNotDirectlyReferenced: unusedModels.length,
  },
  byPack,
  categoryCounts: Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, value.length])),
  categorySamples: Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, value.slice(0, 24)])),
  biomeCandidateCounts: Object.fromEntries(Object.entries(biomeCandidates).map(([key, value]) => [key, value.length])),
  biomeCandidates: Object.fromEntries(Object.entries(biomeCandidates).map(([key, value]) => [key, value.slice(0, 80)])),
  directlyReferencedModels: usedModels,
  candidatePoolNotDirectlyReferenced: unusedModels,
};

fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + '\n');
console.log('Asset audit complete');
console.log(JSON.stringify(report.totals));
console.log(JSON.stringify(report.categoryCounts));
console.log(JSON.stringify(report.biomeCandidateCounts));
`;

write('src/game/worldAssetCatalog.ts', catalog);
write('scripts/audit-kaykit-assets.mjs', auditScript);

const packagePath = path.join(APP, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.scripts = { ...packageJson.scripts, 'audit:assets': 'node scripts/audit-kaykit-assets.mjs' };
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('Block 3 asset catalog files written.');
