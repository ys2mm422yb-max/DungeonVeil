import type { EquipmentId } from './metaProgression';

const CHAPTER_KEY = 'dungeon-veil-highest-chapter-v1';

export const EQUIPMENT_UNLOCK_CHAPTER: Record<EquipmentId, number> = {
  'ash-bow': 1,
  'ember-bow': 1,
  'hunter-bow': 2,
  'frost-bow': 3,
  'splinter-bow': 4,
  'veil-bow': 7,
  'warden-bow': 7,
  'ranger-quiver': 1,
  'black-quiver': 2,
  'rune-quiver': 5,
  'frost-quiver': 3,
  'splinter-quiver': 4,
  'warden-quiver': 6,
  'veil-key': 1,
  'guardian-sigil': 3,
  'frost-grimoire': 6,
  'ritual-shard': 5,
  'ash-amulet': 2,
  'depth-seal': 4,
  'veil-eye': 8,
  'ranger-cloak': 1,
  'ash-armor': 2,
  'frost-armor': 3,
  'warden-armor': 4,
  'veil-mantle': 5,
  'depth-armor': 6,
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
