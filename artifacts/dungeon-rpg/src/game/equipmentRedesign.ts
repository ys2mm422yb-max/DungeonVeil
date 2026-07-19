import type { CurrentEquipmentSlot, EquipmentDropSource, EquipmentId, EquipmentRarity } from './metaProgression';

export type ActiveEquipmentId =
  | 'ash-bow' | 'ember-bow' | 'veil-bow' | 'warden-bow'
  | 'ranger-quiver' | 'black-quiver' | 'warden-quiver'
  | 'ranger-cloak' | 'ash-armor' | 'warden-armor';

export type ActiveEquipmentSlot = CurrentEquipmentSlot;
export type EquipmentLevelStats = Readonly<{
  attackFlat?: number;
  critChance?: number;
  critDamageBonus?: number;
  maxHp?: number;
  defense?: number;
  attackRange?: number;
  attackSpeedPercent?: number;
}>;

export type ActiveEquipmentDefinition = {
  id: ActiveEquipmentId;
  slot: ActiveEquipmentSlot;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  unlockRank: number;
  unlockChapter: number;
  rarity: EquipmentRarity;
  dropSource: EquipmentDropSource;
  levels: readonly [EquipmentLevelStats, EquipmentLevelStats, EquipmentLevelStats, EquipmentLevelStats, EquipmentLevelStats];
};

export const BASE_CRIT_CHANCE = 0.05;
export const BASE_CRIT_DAMAGE_MULTIPLIER = 1.5;
export const MAX_CRIT_CHANCE = 0.55;
export const MAX_CRIT_DAMAGE_MULTIPLIER = 2.4;
export const MAX_ATTACK_SPEED_PERCENT = 0.45;
export const MAX_EQUIPMENT_RANGE_BONUS = 150;
export const ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor'];

export const ACTIVE_EQUIPMENT: Record<ActiveEquipmentId, ActiveEquipmentDefinition> = {
  'ash-bow': {
    id: 'ash-bow', slot: 'bow', nameDe: 'Aschenbogen', nameEn: 'Ash Bow',
    descriptionDe: 'Verlässlicher Angriffsbogen ohne Spezialfähigkeit.', descriptionEn: 'Reliable attack bow without a special ability.',
    unlockRank: 1, unlockChapter: 1, rarity: 'common', dropSource: 'forge',
    levels: [{ attackFlat: 4 }, { attackFlat: 7 }, { attackFlat: 11 }, { attackFlat: 16 }, { attackFlat: 22 }],
  },
  'ember-bow': {
    id: 'ember-bow', slot: 'bow', nameDe: 'Glutbogen', nameEn: 'Ember Bow',
    descriptionDe: 'Krit-Spezialist ohne Feuerpfeil oder Elementareffekt.', descriptionEn: 'Critical-hit specialist without Fire Arrow or elemental effects.',
    unlockRank: 3, unlockChapter: 2, rarity: 'rare', dropSource: 'ritual',
    levels: [
      { attackFlat: 2, critChance: 0.03 }, { attackFlat: 3, critChance: 0.045 },
      { attackFlat: 4, critChance: 0.06 }, { attackFlat: 5, critChance: 0.075 },
      { attackFlat: 7, critChance: 0.09 },
    ],
  },
  'veil-bow': {
    id: 'veil-bow', slot: 'bow', nameDe: 'Schleierbogen', nameEn: 'Veil Bow',
    descriptionDe: 'Fortgeschrittener Hybrid aus Angriff und Krit-Chance.', descriptionEn: 'Advanced hybrid of attack and critical chance.',
    unlockRank: 9, unlockChapter: 5, rarity: 'rare', dropSource: 'depth',
    levels: [
      { attackFlat: 3, critChance: 0.015 }, { attackFlat: 5, critChance: 0.025 },
      { attackFlat: 7, critChance: 0.035 }, { attackFlat: 10, critChance: 0.045 },
      { attackFlat: 13, critChance: 0.055 },
    ],
  },
  'warden-bow': {
    id: 'warden-bow', slot: 'bow', nameDe: 'Wächterbogen', nameEn: 'Warden Bow',
    descriptionDe: 'Später Allround-Bogen mit Angriff, Krit-Chance und etwas Krit-Schaden.', descriptionEn: 'Late all-round bow with attack, critical chance and some critical damage.',
    unlockRank: 18, unlockChapter: 10, rarity: 'epic', dropSource: 'warden',
    levels: [
      { attackFlat: 4, critChance: 0.01, critDamageBonus: 0.05 },
      { attackFlat: 7, critChance: 0.02, critDamageBonus: 0.08 },
      { attackFlat: 10, critChance: 0.03, critDamageBonus: 0.11 },
      { attackFlat: 14, critChance: 0.04, critDamageBonus: 0.14 },
      { attackFlat: 18, critChance: 0.05, critDamageBonus: 0.18 },
    ],
  },
  'ranger-quiver': {
    id: 'ranger-quiver', slot: 'quiver', nameDe: 'Reichweitenköcher', nameEn: 'Range Quiver',
    descriptionDe: 'Erhöht ausschließlich die Angriffsreichweite.', descriptionEn: 'Increases attack range only.',
    unlockRank: 1, unlockChapter: 1, rarity: 'common', dropSource: 'hunt',
    levels: [{ attackRange: 40 }, { attackRange: 65 }, { attackRange: 90 }, { attackRange: 120 }, { attackRange: 150 }],
  },
  'black-quiver': {
    id: 'black-quiver', slot: 'quiver', nameDe: 'Schnellzugköcher', nameEn: 'Quickdraw Quiver',
    descriptionDe: 'Erhöht ausschließlich die Angriffsgeschwindigkeit.', descriptionEn: 'Increases attack speed only.',
    unlockRank: 5, unlockChapter: 3, rarity: 'rare', dropSource: 'forge',
    levels: [
      { attackSpeedPercent: 0.06 }, { attackSpeedPercent: 0.09 }, { attackSpeedPercent: 0.12 },
      { attackSpeedPercent: 0.15 }, { attackSpeedPercent: 0.18 },
    ],
  },
  'warden-quiver': {
    id: 'warden-quiver', slot: 'quiver', nameDe: 'Schleierköcher', nameEn: 'Veil Quiver',
    descriptionDe: 'Hybrid aus Reichweite und Angriffsgeschwindigkeit.', descriptionEn: 'Hybrid of range and attack speed.',
    unlockRank: 11, unlockChapter: 6, rarity: 'epic', dropSource: 'ritual',
    levels: [
      { attackRange: 20, attackSpeedPercent: 0.03 },
      { attackRange: 32, attackSpeedPercent: 0.05 },
      { attackRange: 45, attackSpeedPercent: 0.07 },
      { attackRange: 58, attackSpeedPercent: 0.09 },
      { attackRange: 72, attackSpeedPercent: 0.11 },
    ],
  },
  'ranger-cloak': {
    id: 'ranger-cloak', slot: 'armor', nameDe: 'Waldläufermantel', nameEn: 'Ranger Cloak',
    descriptionDe: 'Standardrüstung mit Schwerpunkt maximales Leben.', descriptionEn: 'Standard armor focused on maximum health.',
    unlockRank: 1, unlockChapter: 1, rarity: 'common', dropSource: 'hunt',
    levels: [{ maxHp: 18 }, { maxHp: 30 }, { maxHp: 44 }, { maxHp: 60 }, { maxHp: 80 }],
  },
  'ash-armor': {
    id: 'ash-armor', slot: 'armor', nameDe: 'Aschenpanzer', nameEn: 'Ash Armor',
    descriptionDe: 'Hybridrüstung aus Leben und Verteidigung ohne Angriff.', descriptionEn: 'Hybrid armor with health and defense, without attack.',
    unlockRank: 7, unlockChapter: 4, rarity: 'rare', dropSource: 'depth',
    levels: [
      { maxHp: 12, defense: 1 }, { maxHp: 22, defense: 2 }, { maxHp: 34, defense: 3 },
      { maxHp: 48, defense: 4 }, { maxHp: 65, defense: 5 },
    ],
  },
  'warden-armor': {
    id: 'warden-armor', slot: 'armor', nameDe: 'Wächterrüstung', nameEn: 'Warden Armor',
    descriptionDe: 'Full-Tank-Rüstung mit Schwerpunkt Verteidigung.', descriptionEn: 'Full-tank armor focused on defense.',
    unlockRank: 14, unlockChapter: 8, rarity: 'epic', dropSource: 'warden',
    levels: [
      { maxHp: 5, defense: 2 }, { maxHp: 10, defense: 4 }, { maxHp: 18, defense: 6 },
      { maxHp: 28, defense: 8 }, { maxHp: 40, defense: 11 },
    ],
  },
};

