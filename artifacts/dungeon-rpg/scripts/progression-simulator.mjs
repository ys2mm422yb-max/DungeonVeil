#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');

export const SIMULATOR_VERSION = 1;
export const DEFAULT_SEED = 0x5eed169;
export const DEFAULT_SAMPLES = 2048;
export const DEFAULT_MAX_CHAPTERS = 160;

const SOURCES = ['forge', 'hunt', 'warden', 'ritual', 'depth'];
const STARTERS = new Set(['ash-bow', 'ranger-quiver', 'veil-key', 'ranger-cloak']);
const HUNT_RELICS = ['ash-eye', 'marked-claw', 'night-hunt-sigil'];
const BOSS_RELICS = ['veil-heart', 'broken-guardian-crown', 'depth-rune-shard'];
const BOSS_ROOMS = new Set([10, 20, 30, 40, 50]);

// This catalog mirrors the currently published PR #169 balance baseline.
// Future balance PRs should update this catalog and the source audit together.
export const EQUIPMENT_CATALOG = [
  ['ash-bow', 'forge', 1, 1, 'common'],
  ['ember-bow', 'forge', 2, 1, 'common'],
  ['hunter-bow', 'hunt', 4, 2, 'rare'],
  ['frost-bow', 'depth', 5, 3, 'rare'],
  ['splinter-bow', 'forge', 6, 3, 'rare'],
  ['veil-bow', 'ritual', 8, 4, 'epic'],
  ['warden-bow', 'warden', 10, 4, 'epic'],
  ['ranger-quiver', 'hunt', 1, 1, 'common'],
  ['black-quiver', 'hunt', 3, 2, 'common'],
  ['rune-quiver', 'ritual', 6, 4, 'epic'],
  ['frost-quiver', 'depth', 4, 3, 'rare'],
  ['splinter-quiver', 'forge', 6, 3, 'rare'],
  ['warden-quiver', 'warden', 8, 4, 'epic'],
  ['veil-key', 'depth', 1, 1, 'common'],
  ['guardian-sigil', 'warden', 5, 3, 'rare'],
  ['frost-grimoire', 'depth', 8, 4, 'epic'],
  ['ritual-shard', 'ritual', 5, 4, 'epic'],
  ['ash-amulet', 'forge', 4, 2, 'rare'],
  ['depth-seal', 'depth', 7, 3, 'rare'],
  ['veil-eye', 'ritual', 10, 4, 'epic'],
  ['ranger-cloak', 'hunt', 1, 1, 'common'],
  ['ash-armor', 'forge', 4, 2, 'rare'],
  ['frost-armor', 'depth', 5, 3, 'rare'],
  ['warden-armor', 'warden', 7, 3, 'epic'],
  ['veil-mantle', 'ritual', 8, 4, 'epic'],
  ['depth-armor', 'depth', 10, 4, 'epic'],
].map(([id, source, unlockRank, unlockChapter, rarity]) => ({ id, source, unlockRank, unlockChapter, rarity, starter: STARTERS.has(id) }));

