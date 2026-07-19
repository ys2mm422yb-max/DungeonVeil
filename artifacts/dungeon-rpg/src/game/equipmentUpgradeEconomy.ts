import { ACTIVE_EQUIPMENT, isActiveEquipmentId } from './equipmentRedesign';
import { clearEquipmentWishItemIfMatches } from './equipmentTargeting';
import {
  loadMetaProgression,
  saveMetaProgression,
  type EquipmentId,
  type MetaProgression,
} from './metaProgression';

export type BalancedEquipmentUpgradeCost = { gold: number; copies: number; dust: number };

const COMMON_COSTS: Record<number, BalancedEquipmentUpgradeCost> = {
  1: { gold: 3500, copies: 1, dust: 120 },
  2: { gold: 11000, copies: 3, dust: 450 },
  3: { gold: 32000, copies: 6, dust: 1400 },
  4: { gold: 85000, copies: 12, dust: 4200 },
};
const RARE_COSTS: Record<number, BalancedEquipmentUpgradeCost> = {
  1: { gold: 6000, copies: 2, dust: 220 },
  2: { gold: 19000, copies: 4, dust: 800 },
  3: { gold: 52000, copies: 8, dust: 2400 },
  4: { gold: 140000, copies: 16, dust: 7200 },
};
const EPIC_COSTS: Record<number, BalancedEquipmentUpgradeCost> = {
  1: { gold: 10000, copies: 3, dust: 400 },
  2: { gold: 32000, copies: 6, dust: 1400 },
  3: { gold: 90000, copies: 12, dust: 4200 },
  4: { gold: 240000, copies: 24, dust: 12500 },
};

function costTable(id: EquipmentId) {
  if (!isActiveEquipmentId(id)) return null;
  const rarity = ACTIVE_EQUIPMENT[id].rarity;
  return rarity === 'common' ? COMMON_COSTS : rarity === 'rare' ? RARE_COSTS : EPIC_COSTS;
}

export function balancedEquipmentUpgradeCost(
  id: EquipmentId,
  meta: MetaProgression = loadMetaProgression(),
): BalancedEquipmentUpgradeCost | null {
  const level = meta.owned[id]?.level ?? 0;
  const table = costTable(id);
  return !table || level <= 0 || level >= 5 ? null : table[level] ?? null;
}

export function upgradeMetaItemBalanced(id: EquipmentId) {
  const meta = loadMetaProgression();
  const progress = meta.owned[id];
  if (!progress || !isActiveEquipmentId(id)) return meta;
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

export const EQUIPMENT_UPGRADE_GOLD_COSTS = Object.freeze({ 1: 3500, 2: 11000, 3: 32000, 4: 85000 });
export const EQUIPMENT_UPGRADE_DUST_COSTS = Object.freeze({ 1: 120, 2: 450, 3: 1400, 4: 4200 });
