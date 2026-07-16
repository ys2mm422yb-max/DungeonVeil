#!/usr/bin/env node

export const RELIC_BALANCE_RULES = Object.freeze({
  huntRelics: 3,
  bossRelics: 3,
  normalHuntsPerChapter: 3,
  ashEyeHuntsPerChapter: 4,
  huntChance: 0.12,
  huntPity: 6,
  bossChances: [0.1, 0.1, 0.1, 0.2],
  bossPity: 8,
  unownedFirst: true,
  crownPercentPerBoss: 0.04,
  crownMaxStacks: 5,
});

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))];
}

function chaptersToCollect(source, rng, ashEye = false) {
  const rules = RELIC_BALANCE_RULES;
  const target = source === 'hunt' ? rules.huntRelics : rules.bossRelics;
  const pityLimit = source === 'hunt' ? rules.huntPity : rules.bossPity;
  let owned = 0;
  let pity = 0;
  let chapters = 0;

  while (owned < target && chapters < 30) {
    chapters++;
    const chances = source === 'hunt'
      ? Array.from({ length: ashEye ? rules.ashEyeHuntsPerChapter : rules.normalHuntsPerChapter }, () => rules.huntChance)
      : rules.bossChances;
    for (const chance of chances) {
      const guaranteed = pity >= pityLimit - 1;
      if (guaranteed || rng() <= chance) {
        pity = 0;
        if (rules.unownedFirst) owned++;
      } else {
        pity++;
      }
      if (owned >= target) break;
    }
  }
  return chapters;
}

function distribution(source, seed, samples, ashEye = false) {
  const rng = createRng(seed);
  const chapters = Array.from({ length: samples }, () => chaptersToCollect(source, rng, ashEye));
  const mean = chapters.reduce((sum, value) => sum + value, 0) / chapters.length;
  return {
    mean: Math.round(mean * 1000) / 1000,
    median: percentile(chapters, 0.5),
    p90: percentile(chapters, 0.9),
    p99: percentile(chapters, 0.99),
    max: Math.max(...chapters),
  };
}

export function simulateRelicBalance({ seed = 0x180b4a, samples = 20000 } = {}) {
  const rules = RELIC_BALANCE_RULES;
  return {
    scenario: 'balanced-relic-progression',
    seed,
    samples,
    rules,
    collection: {
      hunt: distribution('hunt', seed, samples),
      huntWithAshEye: distribution('hunt', seed + 1, samples, true),
      boss: distribution('boss', seed + 2, samples),
    },
    crownMaxAttackBonus: rules.crownPercentPerBoss * rules.crownMaxStacks,
  };
}

const direct = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (direct) console.log(JSON.stringify(simulateRelicBalance(), null, 2));
