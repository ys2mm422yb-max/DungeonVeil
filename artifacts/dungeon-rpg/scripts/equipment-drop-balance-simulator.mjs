#!/usr/bin/env node

export const EQUIPMENT_DROP_RULES = Object.freeze({
  roomsPerChapter: 50,
  bossRooms: [10, 20, 30, 40, 50],
  fixedBossSources: { 10: 'forge', 20: 'ritual', 30: 'warden', 40: 'depth' },
  finalBossSources: ['forge', 'ritual', 'warden', 'depth'],
  ambientSources: ['forge', 'ritual', 'warden', 'depth'],
  normalRoomChance: 0.03,
  huntAttemptsPerChapter: 12,
  huntDropChance: 0.12,
  starterItemsIncluded: true,
  emptySourceFallback: 'starter-copy',
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

function ambientSource(floor, rules) {
  return rules.ambientSources[(floor - 3) % rules.ambientSources.length];
}

export function simulateEquipmentDropBalance({ seed = 0x173d0f, samples = 20000 } = {}) {
  const rules = EQUIPMENT_DROP_RULES;
  const rng = createRng(seed);
  const totals = [];
  const sourceTotals = { forge: 0, ritual: 0, warden: 0, depth: 0, hunt: 0 };
  let guaranteedBossDrops = 0;
  let firstChapterStarterFallbacks = 0;
  let emptyAwards = 0;

  for (let sample = 0; sample < samples; sample++) {
    let total = 0;

    for (const room of [10, 20, 30, 40]) {
      const source = rules.fixedBossSources[room];
      sourceTotals[source]++;
      guaranteedBossDrops++;
      total++;
      if (room === 20 || room === 30) firstChapterStarterFallbacks++;
    }

    const finalSource = rules.finalBossSources[Math.floor(rng() * rules.finalBossSources.length)];
    sourceTotals[finalSource]++;
    guaranteedBossDrops++;
    total++;
    if (finalSource === 'ritual' || finalSource === 'warden') firstChapterStarterFallbacks++;

    for (let floor = 3; floor < rules.roomsPerChapter; floor++) {
      if (rules.bossRooms.includes(floor) || rng() > rules.normalRoomChance) continue;
      sourceTotals[ambientSource(floor, rules)]++;
      total++;
    }

    for (let hunt = 0; hunt < rules.huntAttemptsPerChapter; hunt++) {
      if (rng() > rules.huntDropChance) continue;
      sourceTotals.hunt++;
      total++;
    }

    totals.push(total);
  }

  const sourceAwardsPerChapter = Object.fromEntries(Object.entries(sourceTotals).map(([source, count]) => [source, Math.round(count / samples * 1000) / 1000]));
  const sourceValues = Object.values(sourceAwardsPerChapter);
  const sourceRatio = Math.max(...sourceValues) / Math.min(...sourceValues);
  const mean = totals.reduce((sum, value) => sum + value, 0) / totals.length;

  return {
    scenario: 'fair-equipment-drop-sources',
    seed,
    samples,
    currentRules: rules,
    dropsPerChapter: {
      mean: Math.round(mean * 1000) / 1000,
      p10: percentile(totals, 0.1),
      median: percentile(totals, 0.5),
      p90: percentile(totals, 0.9),
    },
    sourceAwardsPerChapter,
    sourceAwardRatio: Math.round(sourceRatio * 1000) / 1000,
    guaranteedBossDropsPerChapter: guaranteedBossDrops / samples,
    firstChapterStarterFallbacksPerChapter: Math.round(firstChapterStarterFallbacks / samples * 1000) / 1000,
    starterCopiesPossible: rules.starterItemsIncluded && rules.emptySourceFallback === 'starter-copy',
    emptyAwardRate: emptyAwards / Math.max(1, totals.reduce((sum, value) => sum + value, 0)),
  };
}

const direct = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (direct) console.log(JSON.stringify(simulateEquipmentDropBalance(), null, 2));
