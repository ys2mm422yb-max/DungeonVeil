export type ChapterCombatProfileV4 = {
  hpScale: number;
  attackScale: number;
  bossHpScale: number;
  elitePressure: number;
};

const CHAPTERS: readonly ChapterCombatProfileV4[] = [
  { hpScale: 1.00, attackScale: 1.00, bossHpScale: 1.00, elitePressure: 0.00 },
  { hpScale: 1.13, attackScale: 1.09, bossHpScale: 1.16, elitePressure: 0.04 },
  { hpScale: 1.27, attackScale: 1.18, bossHpScale: 1.34, elitePressure: 0.08 },
  { hpScale: 1.43, attackScale: 1.28, bossHpScale: 1.56, elitePressure: 0.13 },
  { hpScale: 1.62, attackScale: 1.39, bossHpScale: 1.80, elitePressure: 0.18 },
  { hpScale: 1.83, attackScale: 1.51, bossHpScale: 2.05, elitePressure: 0.23 },
  { hpScale: 2.05, attackScale: 1.64, bossHpScale: 2.32, elitePressure: 0.28 },
  { hpScale: 2.28, attackScale: 1.78, bossHpScale: 2.62, elitePressure: 0.33 },
  { hpScale: 2.52, attackScale: 1.93, bossHpScale: 2.94, elitePressure: 0.38 },
  { hpScale: 2.78, attackScale: 2.09, bossHpScale: 3.28, elitePressure: 0.43 },
];

const OLD_CHAPTERS = [
  { hpScale: 1, attackScale: 1, bossHpScale: 1 },
  { hpScale: 1.12, attackScale: 1.08, bossHpScale: 1.14 },
  { hpScale: 1.24, attackScale: 1.16, bossHpScale: 1.3 },
  { hpScale: 1.36, attackScale: 1.24, bossHpScale: 1.46 },
  { hpScale: 1.48, attackScale: 1.32, bossHpScale: 1.62 },
  { hpScale: 1.6, attackScale: 1.4, bossHpScale: 1.78 },
];

export function chapterCombatProfileV4(chapter: number): ChapterCombatProfileV4 {
  const value = Math.max(1, Math.floor(Number(chapter) || 1));
  if (value <= CHAPTERS.length) return CHAPTERS[value - 1];
  const overflow = value - CHAPTERS.length;
  const damped = Math.log2(overflow + 1);
  const end = CHAPTERS.at(-1)!;
  return {
    hpScale: end.hpScale + damped * 0.20,
    attackScale: end.attackScale + damped * 0.12,
    bossHpScale: end.bossHpScale + damped * 0.28,
    elitePressure: Math.min(0.58, end.elitePressure + damped * 0.025),
  };
}

export function oldChapterCombatProfile(chapter: number) {
  const value = Math.max(1, Math.floor(Number(chapter) || 1));
  if (value <= OLD_CHAPTERS.length) return OLD_CHAPTERS[value - 1];
  const overflow = value - OLD_CHAPTERS.length;
  const end = OLD_CHAPTERS.at(-1)!;
  return { hpScale: end.hpScale + overflow * 0.08, attackScale: end.attackScale + overflow * 0.06, bossHpScale: end.bossHpScale + overflow * 0.1 };
}

export function roomCombatScaleV4(room: number) {
  const value = Math.max(1, Math.min(50, Math.floor(Number(room) || 1)));
  if (value <= 9) return { hp: 1 + (value - 1) * 0.018, attack: 1 + (value - 1) * 0.008 };
  if (value <= 19) return { hp: 1.18 + (value - 10) * 0.024, attack: 1.08 + (value - 10) * 0.011 };
  if (value <= 29) return { hp: 1.42 + (value - 20) * 0.028, attack: 1.20 + (value - 20) * 0.013 };
  if (value <= 39) return { hp: 1.72 + (value - 30) * 0.032, attack: 1.34 + (value - 30) * 0.015 };
  return { hp: 2.06 + (value - 40) * 0.038, attack: 1.50 + (value - 40) * 0.017 };
}

export function oldRoomCombatScale(room: number) {
  return { hp: 1 + Math.max(0, room - 1) * 0.022, attack: 1 + Math.max(0, room - 1) * 0.0105 };
}

export const BOSS_TARGETS_V4 = Object.freeze({
  10: { hp: 920, attack: 21, supportCap: 0 },
  20: { hp: 1750, attack: 29, supportCap: 1 },
  30: { hp: 2850, attack: 38, supportCap: 1 },
  40: { hp: 4300, attack: 49, supportCap: 2 },
  50: { hp: 6500, attack: 61, supportCap: 2 },
});
