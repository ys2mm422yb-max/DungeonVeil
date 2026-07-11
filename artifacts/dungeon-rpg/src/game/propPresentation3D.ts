export type RoomPropPresentationInput = {
  model: string;
  scale?: number;
  y?: number;
  rotation?: number;
  collider?: readonly [number, number];
};

export type RoomPropScaleClass =
  | 'architecture'
  | 'furniture'
  | 'nature-solid'
  | 'heavy-prop'
  | 'foliage'
  | 'wall-decoration'
  | 'lighting'
  | 'small-prop'
  | 'tool-weapon'
  | 'default';

export type RoomPropColliderFootprint = {
  width: number;
  height: number;
  inset: number;
};

function modelKey(model: string) {
  return model.toLowerCase().replace(/\\/g, '/');
}

function hasAny(key: string, terms: readonly string[]) {
  return terms.some(term => key.includes(term));
}

const ARCHITECTURE_TERMS = [
  '/wall_',
  '/wall.',
  '/pillar',
  '/column',
  '/barrier_',
  '/stairs',
  '/gate',
  '/crypt',
  '/coffin',
  '/grave',
  '/shrine',
] as const;

const FURNITURE_TERMS = [
  '/bed_',
  '/chair',
  '/table_',
  '/shelf',
  '/cabinet',
  '/bench',
  '/barrel',
  '/box_',
  '/trunk_',
  '/pallet_',
  '/chest_',
] as const;

const NATURE_SOLID_TERMS = [
  '/tree_',
  '/tree_bare',
  '/rock_',
  '/rubble',
  'stone_chunks_large',
  'stone_bricks_stack',
] as const;

const HEAVY_PROP_TERMS = [
  '/anvil.',
  'anvil_log',
  '/grindstone.',
  '/cauldron',
  '/forge',
  'bars_stack',
] as const;

const FOLIAGE_TERMS = [
  '/bush_',
  '/grass_',
  '/flower',
  '/mushroom',
] as const;

const WALL_DECORATION_TERMS = [
  '/banner_',
  '/plaque_',
  '/sword_shield',
] as const;

const LIGHTING_TERMS = [
  'torch',
  'lantern',
  'lamp_',
  'lamp.',
  'candle',
  'jackolantern',
] as const;

const SMALL_PROP_TERMS = [
  '/key.',
  'key_metal',
  'spellbook',
  '/book_',
  '/map.',
  'map_rolled',
  'blueprint',
  '/skull.',
  '/bone_',
  'nuggets',
  'gem_',
  'crystal_',
] as const;

const TOOL_WEAPON_TERMS = [
  '/pickaxe.',
  '/shovel.',
  '/saw.',
  '/hammer.',
  '/mallet.',
  '/knife.',
  '/axe.',
  '/sword_',
  '/shield_',
  '/spear_',
  '/staff.',
  '/wand.',
  '/bow.',
  '/crossbow_',
  'handdrill',
  'wrench_',
  'tongs',
] as const;

export function roomPropScaleClass(piece: RoomPropPresentationInput): RoomPropScaleClass {
  const key = modelKey(piece.model);

  // Structural models win before decoration keywords. This keeps models such as
  // shrine_candles and shelf_small_candles solid instead of treating the whole
  // object as a tiny candle.
  if (hasAny(key, ARCHITECTURE_TERMS)) return 'architecture';
  if (hasAny(key, FURNITURE_TERMS)) return 'furniture';
  if (hasAny(key, NATURE_SOLID_TERMS)) return 'nature-solid';
  if (hasAny(key, HEAVY_PROP_TERMS)) return 'heavy-prop';
  if (hasAny(key, FOLIAGE_TERMS)) return 'foliage';
  if (hasAny(key, WALL_DECORATION_TERMS)) return 'wall-decoration';
  if (hasAny(key, LIGHTING_TERMS)) return 'lighting';
  if (hasAny(key, SMALL_PROP_TERMS)) return 'small-prop';
  if (hasAny(key, TOOL_WEAPON_TERMS)) return 'tool-weapon';
  return 'default';
}

function lightingDisplayScale(piece: RoomPropPresentationInput, key: string, base: number) {
  const elevated = (piece.y ?? 0) >= 0.45;

  if (key.includes('candle')) {
    return Math.max(base * (elevated ? 1.18 : 1.32), elevated ? 1.0 : 1.24);
  }
  if (key.includes('lantern') || key.includes('lamp_') || key.includes('lamp.')) {
    return Math.max(base * (elevated ? 1.24 : 1.48), elevated ? 1.18 : 1.44);
  }
  if (key.includes('torch')) {
    return Math.max(base * (elevated ? 1.2 : 1.42), elevated ? 1.18 : 1.5);
  }
  return base * 1.28;
}

export function roomPropDisplayScale(piece: RoomPropPresentationInput) {
  const base = piece.scale ?? 1;
  const key = modelKey(piece.model);
  const classification = roomPropScaleClass(piece);

  if (classification === 'lighting') return lightingDisplayScale(piece, key, base);
  if (classification === 'small-prop') return base * 1.2;
  if (classification === 'tool-weapon') return base * ((piece.y ?? 0) >= 0.45 ? 1.16 : 1.12);
  if (classification === 'wall-decoration') return base * 1.04;
  if (classification === 'furniture' && base < 1) return base * 1.06;
  if (classification === 'heavy-prop' && base < 1.15) return base * 1.08;
  return base;
}

export function roomPropBlocksGameplay(piece: RoomPropPresentationInput) {
  if (!piece.collider) return false;
  const classification = roomPropScaleClass(piece);
  return !['lighting', 'small-prop', 'tool-weapon', 'wall-decoration', 'foliage'].includes(classification);
}

export function roomPropColliderInset(piece: RoomPropPresentationInput) {
  const classification = roomPropScaleClass(piece);
  if (classification === 'architecture') return 0.9;
  if (classification === 'furniture') return 0.84;
  if (classification === 'nature-solid') return 0.8;
  if (classification === 'heavy-prop') return 0.86;
  return 0.88;
}

export function roomPropColliderScale(piece: RoomPropPresentationInput) {
  return roomPropDisplayScale(piece);
}

export function roomPropColliderFootprint(piece: RoomPropPresentationInput): RoomPropColliderFootprint | null {
  if (!roomPropBlocksGameplay(piece) || !piece.collider) return null;
  const inset = roomPropColliderInset(piece);
  const scale = roomPropColliderScale(piece) * inset;
  const localWidth = piece.collider[0] * scale;
  const localHeight = piece.collider[1] * scale;
  const angle = piece.rotation ?? 0;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  return {
    width: localWidth * cos + localHeight * sin,
    height: localWidth * sin + localHeight * cos,
    inset,
  };
}
