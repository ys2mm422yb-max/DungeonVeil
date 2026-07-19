#!/usr/bin/env node

const SAMPLES = 4096;
const MIGRATION_SAMPLES = 2048;
const MAX_CHAPTERS = 240;
const BOSS_ROOMS = [10, 20, 30, 40, 50];
const BOSS_CHANCES = { 10: 0.18, 20: 0.20, 30: 0.22, 40: 0.25, 50: 0.42 };
const SOURCE_BY_ROOM = { 10: 'forge', 20: 'ritual', 30: 'warden', 40: 'depth', 50: 'global' };
const HUNTS_PER_CHAPTER = 3;
const HUNT_DROP_CHANCE = 0.08;
const SOURCE_WISH_CHANCE = 0.18;
const GLOBAL_WISH_CHANCE = 0.24;
const SOURCE_PITY = 7;
const GLOBAL_PITY = 9;
const UNOWNED_PREFERENCE = 0.35;

const ITEMS = [
  { id: 'ash-bow', slot: 'bow', rarity: 'common', source: 'forge', chapter: 1, copies: 22, marks: 8, gold: 131500, dust: 6170 },
  { id: 'ember-bow', slot: 'bow', rarity: 'rare', source: 'ritual', chapter: 2, copies: 30, marks: 11, gold: 217000, dust: 10620 },
  { id: 'veil-bow', slot: 'bow', rarity: 'rare', source: 'depth', chapter: 5, copies: 30, marks: 11, gold: 217000, dust: 10620 },
  { id: 'warden-bow', slot: 'bow', rarity: 'epic', source: 'warden', chapter: 10, copies: 45, marks: 15, gold: 372000, dust: 18700 },
  { id: 'ranger-quiver', slot: 'quiver', rarity: 'common', source: 'hunt', chapter: 1, copies: 22, marks: 8, gold: 131500, dust: 6170 },
  { id: 'black-quiver', slot: 'quiver', rarity: 'rare', source: 'forge', chapter: 3, copies: 30, marks: 11, gold: 217000, dust: 10620 },
  { id: 'warden-quiver', slot: 'quiver', rarity: 'epic', source: 'ritual', chapter: 6, copies: 45, marks: 15, gold: 372000, dust: 18700 },
  { id: 'ranger-cloak', slot: 'armor', rarity: 'common', source: 'hunt', chapter: 1, copies: 22, marks: 8, gold: 131500, dust: 6170 },
  { id: 'ash-armor', slot: 'armor', rarity: 'rare', source: 'depth', chapter: 4, copies: 30, marks: 11, gold: 217000, dust: 10620 },
  { id: 'warden-armor', slot: 'armor', rarity: 'epic', source: 'warden', chapter: 8, copies: 45, marks: 15, gold: 372000, dust: 18700 },
];

const WISH_POLICIES = ['none', 'persistent', 'switching'];
const PLAYER_PROFILES = Object.freeze({
  weak: { chapterMinutes: 34, chaptersPerRun: 1.4 },
  average: { chapterMinutes: 24, chaptersPerRun: 2.2 },
  strong: { chapterMinutes: 18, chaptersPerRun: 3.2 },
});
const MODE_RULES = Object.freeze({
  solo: { equipmentAwardChance: 1, currencyFactor: 1 },
  duo: { equipmentAwardChance: 0.72, currencyFactor: 1.25 },
});
const MIGRATED_STARTS = Object.freeze({
  legacyMidProgress: { found: true, copyRatio: 0.25, currencyRatio: 0.22 },
  legacyAdvanced: { found: true, copyRatio: 0.60, currencyRatio: 0.58 },
});

function rng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))];
}
function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
function summary(values) {
  return {
    p01: percentile(values, 0.01),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    p99: percentile(values, 0.99),
    mean: round(values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)),
  };
}
function chapterCurrency(chapter) {
  let gold = 0;
  let dust = 0;
  for (let floor = 1; floor <= 50; floor++) {
    const boss = BOSS_ROOMS.includes(floor);
    const final = floor === 50;
    gold += final ? 1200 + chapter * 170 : boss ? 430 + chapter * 82 : 48 + floor * 20 + Math.max(0, chapter - 1) * 24;
    dust += final ? 130 + chapter * 16 : boss ? 62 + chapter * 9 : 5 + Math.ceil(floor * 0.75);
  }
  return { gold, dust };
}

