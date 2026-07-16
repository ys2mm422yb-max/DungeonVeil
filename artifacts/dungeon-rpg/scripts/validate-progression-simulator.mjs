import { readFile } from 'node:fs/promises';
import { simulateBoundedGiftProgression } from './bounded-gift-progression-simulator.mjs';

const [meta, economy, baselineRaw] = await Promise.all([
  readFile(new URL('../src/game/metaProgression.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../docs/progression-baseline.json', import.meta.url), 'utf8'),
]);

const publishedBaseline = JSON.parse(baselineRaw);
const report = simulateBoundedGiftProgression({ seed: 0x5eed169, samples: 256, maxChapters: 120 });
const warningCodes = new Set(report.warnings.map(warning => warning.code));
const resolvedWarningCodes = [
  'unbounded_gift_overflow',
  'player_growth_outpaces_enemy_attack',
  'room20_is_special_reward_boss',
  'starter_copies_impossible',
  'equipment_source_skew',
  'early_guaranteed_drops_have_empty_pools',
  'guardian_crown_unbounded',
  'relic_source_skew',
];

const checks = [
  [!meta.includes('const UPGRADE_COSTS'), 'legacy upgrade cost table still exists in metaProgression.ts'],
  [!meta.includes('function equipmentUpgradeCost') && !meta.includes('function upgradeMetaItem'), 'legacy upgrade functions still exist in metaProgression.ts'],
  [!meta.includes('type EquipmentUpgradeCost'), 'legacy upgrade cost type still exists in metaProgression.ts'],
  [economy.includes('export type BalancedEquipmentUpgradeCost = { gold: number; copies: number; dust: number };'), 'the active three-resource cost type is not owned by equipmentUpgradeEconomy.ts'],
  [publishedBaseline.baselineCommit === '68508484353162e987e20ade64bb259845250e1b', 'published baseline does not identify the PR #169 merge commit'],
  [publishedBaseline.scenario === 'chapter-50-reward-contract' && publishedBaseline.currentRules.chapterBossRewardRoom === 50, 'published pre-balance baseline no longer models room 50 as chapter reward boss'],
  [report.scenario === 'bounded-run-gifts', 'live simulator does not use the bounded progression scenario'],
  [report.currentRules.firstChapterGiftSelections === 11 && report.currentRules.laterChapterGiftSelections === 5, 'simulator does not model the bounded 11/5 gift schedule'],
  [report.currentRules.hunterBlessingMaxRank === 3 && report.currentRules.vitalSparkMaxRank === 3, 'mastery caps are not represented in the simulator'],
  [report.currentRules.guardianCrownPercentPerBoss === 0.04 && report.currentRules.guardianCrownMaxStacks === 5, 'bounded Guardian Crown rules are missing from the simulator'],
  [report.roomRewardTotals[0].xp === 6020 && report.roomRewardTotals[0].dust === 1480 && report.roomRewardTotals[0].gold === 24770, 'chapter-one static room rewards changed without updating the simulator contract'],
  [resolvedWarningCodes.every(code => !warningCodes.has(code)), 'a completed balance risk still appears as unresolved in the simulator'],
  [report.warnings.length === 0, 'the completed balance baseline still reports unresolved warnings'],
  [report.giftGrowth.atChapter10.offensiveAttack === 29 && report.giftGrowth.atChapter10.defensiveMaxHealth === 206, 'capped mastery stats do not stop at the intended reference values'],
  [report.giftGrowth.atChapter10.offensiveMasterySelections === 3 && report.giftGrowth.atChapter10.defensiveMasterySelections === 3, 'chapter-ten mastery ranks are not capped at III'],
  [report.giftGrowth.atChapter10.nonPowerChoices > 0, 'late milestones do not transition to healing or currency choices'],
  [report.giftGrowth.atChapter1.guardianCrownStacks === 5 && report.giftGrowth.atChapter10.guardianCrownStacks === 5, 'Guardian Crown does not stop at five stacks within the first chapter'],
  [report.giftGrowth.atChapter1.guardianCrownAttackMultiplier === 1.2 && report.giftGrowth.atChapter10.guardianCrownAttackMultiplier === 1.2, 'Guardian Crown exceeds or misses its 20% run ceiling'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Progression simulator audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Progression simulator audit passed: legacy upgrades are gone and all eight original progression risks have bounded, audited replacements.');
