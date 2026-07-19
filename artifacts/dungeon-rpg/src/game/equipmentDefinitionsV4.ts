import { ACTIVE_EQUIPMENT, isActiveEquipmentId } from './equipmentRedesign';
import { EQUIPMENT_ARMOR_VISUALS } from './equipmentVisualsArmorV4';
import { EQUIPMENT_WEAPON_VISUALS } from './equipmentVisualsWeaponsV4';
import type { EquipmentDefinition, EquipmentId } from './metaProgressionTypes';

const visuals = { ...EQUIPMENT_WEAPON_VISUALS, ...EQUIPMENT_ARMOR_VISUALS };

export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = Object.fromEntries(
  (Object.keys(visuals) as EquipmentId[]).map(id => {
    const visual = visuals[id];
    if (!visual) throw new Error(`Missing equipment visual metadata for ${id}`);
    const active = isActiveEquipmentId(id) ? ACTIVE_EQUIPMENT[id] : null;
    return [id, {
      ...visual,
      active: Boolean(active),
      nameDe: active?.nameDe ?? visual.nameDe,
      nameEn: active?.nameEn ?? visual.nameEn,
      descriptionDe: active?.descriptionDe ?? 'Legacy-Skin ohne aktive Kampfwerte.',
      descriptionEn: active?.descriptionEn ?? 'Legacy cosmetic without active combat stats.',
      unlockRank: active?.unlockRank ?? visual.unlockRank,
      rarity: active?.rarity ?? visual.rarity,
      dropSource: active?.dropSource ?? visual.dropSource,
    }];
  }),
) as Record<EquipmentId, EquipmentDefinition>;
