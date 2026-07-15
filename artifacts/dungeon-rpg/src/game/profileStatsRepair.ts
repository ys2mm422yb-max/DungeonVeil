import { loadMetaProgression } from './metaProgression';
import { syncOnlineProfileCosmetics } from './onlineProfileCosmetics';
import { loadPlayerProfile, recordPlayerProfileItemFound } from './playerProfile';

export function repairLegacyProfileStats(): void {
  const profile = loadPlayerProfile();
  const ownedEquipment = Object.keys(loadMetaProgression().owned).length;
  const missingEquipmentDrops = Math.max(0, ownedEquipment - profile.stats.itemsFound);
  const repaired = missingEquipmentDrops > 0 ? recordPlayerProfileItemFound(missingEquipmentDrops) : profile;
  void syncOnlineProfileCosmetics(repaired).catch(() => {});
}
