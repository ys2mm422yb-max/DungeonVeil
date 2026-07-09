export type RoomIdentityId =
  | 'storehouse'
  | 'guardroom'
  | 'old-passage'
  | 'miners-camp'
  | 'workshop'
  | 'forge'
  | 'quarters'
  | 'material-vault'
  | 'ritual-antechamber'
  | 'guardian-hall'
  | 'overgrown-vault'
  | 'blood-archive'
  | 'rune-sanctum'
  | 'root-chamber'
  | 'veil-shrine'
  | 'fractured-workshop'
  | 'grave-gallery'
  | 'crystal-foundry'
  | 'broken-ritual'
  | 'first-warden';

export type RoomIdentity = {
  id: RoomIdentityId;
  nameDe: string;
  nameEn: string;
  packs: Array<'furniture' | 'tools' | 'resources' | 'forest' | 'halloween'>;
  keywords: string[];
  density: number;
};

export const ROOM_IDENTITIES: Record<number, RoomIdentity> = {
  1: { id: 'storehouse', nameDe: 'Vorratslager', nameEn: 'Storehouse', packs: ['furniture', 'resources'], keywords: ['shelf', 'cabinet', 'table', 'sack', 'bundle', 'wood', 'rope'], density: 5 },
  2: { id: 'guardroom', nameDe: 'Wachstube', nameEn: 'Guardroom', packs: ['furniture', 'tools'], keywords: ['table', 'chair', 'map', 'journal', 'lantern', 'compass'], density: 6 },
  3: { id: 'old-passage', nameDe: 'Alte Passage', nameEn: 'Old Passage', packs: ['halloween'], keywords: ['statue', 'grave', 'skull', 'bone', 'fence'], density: 3 },
  4: { id: 'miners-camp', nameDe: 'Bergarbeiterlager', nameEn: 'Miners Camp', packs: ['tools', 'resources'], keywords: ['pickaxe', 'lantern', 'bucket', 'shovel', 'rope', 'ore', 'coal', 'rock'], density: 6 },
  5: { id: 'workshop', nameDe: 'Werkstatt', nameEn: 'Workshop', packs: ['tools', 'furniture'], keywords: ['handdrill', 'file', 'saw', 'wrench', 'blueprint', 'journal', 'table', 'stool'], density: 6 },
  6: { id: 'forge', nameDe: 'Schmiede', nameEn: 'Forge', packs: ['tools', 'resources'], keywords: ['anvil', 'grindstone', 'hammer', 'tongs', 'metal', 'ingot', 'coal', 'torch'], density: 6 },
  7: { id: 'quarters', nameDe: 'Verlassene Unterkunft', nameEn: 'Abandoned Quarters', packs: ['furniture'], keywords: ['bed', 'cabinet', 'chair', 'rug', 'pillow', 'lamp'], density: 6 },
  8: { id: 'material-vault', nameDe: 'Materiallager', nameEn: 'Material Vault', packs: ['resources', 'tools'], keywords: ['ore', 'crystal', 'ingot', 'wood', 'plank', 'rope', 'bucket'], density: 6 },
  9: { id: 'ritual-antechamber', nameDe: 'Ritualvorraum', nameEn: 'Ritual Antechamber', packs: ['halloween', 'tools'], keywords: ['candle', 'cauldron', 'skull', 'bone', 'journal', 'map', 'torch'], density: 5 },
  10: { id: 'guardian-hall', nameDe: 'Wächterhalle', nameEn: 'Guardian Hall', packs: ['halloween'], keywords: ['grave', 'tomb', 'statue', 'skull', 'candle', 'crypt'], density: 5 },
  11: { id: 'overgrown-vault', nameDe: 'Überwuchertes Gewölbe', nameEn: 'Overgrown Vault', packs: ['forest', 'furniture'], keywords: ['root', 'stump', 'mushroom', 'fern', 'shelf', 'cabinet'], density: 6 },
  12: { id: 'blood-archive', nameDe: 'Blutarchiv', nameEn: 'Blood Archive', packs: ['furniture', 'halloween', 'tools'], keywords: ['book', 'shelf', 'journal', 'map', 'candle', 'skull'], density: 6 },
  13: { id: 'rune-sanctum', nameDe: 'Runensanktum', nameEn: 'Rune Sanctum', packs: ['resources', 'tools'], keywords: ['crystal', 'gem', 'blueprint', 'drafting', 'compass', 'journal'], density: 5 },
  14: { id: 'root-chamber', nameDe: 'Wurzelkammer', nameEn: 'Root Chamber', packs: ['forest'], keywords: ['root', 'stump', 'mushroom', 'bush', 'fern', 'rock'], density: 6 },
  15: { id: 'veil-shrine', nameDe: 'Schleierschrein', nameEn: 'Veil Shrine', packs: ['halloween', 'resources'], keywords: ['candle', 'crypt', 'skull', 'crystal', 'gem', 'stone'], density: 5 },
  16: { id: 'fractured-workshop', nameDe: 'Gebrochene Werkstatt', nameEn: 'Fractured Workshop', packs: ['tools', 'resources'], keywords: ['blueprint', 'handdrill', 'wrench', 'hammer', 'crystal', 'metal'], density: 6 },
  17: { id: 'grave-gallery', nameDe: 'Grabgalerie', nameEn: 'Grave Gallery', packs: ['halloween'], keywords: ['grave', 'tomb', 'coffin', 'bone', 'skull', 'candle'], density: 6 },
  18: { id: 'crystal-foundry', nameDe: 'Kristallgießerei', nameEn: 'Crystal Foundry', packs: ['resources', 'tools'], keywords: ['crystal', 'gem', 'ingot', 'anvil', 'grindstone', 'tongs'], density: 6 },
  19: { id: 'broken-ritual', nameDe: 'Gebrochenes Ritual', nameEn: 'Broken Ritual', packs: ['halloween', 'resources'], keywords: ['cauldron', 'candle', 'skull', 'crystal', 'gem', 'crypt'], density: 6 },
  20: { id: 'first-warden', nameDe: 'Halle des ersten Wächters', nameEn: 'Hall of the First Warden', packs: ['halloween', 'resources'], keywords: ['statue', 'crypt', 'grave', 'crystal', 'stone', 'candle'], density: 5 },
};

export function roomIdentity(room: number): RoomIdentity {
  return ROOM_IDENTITIES[Math.max(1, Math.min(20, room))] ?? ROOM_IDENTITIES[1];
}
