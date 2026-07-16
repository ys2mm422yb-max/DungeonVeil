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

const checks = [
  [!meta.includes('const UPGRADE_COSTS'), 'legacy upgrade cost table still exists in metaProgression.ts'],
  [!meta.includes('function equipmentUpgradeCost') && !meta.includes('function upgradeMetaItem'), 'legacy upgrade functions still exist in metaProgression.ts'],
  [!meta.includes('type EquipmentUpgradeCost'), 'legacy upgrade cost type still exists in metaProgression.ts'],
  [economy.includes('export type BalancedEquipmentUpgradeCost = { gold: number; copies: number; dust: number };'), 'the active three-resource cost type is not owned by equipmentUpgradeEconomy.ts'],
  [publishedBaseline.baselineCommit === '68508484353162e987e20ade64bb259845250e1b', 'published baseline does not identify the PR #169 merge commit'],
  [publishedBaseline.scenario === 'chapter-50-reward-contract' && publishedBaseline.currentRules.chapterBossRewardRoom === 50, 'published pre-gift baseline no longer models room 50 as chapter reward boss'],
  [report.scenario === 'bounded-run-gifts', 'live simulator does not use the bounded gift scenario'],
  [report.currentRules.firstChapterGiftSelections === 11 && report.currentRules.laterChapterGiftSelections === 5, 'simulator does not model the bounded 11/5 gift schedule'],
  [report.currentRules.hunterBlessingMaxRank === 3 && report.currentRules.vitalSparkMaxRank === 3, 'mastery caps are not represented in the simulator'],
  [report.roomRewardTotals[0].xp === 6020 && report.roomRewardTotals[0].dust === 1480 && report.roomRewardTotals[0].gold === 24770, 'chapter-one static room rewards changed without updating the simulator contract'],
  [report.sourceAttemptsPerChapter.steadyState.forge > 0.45 && report.sourceAttemptsPerChapter.steadyState.forge < 0.65, 'forge attempt rate left the expected current-baseline range'],
  [report.sourceAttemptsPerChapter.steadyState.ritual > 0.45 && report.sourceAttemptsPerChapter.steadyState.ritual < 0.65, 'ritual attempt rate left the expected current-baseline range'],
  [report.sourceAttemptsPerChapter.steadyState.warden > 5.1 && report.sourceAttemptsPerChapter.steadyState.warden < 5.6, 'warden attempt rate left the expected current-baseline range'],
  [report.sourceAttemptsPerChapter.steadyState.depth > 6.0 && report.sourceAttemptsPerChapter.steadyState.depth < 6.6, 'depth attempt rate left the expected current-baseline range'],
  [report.sourceAttemptsPerChapter.steadyState.hunt > 3.5 && report.sourceAttemptsPerChapter.steadyState.hunt < 4.2, 'hunt attempt rate left the expected current-baseline range'],
  [warningCodes.has('starter_copies_impossible'), 'simulator no longer detects impossible starter upgrades'],
  [warningCodes.has('equipment_source_skew'), 'simulator no longer detects equipment source skew'],
  [warningCodes.has('early_guaranteed_drops_have_empty_pools'), 'simulator no longer detects empty early source pools'],
  [!warningCodes.has('unbounded_gift_overflow'), 'simulator still reports removed uncapped repeatable gifts'],
  [!warningCodes.has('player_growth_outpaces_enemy_attack'), 'simulator still reports capped gift stats as outpacing the enemy curve'],
  [!warningCodes.has('room20_is_special_reward_boss'), 'simulator still reports the corrected room-20 reward asymmetry'],
  [warningCodes.has('guardian_crown_unbounded'), 'simulator no longer detects uncapped Guardian Crown growth'],
  [warningCodes.has('relic_source_skew'), 'simulator no longer detects relic source skew'],
  [report.giftGrowth.atChapter10.offensiveAttack === 29 && report.giftGrowth.atChapter10.defensiveMaxHealth === 206, 'capped mastery stats do not stop at the intended reference values'],
  [report.giftGrowth.atChapter10.offensiveMasterySelections === 3 && report.giftGrowth.atChapter10.defensiveMasterySelections === 3, 'chapter-ten mastery ranks are not capped at III'],
  [report.giftGrowth.atChapter10.nonPowerChoices > 0, 'late milestones do not transition to healing or currency choices'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Progression simulator audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Progression simulator audit passed: bounded gifts remove two infinite-growth risks while ${report.warnings.length} unrelated baseline risks remain visible.`);