const ELIGIBLE_POOLS = Object.fromEntries(
  Array.from({ length: MAX_CHAPTERS + 1 }, (_, chapter) => [chapter, Object.fromEntries(
    ['forge', 'ritual', 'warden', 'depth', 'hunt', 'global'].map(source => [
      source,
      ITEMS.filter(item => item.chapter <= chapter && (source === 'global' || item.source === source)),
    ]),
  )]),
);

function wishActive(policy, chapter, item) {
  if (policy === 'persistent') return true;
  if (policy === 'switching') return (chapter + item.id.length) % 3 === 0;
  return false;
}

function rollTarget(random, item, source, chapter, found, wishPolicy, sourceMisses, globalMisses) {
  const pool = ELIGIBLE_POOLS[chapter]?.[source] ?? [];
  if (!pool.some(candidate => candidate.id === item.id)) {
    return { hit: false, sourceMisses, globalMisses, pity: false };
  }

  const global = source === 'global';
  const activeWish = wishActive(wishPolicy, chapter, item);
  const misses = global ? globalMisses : sourceMisses;
  const pityAt = global ? GLOBAL_PITY : SOURCE_PITY;
  const forced = activeWish && misses >= pityAt;
  const wishChance = global ? GLOBAL_WISH_CHANCE : SOURCE_WISH_CHANCE;
  const baseChance = 1 / Math.max(1, pool.length);
  const discoveryBias = found ? 1 : 1 + UNOWNED_PREFERENCE;
  const chance = forced ? 1 : activeWish ? Math.max(wishChance, baseChance) : Math.min(0.88, baseChance * discoveryBias);
  const hit = random() < chance;

  return {
    hit,
    sourceMisses: global || !activeWish ? sourceMisses : hit ? 0 : Math.min(SOURCE_PITY, sourceMisses + 1),
    globalMisses: !global || !activeWish ? globalMisses : hit ? 0 : Math.min(GLOBAL_PITY, globalMisses + 1),
    pity: forced,
  };
}

function startingState(item, start) {
  if (!start) return { found: false, copies: 0, gold: 0, dust: 0 };
  return {
    found: Boolean(start.found),
    copies: Math.floor(item.copies * start.copyRatio),
    gold: Math.floor(item.gold * start.currencyRatio),
    dust: Math.floor(item.dust * start.currencyRatio),
  };
}

function simulateItem(item, sampleSeed, mode = 'solo', wishPolicy = 'none', start = null) {
  const random = rng(sampleSeed);
  const modeRules = MODE_RULES[mode];
  const initial = startingState(item, start);
  let copies = initial.copies;
  let found = initial.found;
  let firstChapter = found ? Math.max(1, item.chapter) : MAX_CHAPTERS;
  let level5Chapter = MAX_CHAPTERS;
  let marks = 0;
  let marksSpent = 0;
  let sourceMisses = 0;
  let globalMisses = 0;
  let gold = initial.gold;
  let dust = initial.dust;
  let bossKills = 0;
  let hunts = 0;
  let pityHits = 0;
  let copiesFromDrops = 0;
  let copiesFromMarks = 0;

  const receiveTarget = chapter => {
    if (random() > modeRules.equipmentAwardChance) return;
    if (!found) {
      found = true;
      firstChapter = chapter;
    } else {
      copies++;
      copiesFromDrops++;
    }
  };

  for (let chapter = 1; chapter <= MAX_CHAPTERS; chapter++) {
    const currency = chapterCurrency(chapter);
    gold += currency.gold * modeRules.currencyFactor;
    dust += currency.dust * modeRules.currencyFactor;
    if (chapter < item.chapter) continue;

    for (const room of BOSS_ROOMS) {
      bossKills++;
      const source = SOURCE_BY_ROOM[room];
      if ((source === item.source || source === 'global') && random() < 0.45) marks++;
      if (random() > BOSS_CHANCES[room]) continue;
      const roll = rollTarget(random, item, source, chapter, found, wishPolicy, sourceMisses, globalMisses);
      sourceMisses = roll.sourceMisses;
      globalMisses = roll.globalMisses;
      if (roll.pity) pityHits++;
      if (roll.hit) receiveTarget(chapter);
    }

    for (let hunt = 0; hunt < HUNTS_PER_CHAPTER; hunt++) {
      hunts++;
      if (item.source === 'hunt' && chapter % 2 === 0 && hunt === 0) marks++;
      if (random() > HUNT_DROP_CHANCE) continue;
      const roll = rollTarget(random, item, 'hunt', chapter, found, wishPolicy, sourceMisses, globalMisses);
      sourceMisses = roll.sourceMisses;
      if (roll.pity) pityHits++;
      if (roll.hit) receiveTarget(chapter);
    }

    while (marks >= item.marks && (!found || copies < item.copies)) {
      marks -= item.marks;
      marksSpent += item.marks;
      if (!found) {
        found = true;
        firstChapter = chapter;
      } else {
        copies++;
        copiesFromMarks++;
      }
    }

    if (found && copies >= item.copies && gold >= item.gold && dust >= item.dust) {
      level5Chapter = chapter;
      break;
    }
  }

  return {
    firstChapter,
    level5Chapter,
    bossKills,
    hunts,
    pityHits,
    marksEarned: marks + marksSpent,
    marksSpent,
    copiesEarned: copies,
    copiesFromDrops,
    copiesFromMarks,
    goldAvailable: Math.floor(gold),
    dustAvailable: Math.floor(dust),
  };
}

