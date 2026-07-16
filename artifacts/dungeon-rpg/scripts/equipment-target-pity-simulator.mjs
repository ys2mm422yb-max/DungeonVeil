#!/usr/bin/env node

import { EQUIPMENT_DROP_RULES } from './equipment-drop-balance-simulator.mjs';

const TARGET_SOURCES = ['forge', 'ritual', 'warden', 'depth', 'hunt'];
const TARGET_AWARDS_TO_LEVEL_FIVE = 12;
const TARGET_SOURCE_CHANCE = 0.5;
const TARGET_HARD_PITY = 2;

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

function ambientSource(floor) {
  return EQUIPMENT_DROP_RULES.ambientSources[(floor - 3) % EQUIPMENT_DROP_RULES.ambientSources.length];
}

function matchingSourceAwards(source, rng) {
  if (source === 'hunt') {
    let awards = 0;
    for (let attempt = 0; attempt < EQUIPMENT_DROP_RULES.huntAttemptsPerChapter; attempt++) {
      if (rng() <= EQUIPMENT_DROP_RULES.huntDropChance) awards++;
    }
    return awards;
  }

  let awards = 1;
  for (let floor = 3; floor < EQUIPMENT_DROP_RULES.roomsPerChapter; floor++) {
    if (EQUIPMENT_DROP_RULES.bossRooms.includes(floor) || ambientSource(floor) !== source) continue;
    if (rng() <= EQUIPMENT_DROP_RULES.normalRoomChance) awards++;
  }
  return awards;
}

function chaptersToLevelFive(source, rng) {
  let targetAwards = 0;
  let sourceMisses = 0;
  let chapters = 0;

  while (targetAwards < TARGET_AWARDS_TO_LEVEL_FIVE && chapters < 30) {
    chapters++;
    const attempts = matchingSourceAwards(source, rng);
    for (let attempt = 0; attempt < attempts && targetAwards < TARGET_AWARDS_TO_LEVEL_FIVE; attempt++) {
      if (sourceMisses >= TARGET_HARD_PITY || rng() < TARGET_SOURCE_CHANCE) {
        targetAwards++;
        sourceMisses = 0;
      } else {
        sourceMisses++;
      }
    }
    if (targetAwards < TARGET_AWARDS_TO_LEVEL_FIVE) targetAwards++;
  }

  return chapters;
}

export function simulateEquipmentTargetPity({ seed = 0x1760177, samples = 20000 } = {}) {
  const bySource = {};
  for (let index = 0; index < TARGET_SOURCES.length; index++) {
    const source = TARGET_SOURCES[index];
    const rng = createRng(seed + index * 0x9e3779b9);
    const chapters = Array.from({ length: samples }, () => chaptersToLevelFive(source, rng));
    const mean = chapters.reduce((sum, value) => sum + value, 0) / chapters.length;
    bySource[source] = {
      mean: Math.round(mean * 1000) / 1000,
      median: percentile(chapters, 0.5),
      p90: percentile(chapters, 0.9),
      p99: percentile(chapters, 0.99),
      max: Math.max(...chapters),
    };
  }

  return {
    scenario: 'equipment-target-pity',
    seed,
    samples,
    rules: {
      targetAwardsToLevelFive: TARGET_AWARDS_TO_LEVEL_FIVE,
      sourceChance: TARGET_SOURCE_CHANCE,
      hardPityMisses: TARGET_HARD_PITY,
      finalBossGuaranteedTarget: true,
      finalBossResetsSourcePity: false,
    },
    bySource,
  };
}

const direct = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (direct) console.log(JSON.stringify(simulateEquipmentTargetPity(), null, 2));
