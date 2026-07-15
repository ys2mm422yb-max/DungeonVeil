import {
  loadMetaProgression,
  saveMetaProgression,
  type EquipmentId,
  type EquipmentUpgradeCost,
  type MetaProgression,
} from './metaProgression';

const BALANCED_UPGRADE_COSTS: Record<number, EquipmentUpgradeCost> = {
  1: { gold: 1000, copies: 1 },
  2: { gold: 2800, copies: 2 },
  3: { gold: 6000, copies: 3 },
  4: { gold: 11000, copies: 5 },
};

export function balancedEquipmentUpgradeCost(
  id: EquipmentId,
  meta: MetaProgression = loadMetaProgression(),
): EquipmentUpgradeCost | null {
  const level = meta.owned[id]?.level ?? 0;
  return level <= 0 || level >= 5 ? null : BALANCED_UPGRADE_COSTS[level];
}

export function upgradeMetaItemBalanced(id: EquipmentId) {
  const meta = loadMetaProgression();
  const progress = meta.owned[id];
  if (!progress) return meta;

  const cost = balancedEquipmentUpgradeCost(id, meta);
  if (!cost || meta.gold < cost.gold || progress.copies < cost.copies) return meta;

  meta.gold -= cost.gold;
  progress.copies -= cost.copies;
  progress.level += 1;
  return saveMetaProgression(meta);
}

export const EQUIPMENT_UPGRADE_GOLD_COSTS = Object.freeze({
  1: 1000,
  2: 2800,
  3: 6000,
  4: 11000,
});
