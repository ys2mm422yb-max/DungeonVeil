export const MAX_CHAPTER = 100;
export const ROOMS_PER_CHAPTER = 100;

export type ChapterPosition = {
  chapter: number;
  room: number;
};

export type ChapterAdvanceResult = {
  position: ChapterPosition;
  completedChapter: number | null;
  terminal: boolean;
};

export function normalizeChapter(value: number): number {
  return Math.max(1, Math.min(MAX_CHAPTER, Math.floor(Number.isFinite(value) ? value : 1)));
}

export function normalizeRoom(value: number): number {
  return Math.max(1, Math.min(ROOMS_PER_CHAPTER, Math.floor(Number.isFinite(value) ? value : 1)));
}

export function advanceChapterPosition(chapter: number, room: number): ChapterAdvanceResult {
  const safeChapter = normalizeChapter(chapter);
  const safeRoom = normalizeRoom(room);

  if (safeRoom < ROOMS_PER_CHAPTER) {
    return {
      position: { chapter: safeChapter, room: safeRoom + 1 },
      completedChapter: null,
      terminal: false,
    };
  }

  if (safeChapter >= MAX_CHAPTER) {
    return {
      position: { chapter: MAX_CHAPTER, room: ROOMS_PER_CHAPTER },
      completedChapter: MAX_CHAPTER,
      terminal: true,
    };
  }

  return {
    position: { chapter: safeChapter + 1, room: 1 },
    completedChapter: safeChapter,
    terminal: false,
  };
}

export function normalizeClaimedChapterRewards(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map(entry => Math.floor(Number(entry)))
    .filter(entry => Number.isFinite(entry) && entry >= 1 && entry <= MAX_CHAPTER))]
    .sort((a, b) => a - b);
}

export function claimChapterReward(claimed: readonly number[], chapter: number): {
  claimed: number[];
  granted: boolean;
} {
  const safeChapter = normalizeChapter(chapter);
  const current = normalizeClaimedChapterRewards(claimed);
  if (current.includes(safeChapter)) return { claimed: current, granted: false };
  return { claimed: [...current, safeChapter].sort((a, b) => a - b), granted: true };
}
