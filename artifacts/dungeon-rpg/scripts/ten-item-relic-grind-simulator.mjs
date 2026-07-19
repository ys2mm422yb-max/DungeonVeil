#!/usr/bin/env node

const SAMPLES = 4096;
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

function rng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))];
}
function summary(values) {
  return {
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    p99: percentile(values, 0.99),
    mean: Math.round(values.reduce((a, b) => a + b, 0) / Math.max(1, values.length) * 100) / 100,
  };
}
function chapterCurrency(chapter) {
  let gold = 0; let dust = 0;
  for (let floor = 1; floor <= 50; floor++) {
    const boss = BOSS_ROOMS.includes(floor);
    const final = floor === 50;
    gold += final ? 1200 + chapter * 170 : boss ? 430 + chapter * 82 : 48 + floor * 20 + Math.max(0, chapter - 1) * 24;
    dust += final ? 130 + chapter * 16 : boss ? 62 + chapter * 9 : 5 + Math.ceil(floor * 0.75);
  }
  return { gold, dust };
}
function sourceEligibleItems(source, chapter) {
  return ITEMS.filter(item => item.chapter <= chapter && (source === 'global' || item.source === source));
}
function rollPoolItem(random, source, chapter, targetId, sourceMisses, globalMisses) {
  const pool = sourceEligibleItems(source, chapter);
  if (!pool.length) return { id: null, sourceMisses, globalMisses, pity: false };
  const target = pool.find(item => item.id === targetId);
  const global = source === 'global';
  const misses = global ? globalMisses : sourceMisses;
  const pityAt = global ? GLOBAL_PITY : SOURCE_PITY;
  const chance = global ? GLOBAL_WISH_CHANCE : SOURCE_WISH_CHANCE;
  const forced = Boolean(target && misses >= pityAt);
  const hitTarget = Boolean(target && (forced || random() < chance));
  let selected;
  if (hitTarget) selected = target;
  else {
    const unownedBias = random() < UNOWNED_PREFERENCE;
    selected = pool[Math.floor(random() * pool.length)];
    if (unownedBias && pool.length > 1 && selected.id === targetId) selected = pool.find(item => item.id !== targetId) ?? selected;
  }
  return {
    id: selected.id,
    sourceMisses: global ? sourceMisses : selected.id === targetId ? 0 : Math.min(SOURCE_PITY, sourceMisses + 1),
    globalMisses: global ? selected.id === targetId ? 0 : Math.min(GLOBAL_PITY, globalMisses + 1) : globalMisses,
    pity: forced,
  };
}

function simulateItem(item, sampleSeed, mode = 'solo') {
  const random = rng(sampleSeed);
  let copies = 0; let found = false; let firstChapter = MAX_CHAPTERS;
  let level5Chapter = MAX_CHAPTERS; let marks = 0; let sourceMisses = 0; let globalMisses = 0;
  let gold = 0; let dust = 0; let bossKills = 0; let hunts = 0; let pityHits = 0;
  const duoAwardChance = mode === 'duo' ? 0.72 : 1;

  for (let chapter = 1; chapter <= MAX_CHAPTERS; chapter++) {
    const currency = chapterCurrency(chapter); gold += currency.gold; dust += currency.dust;
    if (chapter < item.chapter) continue;

    for (const room of BOSS_ROOMS) {
      bossKills++;
      const source = SOURCE_BY_ROOM[room];
      if (source === item.source && random() < 0.45) marks++;
      if (random() > BOSS_CHANCES[room]) continue;
      const roll = rollPoolItem(random, source, chapter, item.id, sourceMisses, globalMisses);
      sourceMisses = roll.sourceMisses; globalMisses = roll.globalMisses;
      if (roll.pity) pityHits++;
      if (roll.id === item.id && random() <= duoAwardChance) {
        if (!found) { found = true; firstChapter = chapter; }
        else copies++;
      }
    }

    for (let hunt = 0; hunt < HUNTS_PER_CHAPTER; hunt++) {
      hunts++;
      if (item.source === 'hunt' && chapter % 2 === 0 && hunt === 0) marks++;
      if (random() > HUNT_DROP_CHANCE) continue;
      const roll = rollPoolItem(random, 'hunt', chapter, item.id, sourceMisses, globalMisses);
      sourceMisses = roll.sourceMisses;
      if (roll.pity) pityHits++;
      if (roll.id === item.id && random() <= duoAwardChance) {
        if (!found) { found = true; firstChapter = chapter; }
        else copies++;
      }
    }

    while (marks >= item.marks && (!found || copies < item.copies)) {
      marks -= item.marks;
      if (!found) { found = true; firstChapter = chapter; }
      else copies++;
    }

    if (found && copies >= item.copies && gold >= item.gold && dust >= item.dust) {
      level5Chapter = chapter;
      break;
    }
  }
  return { firstChapter, level5Chapter, bossKills, hunts, pityHits };
}

