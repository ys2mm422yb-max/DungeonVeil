import type { EquipmentId } from './metaProgression';

const CHAPTER_KEY = 'dungeon-veil-highest-chapter-v1';

export const EQUIPMENT_UNLOCK_CHAPTER: Record<EquipmentId, number> = {
  'ash-bow': 1,
  'ember-bow': 1,
  'hunter-bow': 2,
  'frost-bow': 3,
  'splinter-bow': 3,
  'veil-bow': 4,
  'warden-bow': 4,
  'ranger-quiver': 1,
  'black-quiver': 2,
  'rune-quiver': 4,
  'frost-quiver': 3,
  'splinter-quiver': 3,
  'warden-quiver': 4,
  'veil-key': 1,
  'guardian-sigil': 3,
  'frost-grimoire': 4,
  'ritual-shard': 4,
  'ash-amulet': 2,
  'depth-seal': 3,
  'veil-eye': 4,
  'ranger-cloak': 1,
  'ash-armor': 2,
  'frost-armor': 3,
  'warden-armor': 3,
  'veil-mantle': 4,
  'depth-armor': 4,
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
