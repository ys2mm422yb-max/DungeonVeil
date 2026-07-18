export const ACTIVE_EQUIPMENT_IDS = [
  'ash-bow',
  'ember-bow',
  'veil-bow',
  'warden-bow',
  'ranger-quiver',
  'black-quiver',
  'rune-quiver',
  'ranger-cloak',
  'ash-armor',
  'warden-armor',
] as const;

export type ActiveEquipmentId = typeof ACTIVE_EQUIPMENT_IDS[number];
export type ActiveEquipmentSlot = 'bow' | 'quiver' | 'armor';
export type EquipmentCoreStats = {
  attackFlat: number;
  maxHp: number;
  defense: number;
  attackRange: number;
  attackSpeedPercent: number;
  critChance: number;
  critDamage: number;
};

export const BASE_CRIT_CHANCE = 0.05;
export const BASE_CRIT_DAMAGE = 1.5;
export const MAX_TOTAL_CRIT_CHANCE = 0.35;
export const MAX_TOTAL_CRIT_DAMAGE = 2.25;
export const MIN_ATTACK_COOLDOWN_MS = 115;
export const COMPANION_POWER_RESERVE_MIN = 0.08;
export const COMPANION_POWER_RESERVE_MAX = 0.12;

const ZERO_STATS: EquipmentCoreStats = Object.freeze({
  attackFlat: 0,
  maxHp: 0,
  defense: 0,
  attackRange: 0,
  attackSpeedPercent: 0,
  critChance: 0,
  critDamage: 0,
});

function stats(partial: Partial<EquipmentCoreStats>): EquipmentCoreStats {
  return Object.freeze({ ...ZERO_STATS, ...partial });
}

export const EQUIPMENT_LEVEL_STATS: Readonly<Record<ActiveEquipmentId, readonly EquipmentCoreStats[]>> = Object.freeze({
  'ash-bow': [
    stats({ attackFlat: 2 }),
    stats({ attackFlat: 4 }),
    stats({ attackFlat: 6 }),
    stats({ attackFlat: 9 }),
    stats({ attackFlat: 13 }),
  ],
  'ember-bow': [
    stats({ critChance: 0.02 }),
    stats({ attackFlat: 1, critChance: 0.04 }),
    stats({ attackFlat: 1, critChance: 0.06 }),
    stats({ attackFlat: 2, critChance: 0.08 }),
    stats({ attackFlat: 3, critChance: 0.11 }),
  ],
  'veil-bow': [
    stats({ attackFlat: 1, critChance: 0.01 }),
    stats({ attackFlat: 2, critChance: 0.02 }),
    stats({ attackFlat: 4, critChance: 0.04 }),
    stats({ attackFlat: 6, critChance: 0.06 }),
    stats({ attackFlat: 9, critChance: 0.08 }),
  ],
  'warden-bow': [
    stats({ attackFlat: 2, critChance: 0.01, critDamage: 0.05 }),
    stats({ attackFlat: 4, critChance: 0.03, critDamage: 0.10 }),
    stats({ attackFlat: 6, critChance: 0.05, critDamage: 0.15 }),
    stats({ attackFlat: 8, critChance: 0.07, critDamage: 0.22 }),
    stats({ attackFlat: 11, critChance: 0.09, critDamage: 0.30 }),
  ],
  'ranger-quiver': [
    stats({ attackRange: 20 }),
    stats({ attackRange: 35 }),
    stats({ attackRange: 50 }),
    stats({ attackRange: 70 }),
    stats({ attackRange: 95 }),
  ],
  'black-quiver': [
    stats({ attackSpeedPercent: 0.04 }),
    stats({ attackSpeedPercent: 0.07 }),
    stats({ attackSpeedPercent: 0.10 }),
    stats({ attackSpeedPercent: 0.13 }),
    stats({ attackSpeedPercent: 0.17 }),
  ],
  'rune-quiver': [
    stats({ attackRange: 10, attackSpeedPercent: 0.02 }),
    stats({ attackRange: 18, attackSpeedPercent: 0.04 }),
    stats({ attackRange: 28, attackSpeedPercent: 0.06 }),
    stats({ attackRange: 40, attackSpeedPercent: 0.08 }),
    stats({ attackRange: 55, attackSpeedPercent: 0.10 }),
  ],
  'ranger-cloak': [
    stats({ maxHp: 12 }),
    stats({ maxHp: 24 }),
    stats({ maxHp: 38 }),
    stats({ maxHp: 54 }),
    stats({ maxHp: 72 }),
  ],
  'ash-armor': [
    stats({ maxHp: 8 }),
    stats({ maxHp: 17, defense: 1 }),
    stats({ maxHp: 27, defense: 2 }),
    stats({ maxHp: 39, defense: 3 }),
    stats({ maxHp: 53, defense: 4 }),
  ],
  'warden-armor': [
    stats({ maxHp: 5, defense: 1 }),
    stats({ maxHp: 10, defense: 2 }),
    stats({ maxHp: 16, defense: 3 }),
    stats({ maxHp: 24, defense: 5 }),
    stats({ maxHp: 34, defense: 7 }),
  ],
});

