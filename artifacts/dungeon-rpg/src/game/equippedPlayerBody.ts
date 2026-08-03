import { EQUIPMENT_ARMOR_VISUALS } from './equipmentVisualsArmorV4';
import type { EquipmentId } from './metaProgressionTypes';

const DEFAULT_ARMOR_ID: EquipmentId = 'ranger-cloak';
const DEFAULT_ASSET_PATH = 'adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb';

export type EquippedPlayerBody = {
  armorId: EquipmentId;
  assetPath: string;
  usedFallback: boolean;
};

export function resolveEquippedPlayerBody(armorId: string | null | undefined): EquippedPlayerBody {
  const requestedId = armorId as EquipmentId | undefined;
  const visual = requestedId ? EQUIPMENT_ARMOR_VISUALS[requestedId] : undefined;

  if (visual?.slot === 'armor' && visual.assetPath.endsWith('.glb')) {
    return {
      armorId: visual.id,
      assetPath: visual.assetPath,
      usedFallback: false,
    };
  }

  return {
    armorId: DEFAULT_ARMOR_ID,
    assetPath: DEFAULT_ASSET_PATH,
    usedFallback: true,
  };
}