function summarizeItemRows(item, rows) {
  const first = summary(rows.map(row => row.firstChapter));
  const level5 = summary(rows.map(row => row.level5Chapter));
  return {
    firstFindChapter: first,
    level5Chapter: level5,
    averageChapters: level5.mean,
    bossKillsToLevel5: summary(rows.map(row => row.bossKills)),
    huntsToLevel5: summary(rows.map(row => row.hunts)),
    pityTriggers: summary(rows.map(row => row.pityHits)),
    marksEarned: summary(rows.map(row => row.marksEarned)),
    marksSpent: summary(rows.map(row => row.marksSpent)),
    copiesEarned: summary(rows.map(row => row.copiesEarned)),
    copiesFromDrops: summary(rows.map(row => row.copiesFromDrops)),
    copiesFromMarks: summary(rows.map(row => row.copiesFromMarks)),
    goldRequirement: item.gold,
    dustRequirement: item.dust,
    copyRequirement: item.copies,
    markCostPerCopy: item.marks,
    luckCases: {
      extremeLuckFirstFindChapter: first.p01,
      extremeBadLuckFirstFindChapter: first.p99,
      extremeLuckLevel5Chapter: level5.p01,
      extremeBadLuckLevel5Chapter: level5.p99,
    },
    playerProfiles: Object.fromEntries(Object.entries(PLAYER_PROFILES).map(([name, profile]) => [name, {
      medianRunsToLevel5: Math.ceil(level5.median / profile.chaptersPerRun),
      p90RunsToLevel5: Math.ceil(level5.p90 / profile.chaptersPerRun),
      medianHoursToLevel5: round(level5.median * profile.chapterMinutes / 60),
      p90HoursToLevel5: round(level5.p90 * profile.chapterMinutes / 60),
    }])),
  };
}

function simulateRelics(seed, mode = 'solo') {
  const random = rng(seed ^ (mode === 'duo' ? 0x51f15e : 0x9e3779b9));
  const huntOwned = new Set();
  const bossOwned = new Set();
  let worldCore = false;
  let huntMisses = 0;
  let bossMisses = 0;
  let worldMisses = 0;
  let duplicates = 0;
  let duplicateDust = 0;
  let pityHits = 0;
  let firstChapter = MAX_CHAPTERS;
  let sixCoreChapter = MAX_CHAPTERS;
  let allSevenChapter = MAX_CHAPTERS;

  const collect = (owned, poolSize, unownedPreference) => {
    const missing = Array.from({ length: poolSize }, (_, id) => id).filter(id => !owned.has(id));
    const candidates = missing.length && random() < unownedPreference ? missing : Array.from({ length: poolSize }, (_, id) => id);
    const id = candidates[Math.floor(random() * candidates.length)];
    if (owned.has(id)) {
      duplicates++;
      duplicateDust += 60;
    } else {
      owned.add(id);
    }
  };

  for (let chapter = 1; chapter <= MAX_CHAPTERS; chapter++) {
    for (let attempt = 0; attempt < HUNTS_PER_CHAPTER; attempt++) {
      const forced = huntMisses >= 9;
      if (!forced && random() > 0.06) {
        huntMisses++;
        continue;
      }
      if (forced) pityHits++;
      huntMisses = 0;
      collect(huntOwned, 3, 0.65);
      firstChapter = Math.min(firstChapter, chapter);
    }
    for (let attempt = 0; attempt < BOSS_ROOMS.length; attempt++) {
      const forced = bossMisses >= 11;
      if (!forced && random() > 0.08) {
        bossMisses++;
        continue;
      }
      if (forced) pityHits++;
      bossMisses = 0;
      collect(bossOwned, 3, 0.65);
      firstChapter = Math.min(firstChapter, chapter);
    }
    if (chapter % 2 === 0 && !worldCore) {
      const forced = worldMisses >= 14;
      if (forced || random() < 0.05) {
        if (forced) pityHits++;
        worldCore = true;
        firstChapter = Math.min(firstChapter, chapter);
      } else {
        worldMisses++;
      }
    }
    if (huntOwned.size === 3 && bossOwned.size === 3) sixCoreChapter = Math.min(sixCoreChapter, chapter);
    if (huntOwned.size === 3 && bossOwned.size === 3 && worldCore) {
      allSevenChapter = chapter;
      break;
    }
  }

  return { firstChapter, sixCoreChapter, allSevenChapter, duplicates, duplicateDust, pityHits };
}

