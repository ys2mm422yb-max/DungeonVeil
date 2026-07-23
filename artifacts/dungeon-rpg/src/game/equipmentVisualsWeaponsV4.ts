import type { EquipmentDefinition, EquipmentId } from './metaProgressionTypes';

const ADVENTURER = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf';
const WEAPONS = 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf';
const EXTRA_WEAPONS = 'extras/weapons';
const PLANT_WARRIOR = 'extras/plant-warrior';

type Visual = Omit<EquipmentDefinition, 'descriptionDe' | 'descriptionEn'>;

export const EQUIPMENT_WEAPON_VISUALS: Partial<Record<EquipmentId, Visual>> = {
  'ash-bow': { id: 'ash-bow', slot: 'bow', nameDe: 'Aschenbogen', nameEn: 'Ash Bow', pack: 'adventurers', assetPath: `${ADVENTURER}/bow_withString.gltf`, unlockRank: 1, accent: '#d59b45', rarity: 'common', dropSource: 'forge' },
  'ember-bow': { id: 'ember-bow', slot: 'bow', nameDe: 'Glutbogen', nameEn: 'Ember Bow', pack: 'weapons', assetPath: `${WEAPONS}/bow_A_withString.gltf`, unlockRank: 3, accent: '#ff673d', rarity: 'rare', dropSource: 'ritual' },
  'hunter-bow': { id: 'hunter-bow', slot: 'bow', nameDe: 'Bogen des Jägers', nameEn: "Hunter's Bow", pack: 'weapons', assetPath: `${PLANT_WARRIOR}/PlantWarrior_Bow_withString.gltf`, unlockRank: 4, accent: '#a8d381', rarity: 'rare', dropSource: 'hunt' },
  'frost-bow': { id: 'frost-bow', slot: 'bow', nameDe: 'Frostbogen', nameEn: 'Frost Bow', pack: 'adventurers', assetPath: `${ADVENTURER}/crossbow_1handed.gltf`, unlockRank: 5, accent: '#79ddff', rarity: 'rare', dropSource: 'depth' },
  'splinter-bow': { id: 'splinter-bow', slot: 'bow', nameDe: 'Splitterbogen', nameEn: 'Splinter Bow', pack: 'adventurers', assetPath: `${ADVENTURER}/crossbow_2handed.gltf`, unlockRank: 6, accent: '#e0c089', rarity: 'rare', dropSource: 'forge' },
  'veil-bow': { id: 'veil-bow', slot: 'bow', nameDe: 'Schleierbogen', nameEn: 'Veil Bow', pack: 'weapons', assetPath: `${EXTRA_WEAPONS}/bow_C_withString.gltf`, unlockRank: 9, accent: '#a88cff', rarity: 'rare', dropSource: 'depth' },
  'warden-bow': { id: 'warden-bow', slot: 'bow', nameDe: 'Wächterbogen', nameEn: 'Warden Bow', pack: 'weapons', assetPath: `${WEAPONS}/bow_B_withString.gltf`, unlockRank: 18, accent: '#f1c66c', rarity: 'epic', dropSource: 'warden' },
  'ranger-quiver': { id: 'ranger-quiver', slot: 'quiver', nameDe: 'Reichweitenköcher', nameEn: 'Range Quiver', pack: 'adventurers', assetPath: `${ADVENTURER}/quiver.gltf`, unlockRank: 1, accent: '#63c8d8', rarity: 'common', dropSource: 'hunt' },
  'black-quiver': { id: 'black-quiver', slot: 'quiver', nameDe: 'Schnellzugköcher', nameEn: 'Quickdraw Quiver', pack: 'adventurers', assetPath: `${ADVENTURER}/arrow_bow_bundle.gltf`, unlockRank: 5, accent: '#8b78ba', rarity: 'rare', dropSource: 'forge' },
  'rune-quiver': { id: 'rune-quiver', slot: 'quiver', nameDe: 'Runenköcher', nameEn: 'Rune Quiver', pack: 'weapons', assetPath: `${WEAPONS}/arrow_B.gltf`, unlockRank: 6, accent: '#b184ff', rarity: 'epic', dropSource: 'ritual' },
  'frost-quiver': { id: 'frost-quiver', slot: 'quiver', nameDe: 'Frostköcher', nameEn: 'Frost Quiver', pack: 'weapons', assetPath: `${WEAPONS}/arrow_A.gltf`, unlockRank: 4, accent: '#6fd8ff', rarity: 'rare', dropSource: 'depth' },
  'splinter-quiver': { id: 'splinter-quiver', slot: 'quiver', nameDe: 'Splitterköcher', nameEn: 'Splinter Quiver', pack: 'adventurers', assetPath: `${ADVENTURER}/arrow_crossbow_bundle.gltf`, unlockRank: 6, accent: '#d8bd82', rarity: 'rare', dropSource: 'forge' },
  'warden-quiver': { id: 'warden-quiver', slot: 'quiver', nameDe: 'Schleierköcher', nameEn: 'Veil Quiver', pack: 'adventurers', assetPath: `${ADVENTURER}/arrow_crossbow.gltf`, unlockRank: 11, accent: '#e6c46d', rarity: 'epic', dropSource: 'ritual' },
};
