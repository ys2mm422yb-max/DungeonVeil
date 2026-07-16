import type { EquipmentDropSource } from './metaProgression';
import { isBossRoom } from './chapterRun';

export const NORMAL_ROOM_EQUIPMENT_CHANCE = 0.03;
export const HUNT_EQUIPMENT_CHANCE = 0.12;
export const BALANCED_NON_HUNT_SOURCES: readonly EquipmentDropSource[] = ['forge', 'ritual', 'warden', 'depth'];

export type EquipmentDropRule = {
  chance: number;
  sources: readonly EquipmentDropSource[];
  mode: 'primary-fallback' | 'wildcard';
  guaranteed: boolean;
};

function normalRoomPrimarySource(floor: number): EquipmentDropSource {
  const safeFloor = Math.max(3, Math.min(50, Math.floor(Number(floor) || 3)));
  return BALANCED_NON_HUNT_SOURCES[(safeFloor - 3) % BALANCED_NON_HUNT_SOURCES.length];
}

function fallbackOrder(primary: EquipmentDropSource): readonly EquipmentDropSource[] {
  return [primary, ...BALANCED_NON_HUNT_SOURCES.filter(source => source !== primary)];
}

export function equipmentDropRuleForRoom(floor: number): EquipmentDropRule {
  const safeFloor = Math.max(1, Math.min(50, Math.floor(Number(floor) || 1)));
  if (safeFloor === 10) return { chance: 1, sources: fallbackOrder('forge'), mode: 'primary-fallback', guaranteed: true };
  if (safeFloor === 20) return { chance: 1, sources: fallbackOrder('ritual'), mode: 'primary-fallback', guaranteed: true };
  if (safeFloor === 30) return { chance: 1, sources: fallbackOrder('warden'), mode: 'primary-fallback', guaranteed: true };
  if (safeFloor === 40) return { chance: 1, sources: fallbackOrder('depth'), mode: 'primary-fallback', guaranteed: true };
  if (safeFloor === 50) return { chance: 1, sources: BALANCED_NON_HUNT_SOURCES, mode: 'wildcard', guaranteed: true };
  if (safeFloor < 3 || isBossRoom(safeFloor)) return { chance: 0, sources: [], mode: 'primary-fallback', guaranteed: false };
  return {
    chance: NORMAL_ROOM_EQUIPMENT_CHANCE,
    sources: fallbackOrder(normalRoomPrimarySource(safeFloor)),
    mode: 'primary-fallback',
    guaranteed: false,
  };
}

export function primaryEquipmentSourceForRoom(floor: number): EquipmentDropSource {
  return equipmentDropRuleForRoom(floor).sources[0] ?? 'depth';
}
