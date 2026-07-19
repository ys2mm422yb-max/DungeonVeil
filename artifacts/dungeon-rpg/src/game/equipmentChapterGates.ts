import type { EquipmentId } from './metaProgression';
import { EQUIPMENT_UNLOCK_CHAPTER, isActiveEquipmentId } from './equipmentCore';

const CHAPTER_KEY = 'dungeon-veil-highest-chapter-v1';

export const EQUIPMENT_CHAPTER_GATES: Record<EquipmentId, number> = {
  'ash-bow': 1,
  'ember-bow': 2,
  'veil-bow': 5,
  'warden-bow': 9,
  'ranger-quiver': 1,
  'black-quiver': 3,
  'rune-quiver': 6,
  'ranger-cloak': 1,
  'ash-armor': 3,
  'warden-armor': 7,
  'hunter-bow': 99,
  'frost-bow': 99,
  'splinter-bow': 99,
  'frost-quiver': 99,
  'splinter-quiver': 99,
  'warden-quiver': 99,
  'veil-key': 99,
  'guardian-sigil': 99,
  'frost-grimoire': 99,
  'ritual-shard': 99,
  'ash-amulet': 99,
  'depth-seal': 99,
  'veil-eye': 99,
  'frost-armor': 99,
  'veil-mantle': 99,
  'depth-armor': 99,
};

for (const [id, chapter] of Object.entries(EQUIPMENT_UNLOCK_CHAPTER)) {
  EQUIPMENT_CHAPTER_GATES[id as EquipmentId] = chapter;
}

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
  return EQUIPMENT_CHAPTER_GATES[id] ?? 99;
}

export function equipmentUnlockedForCurrentProgress(id: EquipmentId): boolean {
  return isActiveEquipmentId(id) && highestReachedChapter() >= equipmentUnlockChapter(id);
}
