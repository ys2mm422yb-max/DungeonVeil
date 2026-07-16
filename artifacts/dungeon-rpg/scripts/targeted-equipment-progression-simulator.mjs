#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_MAX_CHAPTERS, DEFAULT_SAMPLES, DEFAULT_SEED } from './progression-simulator.mjs';
import { simulateBalancedEquipmentSources } from './balanced-equipment-source-simulator.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');
const BOSS_ROOMS = new Set([10, 20, 30, 40, 50]);

export const TARGETED_EQUIPMENT_SIMULATOR_VERSION = 1;
export const TARGETED_EQUIPMENT_RULES = Object.freeze({
  sourceMarkCost: 3,
  sourceWishChance: 0.35,
  chapterWishChance: 0.5,
  wishPityMisses: 2,
  huntWishAttemptsPerChapter: 1,
  upgradeCopiesTotal: 11,
});

export const TARGETED_EQUIPMENT_CASES = Object.freeze([
  { id: 'ash-bow', source: 'forge', unlockChapter: 1, starter: true },
  { id: 'hunter-bow', source: 'hunt', unlockChapter: 2, starter: false },
  { id: 'guardian-sigil', source: 'warden', unlockChapter: 3, starter: false },
  { id: 'veil-bow', source: 'ritual', unlockChapter: 4, starter: false },
  { id: 'veil-key', source: 'depth', unlockChapter: 1, starter: true },
]);

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

