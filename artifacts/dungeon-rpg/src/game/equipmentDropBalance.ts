import { FINAL_BOSS_ROOM, isBossRoom } from './chapterRun';
import { equipmentUnlockedForCurrentProgress } from './equipmentChapterGates';
import { targetedEquipmentForAward } from './equipmentTargeting';
import {
  EQUIPMENT,
  loadMetaProgression,
  type EquipmentDropSource,
  type EquipmentId,
  type MetaProgression,
  type PendingEquipmentDrop,
} from './metaProgression';

export const NORMAL_ROOM_EQUIPMENT_CHANCE = 0.03;
export const HUNT_EQUIPMENT_CHANCE = 0.12;

export const BOSS_EQUIPMENT_SOURCES: Readonly<Partial<Record<number, EquipmentDropSource>>> = Object.freeze({
  10: 'forge',
  20: 'ritual',
  30: 'warden',
  40: 'depth',
});

export const STARTER_EQUIPMENT_IDS: readonly EquipmentId[] = Object.freeze([
  'ash-bow',
  'ranger-quiver',
  'veil-key',
  'ranger-cloak',
]);

const AMBIENT_SOURCES: readonly EquipmentDropSource[] = ['forge', 'ritual', 'warden', 'depth'];

function unlockedForMeta(meta: MetaProgression, id: EquipmentId): boolean {
  const item = EQUIPMENT[id];
  return item.unlockRank <= meta.rank && equipmentUnlockedForCurrentProgress(id);
}

function sourcePool(meta: MetaProgression, source: EquipmentDropSource): EquipmentId[] {
  return (Object.keys(EQUIPMENT) as EquipmentId[]).filter(id => EQUIPMENT[id].dropSource === source && unlockedForMeta(meta, id));
}

function starterFallbackPool(meta: MetaProgression): EquipmentId[] {
  const unlocked = STARTER_EQUIPMENT_IDS.filter(id => unlockedForMeta(meta, id));
  return unlocked.length ? unlocked : [...STARTER_EQUIPMENT_IDS];
}

function pendingForItem(meta: MetaProgression, id: EquipmentId, source: EquipmentDropSource): PendingEquipmentDrop {
  const definition = EQUIPMENT[id];
  return {
    item: id,
    duplicate: Boolean(meta.owned[id]),
    source,
    rarity: definition.rarity,
  };
}

function chooseFromPool(meta: MetaProgression, ids: EquipmentId[], source: EquipmentDropSource): PendingEquipmentDrop | null {
  if (!ids.length) return null;
  const unowned = ids.filter(id => !meta.owned[id]);
  const pool = unowned.length ? unowned : ids;
  const id = pool[Math.floor(Math.random() * pool.length)];
  return pendingForItem(meta, id, source);
}

function chooseForSource(meta: MetaProgression, source: EquipmentDropSource, guaranteedTarget = false): PendingEquipmentDrop | null {
  const target = targetedEquipmentForAward(source, guaranteedTarget);
  if (target) return pendingForItem(meta, target, source);
  const requested = sourcePool(meta, source);
  return chooseFromPool(meta, requested.length ? requested : starterFallbackPool(meta), source);
}

function finalBossSource(meta: MetaProgression): EquipmentDropSource {
  const available = AMBIENT_SOURCES.filter(source => sourcePool(meta, source).length > 0);
  const pool = available.length ? available : AMBIENT_SOURCES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function ambientEquipmentSourceForRoom(floor: number): EquipmentDropSource {
  const safeFloor = Math.max(3, Math.min(FINAL_BOSS_ROOM - 1, Math.floor(Number(floor) || 3)));
  return AMBIENT_SOURCES[(safeFloor - 3) % AMBIENT_SOURCES.length];
}

export function rollBalancedRoomEquipmentDrop(floor: number): PendingEquipmentDrop | null {
  const safeFloor = Math.max(1, Math.min(FINAL_BOSS_ROOM, Math.floor(Number(floor) || 1)));
  const meta = loadMetaProgression();

  if (isBossRoom(safeFloor)) {
    const source = safeFloor === FINAL_BOSS_ROOM
      ? finalBossSource(meta)
      : BOSS_EQUIPMENT_SOURCES[safeFloor] ?? ambientEquipmentSourceForRoom(safeFloor);
    return chooseForSource(meta, source, safeFloor === FINAL_BOSS_ROOM);
  }

  if (safeFloor < 3 || Math.random() > NORMAL_ROOM_EQUIPMENT_CHANCE) return null;
  return chooseForSource(meta, ambientEquipmentSourceForRoom(safeFloor));
}

export function rollBalancedHuntEquipmentDrop(): PendingEquipmentDrop | null {
  if (Math.random() > HUNT_EQUIPMENT_CHANCE) return null;
  return chooseForSource(loadMetaProgression(), 'hunt');
}
