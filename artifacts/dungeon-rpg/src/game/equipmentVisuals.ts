import type { EquipmentId } from './metaProgression';

export type EquipmentVisualProfile = {
  primaryPath: string;
  fallbackPath: string;
  accessoryPath?: string;
  accessoryPosition?: readonly [number, number, number];
  accessoryRotation?: readonly [number, number, number];
  accessoryScale?: number;
  rotation: readonly [number, number, number];
  fillWidth: number;
  fillHeight: number;
  yOffset: number;
  lockYaw: boolean;
  tintStrength: number;
  kind: 'bow' | 'crossbow' | 'quiver' | 'book' | 'talisman' | 'armor';
  previewPose?: 'idle-ready';
};

const A = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf';
const C = 'adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf';
const W = 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';

const profile = (
  primaryPath: string,
  fallbackPath: string,
  rotation: readonly [number, number, number],
  fillWidth: number,
  fillHeight: number,
  yOffset: number,
  lockYaw: boolean,
  tintStrength: number,
  kind: EquipmentVisualProfile['kind'],
  accessory?: Pick<EquipmentVisualProfile, 'accessoryPath' | 'accessoryPosition' | 'accessoryRotation' | 'accessoryScale'>,
): EquipmentVisualProfile => ({
  primaryPath,
  fallbackPath,
  rotation,
  fillWidth,
  fillHeight,
  yOffset,
  lockYaw,
  tintStrength,
  kind,
  ...accessory,
});

const armorProfile = (
  primaryPath: string,
  fallbackPath: string,
  tintStrength: number,
  accessory?: Pick<EquipmentVisualProfile, 'accessoryPath' | 'accessoryPosition' | 'accessoryRotation' | 'accessoryScale'>,
): EquipmentVisualProfile => ({
  ...profile(primaryPath, fallbackPath, [0, -0.08, 0], 0.7, 0.8, -0.02, true, tintStrength, 'armor', accessory),
  previewPose: 'idle-ready',
});

const bowPose = [0.08, -0.48, Math.PI / 2] as const;
const importedBowPose = [0.02, -0.18, 0] as const;
const frostCrossbowPose = [-0.18, -0.78, Math.PI / 2 - 0.08] as const;
const splinterCrossbowPose = [-0.22, -0.7, Math.PI / 2 - 0.1] as const;
const importedBowRoot = '/assets/imported/medieval-weapons';
const quiverAccessory = (path: string) => ({
  accessoryPath: path,
  accessoryPosition: [0, 0.18, 0.08] as const,
  accessoryRotation: [0, 0, 0] as const,
  accessoryScale: 0.78,
});
const ritualMantleAccessory = {
  accessoryPath: `${A}/spellbook_open.gltf`,
  accessoryPosition: [-0.32, 0.42, 0.2] as const,
  accessoryRotation: [-0.34, 0.12, 0.08] as const,
  accessoryScale: 0.58,
};

/**
 * One source of truth for inventory previews and world drops. Armor previews use
 * only the clearly male Ranger, Knight and Barbarian models and share one idle-ready pose.
 */
