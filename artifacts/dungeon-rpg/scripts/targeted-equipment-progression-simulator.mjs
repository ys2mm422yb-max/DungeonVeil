#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_MAX_CHAPTERS, DEFAULT_SAMPLES, DEFAULT_SEED } from './progression-simulator.mjs';
import { simulateBalancedEquipmentSources } from './balanced-equipment-source-simulator.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');

export const TARGETED_EQUIPMENT_SIMULATOR_VERSION = 2;
export const FORGE_MARK_SIMULATION_RULES = Object.freeze({
  exchangeCost: 10,
  huntsPerChapter: 12,
  intermediateBossesPerChapter: 4,
  chapterBossesPerChapter: 1,
  huntChance: 0.01,
  intermediateBossChance: 0.025,
  chapterBossChance: 0.075,
  categoryWeights: Object.freeze({ bow: 40, quiver: 30, armor: 30 }),
  rarityWeights: Object.freeze({ common: 55, rare: 32, epic: 13 }),
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

function rollMany(rng, attempts, chance) {
  let marks = 0;
  for (let attempt = 0; attempt < attempts; attempt += 1) if (rng() < chance) marks += 1;
  return marks;
}

function simulateExchangeChapter(seed, maxChapters) {
  const rng = mulberry32(seed);
  let marks = 0;
  for (let chapter = 1; chapter <= maxChapters; chapter += 1) {
    marks += rollMany(rng, FORGE_MARK_SIMULATION_RULES.huntsPerChapter, FORGE_MARK_SIMULATION_RULES.huntChance);
    marks += rollMany(rng, FORGE_MARK_SIMULATION_RULES.intermediateBossesPerChapter, FORGE_MARK_SIMULATION_RULES.intermediateBossChance);
    marks += rollMany(rng, FORGE_MARK_SIMULATION_RULES.chapterBossesPerChapter, FORGE_MARK_SIMULATION_RULES.chapterBossChance);
    if (marks >= FORGE_MARK_SIMULATION_RULES.exchangeCost) return chapter;
  }
  return null;
}

function weightedPick(rng, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rng() * total;
  for (const [entry, weight] of entries) {
    cursor -= weight;
    if (cursor < 0) return entry;
  }
  return entries.at(-1)[0];
}

function simulateRewardDistribution(seed, samples) {
  const rng = mulberry32(seed);
  const categoryCounts = { bow: 0, quiver: 0, armor: 0 };
  const rarityCounts = { common: 0, rare: 0, epic: 0 };
  for (let sample = 0; sample < samples; sample += 1) {
    categoryCounts[weightedPick(rng, FORGE_MARK_SIMULATION_RULES.categoryWeights)] += 1;
    rarityCounts[weightedPick(rng, FORGE_MARK_SIMULATION_RULES.rarityWeights)] += 1;
  }
  const ratios = counts => Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value / samples]));
  return { samples, categoryCounts, rarityCounts, categoryRatios: ratios(categoryCounts), rarityRatios: ratios(rarityCounts) };
}

export function simulateTargetedEquipmentProgression({
  seed = DEFAULT_SEED,
  samples = DEFAULT_SAMPLES,
  maxChapters = Math.max(DEFAULT_MAX_CHAPTERS, 120),
} = {}) {
  const base = simulateBalancedEquipmentSources({ seed, samples, maxChapters });
  const chapterValues = Array.from({ length: samples }, (_, sample) => simulateExchangeChapter(hashSeed(seed, sample), maxChapters));
  const expectedMarksPerChapter = (
    FORGE_MARK_SIMULATION_RULES.huntsPerChapter * FORGE_MARK_SIMULATION_RULES.huntChance
    + FORGE_MARK_SIMULATION_RULES.intermediateBossesPerChapter * FORGE_MARK_SIMULATION_RULES.intermediateBossChance
    + FORGE_MARK_SIMULATION_RULES.chapterBossesPerChapter * FORGE_MARK_SIMULATION_RULES.chapterBossChance
  );
  return {
    ...base,
    simulatorVersion: `${base.simulatorVersion}+forge-${TARGETED_EQUIPMENT_SIMULATOR_VERSION}`,
    scenario: 'forge-marks-equipment-progression',
    currentRules: { ...base.currentRules, ...FORGE_MARK_SIMULATION_RULES },
    forgeMarks: {
      expectedMarksPerChapter,
      expectedMeanChaptersPerExchange: FORGE_MARK_SIMULATION_RULES.exchangeCost / expectedMarksPerChapter,
      chaptersToFirstExchange: distribution(chapterValues, maxChapters),
      rewardDistribution: simulateRewardDistribution(hashSeed(seed, samples, 0x51f15e), Math.max(samples * 4, 16_384)),
    },
    warnings: base.warnings.filter(warning => warning.code !== 'targeted_copy_control_missing'),
  };
}

export function renderTargetedEquipmentMarkdown(report) {
  const exchange = report.forgeMarks.chaptersToFirstExchange;
  const category = report.forgeMarks.rewardDistribution.categoryRatios;
  const rarity = report.forgeMarks.rewardDistribution.rarityRatios;
  const warnings = report.warnings.map(warning => `- **${warning.severity.toUpperCase()} · ${warning.code}:** ${warning.message}`).join('\n');
  return `# Dungeon Veil Forge Marks progression\n\n- Scenario: \`${report.scenario}\`\n- Seed: \`${report.seed}\`\n- Samples: ${report.samples}\n- Exchange cost: ${report.currentRules.exchangeCost} Forge Marks\n- Expected marks per 50-room chapter: ${report.forgeMarks.expectedMarksPerChapter.toFixed(3)}\n- Expected mean chapters per exchange: ${report.forgeMarks.expectedMeanChaptersPerExchange.toFixed(2)}\n\n## Chapters to first ten-mark exchange\n\n| P10 | Median | P90 | P99 |\n|---:|---:|---:|---:|\n| ${exchange.p10} | ${exchange.median} | ${exchange.p90} | ${exchange.p99} |\n\n## Simulated reward distribution\n\n- Categories: bow ${(category.bow * 100).toFixed(2)}%, quiver ${(category.quiver * 100).toFixed(2)}%, armor ${(category.armor * 100).toFixed(2)}%\n- Rarities: common ${(rarity.common * 100).toFixed(2)}%, rare ${(rarity.rare * 100).toFixed(2)}%, epic ${(rarity.epic * 100).toFixed(2)}%\n\n## Remaining warnings\n\n${warnings || '- None'}\n`;
}

function parseCli(argv) {
  const options = { seed: DEFAULT_SEED, samples: DEFAULT_SAMPLES, maxChapters: Math.max(DEFAULT_MAX_CHAPTERS, 120), format: 'summary', write: false };
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
      writeFile(path.join(docsDir, 'forge-marks-progression.json'), `${JSON.stringify(report, null, 2)}\n`),
      writeFile(path.join(docsDir, 'forge-marks-progression.md'), markdown),
    ]);
  }
  if (options.format === 'json') console.log(JSON.stringify(report, null, 2));
  else if (options.format === 'markdown') console.log(markdown);
  else {
    console.log(`Forge Marks simulator: ${report.samples} samples × ${report.maxChapters} chapters`);
    console.log('Chapters to first exchange:', report.forgeMarks.chaptersToFirstExchange);
    console.log('Reward category ratios:', report.forgeMarks.rewardDistribution.categoryRatios);
    console.log('Reward rarity ratios:', report.forgeMarks.rewardDistribution.rarityRatios);
    console.log(`Remaining warnings: ${report.warnings.length}`);
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
