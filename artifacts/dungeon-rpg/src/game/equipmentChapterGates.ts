import { ACTIVE_EQUIPMENT, isActiveEquipmentId } from './equipmentRedesign';
import type { EquipmentId } from './metaProgression';

const CHAPTER_KEY = 'dungeon-veil-highest-chapter-v1';

export function highestReachedChapter(): number {
  try {
    return Math.max(1, Math.min(99, Math.floor(Number(localStorage.getItem(CHAPTER_KEY)) || 1)));
  } catch {
    return 1;
  }
}

export function recordReachedChapter(chapter: number): number {
  const next = Math.max(highestReachedChapter(), Math.max(1, Math.floor(Number(chapter) || 1)));
  try { localStorage.setItem(CHAPTER_KEY, String(next)); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('dungeon-veil-chapter-unlock-changed'));
  return next;
}

export function equipmentUnlockChapter(id: EquipmentId): number {
  return isActiveEquipmentId(id) ? ACTIVE_EQUIPMENT[id].unlockChapter : 99;
}

export function equipmentUnlockedForCurrentProgress(id: EquipmentId): boolean {
  return isActiveEquipmentId(id) && highestReachedChapter() >= equipmentUnlockChapter(id);
}

export const EQUIPMENT_UNLOCK_CHAPTER = Object.freeze(Object.fromEntries(
  Object.entries(ACTIVE_EQUIPMENT).map(([id, item]) => [id, item.unlockChapter]),
) as Partial<Record<EquipmentId, number>>);