export const EQUIPMENT_VISUALS: Record<EquipmentId, EquipmentVisualProfile> = {
  'ash-bow': profile(`${importedBowRoot}/Bow_Wooden2.glb`, `${A}/bow_withString.gltf`, importedBowPose, 0.86, 0.7, 0, true, 0.04, 'bow'),
  'ember-bow': profile(`${importedBowRoot}/Bow_Golden.glb`, `${W}/bow_A_withString.gltf`, importedBowPose, 0.86, 0.7, 0, true, 0.06, 'bow'),
  'hunter-bow': profile(`${importedBowRoot}/Bow_Wooden.glb`, `${W}/bow_B_withString.gltf`, importedBowPose, 0.86, 0.7, 0, true, 0.03, 'bow'),
  'veil-bow': profile(`${importedBowRoot}/Bow_Evil.glb`, `${W}/bow_A_withString.gltf`, importedBowPose, 0.86, 0.7, 0, true, 0.05, 'bow'),
  'warden-bow': profile(`${W}/bow_B_withString.gltf`, `${A}/bow_withString.gltf`, bowPose, 0.84, 0.68, 0, true, 0.1, 'bow'),

  'frost-bow': profile(`${A}/crossbow_2handed.gltf`, `${A}/crossbow_2handed.gltf`, frostCrossbowPose, 0.7, 0.82, 0, true, 0.3, 'crossbow'),
  'splinter-bow': profile(`${A}/crossbow_1handed.gltf`, `${A}/crossbow_1handed.gltf`, splinterCrossbowPose, 0.72, 0.82, 0, true, 0.18, 'crossbow'),

  'ranger-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.04, -0.32, -0.08], 0.62, 0.8, -0.01, true, 0.12, 'quiver', quiverAccessory(`${A}/arrow_bow_bundle.gltf`)),
  'black-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.04, -0.32, -0.08], 0.62, 0.8, -0.01, true, 0.5, 'quiver', quiverAccessory(`${A}/arrow_bow_bundle.gltf`)),
  'rune-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.04, -0.32, -0.08], 0.62, 0.8, -0.01, true, 0.42, 'quiver', quiverAccessory(`${A}/arrow_bow_bundle.gltf`)),
  'frost-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.04, -0.32, -0.08], 0.62, 0.8, -0.01, true, 0.42, 'quiver', quiverAccessory(`${A}/arrow_bow_bundle.gltf`)),
  'splinter-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.04, -0.32, -0.08], 0.62, 0.8, -0.01, true, 0.28, 'quiver', quiverAccessory(`${A}/arrow_crossbow_bundle.gltf`)),
  'warden-quiver': profile(`${A}/quiver.gltf`, `${A}/quiver.gltf`, [-0.04, -0.32, -0.08], 0.62, 0.8, -0.01, true, 0.38, 'quiver', quiverAccessory(`${A}/arrow_crossbow_bundle.gltf`)),

  'frost-grimoire': profile(`${A}/spellbook_closed.gltf`, `${A}/spellbook_closed.gltf`, [-0.46, -0.45, 0.15], 0.72, 0.65, 0, true, 0.22, 'book'),
  'ritual-shard': profile(`${A}/spellbook_open.gltf`, `${A}/spellbook_open.gltf`, [-0.5, -0.42, 0.12], 0.74, 0.67, 0, true, 0.32, 'book'),
  'veil-key': profile(`${D}/key.gltf`, `${D}/key.gltf`, [0.05, -0.45, Math.PI / 2], 0.74, 0.68, 0, true, 0.32, 'talisman'),
  'guardian-sigil': profile(`${A}/shield_spikes_color.gltf`, `${A}/shield_round_color.gltf`, [-0.12, -0.34, 0.04], 0.72, 0.74, 0, true, 0.08, 'talisman', {
    accessoryPath: `${A}/sword_1handed.gltf`,
    accessoryPosition: [0, -0.02, -0.14] as const,
    accessoryRotation: [0.18, 0.12, -0.74] as const,
    accessoryScale: 0.86,
  }),
  'ash-amulet': profile(`${D}/bottle_C_brown.gltf`, `${A}/smokebomb.gltf`, [-0.08, -0.4, 0.08], 0.65, 0.7, 0, true, 0.28, 'talisman'),
  'depth-seal': profile(`${D}/coin.gltf`, `${A}/shield_badge.gltf`, [-0.18, -0.38, 0.08], 0.68, 0.7, 0, true, 0.38, 'talisman'),
  'veil-eye': profile(`${A}/staff.gltf`, `${A}/wand.gltf`, [-0.02, -0.36, 0.18], 0.7, 0.72, 0, true, 0.34, 'talisman'),

  'ranger-cloak': armorProfile(`${C}/Ranger.glb`, `${C}/Knight.glb`, 0.08),
  'ash-armor': armorProfile(`${C}/Barbarian.glb`, `${C}/Knight.glb`, 0.2),
  'frost-armor': armorProfile(`${C}/Knight.glb`, `${C}/Ranger.glb`, 0.28),
  'warden-armor': armorProfile(`${C}/Knight.glb`, `${C}/Ranger.glb`, 0.12),
  'veil-mantle': armorProfile(`${C}/Knight.glb`, `${C}/Barbarian.glb`, 0.58, ritualMantleAccessory),
  'depth-armor': armorProfile(`${C}/Barbarian.glb`, `${C}/Knight.glb`, 0.3),
};

export function equipmentVisualProfile(id: EquipmentId) {
  return EQUIPMENT_VISUALS[id];
}

export function equipmentVisualAudit() {
  return (Object.entries(EQUIPMENT_VISUALS) as Array<[EquipmentId, EquipmentVisualProfile]>).flatMap(([id, visual]) => {
    const issues: string[] = [];
    if (visual.kind === 'quiver' && !/quiver/i.test(visual.primaryPath)) issues.push(`${id}: primary is not a quiver`);
    if (visual.kind === 'quiver' && !/bundle/i.test(visual.accessoryPath ?? '')) issues.push(`${id}: quiver has no arrow bundle`);
    if (visual.kind === 'crossbow' && !/crossbow/i.test(visual.primaryPath)) issues.push(`${id}: crossbow path is not a crossbow`);
    if (visual.kind === 'armor' && !/(ranger|knight|barbarian)\.glb$/i.test(visual.primaryPath)) issues.push(`${id}: armor preview is not a male character model`);
    if (visual.kind === 'armor' && !/(ranger|knight|barbarian)\.glb$/i.test(visual.fallbackPath)) issues.push(`${id}: armor fallback is not a male character model`);
    if (visual.kind === 'armor' && visual.previewPose !== 'idle-ready') issues.push(`${id}: armor preview has no idle-ready pose`);
    if (visual.fillWidth <= 0 || visual.fillWidth > 0.96) issues.push(`${id}: unsafe preview width`);
    if (visual.fillHeight <= 0 || visual.fillHeight > 0.82) issues.push(`${id}: unsafe preview height`);
    return issues;
  });
}
