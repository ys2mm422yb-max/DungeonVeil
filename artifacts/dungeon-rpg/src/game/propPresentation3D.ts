export type RoomPropPresentationInput = {
  model: string;
  scale?: number;
  y?: number;
  collider?: readonly [number, number];
};

export type RoomPropScaleClass = 'lighting' | 'small-prop' | 'tool-weapon' | 'furniture' | 'architecture' | 'default';

function modelKey(model: string) {
  return model.toLowerCase().replace(/\\/g, '/');
}

function hasAny(key: string, terms: readonly string[]) {
  return terms.some(term => key.includes(term));
}

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

export function roomPropScaleClass(piece: RoomPropPresentationInput): RoomPropScaleClass {
  const key = modelKey(piece.model);
  if (hasAny(key, LIGHTING_TERMS)) return 'lighting';
  if (hasAny(key, SMALL_PROP_TERMS)) return 'small-prop';
  if (hasAny(key, TOOL_WEAPON_TERMS)) return 'tool-weapon';
  if (hasAny(key, FURNITURE_TERMS)) return 'furniture';
  if (hasAny(key, ARCHITECTURE_TERMS)) return 'architecture';
  return 'default';
}

export function roomPropDisplayScale(piece: RoomPropPresentationInput) {
  const base = piece.scale ?? 1;
  const classification = roomPropScaleClass(piece);

  if (classification === 'lighting') {
    const mounted = (piece.y ?? 0) >= 0.45;
    return base * (mounted ? 1.28 : 1.48);
  }
  if (classification === 'small-prop') return base * 1.22;
  if (classification === 'tool-weapon') return base * ((piece.y ?? 0) >= 0.45 ? 1.18 : 1.14);
  if (classification === 'furniture' && base < 1) return base * 1.08;
  return base;
}

export function roomPropColliderScale(piece: RoomPropPresentationInput) {
  // Collider and rendering deliberately share one resolved scale. The small inset
  // is applied by roomCollision3D so visible edges do not feel sticky on mobile.
  return roomPropDisplayScale(piece);
}