export const CURRENT_RULES = Object.freeze({
  roomsPerChapter: 50,
  normalEquipmentChance: 0.18,
  normalEquipmentMinimumRoom: 3,
  huntEquipmentChance: 0.32,
  huntMinimumRoom: 8,
  huntBaseChance: 0.18,
  huntPityStep: 0.09,
  huntChanceCap: 0.72,
  huntRelicChance: 0.18,
  bossRelicChance: 0.06,
  finalBossRelicChance: 0.12,
  bossRelicMinimumRoom: 20,
  finiteGiftSelections: 33,
  giftSelectionsPerChapter: 50,
  hunterBlessingAttack: 2,
  vitalSparkHealth: 8,
  upgradeGoldTotal: 58_000,
  upgradeDustTotal: 2_825,
  upgradeCopiesTotal: 11,
});

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed, sample) {
  let value = (seed ^ Math.imul(sample + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

function percentile(values, fraction) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  const index = Math.min(finite.length - 1, Math.max(0, Math.ceil(finite.length * fraction) - 1));
  return finite[index];
}

function distribution(values, maxValue = null) {
  const normalized = values.map(value => value == null ? Number.POSITIVE_INFINITY : value);
  const result = {
    p10: percentile(normalized, 0.10),
    median: percentile(normalized, 0.50),
    p90: percentile(normalized, 0.90),
    p99: percentile(normalized, 0.99),
  };
  if (maxValue != null) {
    for (const key of Object.keys(result)) if (!Number.isFinite(result[key])) result[key] = `>${maxValue}`;
  }
  return result;
}

function isBossRoom(room) {
  return BOSS_ROOMS.has(room);
}

function equipmentSourceForRoom(room) {
  if (isBossRoom(room) || room === 16 || room === 19) return 'warden';
  if (room === 4 || room === 5 || room === 6) return 'forge';
  if (room === 9 || room === 15 || room === 18) return 'ritual';
  return 'depth';
}

function xpForNextRank(rank) {
  return 100 + Math.max(0, rank - 1) * 65;
}

function addRankXp(state, xp) {
  state.xp += xp;
  while (state.xp >= xpForNextRank(state.rank)) {
    state.xp -= xpForNextRank(state.rank);
    state.rank += 1;
  }
}

function roomReward(chapter, room) {
  const boss = isBossRoom(room);
  const chapterBoss = room === 20;
  return {
    xp: chapterBoss ? 260 + chapter * 30 : boss ? 130 + chapter * 20 : 14 + room * 4 + Math.max(0, chapter - 1) * 8,
    dust: chapterBoss ? 105 + chapter * 15 : boss ? 55 + chapter * 10 : 4 + Math.ceil(room * 0.8),
    gold: chapterBoss ? 900 + chapter * 140 : boss ? 350 + chapter * 70 : 40 + room * 18 + Math.max(0, chapter - 1) * 20,
  };
}

function availableEquipment(state, source, chapter) {
  return EQUIPMENT_CATALOG.filter(item => (
    item.source === source
    && !item.starter
    && item.unlockRank <= state.rank
    && item.unlockChapter <= chapter
  ));
}

function collectEquipment(state, source, chapter, rng) {
  state.sourceAttempts[source] += 1;
  const pool = availableEquipment(state, source, chapter);
  if (!pool.length) {
    state.emptySourceAttempts[source] += 1;
    return null;
  }
  const unowned = pool.filter(item => !state.owned.has(item.id));
  const dropPool = unowned.length ? unowned : pool;
  const item = dropPool[Math.floor(rng() * dropPool.length)];
  state.sourceAwards[source] += 1;
  if (!state.owned.has(item.id)) {
    state.owned.add(item.id);
    state.firstOwnedChapter[item.id] ??= chapter;
    state.copies[item.id] = 0;
  } else {
    state.copies[item.id] = (state.copies[item.id] ?? 0) + 1;
    if (state.copies[item.id] >= CURRENT_RULES.upgradeCopiesTotal && state.maxCopyChapter[item.id] == null) {
      state.maxCopyChapter[item.id] = chapter;
    }
  }
  return item.id;
}

function collectRelic(state, source, rng) {
  const pool = source === 'hunt' ? HUNT_RELICS : BOSS_RELICS;
  const id = pool[Math.floor(rng() * pool.length)];
  const owned = state.relicOwned[source];
  state.relicDrops[source] += 1;
  if (owned.has(id)) state.relicDuplicates[source] += 1;
  else owned.add(id);
  if (owned.size === pool.length && state.allRelicsChapter[source] == null) state.allRelicsChapter[source] = state.chapter;
}

function simulateSample(seed, maxChapters) {
  const rng = mulberry32(seed);
  const state = {
    chapter: 1,
    rank: 1,
    xp: 0,
    gold: 0,
    dust: 0,
    roomsSinceHunt: 0,
    owned: new Set(STARTERS),
    copies: Object.fromEntries([...STARTERS].map(id => [id, 0])),
    firstOwnedChapter: Object.fromEntries([...STARTERS].map(id => [id, 1])),
    maxCopyChapter: {},
    sourceAttempts: Object.fromEntries(SOURCES.map(source => [source, 0])),
    sourceAwards: Object.fromEntries(SOURCES.map(source => [source, 0])),
    emptySourceAttempts: Object.fromEntries(SOURCES.map(source => [source, 0])),
    chapterSourceAttempts: [],
    chapterSourceAwards: [],
    chapterHunts: [],
    chapterGold: [],
    chapterDust: [],
    chapterXp: [],
    relicOwned: { hunt: new Set(), boss: new Set() },
    relicDrops: { hunt: 0, boss: 0 },
    relicDuplicates: { hunt: 0, boss: 0 },
    allRelicsChapter: { hunt: null, boss: null },
  };

  for (let chapter = 1; chapter <= maxChapters; chapter += 1) {
    state.chapter = chapter;
    const attemptsBefore = { ...state.sourceAttempts };
    const awardsBefore = { ...state.sourceAwards };
    const goldBefore = state.gold;
    const dustBefore = state.dust;
    let xpEarned = 0;
    let hunts = 0;

    for (let room = 1; room <= CURRENT_RULES.roomsPerChapter; room += 1) {
      // Hunt targets are chosen on room entry, before the room-clear rank reward.
      if (room >= CURRENT_RULES.huntMinimumRoom && !isBossRoom(room)) {
        const huntChance = Math.min(
          CURRENT_RULES.huntBaseChance + state.roomsSinceHunt * CURRENT_RULES.huntPityStep,
          CURRENT_RULES.huntChanceCap,
        );
        if (rng() <= huntChance) {
          hunts += 1;
          state.roomsSinceHunt = 0;
          state.dust += 25;
          if (rng() <= CURRENT_RULES.huntEquipmentChance) collectEquipment(state, 'hunt', chapter, rng);
          if (rng() <= CURRENT_RULES.huntRelicChance) {
            collectRelic(state, 'hunt', rng);
            state.dust += 18;
          }
        } else {
          state.roomsSinceHunt += 1;
        }
      }

      const reward = roomReward(chapter, room);
      xpEarned += reward.xp;
      state.gold += reward.gold;
      state.dust += reward.dust;
      addRankXp(state, reward.xp);

      const shouldAttemptEquipment = isBossRoom(room)
        || (room >= CURRENT_RULES.normalEquipmentMinimumRoom && rng() < CURRENT_RULES.normalEquipmentChance);
      if (shouldAttemptEquipment) collectEquipment(state, equipmentSourceForRoom(room), chapter, rng);

      if (room >= CURRENT_RULES.bossRelicMinimumRoom && isBossRoom(room)) {
        const chance = room === 50 ? CURRENT_RULES.finalBossRelicChance : CURRENT_RULES.bossRelicChance;
        if (rng() <= chance) {
          collectRelic(state, 'boss', rng);
          state.dust += 60;
        }
      }
    }

    state.chapterSourceAttempts.push(Object.fromEntries(SOURCES.map(source => [source, state.sourceAttempts[source] - attemptsBefore[source]])));
    state.chapterSourceAwards.push(Object.fromEntries(SOURCES.map(source => [source, state.sourceAwards[source] - awardsBefore[source]])));
    state.chapterHunts.push(hunts);
    state.chapterGold.push(state.gold - goldBefore);
    state.chapterDust.push(state.dust - dustBefore);
    state.chapterXp.push(xpEarned);
  }

  return state;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarizeItem(samples, item, maxChapters) {
  const first = samples.map(sample => sample.firstOwnedChapter[item.id] ?? null);
  const maxCopies = samples.map(sample => sample.maxCopyChapter[item.id] ?? null);
  return {
    id: item.id,
    source: item.source,
    rarity: item.rarity,
    starter: item.starter,
    unlockRank: item.unlockRank,
    unlockChapter: item.unlockChapter,
    firstOwnedChapter: distribution(first, maxChapters),
    copiesForLevel5Chapter: distribution(maxCopies, maxChapters),
  };
}

function chapterRewardTotals(chapter) {
  const total = { xp: 0, dust: 0, gold: 0 };
  for (let room = 1; room <= 50; room += 1) {
    const reward = roomReward(chapter, room);
    total.xp += reward.xp;
    total.dust += reward.dust;
    total.gold += reward.gold;
  }
  return total;
}

function chapterBalanceProfile(chapter) {
  const fixed = [
    { attackScale: 1, bossHpScale: 1 },
    { attackScale: 1.18, bossHpScale: 1.22 },
    { attackScale: 1.36, bossHpScale: 1.45 },
    { attackScale: 1.56, bossHpScale: 1.72 },
    { attackScale: 1.78, bossHpScale: 2.02 },
  ];
  if (chapter <= fixed.length) return fixed[chapter - 1];
  const overflow = chapter - fixed.length;
  return { attackScale: 1.78 + overflow * 0.1, bossHpScale: 2.02 + overflow * 0.12 };
}

function finalBossStats(chapter) {
  const room = 50;
  const chapterScale = 1 + (chapter - 1) * 0.36;
  const roomScale = 1 + (room - 1) * 0.055;
  const spawnScale = chapterScale * roomScale * 1.18;
  let hp = Math.round(520 * spawnScale);
  const attackScale = 1 + Math.max(0, spawnScale - 1) * 0.62;
  let attack = Math.round(24 * attackScale);
  const profile = chapterBalanceProfile(chapter);
  const hpFactor = 2.08 + (room - 19) * 0.035;
  hp = Math.round(hp * hpFactor);
  const lateRoomAttack = 1 + (room - 20) * 0.018;
  attack = Math.min(Math.round(attack * profile.attackScale * lateRoomAttack), Math.round(96 * profile.attackScale));
  hp = Math.max(Math.round(6000 * profile.bossHpScale), Math.round(hp * 1.18));
  attack = Math.min(
    Math.round(88 * profile.attackScale),
    Math.max(Math.round(64 * profile.attackScale), attack),
  );
  return { chapter, hp, attack };
}

function giftGrowth(chapter) {
  const choices = CURRENT_RULES.giftSelectionsPerChapter * chapter;
  const overflow = Math.max(0, choices - CURRENT_RULES.finiteGiftSelections);
  const normalAttackGift = 13;
  const normalHealthGift = 75;
  const baseAttack = 10;
  const baseHealthWithStarterLoadout = 107;
  return {
    chapter,
    totalChoices: choices,
    overflowChoices: overflow,
    offensiveAttack: baseAttack + normalAttackGift + overflow * CURRENT_RULES.hunterBlessingAttack,
    defensiveMaxHealth: baseHealthWithStarterLoadout + normalHealthGift + overflow * CURRENT_RULES.vitalSparkHealth,
    guardianCrownAttackMultiplier: round(1.1 ** (5 * chapter), 3),
  };
}

function buildWarnings(report) {
  const warnings = [];
  const starterRows = report.items.filter(item => item.starter);
  if (starterRows.some(item => typeof item.copiesForLevel5Chapter.median === 'string')) {
    warnings.push({
      code: 'starter_copies_impossible',
      severity: 'error',
      message: 'All four starter items are excluded from drop pools, so their required copies can never be earned.',
    });
  }

  const sourceMeans = Object.values(report.sourceAttemptsPerChapter.steadyState);
  const positive = sourceMeans.filter(value => value > 0);
  const skew = Math.max(...positive) / Math.min(...positive);
  if (skew >= 4) warnings.push({
    code: 'equipment_source_skew',
    severity: 'error',
    message: `The busiest equipment source receives ${round(skew, 1)}x as many attempts as the rarest source.`,
  });

  if (report.sourceEmptyAttemptRate.chapter1.warden > 0.95 && report.sourceEmptyAttemptRate.chapter1.depth > 0.95) {
    warnings.push({
      code: 'early_guaranteed_drops_have_empty_pools',
      severity: 'error',
      message: 'Most chapter-one boss/depth equipment attempts cannot award an item because those source pools are still chapter-locked.',
    });
  }

  if (report.giftGrowth.atChapter2.overflowChoices > 0) warnings.push({
    code: 'unbounded_gift_overflow',
    severity: 'error',
    message: 'Repeatable attack/health overflow starts in chapter one and then adds 50 more uncapped choices per later chapter.',
  });

  warnings.push({
    code: 'room20_is_special_reward_boss',
    severity: 'warning',
    message: 'The reward formula still treats room 20 as the chapter boss while room 50 receives only the standard boss reward.',
  });

  if (report.giftGrowth.atChapter5.guardianCrownAttackMultiplier > 5) warnings.push({
    code: 'guardian_crown_unbounded',
    severity: 'error',
    message: `The Guardian Crown reaches about ${report.giftGrowth.atChapter5.guardianCrownAttackMultiplier}x attack after five uninterrupted chapters.`,
  });

  const bossMedian = report.relicCompletion.boss.median;
  const huntMedian = report.relicCompletion.hunt.median;
  if (typeof bossMedian === 'number' && typeof huntMedian === 'number' && bossMedian / huntMedian >= 3) warnings.push({
    code: 'relic_source_skew',
    severity: 'warning',
    message: `Completing the boss relic set takes about ${round(bossMedian / huntMedian, 1)}x as many chapters as the hunt relic set.`,
  });

  const c5Gift = report.giftGrowth.atChapter5.offensiveAttack;
  const c5Boss = report.enemyReference.finalBosses.find(entry => entry.chapter === 5).attack;
  if (c5Gift > c5Boss * 2) warnings.push({
    code: 'player_growth_outpaces_enemy_attack',
    severity: 'error',
    message: 'Raw attack from repeatable gifts grows substantially faster than the final-boss attack curve across chapters.',
  });

  return warnings;
}

export function simulateProgression({
  seed = DEFAULT_SEED,
  samples = DEFAULT_SAMPLES,
  maxChapters = DEFAULT_MAX_CHAPTERS,
} = {}) {
  if (!Number.isInteger(samples) || samples < 32) throw new Error('samples must be an integer of at least 32');
  if (!Number.isInteger(maxChapters) || maxChapters < 4) throw new Error('maxChapters must be an integer of at least 4');

  const runs = Array.from({ length: samples }, (_, index) => simulateSample(hashSeed(seed, index), maxChapters));
  const chapter1Attempts = Object.fromEntries(SOURCES.map(source => [source, round(average(runs.map(run => run.chapterSourceAttempts[0][source])), 3)]));
  const steadyStateAttempts = Object.fromEntries(SOURCES.map(source => [source, round(average(runs.flatMap(run => run.chapterSourceAttempts.slice(4, 20).map(row => row[source]))), 3)]));
  const chapter1Awards = Object.fromEntries(SOURCES.map(source => [source, round(average(runs.map(run => run.chapterSourceAwards[0][source])), 3)]));
  const steadyStateAwards = Object.fromEntries(SOURCES.map(source => [source, round(average(runs.flatMap(run => run.chapterSourceAwards.slice(4, 20).map(row => row[source]))), 3)]));
  const chapter1EmptyRate = Object.fromEntries(SOURCES.map(source => {
    const attempts = runs.reduce((sum, run) => sum + run.chapterSourceAttempts[0][source], 0);
    const awards = runs.reduce((sum, run) => sum + run.chapterSourceAwards[0][source], 0);
    return [source, attempts ? round((attempts - awards) / attempts, 3) : 0];
  }));

  const report = {
    simulatorVersion: SIMULATOR_VERSION,
    baselineCommit: '68508484353162e987e20ade64bb259845250e1b',
    seed,
    samples,
    maxChapters,
    currentRules: CURRENT_RULES,
    catalog: {
      totalItems: EQUIPMENT_CATALOG.length,
      starterItems: STARTERS.size,
      nonStarterBySource: Object.fromEntries(SOURCES.map(source => [source, EQUIPMENT_CATALOG.filter(item => item.source === source && !item.starter).length])),
    },
    roomRewardTotals: [1, 2, 3, 4, 5].map(chapter => ({ chapter, ...chapterRewardTotals(chapter) })),
    sourceAttemptsPerChapter: { chapter1: chapter1Attempts, steadyState: steadyStateAttempts },
    sourceAwardsPerChapter: { chapter1: chapter1Awards, steadyState: steadyStateAwards },
    sourceEmptyAttemptRate: { chapter1: chapter1EmptyRate },
    huntsPerChapter: {
      chapter1: distribution(runs.map(run => run.chapterHunts[0])),
      steadyStateMean: round(average(runs.flatMap(run => run.chapterHunts.slice(4, 20))), 2),
    },
    currencyIncludingHuntsAndRelics: {
      chapter1Gold: distribution(runs.map(run => run.chapterGold[0])),
      chapter1Dust: distribution(runs.map(run => run.chapterDust[0])),
    },
    relicCompletion: {
      hunt: distribution(runs.map(run => run.allRelicsChapter.hunt), maxChapters),
      boss: distribution(runs.map(run => run.allRelicsChapter.boss), maxChapters),
    },
    items: EQUIPMENT_CATALOG.map(item => summarizeItem(runs, item, maxChapters)),
    giftGrowth: {
      atChapter1: giftGrowth(1),
      atChapter2: giftGrowth(2),
      atChapter5: giftGrowth(5),
      atChapter10: giftGrowth(10),
    },
    enemyReference: {
      finalBosses: [1, 2, 3, 4, 5, 10].map(finalBossStats),
    },
  };
  report.warnings = buildWarnings(report);
  return report;
}

function markdownValue(value) {
  return value == null ? '—' : String(value);
}

export function renderMarkdown(report) {
  const sourceRows = SOURCES.map(source => `| ${source} | ${report.sourceAttemptsPerChapter.chapter1[source]} | ${report.sourceAwardsPerChapter.chapter1[source]} | ${report.sourceEmptyAttemptRate.chapter1[source]} | ${report.sourceAttemptsPerChapter.steadyState[source]} |`).join('\n');
  const warningRows = report.warnings.map(warning => `- **${warning.severity.toUpperCase()} · ${warning.code}:** ${warning.message}`).join('\n');
  const slowItems = report.items
    .filter(item => !item.starter)
    .sort((a, b) => {
      const left = typeof a.copiesForLevel5Chapter.median === 'number' ? a.copiesForLevel5Chapter.median : Number.POSITIVE_INFINITY;
      const right = typeof b.copiesForLevel5Chapter.median === 'number' ? b.copiesForLevel5Chapter.median : Number.POSITIVE_INFINITY;
      return right - left;
    })
    .slice(0, 10)
    .map(item => `| ${item.id} | ${item.source} | ${markdownValue(item.firstOwnedChapter.median)} | ${markdownValue(item.copiesForLevel5Chapter.median)} | ${markdownValue(item.copiesForLevel5Chapter.p90)} |`)
    .join('\n');

  return `# Dungeon Veil progression baseline\n\nGenerated deterministically from simulator version ${report.simulatorVersion}.\n\n- Baseline commit: \`${report.baselineCommit}\`\n- Seed: \`${report.seed}\`\n- Samples: ${report.samples}\n- Simulated chapters per sample: ${report.maxChapters}\n\n## Current warnings\n\n${warningRows}\n\n## Equipment sources\n\n| Source | Chapter 1 attempts | Chapter 1 awarded items | Chapter 1 empty-attempt rate | Steady-state attempts |\n|---|---:|---:|---:|---:|\n${sourceRows}\n\nAn “attempt” is a successful equipment roll before checking whether the source currently has an eligible item. An empty attempt therefore produces no equipment object.\n\n## Room-clear economy\n\n| Chapter | XP | Veil Dust | Gold |\n|---|---:|---:|---:|\n${report.roomRewardTotals.map(row => `| ${row.chapter} | ${row.xp} | ${row.dust} | ${row.gold} |`).join('\n')}\n\nHunt and relic dust are simulated separately and included in the JSON report.\n\n## Slowest non-starter copy paths\n\n| Item | Source | Median first owned chapter | Median chapter with 11 copies | P90 chapter with 11 copies |\n|---|---|---:|---:|---:|\n${slowItems}\n\nThe four starter items remain impossible to raise through copies in the current baseline because they are excluded from every drop pool.\n\n## Gifts across uninterrupted chapters\n\n| Chapter | Total choices | Repeatable overflow choices | Offensive raw attack | Defensive max HP | Guardian Crown multiplier |\n|---:|---:|---:|---:|---:|---:|\n${Object.values(report.giftGrowth).map(row => `| ${row.chapter} | ${row.totalChoices} | ${row.overflowChoices} | ${row.offensiveAttack} | ${row.defensiveMaxHealth} | ${row.guardianCrownAttackMultiplier}x |`).join('\n')}\n\nThe attack and health columns intentionally isolate the current repeatable overflow policy. They are reference curves, not a full combat-DPS prediction.\n\n## Final boss reference\n\n| Chapter | HP | Attack |\n|---:|---:|---:|\n${report.enemyReference.finalBosses.map(row => `| ${row.chapter} | ${row.hp} | ${row.attack} |`).join('\n')}\n`;
}

function parseCli(argv) {
  const options = { seed: DEFAULT_SEED, samples: DEFAULT_SAMPLES, maxChapters: DEFAULT_MAX_CHAPTERS, format: 'summary', write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') options.format = 'json';
    else if (arg === '--markdown') options.format = 'markdown';
    else if (arg === '--write') options.write = true;
    else if (arg === '--samples') options.samples = Number(argv[++index]);
    else if (arg === '--chapters') options.maxChapters = Number(argv[++index]);
    else if (arg === '--seed') options.seed = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function main() {
  const options = parseCli(process.argv.slice(2));
  const report = simulateProgression(options);
  const markdown = renderMarkdown(report);

  if (options.write) {
    const docsDir = path.join(PROJECT_ROOT, 'docs');
    await mkdir(docsDir, { recursive: true });
    await Promise.all([
      writeFile(path.join(docsDir, 'progression-baseline.json'), `${JSON.stringify(report, null, 2)}\n`),
      writeFile(path.join(docsDir, 'progression-baseline.md'), markdown),
    ]);
  }

  if (options.format === 'json') console.log(JSON.stringify(report, null, 2));
  else if (options.format === 'markdown') console.log(markdown);
  else {
    console.log(`Progression simulator v${report.simulatorVersion}: ${report.samples} samples × ${report.maxChapters} chapters`);
    console.log(`Warnings: ${report.warnings.length}`);
    for (const warning of report.warnings) console.log(`  [${warning.severity}] ${warning.code}: ${warning.message}`);
    console.log('Source attempts/chapter (steady):', report.sourceAttemptsPerChapter.steadyState);
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
