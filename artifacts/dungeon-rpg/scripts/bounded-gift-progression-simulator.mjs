#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_MAX_CHAPTERS,
  DEFAULT_SAMPLES,
  DEFAULT_SEED,
  simulateProgression as simulatePublishedBaseline,
} from './progression-simulator.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');

export const BOUNDED_GIFT_SIMULATOR_VERSION = 1;
export const BOUNDED_GIFT_RULES = Object.freeze({
  firstChapterGiftSelections: 11,
  laterChapterGiftSelections: 5,
  finiteBuildSelections: 33,
  hunterBlessingMaxRank: 3,
  vitalSparkMaxRank: 3,
  hunterBlessingAttack: 2,
  vitalSparkHealth: 8,
  veilCacheDust: 30,
  goldCacheGold: 300,
});

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function boundedGiftGrowth(chapter) {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const totalChoices = BOUNDED_GIFT_RULES.firstChapterGiftSelections
    + Math.max(0, safeChapter - 1) * BOUNDED_GIFT_RULES.laterChapterGiftSelections;
  const postBuildChoices = Math.max(0, totalChoices - BOUNDED_GIFT_RULES.finiteBuildSelections);
  const offensiveMasterySelections = Math.min(postBuildChoices, BOUNDED_GIFT_RULES.hunterBlessingMaxRank);
  const defensiveMasterySelections = Math.min(postBuildChoices, BOUNDED_GIFT_RULES.vitalSparkMaxRank);
  const nonPowerChoices = Math.max(0, postBuildChoices - offensiveMasterySelections - defensiveMasterySelections);

  return {
    chapter: safeChapter,
    totalChoices,
    postBuildChoices,
    offensiveMasterySelections,
    defensiveMasterySelections,
    nonPowerChoices,
    offensiveAttack: 10 + 13 + offensiveMasterySelections * BOUNDED_GIFT_RULES.hunterBlessingAttack,
    defensiveMaxHealth: 107 + 75 + defensiveMasterySelections * BOUNDED_GIFT_RULES.vitalSparkHealth,
    guardianCrownAttackMultiplier: round(1.1 ** (5 * safeChapter)),
  };
}

export function simulateBoundedGiftProgression({
  seed = DEFAULT_SEED,
  samples = DEFAULT_SAMPLES,
  maxChapters = DEFAULT_MAX_CHAPTERS,
} = {}) {
  const report = simulatePublishedBaseline({ seed, samples, maxChapters });
  const removedWarnings = new Set(['unbounded_gift_overflow', 'player_growth_outpaces_enemy_attack']);
  return {
    ...report,
    simulatorVersion: `${report.simulatorVersion}+gift-${BOUNDED_GIFT_SIMULATOR_VERSION}`,
    scenario: 'bounded-run-gifts',
    currentRules: {
      ...report.currentRules,
      ...BOUNDED_GIFT_RULES,
    },
    giftGrowth: {
      atChapter1: boundedGiftGrowth(1),
      atChapter2: boundedGiftGrowth(2),
      atChapter5: boundedGiftGrowth(5),
      atChapter10: boundedGiftGrowth(10),
    },
    warnings: report.warnings.filter(warning => !removedWarnings.has(warning.code)),
  };
}

export function renderBoundedGiftMarkdown(report) {
  const warnings = report.warnings
    .map(warning => `- **${warning.severity.toUpperCase()} · ${warning.code}:** ${warning.message}`)
    .join('\n');
  const giftRows = Object.values(report.giftGrowth)
    .map(row => `| ${row.chapter} | ${row.totalChoices} | ${row.postBuildChoices} | ${row.offensiveMasterySelections}/3 | ${row.defensiveMasterySelections}/3 | ${row.nonPowerChoices} | ${row.offensiveAttack} | ${row.defensiveMaxHealth} | ${row.guardianCrownAttackMultiplier}x |`)
    .join('\n');

  return `# Dungeon Veil bounded gift progression\n\nGenerated deterministically from the PR #170 progression baseline.\n\n- Scenario: \`${report.scenario}\`\n- Seed: \`${report.seed}\`\n- Samples: ${report.samples}\n- Simulated chapters per sample: ${report.maxChapters}\n- Chapter 1 gift choices: ${report.currentRules.firstChapterGiftSelections}\n- Later chapter gift choices: ${report.currentRules.laterChapterGiftSelections}\n\n## Remaining warnings\n\n${warnings}\n\n## Gifts across the uninterrupted run\n\n| Chapter | Total choices | Post-build choices | Attack mastery | HP mastery | Non-power choices | Offensive raw attack | Defensive max HP | Guardian Crown multiplier |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${giftRows}\n\nHunter Blessing and Vital Spark stop at mastery rank III. Once both masteries are full, later milestones offer healing or currency instead of permanent combat-stat growth. The Guardian Crown remains intentionally visible as a separate unresolved relic risk.\n`;
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
  const report = simulateBoundedGiftProgression(options);
  const markdown = renderBoundedGiftMarkdown(report);

  if (options.write) {
    const docsDir = path.join(PROJECT_ROOT, 'docs');
    await mkdir(docsDir, { recursive: true });
    await Promise.all([
      writeFile(path.join(docsDir, 'bounded-gift-progression.json'), `${JSON.stringify(report, null, 2)}\n`),
      writeFile(path.join(docsDir, 'bounded-gift-progression.md'), markdown),
    ]);
  }

  if (options.format === 'json') console.log(JSON.stringify(report, null, 2));
  else if (options.format === 'markdown') console.log(markdown);
  else {
    console.log(`Bounded gift simulator: ${report.samples} samples × ${report.maxChapters} chapters`);
    console.log(`Remaining warnings: ${report.warnings.length}`);
    console.log('Chapter 10 gift reference:', report.giftGrowth.atChapter10);
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
