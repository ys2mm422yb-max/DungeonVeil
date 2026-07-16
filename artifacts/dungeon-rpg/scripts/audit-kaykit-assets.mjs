import fs from 'node:fs';
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
  armor: ['armor', 'armour', 'helmet', 'helm', 'chest', 'pauldron', 'cloak', 'cape', 'knight', 'ranger', 'rogue', 'barbarian', 'mage', 'mannequin'],
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

const requiredCategories = ['architecture', 'floors', 'interiors', 'tools', 'resources', 'nature', 'graveyard', 'ritual', 'lighting', 'weapons', 'characters', 'armor'];
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
