#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_MAX_CHAPTERS,
  DEFAULT_SAMPLES,
  DEFAULT_SEED,
  EQUIPMENT_CATALOG,
} from './progression-simulator.mjs';
import { simulateBoundedGiftProgression } from './bounded-gift-progression-simulator.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');
const SOURCES = ['forge', 'hunt', 'warden', 'ritual', 'depth'];
const BOSS_ROOMS = new Set([10, 20, 30, 40, 50]);
const STARTERS = new Set(EQUIPMENT_CATALOG.filter(item => item.starter).map(item => item.id));

export const BALANCED_SOURCE_SIMULATOR_VERSION = 1;
export const BALANCED_SOURCE_RULES = Object.freeze({
  normalRoomEquipmentChance: 0,
  huntEquipmentChance: 0.18,
  guaranteedBossEquipmentRooms: [10, 20, 30, 40, 50],
  lateChapterBossSources: { 10: 'forge', 20: 'ritual', 30: 'warden', 40: 'depth', 50: 'global' },
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
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
}

function distribution(values, maxValue = null) {
  const normalized = values.map(value => value == null ? Number.POSITIVE_INFINITY : value);
  const result = {
    p10: percentile(normalized, 0.1),
    median: percentile(normalized, 0.5),
    p90: percentile(normalized, 0.9),
    p99: percentile(normalized, 0.99),
  };
  if (maxValue != null) {
    for (const key of Object.keys(result)) if (!Number.isFinite(result[key])) result[key] = `>${maxValue}`;
  }
  return result;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function xpForNextRank(rank) {
  return 100 + Math.max(0, rank - 1) * 65;
}

function roomXp(chapter, room) {
  if (room === 50) return 260 + chapter * 30;
  if (BOSS_ROOMS.has(room)) return 130 + chapter * 20;
  return 14 + room * 4 + Math.max(0, chapter - 1) * 8;
}

function addRankXp(state, xp) {
  state.xp += xp;
  while (state.xp >= xpForNextRank(state.rank)) {
    state.xp -= xpForNextRank(state.rank);
    state.rank += 1;
  }
}

function bossSource(chapter, room) {
  if (room === 10) return 'forge';
  if (room === 20) return chapter >= 4 ? 'ritual' : 'hunt';
  if (room === 30) return chapter >= 3 ? 'warden' : 'depth';
  if (room === 40) return 'depth';
  return null;
}

function eligibleEquipment(state, chapter, source) {
  return EQUIPMENT_CATALOG.filter(item => (
    (source == null || item.source === source)
    && item.unlockRank <= state.rank
    && item.unlockChapter <= chapter
  ));
}

function collectEquipment(state, chapter, source, rng) {
  const pool = eligibleEquipment(state, chapter, source);
  if (!pool.length) {
    state.emptyAttempts += 1;
    return null;
  }
  const unowned = pool.filter(item => !state.owned.has(item.id));
  const candidates = unowned.length ? unowned : pool;
  const item = candidates[Math.floor(rng() * candidates.length)];
  state.sourceAwards[item.source] += 1;
  if (!state.owned.has(item.id)) {
    state.owned.add(item.id);
    state.firstOwnedChapter[item.id] ??= chapter;
    state.copies[item.id] = 0;
  } else {
    state.copies[item.id] = (state.copies[item.id] ?? 0) + 1;
    if (state.copies[item.id] >= BALANCED_SOURCE_RULES.upgradeCopiesTotal && state.maxCopyChapter[item.id] == null) {
      state.maxCopyChapter[item.id] = chapter;
    }
  }
  return item;
}

function simulateSample(seed, maxChapters) {
  const rng = mulberry32(seed);
  const state = {
    rank: 1,
    xp: 0,
    roomsSinceHunt: 0,
    owned: new Set(STARTERS),
    copies: Object.fromEntries([...STARTERS].map(id => [id, 0])),
    firstOwnedChapter: Object.fromEntries([...STARTERS].map(id => [id, 1])),
    maxCopyChapter: {},
    sourceAwards: Object.fromEntries(SOURCES.map(source => [source, 0])),
    emptyAttempts: 0,
    chapterSourceAwards: [],
    chapterDrops: [],
    chapterHunts: [],
  };

  for (let chapter = 1; chapter <= maxChapters; chapter += 1) {
    const before = { ...state.sourceAwards };
    let hunts = 0;
    for (let room = 1; room <= 50; room += 1) {
      if (room >= 8 && !BOSS_ROOMS.has(room)) {
        const chance = Math.min(0.18 + state.roomsSinceHunt * 0.09, 0.72);
        if (rng() <= chance) {
          hunts += 1;
          state.roomsSinceHunt = 0;
          if (rng() <= BALANCED_SOURCE_RULES.huntEquipmentChance) collectEquipment(state, chapter, 'hunt', rng);
        } else {
          state.roomsSinceHunt += 1;
        }
      }

      addRankXp(state, roomXp(chapter, room));
      if (BOSS_ROOMS.has(room)) collectEquipment(state, chapter, bossSource(chapter, room), rng);
    }

    const awards = Object.fromEntries(SOURCES.map(source => [source, state.sourceAwards[source] - before[source]]));
    state.chapterSourceAwards.push(awards);
    state.chapterDrops.push(Object.values(awards).reduce((sum, value) => sum + value, 0));
    state.chapterHunts.push(hunts);
  }
  return state;
}

export function simulateBalancedEquipmentSources({
  seed = DEFAULT_SEED,
  samples = DEFAULT_SAMPLES,
  maxChapters = DEFAULT_MAX_CHAPTERS,
} = {}) {
  const base = simulateBoundedGiftProgression({ seed, samples, maxChapters });
  const runs = Array.from({ length: samples }, (_, index) => simulateSample(hashSeed(seed, index), maxChapters));
  const chapter1Awards = Object.fromEntries(SOURCES.map(source => [source, round(average(runs.map(run => run.chapterSourceAwards[0][source])))]));
  const steadyAwards = Object.fromEntries(SOURCES.map(source => [source, round(average(runs.flatMap(run => run.chapterSourceAwards.slice(4, 20).map(row => row[source]))))]));
  const steadyValues = Object.values(steadyAwards).filter(value => value > 0);
  const sourceSkew = round(Math.max(...steadyValues) / Math.min(...steadyValues), 2);
  const starterCompletion = Object.fromEntries([...STARTERS].map(id => [id, distribution(runs.map(run => run.maxCopyChapter[id] ?? null), maxChapters)]));
  const removedWarnings = new Set(['starter_copies_impossible', 'equipment_source_skew', 'early_guaranteed_drops_have_empty_pools']);
  const warnings = base.warnings.filter(warning => !removedWarnings.has(warning.code));
  const slowestStarterMedian = Math.max(...Object.values(starterCompletion).map(row => typeof row.median === 'number' ? row.median : maxChapters + 1));
  if (slowestStarterMedian > 20) warnings.push({
    code: 'targeted_copy_control_missing',
    severity: 'warning',
    message: `Starter copies are now possible, but the slowest starter still needs a median of ${slowestStarterMedian} chapters without a wish-item or source-mark system.`,
  });

  return {
    ...base,
    simulatorVersion: `${base.simulatorVersion}+sources-${BALANCED_SOURCE_SIMULATOR_VERSION}`,
    scenario: 'balanced-equipment-sources',
    currentRules: { ...base.currentRules, ...BALANCED_SOURCE_RULES },
    equipmentSources: {
      chapter1Awards,
      steadyStateAwards: steadyAwards,
      sourceSkew,
      emptyGuaranteedAttempts: runs.reduce((sum, run) => sum + run.emptyAttempts, 0),
      dropsPerChapter: {
        chapter1: distribution(runs.map(run => run.chapterDrops[0])),
        steadyStateMean: round(average(runs.flatMap(run => run.chapterDrops.slice(4, 20))), 2),
      },
      huntsPerChapter: {
        chapter1: distribution(runs.map(run => run.chapterHunts[0])),
        steadyStateMean: round(average(runs.flatMap(run => run.chapterHunts.slice(4, 20))), 2),
      },
      starterCopiesForLevel5: starterCompletion,
    },
    warnings,
  };
}

export function renderBalancedEquipmentSourceMarkdown(report) {
  const sourceRows = SOURCES.map(source => `| ${source} | ${report.equipmentSources.chapter1Awards[source]} | ${report.equipmentSources.steadyStateAwards[source]} |`).join('\n');
  const starterRows = Object.entries(report.equipmentSources.starterCopiesForLevel5)
    .map(([id, row]) => `| ${id} | ${row.p10} | ${row.median} | ${row.p90} | ${row.p99} |`)
    .join('\n');
  const warnings = report.warnings.map(warning => `- **${warning.severity.toUpperCase()} · ${warning.code}:** ${warning.message}`).join('\n');
  return `# Dungeon Veil balanced equipment sources\n\n- Scenario: \`${report.scenario}\`\n- Seed: \`${report.seed}\`\n- Samples: ${report.samples}\n- Simulated chapters per sample: ${report.maxChapters}\n- Normal-room equipment chance: ${report.currentRules.normalRoomEquipmentChance}\n- Hunt equipment chance: ${Math.round(report.currentRules.huntEquipmentChance * 100)}%\n- Guaranteed equipment rooms: ${report.currentRules.guaranteedBossEquipmentRooms.join(', ')}\n\n## Equipment awards per chapter\n\n| Source | Chapter 1 | Steady state |\n|---|---:|---:|\n${sourceRows}\n\n- Total chapter-1 drops, median: ${report.equipmentSources.dropsPerChapter.chapter1.median}\n- Total steady-state drops, mean: ${report.equipmentSources.dropsPerChapter.steadyStateMean}\n- Source skew: ${report.equipmentSources.sourceSkew}x\n- Empty guaranteed attempts: ${report.equipmentSources.emptyGuaranteedAttempts}\n\n## Starter copies for level 5\n\n| Item | P10 | Median | P90 | P99 |\n|---|---:|---:|---:|---:|\n${starterRows}\n\n## Remaining warnings\n\n${warnings}\n`;
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
  const report = simulateBalancedEquipmentSources(options);
  const markdown = renderBalancedEquipmentSourceMarkdown(report);
  if (options.write) {
    const docsDir = path.join(PROJECT_ROOT, 'docs');
    await mkdir(docsDir, { recursive: true });
    await Promise.all([
      writeFile(path.join(docsDir, 'balanced-equipment-sources.json'), `${JSON.stringify(report, null, 2)}\n`),
      writeFile(path.join(docsDir, 'balanced-equipment-sources.md'), markdown),
    ]);
  }
  if (options.format === 'json') console.log(JSON.stringify(report, null, 2));
  else if (options.format === 'markdown') console.log(markdown);
  else {
    console.log(`Balanced source simulator: ${report.samples} samples × ${report.maxChapters} chapters`);
    console.log(`Drops per chapter: ${report.equipmentSources.dropsPerChapter.steadyStateMean}`);
    console.log(`Source skew: ${report.equipmentSources.sourceSkew}x`);
    console.log(`Remaining warnings: ${report.warnings.length}`);
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
