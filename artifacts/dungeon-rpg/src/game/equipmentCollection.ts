import {
  EQUIPMENT,
  collectMetaEquipmentDrop,
  loadMetaProgression,
  saveMetaProgression,
  type EquipmentId,
  type EquipmentRarity,
} from './metaProgression';

export const MAX_LEVEL_DUPLICATE_DUST: Readonly<Record<EquipmentRarity, number>> = Object.freeze({
  common: 35,
  rare: 60,
  epic: 100,
});

export function collectBalancedEquipmentDrop(id: EquipmentId) {
  const meta = loadMetaProgression();
  const existing = meta.owned[id];
  if (existing && existing.level >= 5) {
    const convertedDust = MAX_LEVEL_DUPLICATE_DUST[EQUIPMENT[id].rarity];
    meta.dust += convertedDust;
    saveMetaProgression(meta);
    return { meta, duplicate: true, convertedDust, progress: existing };
  }

  const result = collectMetaEquipmentDrop(id);
  return { ...result, convertedDust: 0 };
}

export type IdempotentEquipmentReward = {
  applied: boolean;
  duplicate: boolean;
  convertedDust: number;
  copies: number;
  level: number;
};

export function collectBalancedEquipmentDropOnce(id: EquipmentId, ledgerKey: string): IdempotentEquipmentReward {
  const key = String(ledgerKey).trim().slice(0, 180);
  const meta = loadMetaProgression();
  const before = meta.owned[id];
  if (!key || meta.rewardLedger.includes(key)) {
    return {
      applied: false,
      duplicate: Boolean(before),
      convertedDust: 0,
      copies: before?.copies ?? 0,
      level: before?.level ?? 0,
    };
  }

  let convertedDust = 0;
  const duplicate = Boolean(before);
  if (before && before.level >= 5) {
    convertedDust = MAX_LEVEL_DUPLICATE_DUST[EQUIPMENT[id].rarity];
    meta.dust += convertedDust;
  } else if (before) {
    before.copies += 1;
  } else {
    meta.owned[id] = { level: 1, copies: 0 };
  }

  meta.rewardLedger.push(key);
  saveMetaProgression(meta);
  const progress = meta.owned[id]!;
  return { applied: true, duplicate, convertedDust, copies: progress.copies, level: progress.level };
}

export function grantMetaDustOnce(amount: number, ledgerKey: string): { applied: boolean; amount: number } {
  const key = String(ledgerKey).trim().slice(0, 180);
  const safeAmount = Math.max(0, Math.min(500, Math.floor(Number(amount) || 0)));
  const meta = loadMetaProgression();
  if (!key || safeAmount <= 0 || meta.rewardLedger.includes(key)) return { applied: false, amount: 0 };
  meta.dust += safeAmount;
  meta.rewardLedger.push(key);
  saveMetaProgression(meta);
  return { applied: true, amount: safeAmount };
}
