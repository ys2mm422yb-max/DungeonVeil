import { FINAL_BOSS_ROOM, isBossRoom } from './chapterRun';
import { equipmentUnlockChapter } from './equipmentChapterGates';
import { ACTIVE_EQUIPMENT, isActiveEquipmentId } from './equipmentRedesign';
import {
  CHAPTER_WISH_CHANCE,
  CHAPTER_WISH_PITY_MISSES,
  SOURCE_WISH_CHANCE,
  WISH_PITY_MISSES,
  loadEquipmentTargeting,
  saveEquipmentTargeting,
  type EquipmentTargetingProfile,
} from './equipmentTargeting';
import {
  EQUIPMENT,
  loadMetaProgression,
  type EquipmentDefinition,
  type EquipmentDropSource,
  type EquipmentId,
  type MetaProgression,
  type PendingEquipmentDrop,
} from './metaProgression';

export const HUNT_EQUIPMENT_DROP_CHANCE = 0.08;
export const UNOWNED_ITEM_PREFERENCE = 0.35;
export const BOSS_EQUIPMENT_DROP_CHANCE: Readonly<Record<number, number>> = Object.freeze({
  10: 0.18,
  20: 0.20,
  30: 0.22,
  40: 0.25,
  50: 0.42,
});

export const LATE_CHAPTER_BOSS_SOURCES: Readonly<Record<number, EquipmentDropSource>> = Object.freeze({
  10: 'forge', 20: 'ritual', 30: 'warden', 40: 'depth',
});

function eligibleEquipment(meta: MetaProgression, chapter: number, source: EquipmentDropSource | null): EquipmentDefinition[] {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const all = Object.values(EQUIPMENT).filter(item => {
    if (!isActiveEquipmentId(item.id)) return false;
    if (source && item.dropSource !== source) return false;
    return ACTIVE_EQUIPMENT[item.id].unlockRank <= meta.rank && equipmentUnlockChapter(item.id) <= safeChapter;
  });
  const fallback = all.length ? all : Object.values(EQUIPMENT).filter(item => (
    isActiveEquipmentId(item.id)
    && ACTIVE_EQUIPMENT[item.id].unlockRank <= meta.rank
    && equipmentUnlockChapter(item.id) <= safeChapter
  ));
  const unfinished = fallback.filter(item => (meta.owned[item.id]?.level ?? 0) < 5);
  return unfinished.length ? unfinished : fallback;
}

function equipmentDrop(meta: MetaProgression, item: EquipmentDefinition): PendingEquipmentDrop {
  return { item: item.id, duplicate: Boolean(meta.owned[item.id]), source: item.dropSource, rarity: item.rarity };
}

function chooseEquipment(
  meta: MetaProgression,
  chapter: number,
  source: EquipmentDropSource | null,
  random: () => number,
  forcedItem: EquipmentId | null = null,
): PendingEquipmentDrop | null {
  const pool = eligibleEquipment(meta, chapter, source);
  if (!pool.length) return null;
  if (forcedItem) {
    const forced = pool.find(item => item.id === forcedItem);
    if (forced) return equipmentDrop(meta, forced);
  }
  const unowned = pool.filter(item => !meta.owned[item.id]);
  const candidates = unowned.length > 0 && random() < UNOWNED_ITEM_PREFERENCE ? unowned : pool;
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, random()) * candidates.length));
  return equipmentDrop(meta, candidates[index]);
}

function eligibleWishItem(meta: MetaProgression, profile: EquipmentTargetingProfile, chapter: number, source: EquipmentDropSource | null): EquipmentId | null {
  const id = profile.wishItem;
  if (!id || !isActiveEquipmentId(id)) return null;
  const item = ACTIVE_EQUIPMENT[id];
  if (source && item.dropSource !== source) return null;
  if (item.unlockRank > meta.rank || equipmentUnlockChapter(id) > chapter) return null;
  if ((meta.owned[id]?.level ?? 0) >= 5) return null;
  return id;
}

function chooseTargetedReward(
  meta: MetaProgression,
  profile: EquipmentTargetingProfile,
  chapter: number,
  source: EquipmentDropSource | null,
  random: () => number,
): PendingEquipmentDrop | null {
  const wishItem = eligibleWishItem(meta, profile, chapter, source);
  if (!wishItem) {
    if (source) profile.sourceWishMisses[source] = 0;
    else profile.chapterWishMisses = 0;
    return chooseEquipment(meta, chapter, source, random);
  }
  const misses = source ? profile.sourceWishMisses[source] : profile.chapterWishMisses;
  const chance = source ? SOURCE_WISH_CHANCE : CHAPTER_WISH_CHANCE;
  const pity = source ? WISH_PITY_MISSES : CHAPTER_WISH_PITY_MISSES;
  const wishHit = misses >= pity || random() <= chance;
  const drop = chooseEquipment(meta, chapter, source, random, wishHit ? wishItem : null);
  const receivedWish = drop?.item === wishItem;
  if (source) profile.sourceWishMisses[source] = receivedWish ? 0 : Math.min(pity, misses + 1);
  else profile.chapterWishMisses = receivedWish ? 0 : Math.min(pity, misses + 1);
  return drop;
}

export function bossEquipmentSource(_chapter: number, floor: number): EquipmentDropSource | null {
  const safeFloor = Math.max(1, Math.min(FINAL_BOSS_ROOM, Math.floor(Number(floor) || 1)));
  if (!isBossRoom(safeFloor) || safeFloor === FINAL_BOSS_ROOM) return null;
  return LATE_CHAPTER_BOSS_SOURCES[safeFloor] ?? null;
}

export function rollBossEquipmentReward(chapter: number, floor: number, random: () => number = Math.random): PendingEquipmentDrop | null {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const safeFloor = Math.max(1, Math.min(FINAL_BOSS_ROOM, Math.floor(Number(floor) || 1)));
  if (!isBossRoom(safeFloor)) return null;
  const source = bossEquipmentSource(safeChapter, safeFloor);
  const meta = loadMetaProgression();
  const profile = loadEquipmentTargeting();
  if (source && random() <= 0.45) profile.sourceMarks[source] += 1;
  const chance = BOSS_EQUIPMENT_DROP_CHANCE[safeFloor] ?? 0;
  const drop = random() <= chance ? chooseTargetedReward(meta, profile, safeChapter, source, random) : null;
  saveEquipmentTargeting(profile);
  return drop;
}

export function rollHuntEquipmentReward(
  chapter: number,
  random: () => number = Math.random,
  chance = HUNT_EQUIPMENT_DROP_CHANCE,
): PendingEquipmentDrop | null {
  if (random() > Math.max(0, Math.min(1, Number(chance) || 0))) return null;
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const meta = loadMetaProgression();
  const profile = loadEquipmentTargeting();
  const runId = meta.currentRunId;
  const wishKey = runId ? `${runId}:${safeChapter}:hunt-wish` : '';
  const canUseWishAttempt = Boolean(wishKey && eligibleWishItem(meta, profile, safeChapter, 'hunt') && !profile.huntWishLedger.includes(wishKey));
  if (canUseWishAttempt) profile.huntWishLedger.push(wishKey);
  const drop = canUseWishAttempt
    ? chooseTargetedReward(meta, profile, safeChapter, 'hunt', random)
    : chooseEquipment(meta, safeChapter, 'hunt', random);
  saveEquipmentTargeting(profile);
  return drop;
}

export function eligibleEquipmentForSource(chapter: number, source: EquipmentDropSource | null, meta: MetaProgression = loadMetaProgression()) {
  return eligibleEquipment(meta, chapter, source);
}
