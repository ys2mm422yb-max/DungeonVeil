import { loadMetaProgression, type EquipmentId, type MetaProgression } from './metaProgression';
import {
  addEquipmentStats,
  equipmentStatsAtLevel,
  isActiveEquipmentId,
  totalCritChance,
  totalCritDamage,
  type ActiveEquipmentId,
  type EquipmentCoreStats,
} from './equipmentCore';

export type ActiveLoadoutStats = EquipmentCoreStats & {
  critChanceTotal: number;
  critDamageTotal: number;
  equippedIds: readonly ActiveEquipmentId[];
};

function itemLevel(meta: MetaProgression, id: EquipmentId): number {
  return Math.max(1, Math.min(5, Math.floor(meta.owned[id]?.level ?? 1)));
}

export function activeEquipmentLoadoutStats(meta: MetaProgression = loadMetaProgression()): ActiveLoadoutStats {
  const candidates = [meta.equipped.bow, meta.equipped.quiver, meta.equipped.armor]
    .filter(isActiveEquipmentId);
  const equippedIds = [...new Set(candidates)];
  const stats = addEquipmentStats(...equippedIds.map(id => equipmentStatsAtLevel(id, itemLevel(meta, id))));
  return {
    ...stats,
    critChanceTotal: totalCritChance(stats.critChance),
    critDamageTotal: totalCritDamage(stats.critDamage),
    equippedIds,
  };
}
