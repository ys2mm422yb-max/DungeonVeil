export const VEIL_RANK_XP_BASE = 1500;
export const VEIL_RANK_XP_STEP = 350;

export function xpForNextVeilRank(rank: number): number {
  const safeRank = Math.max(1, Math.floor(Number(rank) || 1));
  return VEIL_RANK_XP_BASE + Math.max(0, safeRank - 1) * VEIL_RANK_XP_STEP;
}
