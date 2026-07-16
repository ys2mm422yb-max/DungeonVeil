import { clearEquipmentWishItemIfMatches } from './equipmentTargeting';
import {
  loadMetaProgression,
  saveMetaProgression,
  type EquipmentId,
  type MetaProgression,
} from './metaProgression';

export type BalancedEquipmentUpgradeCost = { gold: number; copies: number; dust: number };

const BALANCED_UPGRADE_COSTS: Record<number, BalancedEquipmentUpgradeCost> = {
  1: { gold: 2000, copies: 1, dust: 75 },
  2: { gold: 6000, copies: 2, dust: 250 },
  3: { gold: 15000, copies: 3, dust: 700 },
  4: { gold: 35000, copies: 5, dust: 1800 },
};

export function balancedEquipmentUpgradeCost(
  id: EquipmentId,
  meta: MetaProgression = loadMetaProgression(),
): BalancedEquipmentUpgradeCost | null {
  const level = meta.owned[id]?.level ?? 0;
  return level <= 0 || level >= 5 ? null : BALANCED_UPGRADE_COSTS[level];
}

export function upgradeMetaItemBalanced(id: EquipmentId) {
  const meta = loadMetaProgression();
  const progress = meta.owned[id];
  if (!progress) return meta;

  const cost = balancedEquipmentUpgradeCost(id, meta);
  if (!cost || meta.gold < cost.gold || meta.dust < cost.dust || progress.copies < cost.copies) return meta;

  meta.gold -= cost.gold;
  meta.dust -= cost.dust;
  progress.copies -= cost.copies;
  progress.level += 1;
  const saved = saveMetaProgression(meta);
  if (progress.level >= 5) clearEquipmentWishItemIfMatches(id);
  return saved;
}

export const EQUIPMENT_UPGRADE_GOLD_COSTS = Object.freeze({
  1: 2000,
  2: 6000,
  3: 15000,
  4: 35000,
});

export const EQUIPMENT_UPGRADE_DUST_COSTS = Object.freeze({
  1: 75,
  2: 250,
  3: 700,
  4: 1800,
});
