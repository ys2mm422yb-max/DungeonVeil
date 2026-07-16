import type { EquipmentId } from './metaProgression';

const CHAPTER_KEY = 'dungeon-veil-highest-chapter-v1';

export const EQUIPMENT_UNLOCK_CHAPTER: Record<EquipmentId, number> = {
  'ash-bow': 1,
  'ember-bow': 2,
  'hunter-bow': 3,
  'frost-bow': 4,
  'splinter-bow': 5,
  'veil-bow': 8,
  'warden-bow': 10,
  'ranger-quiver': 1,
  'black-quiver': 2,
  'rune-quiver': 7,
  'frost-quiver': 4,
  'splinter-quiver': 5,
  'warden-quiver': 9,
  'veil-key': 1,
  'guardian-sigil': 4,
  'frost-grimoire': 7,
  'ritual-shard': 6,
  'ash-amulet': 3,
  'depth-seal': 6,
  'veil-eye': 10,
  'ranger-cloak': 1,
  'ash-armor': 3,
  'frost-armor': 5,
  'warden-armor': 6,
  'veil-mantle': 8,
  'depth-armor': 9,
};

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
  return EQUIPMENT_UNLOCK_CHAPTER[id] ?? 1;
}

export function equipmentUnlockedForCurrentProgress(id: EquipmentId): boolean {
  return highestReachedChapter() >= equipmentUnlockChapter(id);
}
