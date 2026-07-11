import type { EquipmentId } from './metaProgression';

export type EquipmentVisualProfile = {
  primaryPath: string;
  fallbackPath: string;
  rotation: readonly [number, number, number];
  fillWidth: number;
  fillHeight: number;
  yOffset: number;
  lockYaw: boolean;
  kind: 'bow' | 'crossbow' | 'quiver' | 'book' | 'talisman';
};

const A = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf';
const W = 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const IMPORTED = '/assets/imported';

const profile = (
  primaryPath: string,
  fallbackPath: string,
  rotation: readonly [number, number, number],
  fillWidth: number,
  fillHeight: number,
  yOffset: number,
  lockYaw: boolean,
  kind: EquipmentVisualProfile['kind'],
): EquipmentVisualProfile => ({ primaryPath, fallbackPath, rotation, fillWidth, fillHeight, yOffset, lockYaw, kind });

/**
 * One source of truth for the inventory card and world-drop model. Imported paths
 * are attempted first and always have a KayKit fallback, so a missing optional
 * asset can never leave an empty item card.
 */
export const EQUIPMENT_VISUALS: Record<EquipmentId, EquipmentVisualProfile> = {
  'ash-bow': profile(`${IMPORTED}/medieval-weapons/Bow_Wooden.glb`, `${A}/bow_withString.gltf`, [-0.08, -0.2, Math.PI / 2], 0.7, 0.58, -0.02, false, 'bow'),
  'ember-bow': profile(`${IMPORTED}/medieval-weapons/Bow_Evil.glb`, `${W}/bow_A_withString.gltf`, [-0.08, -0.2, Math.PI / 2], 0.7, 0.58, -0.02, false, 'bow'),
  'hunter-bow': profile(`${IMPORTED}/medieval-weapons/Bow_Wooden2.glb`, `${W}/bow_B_withString.gltf`, [-0.08, -0.2, Math.PI / 2], 0.7, 0.58, -0.02, false, 'bow'),
  'veil-bow': profile(`${W}/bow_A.gltf`, `${W}/bow_A.gltf`, [-0.08, -0.22, Math.PI / 2], 0.7, 0.58, -0.02, false, 'bow'),
  'warden-bow': profile(`${IMPORTED}/medieval-weapons/Bow_Golden.glb`, `${W}/bow_B.gltf`, [-0.08, -0.2, Math.PI / 2], 0.7, 0.58, -0.02, false, 'bow'),

  'frost-bow': profile(`${A}/crossbow_2handed.gltf`, `${A}/crossbow_2handed.gltf`, [-0.1, -Math.PI / 2 + 0.08, 0], 0.79, 0.36, 0.03, true, 'crossbow'),
  'splinter-bow': profile(`${A}/crossbow_1handed.gltf`, `${A}/crossbow_1handed.gltf`, [-0.18, -Math.PI / 2 + 0.08, 0], 0.76, 0.38, 0.03, true, 'crossbow'),

  // Every quiver now starts from an actual quiver. Variant identity is added by
  // colored arrows and bands in the preview instead of pretending one arrow is a bag.
  'ranger-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.05, -0.42, -0.12], 0.55, 0.7, -0.02, false, 'quiver'),
  'black-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.05, -0.42, -0.12], 0.55, 0.7, -0.02, false, 'quiver'),
  'rune-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.05, -0.42, -0.12], 0.55, 0.7, -0.02, false, 'quiver'),
  'frost-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.05, -0.42, -0.12], 0.55, 0.7, -0.02, false, 'quiver'),
  'splinter-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.05, -0.42, -0.12], 0.55, 0.7, -0.02, false, 'quiver'),
  'warden-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.05, -0.42, -0.12], 0.55, 0.7, -0.02, false, 'quiver'),

  'frost-grimoire': profile(`${IMPORTED}/fantasy-props/Book_5.glb`, `${A}/spellbook_closed.gltf`, [-0.62, -0.34, 0.05], 0.62, 0.55, -0.02, false, 'book'),
  'ritual-shard': profile(`${IMPORTED}/fantasy-props/Book_7.glb`, `${A}/spellbook_open.gltf`, [-0.68, -0.34, 0.05], 0.64, 0.56, -0.02, false, 'book'),
  'veil-key': profile(`${IMPORTED}/fantasy-props/Key_Metal.glb`, `${D}/key.gltf`, [-0.05, -0.38, 0.1], 0.58, 0.64, -0.02, false, 'talisman'),
  'guardian-sigil': profile(`${A}/shield_badge_color.gltf`, `${A}/shield_badge_color.gltf`, [-0.08, -0.3, 0.06], 0.6, 0.62, -0.02, false, 'talisman'),
  'ash-amulet': profile(`${A}/smokebomb.gltf`, `${A}/smokebomb.gltf`, [-0.08, -0.35, 0.08], 0.58, 0.62, -0.02, false, 'talisman'),
  'depth-seal': profile(`${A}/shield_badge.gltf`, `${A}/shield_badge.gltf`, [-0.08, -0.3, 0.06], 0.6, 0.62, -0.02, false, 'talisman'),
  'veil-eye': profile(`${A}/wand.gltf`, `${A}/wand.gltf`, [-0.08, -0.42, 0.12], 0.64, 0.56, -0.02, false, 'talisman'),
};

export function equipmentVisualProfile(id: EquipmentId) {
  return EQUIPMENT_VISUALS[id];
}

export function equipmentVisualAudit() {
  return (Object.entries(EQUIPMENT_VISUALS) as Array<[EquipmentId, EquipmentVisualProfile]>).flatMap(([id, visual]) => {
    const issues: string[] = [];
    if (visual.kind === 'quiver' && !/quiver/i.test(visual.fallbackPath)) issues.push(`${id}: quiver fallback is not a quiver`);
    if (visual.kind === 'crossbow' && !/crossbow/i.test(visual.primaryPath)) issues.push(`${id}: crossbow path is not a crossbow`);
    if (visual.fillWidth <= 0 || visual.fillWidth > 0.85) issues.push(`${id}: unsafe preview width`);
    if (visual.fillHeight <= 0 || visual.fillHeight > 0.8) issues.push(`${id}: unsafe preview height`);
    return issues;
  });
}
