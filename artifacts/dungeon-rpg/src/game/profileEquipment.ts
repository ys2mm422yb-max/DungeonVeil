import {
  ACTIVE_EQUIPMENT,
  ACTIVE_EQUIPMENT_SLOTS,
  activeEquipmentLevelStats,
  isActiveEquipmentId,
  type ActiveEquipmentId,
  type ActiveEquipmentSlot,
} from './equipmentRedesign';
import { EQUIPMENT } from './equipmentDefinitionsV4';
import { isOptionalEquipmentSlotEquipped } from './optionalEquipmentState';
import type { EquipmentId, EquipmentRarity, MetaProgression } from './metaProgressionTypes';

export type CurrentProfileEquipmentItem = {
  slot: ActiveEquipmentSlot;
  id: ActiveEquipmentId;
  level: number;
  rarity: EquipmentRarity;
};

const clampLevel = (value: unknown) => Math.max(1, Math.min(5, Math.floor(Number(value) || 1)));

export function normalizeProfileEquipmentItems(value: unknown): CurrentProfileEquipmentItem[] {
  if (!Array.isArray(value)) return [];
  const bySlot = new Map<ActiveEquipmentSlot, CurrentProfileEquipmentItem>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as { slot?: unknown; id?: unknown; level?: unknown };
    if (!isActiveEquipmentId(candidate.id)) continue;
    const definition = ACTIVE_EQUIPMENT[candidate.id];
    if (!ACTIVE_EQUIPMENT_SLOTS.includes(candidate.slot as ActiveEquipmentSlot)) continue;
    if (candidate.slot !== definition.slot) continue;
    bySlot.set(definition.slot, {
      slot: definition.slot,
      id: definition.id,
      level: clampLevel(candidate.level),
      rarity: definition.rarity,
    });
  }
  return ACTIVE_EQUIPMENT_SLOTS.flatMap(slot => {
    const item = bySlot.get(slot);
    return item ? [item] : [];
  });
}

export function currentProfileEquipmentFromMeta(meta: MetaProgression): CurrentProfileEquipmentItem[] {
  return ACTIVE_EQUIPMENT_SLOTS.flatMap(slot => {
    if (slot === 'quiver' && !isOptionalEquipmentSlotEquipped('quiver')) return [];
    const id = meta.equipped[slot];
    if (!isActiveEquipmentId(id)) return [];
    const definition = ACTIVE_EQUIPMENT[id];
    if (definition.slot !== slot || !meta.owned[id]) return [];
    return [{
      slot,
      id,
      level: clampLevel(meta.owned[id]?.level),
      rarity: definition.rarity,
    } satisfies CurrentProfileEquipmentItem];
  });
}

export function activeOwnedEquipmentCount(meta: MetaProgression): number {
  return Object.keys(meta.owned).filter(isActiveEquipmentId).length;
}

export function profileEquipmentSlotLabel(slot: ActiveEquipmentSlot, de: boolean): string {
  if (slot === 'bow') return de ? 'Bogen' : 'Bow';
  if (slot === 'quiver') return de ? 'Köcher' : 'Quiver';
  return de ? 'Rüstung' : 'Armor';
}

export function profileEquipmentRarityLabel(rarity: EquipmentRarity, de: boolean): string {
  if (rarity === 'epic') return de ? 'Episch' : 'Epic';
  if (rarity === 'rare') return de ? 'Selten' : 'Rare';
  return de ? 'Gewöhnlich' : 'Common';
}

function shown(value: number, percent = false): string {
  const normalized = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  return percent ? `${normalized} %` : normalized;
}

export function profileEquipmentPrimaryBonus(item: Pick<CurrentProfileEquipmentItem, 'id' | 'level'>, de: boolean): string {
  const stats = activeEquipmentLevelStats(item.id as EquipmentId, item.level);
  const values: string[] = [];
  if (stats.attackFlat) values.push(`${de ? 'Angriff' : 'Attack'} +${shown(stats.attackFlat)}`);
  if (stats.critChance) values.push(`${de ? 'Krit' : 'Crit'} +${shown(stats.critChance * 100, true)}`);
  if (stats.critDamageBonus) values.push(`${de ? 'Krit-Schaden' : 'Crit damage'} +${shown(stats.critDamageBonus * 100, true)}`);
  if (stats.attackRange) values.push(`${de ? 'Reichweite' : 'Range'} +${shown(stats.attackRange)}`);
  if (stats.attackSpeedPercent) values.push(`${de ? 'Angriffstempo' : 'Attack speed'} +${shown(stats.attackSpeedPercent * 100, true)}`);
  if (stats.maxHp) values.push(`${de ? 'Leben' : 'Health'} +${shown(stats.maxHp)}`);
  if (stats.defense) values.push(`${de ? 'Verteidigung' : 'Defense'} +${shown(stats.defense)}`);
  return values.slice(0, 2).join(' · ') || (de ? 'Kein Kampfbonus' : 'No combat bonus');
}

export function profileEquipmentDefinition(item: CurrentProfileEquipmentItem) {
  return EQUIPMENT[item.id];
}