export const EQUIPMENT_UNLOCK_CHAPTER: Readonly<Record<ActiveEquipmentId, number>> = Object.freeze({
  'ash-bow': 1,
  'ranger-quiver': 1,
  'ranger-cloak': 1,
  'ember-bow': 2,
  'black-quiver': 3,
  'ash-armor': 3,
  'veil-bow': 5,
  'rune-quiver': 6,
  'warden-armor': 7,
  'warden-bow': 9,
});

export const LEGACY_EQUIPMENT_MIGRATION: Readonly<Record<string, ActiveEquipmentId | null>> = Object.freeze({
  'ash-bow': 'ash-bow',
  'ember-bow': 'ember-bow',
  'hunter-bow': 'ash-bow',
  'frost-bow': 'ember-bow',
  'splinter-bow': 'veil-bow',
  'veil-bow': 'veil-bow',
  'warden-bow': 'warden-bow',
  'ranger-quiver': 'ranger-quiver',
  'black-quiver': 'black-quiver',
  'rune-quiver': 'rune-quiver',
  'frost-quiver': 'ranger-quiver',
  'splinter-quiver': 'rune-quiver',
  'warden-quiver': 'black-quiver',
  'veil-key': null,
  'guardian-sigil': 'warden-armor',
  'frost-grimoire': 'ember-bow',
  'ritual-shard': 'veil-bow',
  'ash-amulet': 'ash-armor',
  'depth-seal': 'rune-quiver',
  'veil-eye': 'warden-bow',
  'ranger-cloak': 'ranger-cloak',
  'ash-armor': 'ash-armor',
  'frost-armor': 'warden-armor',
  'warden-armor': 'warden-armor',
  'veil-mantle': 'ranger-cloak',
  'depth-armor': 'warden-armor',
});

export const REMOVED_ITEM_COMPENSATION_DUST_PER_LEVEL = 30;
export const REMOVED_ITEM_COMPENSATION_DUST_PER_COPY = 12;

export function isActiveEquipmentId(value: unknown): value is ActiveEquipmentId {
  return typeof value === 'string' && (ACTIVE_EQUIPMENT_IDS as readonly string[]).includes(value);
}

export function equipmentStatsAtLevel(id: ActiveEquipmentId, level: number): EquipmentCoreStats {
  const safeLevel = Math.max(1, Math.min(5, Math.floor(Number(level) || 1)));
  return EQUIPMENT_LEVEL_STATS[id][safeLevel - 1];
}

export function addEquipmentStats(...values: readonly EquipmentCoreStats[]): EquipmentCoreStats {
  return values.reduce<EquipmentCoreStats>((total, value) => ({
    attackFlat: total.attackFlat + value.attackFlat,
    maxHp: total.maxHp + value.maxHp,
    defense: total.defense + value.defense,
    attackRange: total.attackRange + value.attackRange,
    attackSpeedPercent: total.attackSpeedPercent + value.attackSpeedPercent,
    critChance: total.critChance + value.critChance,
    critDamage: total.critDamage + value.critDamage,
  }), { ...ZERO_STATS });
}

export function totalCritChance(bonus: number): number {
  return Math.min(MAX_TOTAL_CRIT_CHANCE, Math.max(0, BASE_CRIT_CHANCE + bonus));
}

export function totalCritDamage(bonus: number): number {
  return Math.min(MAX_TOTAL_CRIT_DAMAGE, Math.max(1, BASE_CRIT_DAMAGE + bonus));
}

export function effectiveAttackCooldown(baseCooldownMs: number, attackSpeedPercent: number): number {
  const safeBase = Math.max(MIN_ATTACK_COOLDOWN_MS, Number(baseCooldownMs) || 270);
  const speed = Math.max(0, Math.min(0.5, Number(attackSpeedPercent) || 0));
  return Math.max(MIN_ATTACK_COOLDOWN_MS, Math.round(safeBase / (1 + speed)));
}
