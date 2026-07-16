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
