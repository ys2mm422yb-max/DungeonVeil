import { MAX_LEVEL_DUPLICATE_DUST } from './equipmentCollection';
import {
  EQUIPMENT,
  loadMetaProgression,
  saveMetaProgression,
  type EquipmentId,
} from './metaProgression';

export type IdempotentCoopEquipmentReward = {
  applied: boolean;
  duplicate: boolean;
  convertedDust: number;
  copies: number;
  level: number;
};

export function collectBalancedEquipmentDropOnce(
  id: EquipmentId,
  ledgerKey: string,
): IdempotentCoopEquipmentReward {
  const key = String(ledgerKey).trim().slice(0, 180);
  const meta = loadMetaProgression();
  const existing = meta.owned[id];
  if (!key || meta.rewardLedger.includes(key)) {
    return {
      applied: false,
      duplicate: Boolean(existing),
      convertedDust: 0,
      copies: existing?.copies ?? 0,
      level: existing?.level ?? 0,
    };
  }

  const duplicate = Boolean(existing);
  let convertedDust = 0;
  if (existing && existing.level >= 5) {
    convertedDust = MAX_LEVEL_DUPLICATE_DUST[EQUIPMENT[id].rarity];
    meta.dust += convertedDust;
  } else if (existing) {
    existing.copies += 1;
  } else {
    meta.owned[id] = { level: 1, copies: 0 };
  }

  meta.rewardLedger.push(key);
  saveMetaProgression(meta);
  const progress = meta.owned[id]!;
  return {
    applied: true,
    duplicate,
    convertedDust,
    copies: progress.copies,
    level: progress.level,
  };
}

export function grantMetaDustOnce(
  amount: number,
  ledgerKey: string,
): { applied: boolean; amount: number } {
  const key = String(ledgerKey).trim().slice(0, 180);
  const safeAmount = Math.max(0, Math.min(500, Math.floor(Number(amount) || 0)));
  const meta = loadMetaProgression();
  if (!key || safeAmount <= 0 || meta.rewardLedger.includes(key)) return { applied: false, amount: 0 };
  meta.dust += safeAmount;
  meta.rewardLedger.push(key);
  saveMetaProgression(meta);
  return { applied: true, amount: safeAmount };
}
