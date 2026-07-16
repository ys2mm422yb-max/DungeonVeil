import type { SaveData } from './saveManager';
import type { GameEngine } from './runEngine';
import { CHAPTER_ROOMS } from './chapterRun';

export const FIRST_CHAPTER_GIFT_ROOMS = Object.freeze([3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
export const LATER_CHAPTER_GIFT_ROOMS = Object.freeze([10, 20, 30, 40, 50]);

const FIRST_CHAPTER_GIFT_SET = new Set<number>(FIRST_CHAPTER_GIFT_ROOMS);
const LATER_CHAPTER_GIFT_SET = new Set<number>(LATER_CHAPTER_GIFT_ROOMS);

export function shouldOfferGiftAfterRoom(chapter: number, room: number): boolean {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const safeRoom = Math.max(1, Math.min(CHAPTER_ROOMS, Math.floor(Number(room) || 1)));
  return (safeChapter === 1 ? FIRST_CHAPTER_GIFT_SET : LATER_CHAPTER_GIFT_SET).has(safeRoom);
}

export function shouldRestorePendingGift(save: Pick<SaveData, 'chapter' | 'floor' | 'saveReason'>): boolean {
  const chapter = Math.max(1, Math.floor(Number(save.chapter) || 1));
  const floor = Math.max(1, Math.min(CHAPTER_ROOMS, Math.floor(Number(save.floor) || 1)));
  if (save.saveReason === 'chapter-complete') return shouldOfferGiftAfterRoom(Math.max(1, chapter - 1), CHAPTER_ROOMS);
  if (save.saveReason === 'room-complete' && floor > 1) return shouldOfferGiftAfterRoom(chapter, floor - 1);
  return false;
}

type EngineInternals = {
  nextRoom: () => void;
  emit: () => void;
};

export function installBoundedRunGiftProgression(engine: GameEngine): () => void {
  const internals = engine as unknown as EngineInternals;
  const originalNextRoom = internals.nextRoom;
  if (typeof originalNextRoom !== 'function') return () => {};

  const patchedNextRoom = function patchedNextRoom() {
    const completedChapter = engine.state.chapter;
    const completedRoom = engine.state.floor;
    originalNextRoom.call(engine);

    const moved = engine.state.chapter !== completedChapter || engine.state.floor !== completedRoom;
    if (!moved || shouldOfferGiftAfterRoom(completedChapter, completedRoom) || engine.state.status !== 'levelup') return;

    engine.state.upgradeChoices = [];
    engine.state.status = 'playing';
    engine.saveNow(completedRoom >= CHAPTER_ROOMS ? 'chapter-complete' : 'room-complete');
    internals.emit.call(engine);
  };

  internals.nextRoom = patchedNextRoom;
  return () => {
    if (internals.nextRoom === patchedNextRoom) internals.nextRoom = originalNextRoom;
  };
}