function scenarioSeed(mode, wishPolicy, item, index, offset = 0) {
  const modeSalt = mode === 'duo' ? 0x700000 : 0x300000;
  const wishSalt = WISH_POLICIES.indexOf(wishPolicy) * 0x10000;
  return modeSalt + wishSalt + item.id.length * 977 + index * 97 + offset;
}

export function simulateTenItemRelicGrind() {
  const scenarioMatrix = {};
  for (const mode of Object.keys(MODE_RULES)) {
    scenarioMatrix[mode] = {};
    for (const wishPolicy of WISH_POLICIES) {
      scenarioMatrix[mode][wishPolicy] = {};
      for (const item of ITEMS) {
        const rows = Array.from({ length: SAMPLES }, (_, index) => simulateItem(
          item,
          scenarioSeed(mode, wishPolicy, item, index),
          mode,
          wishPolicy,
        ));
        scenarioMatrix[mode][wishPolicy][item.id] = summarizeItemRows(item, rows);
      }
    }
  }

  const migratedSaves = {};
  for (const [name, start] of Object.entries(MIGRATED_STARTS)) {
    migratedSaves[name] = {};
    for (const item of ITEMS) {
      const rows = Array.from({ length: MIGRATION_SAMPLES }, (_, index) => simulateItem(
        item,
        scenarioSeed('solo', 'persistent', item, index, name.length * 0x1000),
        'solo',
        'persistent',
        start,
      ));
      migratedSaves[name][item.id] = summarizeItemRows(item, rows);
    }
  }

  const relicModes = {};
  for (const mode of Object.keys(MODE_RULES)) {
    const rows = Array.from({ length: SAMPLES }, (_, index) => simulateRelics(0xdef000 + index * 131, mode));
    relicModes[mode] = {
      firstFindChapter: summary(rows.map(row => row.firstChapter)),
      sixCoreRelicsChapter: summary(rows.map(row => row.sixCoreChapter)),
      allSevenRelicsChapter: summary(rows.map(row => row.allSevenChapter)),
      duplicatesBeforeCollection: summary(rows.map(row => row.duplicates)),
      duplicateDustBeforeCollection: summary(rows.map(row => row.duplicateDust)),
      pityTriggers: summary(rows.map(row => row.pityHits)),
    };
  }

  const modes = {
    solo: scenarioMatrix.solo.persistent,
    duo: scenarioMatrix.duo.persistent,
  };
  const soloMedian = modes.solo['warden-bow'].level5Chapter.median;
  const duoMedian = modes.duo['warden-bow'].level5Chapter.median;

  return {
    samples: SAMPLES,
    samplesPerCoreConfiguration: SAMPLES,
    samplesPerMigrationConfiguration: MIGRATION_SAMPLES,
    maxChapters: MAX_CHAPTERS,
    wishPolicies: WISH_POLICIES,
    playerProfiles: PLAYER_PROFILES,
    modes,
    scenarioMatrix,
    migratedSaves,
    relics: { ...relicModes.solo, modes: relicModes },
    duoParity: {
      referenceItem: 'warden-bow',
      soloMedianLevel5Chapter: soloMedian,
      duoMedianLevel5Chapter: duoMedian,
      duoToSoloRatio: round(duoMedian / Math.max(1, soloMedian), 3),
      grindNotHalved: duoMedian >= soloMedian * 0.75,
    },
    companionReserve: {
      none: 1,
      average: 1.10,
      maximum: 1.12,
      scenarios: {
        none: { effectivePower: 1, clearTimeFactor: 1 },
        average: { effectivePower: 1.10, clearTimeFactor: round(1 / 1.10, 4) },
        maximum: { effectivePower: 1.12, clearTimeFactor: round(1 / 1.12, 4) },
      },
      requiredWithoutCompanion: true,
      changesDropChapters: false,
    },
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(JSON.stringify(simulateTenItemRelicGrind(), null, 2));
}
