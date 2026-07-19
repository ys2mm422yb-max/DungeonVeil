import type { GameEngine } from './runEngine';
import { isBossRoom } from './chapterRun';
import { highestReachedChapter, recordReachedChapter } from './equipmentChapterGates';
import { ACTIVE_EQUIPMENT, ACTIVE_EQUIPMENT_IDS, isActiveEquipmentId, legacyReplacementFor } from './equipmentRedesign';
import { EQUIPMENT } from './equipmentDefinitionsV4';
import { loadMetaProgression, saveMetaProgression, xpForNextRank } from './metaStoreV4';
import type { EquipmentDropSource, EquipmentId, MetaProgression, MetaReward, PendingEquipmentDrop } from './metaProgressionTypes';

export const HUNT_EQUIPMENT_DROP_CHANCE_V4 = 0.08;
export const BOSS_EQUIPMENT_DROP_CHANCE_V4: Readonly<Record<number, number>> = Object.freeze({
  10: 0.18,
  20: 0.2,
  30: 0.22,
  40: 0.25,
  50: 0.42,
});

export function equipmentSourceForRoom(floor: number): EquipmentDropSource {
  if (floor === 10) return 'forge';
  if (floor === 20) return 'ritual';
  if (floor === 30) return 'warden';
  if (floor === 40) return 'depth';
  return floor === 50 ? 'warden' : 'hunt';
}

function eligibleDrops(meta: MetaProgression, source: EquipmentDropSource | null) {
  const reachedChapter = highestReachedChapter();
  return ACTIVE_EQUIPMENT_IDS.filter(id => {
    const item = ACTIVE_EQUIPMENT[id];
    if (source && item.dropSource !== source) return false;
    if (item.unlockRank > meta.rank || item.unlockChapter > reachedChapter) return false;
    return (meta.owned[id]?.level ?? 0) < 5;
  });
}

export function chooseEquipmentDrop(
  meta: MetaProgression,
  source: EquipmentDropSource | null,
  random: () => number = Math.random,
): PendingEquipmentDrop | null {
  const pool = eligibleDrops(meta, source);
  if (!pool.length) return null;
  const unowned = pool.filter(id => !meta.owned[id]);
  const candidates = unowned.length > 0 && random() < 0.35 ? unowned : pool;
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, random()) * candidates.length));
  const id = candidates[index];
  const definition = EQUIPMENT[id];
  return { item: id, duplicate: Boolean(meta.owned[id]), source: definition.dropSource, rarity: definition.rarity };
}

export function rollMetaEquipmentDrop(source: EquipmentDropSource, chance = 1): PendingEquipmentDrop | null {
  if (Math.random() > Math.max(0, Math.min(1, Number(chance) || 0))) return null;
  return chooseEquipmentDrop(loadMetaProgression(), source);
}

export function rollBossMetaEquipmentDrop(chapter: number, floor: number, random: () => number = Math.random) {
  const safeFloor = Math.max(1, Math.min(50, Math.floor(Number(floor) || 1)));
  if (!isBossRoom(safeFloor)) return null;
  recordReachedChapter(Math.max(1, Math.floor(Number(chapter) || 1)));
  const chance = BOSS_EQUIPMENT_DROP_CHANCE_V4[safeFloor] ?? 0;
  if (random() > chance) return null;
  return chooseEquipmentDrop(loadMetaProgression(), safeFloor === 50 ? null : equipmentSourceForRoom(safeFloor), random);
}

function addRankXp(meta: MetaProgression, amount: number) {
  meta.xp += amount;
  while (meta.xp >= xpForNextRank(meta.rank)) {
    meta.xp -= xpForNextRank(meta.rank);
    meta.rank++;
  }
}

export function rewardMetaRoomClear(chapter: number, floor: number): MetaReward | null {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const safeFloor = Math.max(1, Math.min(50, Math.floor(Number(floor) || 1)));
  recordReachedChapter(safeChapter);
  const meta = loadMetaProgression();
  if (!meta.currentRunId) meta.currentRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rewardKey = `${meta.currentRunId}:${safeChapter}:${safeFloor}`;
  if (meta.rewardLedger.includes(rewardKey)) return null;
  meta.rewardLedger.push(rewardKey);

  const boss = isBossRoom(safeFloor);
  const chapterBoss = safeFloor === 50;
  const xp = chapterBoss ? 420 + safeChapter * 40 : boss ? 190 + safeChapter * 24 : 18 + safeFloor * 4 + Math.max(0, safeChapter - 1) * 9;
  const dust = chapterBoss ? 130 + safeChapter * 16 : boss ? 62 + safeChapter * 9 : 5 + Math.ceil(safeFloor * 0.75);
  const gold = chapterBoss ? 1200 + safeChapter * 170 : boss ? 430 + safeChapter * 82 : 48 + safeFloor * 20 + Math.max(0, safeChapter - 1) * 24;
  const rankBefore = meta.rank;
  addRankXp(meta, xp);
  meta.dust += dust;
  meta.gold += gold;
  saveMetaProgression(meta);

  const drop = boss ? rollBossMetaEquipmentDrop(safeChapter, safeFloor) : null;
  return { xp, dust, gold, rankBefore, rankAfter: meta.rank, item: drop?.item, duplicate: drop?.duplicate, source: drop?.source, rarity: drop?.rarity };
}

export function spawnEquipmentDrop(engine: GameEngine, drop: PendingEquipmentDrop, x: number, y: number) {
  const id = isActiveEquipmentId(drop.item) ? drop.item : legacyReplacementFor(drop.item);
  const definition = EQUIPMENT[id];
  const itemId = `equipment-drop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  engine.state.items.push({
    id: itemId, type: 'item', itemType: 'equipment', equipmentId: id,
    equipmentRarity: definition.rarity, equipmentSource: definition.dropSource,
    isNewEquipment: !loadMetaProgression().owned[id], value: 0,
    x: x - 12, y: y - 12, width: 24, height: 24, vx: 0, vy: 0,
    color: definition.accent, spawnTime: performance.now(),
  });
  return itemId;
}

export function activeEquipmentId(rawId: EquipmentId) {
  return isActiveEquipmentId(rawId) ? rawId : legacyReplacementFor(rawId);
}
