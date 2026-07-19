import type { EquipmentDefinition, EquipmentId } from './metaProgressionTypes';

const ADVENTURER_ASSETS = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf';
const ADVENTURER_CHARACTERS = 'adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf';
const DUNGEON = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';

type Visual = Omit<EquipmentDefinition, 'descriptionDe' | 'descriptionEn'>;

export const EQUIPMENT_ARMOR_VISUALS: Partial<Record<EquipmentId, Visual>> = {
  'veil-key': { id: 'veil-key', slot: 'talisman', nameDe: 'Schleierschlüssel', nameEn: 'Veil Key', pack: 'dungeon', assetPath: `${DUNGEON}/key.gltf`, unlockRank: 1, accent: '#a58aff', rarity: 'common', dropSource: 'depth' },
  'guardian-sigil': { id: 'guardian-sigil', slot: 'talisman', nameDe: 'Wächtersiegel', nameEn: 'Guardian Sigil', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/shield_spikes_color.gltf`, unlockRank: 5, accent: '#79d69d', rarity: 'rare', dropSource: 'warden' },
  'frost-grimoire': { id: 'frost-grimoire', slot: 'talisman', nameDe: 'Frostgrimoire', nameEn: 'Frost Grimoire', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/spellbook_closed.gltf`, unlockRank: 8, accent: '#78ddff', rarity: 'epic', dropSource: 'depth' },
  'ritual-shard': { id: 'ritual-shard', slot: 'talisman', nameDe: 'Ritualsplitter', nameEn: 'Ritual Shard', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/spellbook_open.gltf`, unlockRank: 5, accent: '#d684ff', rarity: 'epic', dropSource: 'ritual' },
  'ash-amulet': { id: 'ash-amulet', slot: 'talisman', nameDe: 'Aschenamulett', nameEn: 'Ash Amulet', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/smokebomb.gltf`, unlockRank: 4, accent: '#e7804f', rarity: 'rare', dropSource: 'forge' },
  'depth-seal': { id: 'depth-seal', slot: 'talisman', nameDe: 'Tiefensiegel', nameEn: 'Depth Seal', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/shield_badge.gltf`, unlockRank: 7, accent: '#5db2b8', rarity: 'rare', dropSource: 'depth' },
  'veil-eye': { id: 'veil-eye', slot: 'talisman', nameDe: 'Auge des Schleiers', nameEn: 'Veil Eye', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/wand.gltf`, unlockRank: 10, accent: '#c375ff', rarity: 'epic', dropSource: 'ritual' },
  'ranger-cloak': { id: 'ranger-cloak', slot: 'armor', nameDe: 'Waldläufermantel', nameEn: 'Ranger Cloak', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Ranger.glb`, unlockRank: 1, accent: '#78caa0', rarity: 'common', dropSource: 'hunt' },
  'ash-armor': { id: 'ash-armor', slot: 'armor', nameDe: 'Aschenpanzer', nameEn: 'Ash Armor', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Barbarian.glb`, unlockRank: 7, accent: '#db754b', rarity: 'rare', dropSource: 'depth' },
  'frost-armor': { id: 'frost-armor', slot: 'armor', nameDe: 'Frostharnisch', nameEn: 'Frost Harness', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Knight.glb`, unlockRank: 5, accent: '#72d8ff', rarity: 'rare', dropSource: 'depth' },
  'warden-armor': { id: 'warden-armor', slot: 'armor', nameDe: 'Wächterrüstung', nameEn: 'Warden Armor', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Knight.glb`, unlockRank: 14, accent: '#e5c36b', rarity: 'epic', dropSource: 'warden' },
  'veil-mantle': { id: 'veil-mantle', slot: 'armor', nameDe: 'Schleiergewand', nameEn: 'Veil Mantle', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Ranger.glb`, unlockRank: 8, accent: '#a786ff', rarity: 'epic', dropSource: 'ritual' },
  'depth-armor': { id: 'depth-armor', slot: 'armor', nameDe: 'Rüstung der Tiefe', nameEn: 'Depth Armor', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Barbarian.glb`, unlockRank: 10, accent: '#5fb4ba', rarity: 'epic', dropSource: 'depth' },
};
