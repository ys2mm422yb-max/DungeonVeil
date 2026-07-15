import { loadMetaProgression } from './metaProgression';
import { loadPlayerProfile, recordPlayerProfileItemFound } from './playerProfile';

export function repairLegacyProfileStats(): void {
  const profile = loadPlayerProfile();
  const ownedEquipment = Object.keys(loadMetaProgression().owned).length;
  const missingEquipmentDrops = Math.max(0, ownedEquipment - profile.stats.itemsFound);
  if (missingEquipmentDrops > 0) recordPlayerProfileItemFound(missingEquipmentDrops);
}

repairLegacyProfileStats();
