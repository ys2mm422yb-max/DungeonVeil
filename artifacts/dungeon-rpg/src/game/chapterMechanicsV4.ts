import type { EnemyType } from './entities';

export type ChapterPhaseV4 = 'intro' | 'build' | 'midgame' | 'lategame' | 'endgame' | 'endless';

export type ChapterMechanicProfileV4 = Readonly<{
  phase: ChapterPhaseV4;
  reinforcementCount: number;
  supportReplacements: number;
  eliteAffixChance: number;
  bossPhaseCount: number;
  replacementPool: readonly EnemyType[];
  supportPool: readonly EnemyType[];
}>;

const EARLY_POOL: readonly EnemyType[] = ['orc', 'vampire'];
const MID_POOL: readonly EnemyType[] = ['demon', 'vampire', 'golem'];
const LATE_POOL: readonly EnemyType[] = ['demon', 'golem', 'vampire', 'orc'];
const SUPPORT_POOL: readonly EnemyType[] = ['skeleton', 'vampire', 'demon'];

export function chapterMechanicProfileV4(chapter: number): ChapterMechanicProfileV4 {
  const value = Math.max(1, Math.floor(Number(chapter) || 1));
  if (value === 1) return { phase: 'intro', reinforcementCount: 0, supportReplacements: 0, eliteAffixChance: 0, bossPhaseCount: 1, replacementPool: EARLY_POOL, supportPool: SUPPORT_POOL };
  if (value <= 3) return { phase: 'build', reinforcementCount: 0, supportReplacements: 0, eliteAffixChance: 0.04 * (value - 1), bossPhaseCount: 1, replacementPool: EARLY_POOL, supportPool: SUPPORT_POOL };
  if (value <= 6) return { phase: 'midgame', reinforcementCount: 1, supportReplacements: 0, eliteAffixChance: 0.12 + (value - 4) * 0.03, bossPhaseCount: value >= 6 ? 2 : 1, replacementPool: MID_POOL, supportPool: SUPPORT_POOL };
  if (value <= 9) return { phase: 'lategame', reinforcementCount: 2, supportReplacements: value >= 9 ? 1 : 0, eliteAffixChance: Math.min(0.32, 0.22 + (value - 7) * 0.05), bossPhaseCount: 2, replacementPool: LATE_POOL, supportPool: SUPPORT_POOL };
  if (value === 10) return { phase: 'endgame', reinforcementCount: 2, supportReplacements: 1, eliteAffixChance: 0.38, bossPhaseCount: 3, replacementPool: LATE_POOL, supportPool: SUPPORT_POOL };
  const damped = Math.log2(value - 9);
  return {
    phase: 'endless',
    reinforcementCount: 2,
    supportReplacements: 1,
    eliteAffixChance: Math.min(0.48, 0.38 + damped * 0.025),
    bossPhaseCount: 3,
    replacementPool: LATE_POOL,
    supportPool: SUPPORT_POOL,
  };
}

function deterministicIndex(room: number, chapter: number, salt: number, length: number): number {
  if (length <= 1) return 0;
  const value = Math.imul(room + salt * 17, 73856093) ^ Math.imul(chapter + salt * 31, 19349663);
  return Math.abs(value) % length;
}

export function applyChapterMechanicsV4(base: readonly EnemyType[], room: number, chapter: number): EnemyType[] {
  const result = [...base];
  if (!result.length || room % 10 === 0) return result;
  const profile = chapterMechanicProfileV4(chapter);

  for (let index = 0; index < profile.reinforcementCount && result.length > 0; index++) {
    const targetIndex = deterministicIndex(room, chapter, index + 1, result.length);
    const replacement = profile.replacementPool[deterministicIndex(room, chapter, index + 11, profile.replacementPool.length)];
    result[targetIndex] = replacement;
  }

  for (let index = 0; index < profile.supportReplacements && room >= 21 && result.length > 0; index++) {
    const targetIndex = deterministicIndex(room, chapter, index + 23, result.length);
    const support = profile.supportPool[deterministicIndex(room, chapter, index + 29, profile.supportPool.length)];
    result[targetIndex] = support;
  }

  return result.slice(0, 8);
}
