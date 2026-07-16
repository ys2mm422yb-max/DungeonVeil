#!/usr/bin/env node

export const LONG_TERM_UNLOCKS = Object.freeze({
  1: ['ash-bow', 'ember-bow', 'ranger-quiver', 'veil-key', 'ranger-cloak'],
  2: ['hunter-bow', 'black-quiver', 'ash-amulet', 'ash-armor'],
  3: ['frost-bow', 'frost-quiver', 'guardian-sigil', 'frost-armor'],
  4: ['splinter-bow', 'splinter-quiver', 'depth-seal', 'warden-armor'],
  5: ['rune-quiver', 'ritual-shard', 'veil-mantle'],
  6: ['warden-quiver', 'frost-grimoire', 'depth-armor'],
  7: ['veil-bow', 'warden-bow'],
  8: ['veil-eye'],
});

export const LONG_TERM_RANK_RULES = Object.freeze({ base: 1500, step: 350 });
export const MAX_LEVEL_DUPLICATE_DUST = Object.freeze({ common: 60, rare: 90, epic: 140 });

function xpForRank(rank) {
  return LONG_TERM_RANK_RULES.base + Math.max(0, rank - 1) * LONG_TERM_RANK_RULES.step;
}

function roomXp(chapter, floor) {
  const boss = floor % 10 === 0;
  const chapterBoss = floor === 50;
  return chapterBoss ? 260 + chapter * 30 : boss ? 130 + chapter * 20 : 14 + floor * 4 + Math.max(0, chapter - 1) * 8;
}

function chapterXp(chapter) {
  let xp = 0;
  for (let floor = 1; floor <= 50; floor++) xp += roomXp(chapter, floor);
  return xp;
}

export function simulateLongTermEquipmentProgression({ chapters = 8 } = {}) {
  let rank = 1;
  let rankXp = 0;
  let cumulativeUnlocks = 0;
  const chapterResults = [];

  for (let chapter = 1; chapter <= chapters; chapter++) {
    const earnedXp = chapterXp(chapter);
    rankXp += earnedXp;
    while (rankXp >= xpForRank(rank)) {
      rankXp -= xpForRank(rank);
      rank++;
    }
    const newUnlocks = LONG_TERM_UNLOCKS[chapter]?.length ?? 0;
    cumulativeUnlocks += newUnlocks;
    chapterResults.push({ chapter, earnedXp, rank, rankXp, newUnlocks, cumulativeUnlocks });
  }

  return {
    scenario: 'long-term-equipment-progression',
    rankRules: LONG_TERM_RANK_RULES,
    duplicateDust: MAX_LEVEL_DUPLICATE_DUST,
    chapterResults,
    allEquipmentUnlockedChapter: Math.max(...Object.keys(LONG_TERM_UNLOCKS).map(Number)),
    totalEquipment: Object.values(LONG_TERM_UNLOCKS).flat().length,
  };
}

const direct = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (direct) console.log(JSON.stringify(simulateLongTermEquipmentProgression(), null, 2));
