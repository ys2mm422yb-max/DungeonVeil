import { FINAL_BOSS_ROOM, isBossRoom } from './chapterRun';
import { equipmentUnlockChapter } from './equipmentChapterGates';
import {
  EQUIPMENT,
  loadMetaProgression,
  type EquipmentDefinition,
  type EquipmentDropSource,
  type MetaProgression,
  type PendingEquipmentDrop,
} from './metaProgression';

export const HUNT_EQUIPMENT_DROP_CHANCE = 0.18;

export const LATE_CHAPTER_BOSS_SOURCES: Readonly<Record<number, EquipmentDropSource>> = Object.freeze({
  10: 'forge',
  20: 'ritual',
  30: 'warden',
  40: 'depth',
});

function eligibleEquipment(
  meta: MetaProgression,
  chapter: number,
  source: EquipmentDropSource | null,
): EquipmentDefinition[] {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  return Object.values(EQUIPMENT).filter(item => {
    if (source && item.dropSource !== source) return false;
    if (item.unlockRank > meta.rank || equipmentUnlockChapter(item.id) > safeChapter) return false;
    return (meta.owned[item.id]?.level ?? 0) < 5;
  });
}

function chooseEquipment(
  meta: MetaProgression,
  chapter: number,
  source: EquipmentDropSource | null,
  random: () => number,
): PendingEquipmentDrop | null {
  const pool = eligibleEquipment(meta, chapter, source);
  if (!pool.length) return null;
  const unowned = pool.filter(item => !meta.owned[item.id]);
  const candidates = unowned.length ? unowned : pool;
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, random()) * candidates.length));
  const item = candidates[index];
  return {
    item: item.id,
    duplicate: Boolean(meta.owned[item.id]),
    source: item.dropSource,
    rarity: item.rarity,
  };
}

export function bossEquipmentSource(chapter: number, floor: number): EquipmentDropSource | null {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const safeFloor = Math.max(1, Math.min(FINAL_BOSS_ROOM, Math.floor(Number(floor) || 1)));
  if (!isBossRoom(safeFloor) || safeFloor === FINAL_BOSS_ROOM) return null;
  if (safeFloor === 10) return 'forge';
  if (safeFloor === 20) return safeChapter >= 4 ? 'ritual' : 'hunt';
  if (safeFloor === 30) return safeChapter >= 3 ? 'warden' : 'depth';
  return safeFloor === 40 ? 'depth' : null;
}

export function rollBossEquipmentReward(
  chapter: number,
  floor: number,
  random: () => number = Math.random,
): PendingEquipmentDrop | null {
  const safeFloor = Math.max(1, Math.min(FINAL_BOSS_ROOM, Math.floor(Number(floor) || 1)));
  if (!isBossRoom(safeFloor)) return null;
  const source = bossEquipmentSource(chapter, safeFloor);
  return chooseEquipment(loadMetaProgression(), chapter, source, random);
}

export function rollHuntEquipmentReward(
  chapter: number,
  random: () => number = Math.random,
  chance = HUNT_EQUIPMENT_DROP_CHANCE,
): PendingEquipmentDrop | null {
  const safeChance = Math.max(0, Math.min(1, Number(chance) || 0));
  if (random() > safeChance) return null;
  return chooseEquipment(loadMetaProgression(), chapter, 'hunt', random);
}

export function eligibleEquipmentForSource(
  chapter: number,
  source: EquipmentDropSource | null,
  meta: MetaProgression = loadMetaProgression(),
): readonly EquipmentDefinition[] {
  return eligibleEquipment(meta, chapter, source);
}
