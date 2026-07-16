import { equipmentUnlockedForCurrentProgress } from './equipmentChapterGates';
import {
  EQUIPMENT,
  loadMetaProgression,
  type EquipmentDropSource,
  type EquipmentId,
} from './metaProgression';

const STORAGE_KEY = 'dungeon-veil-equipment-target-v1';
export const EQUIPMENT_TARGET_EVENT = 'dungeon-veil-equipment-target-changed';
export const EQUIPMENT_TARGET_HARD_PITY = 2;
export const EQUIPMENT_TARGET_SOURCE_CHANCE = 0.5;

export type EquipmentTargetState = {
  target: EquipmentId | null;
  misses: number;
};

const EMPTY_TARGET: EquipmentTargetState = { target: null, misses: 0 };

function isEquipmentId(value: unknown): value is EquipmentId {
  return typeof value === 'string' && value in EQUIPMENT;
}

function targetEligible(id: EquipmentId): boolean {
  const meta = loadMetaProgression();
  const item = EQUIPMENT[id];
  const level = meta.owned[id]?.level ?? 0;
  return item.unlockRank <= meta.rank && equipmentUnlockedForCurrentProgress(id) && level < 5;
}

function notify(state: EquipmentTargetState): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EQUIPMENT_TARGET_EVENT, { detail: state }));
}

function saveEquipmentTargetState(state: EquipmentTargetState): EquipmentTargetState {
  const normalized: EquipmentTargetState = {
    target: state.target,
    misses: state.target ? Math.max(0, Math.min(EQUIPMENT_TARGET_HARD_PITY, Math.floor(Number(state.misses) || 0))) : 0,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch {}
  notify(normalized);
  return normalized;
}

export function loadEquipmentTargetState(): EquipmentTargetState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<EquipmentTargetState>;
    const target = isEquipmentId(parsed.target) ? parsed.target : null;
    if (!target || !targetEligible(target)) {
      if (target) return saveEquipmentTargetState(EMPTY_TARGET);
      return { ...EMPTY_TARGET };
    }
    return {
      target,
      misses: Math.max(0, Math.min(EQUIPMENT_TARGET_HARD_PITY, Math.floor(Number(parsed.misses) || 0))),
    };
  } catch {
    return { ...EMPTY_TARGET };
  }
}

export function setEquipmentTarget(id: EquipmentId | null): EquipmentTargetState {
  if (!id) return saveEquipmentTargetState(EMPTY_TARGET);
  if (!targetEligible(id)) return loadEquipmentTargetState();
  return saveEquipmentTargetState({ target: id, misses: 0 });
}

export function toggleEquipmentTarget(id: EquipmentId): EquipmentTargetState {
  const current = loadEquipmentTargetState();
  return setEquipmentTarget(current.target === id ? null : id);
}

export function targetedEquipmentForAward(source: EquipmentDropSource, guaranteed = false): EquipmentId | null {
  const state = loadEquipmentTargetState();
  const target = state.target;
  if (!target) return null;
  if (guaranteed) return target;
  if (EQUIPMENT[target].dropSource !== source) return null;
  if (state.misses >= EQUIPMENT_TARGET_HARD_PITY || Math.random() < EQUIPMENT_TARGET_SOURCE_CHANCE) {
    saveEquipmentTargetState({ target, misses: 0 });
    return target;
  }
  saveEquipmentTargetState({ target, misses: state.misses + 1 });
  return null;
}

export function clearEquipmentTargetIfMaxed(id: EquipmentId): void {
  const state = loadEquipmentTargetState();
  if (state.target !== id) return;
  const level = loadMetaProgression().owned[id]?.level ?? 0;
  if (level >= 5) saveEquipmentTargetState(EMPTY_TARGET);
}