export const ACTIVE_EQUIPMENT_IDS = Object.freeze(Object.keys(ACTIVE_EQUIPMENT) as ActiveEquipmentId[]);

export const LEGACY_EQUIPMENT_REPLACEMENTS: Readonly<Record<EquipmentId, ActiveEquipmentId>> = Object.freeze({
  'ash-bow': 'ash-bow', 'ember-bow': 'ember-bow', 'hunter-bow': 'ash-bow', 'frost-bow': 'ember-bow',
  'splinter-bow': 'veil-bow', 'veil-bow': 'veil-bow', 'warden-bow': 'warden-bow',
  'ranger-quiver': 'ranger-quiver', 'black-quiver': 'black-quiver', 'rune-quiver': 'warden-quiver',
  'frost-quiver': 'black-quiver', 'splinter-quiver': 'ranger-quiver', 'warden-quiver': 'warden-quiver',
  'veil-key': 'ranger-quiver', 'guardian-sigil': 'warden-armor', 'frost-grimoire': 'black-quiver',
  'ritual-shard': 'warden-quiver', 'ash-amulet': 'ash-bow', 'depth-seal': 'ash-armor', 'veil-eye': 'veil-bow',
  'ranger-cloak': 'ranger-cloak', 'ash-armor': 'ash-armor', 'frost-armor': 'warden-armor',
  'warden-armor': 'warden-armor', 'veil-mantle': 'ranger-cloak', 'depth-armor': 'warden-armor',
});

export function isActiveEquipmentId(value: unknown): value is ActiveEquipmentId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACTIVE_EQUIPMENT, value);
}

export function activeEquipmentDefinition(id: EquipmentId): ActiveEquipmentDefinition | null {
  return isActiveEquipmentId(id) ? ACTIVE_EQUIPMENT[id] : null;
}

export function activeEquipmentLevelStats(id: EquipmentId, level: number): EquipmentLevelStats {
  const definition = activeEquipmentDefinition(id);
  if (!definition) return {};
  const safeLevel = Math.max(1, Math.min(5, Math.floor(Number(level) || 1)));
  return definition.levels[safeLevel - 1] ?? {};
}

export function legacyReplacementFor(id: EquipmentId): ActiveEquipmentId {
  return LEGACY_EQUIPMENT_REPLACEMENTS[id];
}