function hashSeed(seed, sample, salt = 0) {
  let value = (seed ^ Math.imul(sample + 1 + salt, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
}

function distribution(values, maxValue) {
  const normalized = values.map(value => value == null ? Number.POSITIVE_INFINITY : value);
  const result = {
    p10: percentile(normalized, 0.1),
    median: percentile(normalized, 0.5),
    p90: percentile(normalized, 0.9),
    p99: percentile(normalized, 0.99),
  };
  for (const key of Object.keys(result)) if (!Number.isFinite(result[key])) result[key] = `>${maxValue}`;
  return result;
}

function huntChapter(rng, roomsSinceHunt) {
  let hunts = 0;
  let equipmentDrops = 0;
  for (let room = 1; room <= 50; room += 1) {
    if (room < 8 || BOSS_ROOMS.has(room)) continue;
    const chance = Math.min(0.18 + roomsSinceHunt * 0.09, 0.72);
    if (rng() <= chance) {
      hunts += 1;
      roomsSinceHunt = 0;
      if (rng() <= 0.18) equipmentDrops += 1;
    } else {
      roomsSinceHunt += 1;
    }
  }
  return { hunts, equipmentDrops, roomsSinceHunt };
}

function sourceChapterState(source, chapter, hunt) {
  if (source === 'forge') return { marks: 1, wishAttempts: 1 };
  if (source === 'ritual') return chapter >= 4 ? { marks: 1, wishAttempts: 1 } : { marks: 0, wishAttempts: 0 };
  if (source === 'warden') return chapter >= 3 ? { marks: 1, wishAttempts: 1 } : { marks: 0, wishAttempts: 0 };
  if (source === 'depth') return chapter <= 2 ? { marks: 2, wishAttempts: 2 } : { marks: 1, wishAttempts: 1 };
  const huntBoss = chapter <= 3 ? 1 : 0;
  return {
    marks: (hunt.hunts > 0 ? 1 : 0) + huntBoss,
    wishAttempts: (hunt.equipmentDrops > 0 ? TARGETED_EQUIPMENT_RULES.huntWishAttemptsPerChapter : 0) + huntBoss,
  };
}

function resolveWishAttempt(rng, misses, chance) {
  if (misses >= TARGETED_EQUIPMENT_RULES.wishPityMisses || rng() <= chance) return { hit: true, misses: 0 };
  return { hit: false, misses: misses + 1 };
}

function simulateTargetCase(target, seed, maxChapters) {
  const rng = mulberry32(seed);
  const acquisitionsNeeded = TARGETED_EQUIPMENT_RULES.upgradeCopiesTotal + (target.starter ? 0 : 1);
  let acquisitions = 0;
  let marks = 0;
  let sourceMisses = 0;
  let chapterMisses = 0;
  let roomsSinceHunt = 0;

  for (let chapter = 1; chapter <= maxChapters; chapter += 1) {
    const hunt = huntChapter(rng, roomsSinceHunt);
    roomsSinceHunt = hunt.roomsSinceHunt;
    const source = sourceChapterState(target.source, chapter, hunt);
    marks += source.marks;

    if (chapter < target.unlockChapter) continue;

    for (let attempt = 0; attempt < source.wishAttempts; attempt += 1) {
      const result = resolveWishAttempt(rng, sourceMisses, TARGETED_EQUIPMENT_RULES.sourceWishChance);
      sourceMisses = result.misses;
      if (result.hit) acquisitions += 1;
    }

    const chapterResult = resolveWishAttempt(rng, chapterMisses, TARGETED_EQUIPMENT_RULES.chapterWishChance);
    chapterMisses = chapterResult.misses;
    if (chapterResult.hit) acquisitions += 1;

    while (marks >= TARGETED_EQUIPMENT_RULES.sourceMarkCost && acquisitions < acquisitionsNeeded) {
      marks -= TARGETED_EQUIPMENT_RULES.sourceMarkCost;
      acquisitions += 1;
    }

    if (acquisitions >= acquisitionsNeeded) return chapter - target.unlockChapter + 1;
  }
  return null;
}

export function simulateTargetedEquipmentProgression({
  seed = DEFAULT_SEED,
  samples = DEFAULT_SAMPLES,
  maxChapters = DEFAULT_MAX_CHAPTERS,
} = {}) {
  const base = simulateBalancedEquipmentSources({ seed, samples, maxChapters });
  const targetResults = Object.fromEntries(TARGETED_EQUIPMENT_CASES.map((target, targetIndex) => {
    const values = Array.from({ length: samples }, (_, sample) => simulateTargetCase(
      target,
      hashSeed(seed, sample, targetIndex * 101),
      maxChapters,
    ));
    return [target.id, {
      source: target.source,
      unlockChapter: target.unlockChapter,
      starter: target.starter,
      eligibleChaptersToLevelFiveCopies: distribution(values, maxChapters),
    }];
  }));

  return {
    ...base,
    simulatorVersion: `${base.simulatorVersion}+target-${TARGETED_EQUIPMENT_SIMULATOR_VERSION}`,
    scenario: 'targeted-equipment-progression',
    currentRules: { ...base.currentRules, ...TARGETED_EQUIPMENT_RULES },
    targetedEquipment: targetResults,
    warnings: base.warnings.filter(warning => warning.code !== 'targeted_copy_control_missing'),
  };
}

export function renderTargetedEquipmentMarkdown(report) {
  const rows = Object.entries(report.targetedEquipment).map(([id, entry]) => {
    const result = entry.eligibleChaptersToLevelFiveCopies;
    return `| ${id} | ${entry.source} | ${entry.unlockChapter} | ${entry.starter ? 'yes' : 'no'} | ${result.p10} | ${result.median} | ${result.p90} | ${result.p99} |`;
  }).join('\n');
  const warnings = report.warnings.map(warning => `- **${warning.severity.toUpperCase()} · ${warning.code}:** ${warning.message}`).join('\n');
  return `# Dungeon Veil targeted equipment progression\n\n- Scenario: \`${report.scenario}\`\n- Seed: \`${report.seed}\`\n- Samples: ${report.samples}\n- Source mark cost: ${report.currentRules.sourceMarkCost}\n- Source wish chance: ${Math.round(report.currentRules.sourceWishChance * 100)}%\n- Room-50 wish chance: ${Math.round(report.currentRules.chapterWishChance * 100)}%\n- Guaranteed after matching misses: ${report.currentRules.wishPityMisses}\n\n## Eligible chapters to eleven upgrade copies\n\nUnowned targets require one additional acquisition for the initial unlock. The table reports elapsed chapters from the target's unlock chapter.\n\n| Item | Source | Unlock chapter | Starter | P10 | Median | P90 | P99 |\n|---|---|---:|---|---:|---:|---:|---:|\n${rows}\n\n## Remaining warnings\n\n${warnings}\n`;
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
  const report = simulateTargetedEquipmentProgression(options);
  const markdown = renderTargetedEquipmentMarkdown(report);
  if (options.write) {
    const docsDir = path.join(PROJECT_ROOT, 'docs');
    await mkdir(docsDir, { recursive: true });
    await Promise.all([
      writeFile(path.join(docsDir, 'targeted-equipment-progression.json'), `${JSON.stringify(report, null, 2)}\n`),
      writeFile(path.join(docsDir, 'targeted-equipment-progression.md'), markdown),
    ]);
  }
  if (options.format === 'json') console.log(JSON.stringify(report, null, 2));
  else if (options.format === 'markdown') console.log(markdown);
  else {
    console.log(`Targeted equipment simulator: ${report.samples} samples × ${report.maxChapters} chapters`);
    console.log('Median eligible chapters:', Object.fromEntries(Object.entries(report.targetedEquipment).map(([id, entry]) => [id, entry.eligibleChaptersToLevelFiveCopies.median])));
    console.log(`Remaining warnings: ${report.warnings.length}`);
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