function simulateRelics(seed) {
  const random = rng(seed ^ 0x9e3779b9);
  const huntOwned = new Set(); const bossOwned = new Set();
  let huntMisses = 0; let bossMisses = 0; let duplicates = 0; let pityHits = 0;
  let firstChapter = MAX_CHAPTERS; let completeChapter = MAX_CHAPTERS;
  for (let chapter = 1; chapter <= MAX_CHAPTERS; chapter++) {
    for (let attempt = 0; attempt < HUNTS_PER_CHAPTER; attempt++) {
      const forced = huntMisses >= 9;
      if (!forced && random() > 0.06) { huntMisses++; continue; }
      if (forced) pityHits++;
      huntMisses = 0;
      const missing = [0, 1, 2].filter(id => !huntOwned.has(id));
      const candidates = missing.length && random() < 0.65 ? missing : [0, 1, 2];
      const id = candidates[Math.floor(random() * candidates.length)];
      if (huntOwned.has(id)) duplicates++; else huntOwned.add(id);
      firstChapter = Math.min(firstChapter, chapter);
    }
    for (let attempt = 0; attempt < BOSS_ROOMS.length; attempt++) {
      const forced = bossMisses >= 11;
      if (!forced && random() > 0.08) { bossMisses++; continue; }
      if (forced) pityHits++;
      bossMisses = 0;
      const missing = [0, 1, 2].filter(id => !bossOwned.has(id));
      const candidates = missing.length && random() < 0.65 ? missing : [0, 1, 2];
      const id = candidates[Math.floor(random() * candidates.length)];
      if (bossOwned.has(id)) duplicates++; else bossOwned.add(id);
      firstChapter = Math.min(firstChapter, chapter);
    }
    if (huntOwned.size === 3 && bossOwned.size === 3) { completeChapter = chapter; break; }
  }
  return { firstChapter, completeChapter, duplicates, pityHits };
}

export function simulateTenItemRelicGrind() {
  const modes = {};
  for (const mode of ['solo', 'duo']) {
    modes[mode] = {};
    for (const item of ITEMS) {
      const rows = Array.from({ length: SAMPLES }, (_, index) => simulateItem(item, 0xabc000 + index * 97 + item.id.length * 17, mode));
      modes[mode][item.id] = {
        firstFindChapter: summary(rows.map(row => row.firstChapter)),
        level5Chapter: summary(rows.map(row => row.level5Chapter)),
        bossKillsToLevel5: summary(rows.map(row => row.bossKills)),
        huntsToLevel5: summary(rows.map(row => row.hunts)),
        pityTriggers: summary(rows.map(row => row.pityHits)),
      };
    }
  }
  const relicRows = Array.from({ length: SAMPLES }, (_, index) => simulateRelics(0xdef000 + index * 131));
  return {
    samples: SAMPLES,
    maxChapters: MAX_CHAPTERS,
    modes,
    relics: {
      firstFindChapter: summary(relicRows.map(row => row.firstChapter)),
      sixCoreRelicsChapter: summary(relicRows.map(row => row.completeChapter)),
      duplicatesBeforeCollection: summary(relicRows.map(row => row.duplicates)),
      pityTriggers: summary(relicRows.map(row => row.pityHits)),
    },
    companionReserve: {
      none: 1,
      average: 1.10,
      maximum: 1.12,
      requiredWithoutCompanion: true,
    },
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(JSON.stringify(simulateTenItemRelicGrind(), null, 2));
}
