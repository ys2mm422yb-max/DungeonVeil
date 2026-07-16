import { FINAL_BOSS_ROOM, isBossRoom } from './chapterRun';
import { recordReachedChapter } from './equipmentChapterGates';
import { rollBalancedRoomEquipmentDrop } from './equipmentDropBalance';
import { xpForNextVeilRank } from './rankProgression';
import {
  loadMetaProgression,
  saveMetaProgression,
  type MetaReward,
  type MetaProgression,
} from './metaProgression';

export type ChapterRoomRewardAmounts = Pick<MetaReward, 'xp' | 'dust' | 'gold'>;

export function chapterRoomRewardAmounts(chapter: number, floor: number): ChapterRoomRewardAmounts {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const safeFloor = Math.max(1, Math.min(FINAL_BOSS_ROOM, Math.floor(Number(floor) || 1)));
  const boss = isBossRoom(safeFloor);
  const chapterBoss = safeFloor === FINAL_BOSS_ROOM;
  return {
    xp: chapterBoss ? 260 + safeChapter * 30 : boss ? 130 + safeChapter * 20 : 14 + safeFloor * 4 + Math.max(0, safeChapter - 1) * 8,
    dust: chapterBoss ? 105 + safeChapter * 15 : boss ? 55 + safeChapter * 10 : 4 + Math.ceil(safeFloor * 0.8),
    gold: chapterBoss ? 900 + safeChapter * 140 : boss ? 350 + safeChapter * 70 : 40 + safeFloor * 18 + Math.max(0, safeChapter - 1) * 20,
  };
}

function addRankXp(meta: MetaProgression, xp: number): void {
  meta.xp += xp;
  while (meta.xp >= xpForNextVeilRank(meta.rank)) {
    meta.xp -= xpForNextVeilRank(meta.rank);
    meta.rank++;
  }
}

function ensureRunId(meta: MetaProgression): void {
  if (meta.currentRunId) return;
  meta.currentRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function rewardChapterRoomClear(chapter: number, floor: number): MetaReward | null {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const safeFloor = Math.max(1, Math.min(FINAL_BOSS_ROOM, Math.floor(Number(floor) || 1)));
  recordReachedChapter(safeChapter);

  const meta = loadMetaProgression();
  ensureRunId(meta);
  const rewardKey = `${meta.currentRunId}:${safeChapter}:${safeFloor}`;
  if (meta.rewardLedger.includes(rewardKey)) return null;
  meta.rewardLedger.push(rewardKey);

  const amounts = chapterRoomRewardAmounts(safeChapter, safeFloor);
  const rankBefore = meta.rank;
  addRankXp(meta, amounts.xp);
  meta.dust += amounts.dust;
  meta.gold += amounts.gold;
  saveMetaProgression(meta);

  const drop = rollBalancedRoomEquipmentDrop(safeFloor);

  return {
    ...amounts,
    rankBefore,
    rankAfter: meta.rank,
    item: drop?.item,
    duplicate: drop?.duplicate,
    source: drop?.source,
    rarity: drop?.rarity,
  };
}
