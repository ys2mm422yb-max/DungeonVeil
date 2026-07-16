import {
  EQUIPMENT,
  loadMetaProgression,
  saveMetaProgression,
  type EquipmentId,
  type EquipmentProgress,
  type EquipmentRarity,
  type MetaProgression,
} from './metaProgression';

export const MAX_LEVEL_DUPLICATE_DUST: Readonly<Record<EquipmentRarity, number>> = Object.freeze({
  common: 60,
  rare: 90,
  epic: 140,
});

export type BalancedEquipmentCollectionResult = {
  meta: MetaProgression;
  duplicate: boolean;
  converted: boolean;
  dustAwarded: number;
  progress: EquipmentProgress;
};

export function maxLevelDuplicateDust(id: EquipmentId): number {
  return MAX_LEVEL_DUPLICATE_DUST[EQUIPMENT[id].rarity];
}

export function convertMaxLevelCopies(meta: MetaProgression, id: EquipmentId): number {
  const progress = meta.owned[id];
  if (!progress || progress.level < 5 || progress.copies <= 0) return 0;
  const dust = progress.copies * maxLevelDuplicateDust(id);
  progress.copies = 0;
  meta.dust += dust;
  return dust;
}

export function collectBalancedEquipmentDrop(id: EquipmentId): BalancedEquipmentCollectionResult {
  const meta = loadMetaProgression();
  const existing = meta.owned[id];
  const duplicate = Boolean(existing);

  if (existing?.level === 5) {
    const dustAwarded = maxLevelDuplicateDust(id);
    meta.dust += dustAwarded;
    saveMetaProgression(meta);
    return { meta, duplicate: true, converted: true, dustAwarded, progress: existing };
  }

  if (existing) existing.copies += 1;
  else meta.owned[id] = { level: 1, copies: 0 };
  saveMetaProgression(meta);
  return { meta, duplicate, converted: false, dustAwarded: 0, progress: meta.owned[id]! };
}
