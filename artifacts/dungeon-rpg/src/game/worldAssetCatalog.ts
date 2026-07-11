export type WorldAssetPack =
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
