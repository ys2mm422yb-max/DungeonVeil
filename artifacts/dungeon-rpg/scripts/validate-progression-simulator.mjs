import { readFile } from 'node:fs/promises';
import { simulateProgression } from './progression-simulator.mjs';

const [meta, economy, baselineRaw] = await Promise.all([
  readFile(new URL('../src/game/metaProgression.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../docs/progression-baseline.json', import.meta.url), 'utf8'),
]);

const baseline = JSON.parse(baselineRaw);
const report = simulateProgression({ seed: 0x5eed169, samples: 256, maxChapters: 120 });
const warningCodes = new Set(report.warnings.map(warning => warning.code));

const checks = [
  [!meta.includes('const UPGRADE_COSTS'), 'legacy upgrade cost table still exists in metaProgression.ts'],
  [!meta.includes('function equipmentUpgradeCost') && !meta.includes('function upgradeMetaItem'), 'legacy upgrade functions still exist in metaProgression.ts'],
  [!meta.includes('type EquipmentUpgradeCost'), 'legacy upgrade cost type still exists in metaProgression.ts'],
  [economy.includes('export type BalancedEquipmentUpgradeCost = { gold: number; copies: number; dust: number };'), 'the active three-resource cost type is not owned by equipmentUpgradeEconomy.ts'],
  [baseline.baselineCommit === '68508484353162e987e20ade64bb259845250e1b', 'committed baseline does not identify the published PR #169 merge commit'],
  [baseline.samples === 2048 && baseline.maxChapters === 160, 'committed baseline was not generated with the agreed full sample size'],
  [report.roomRewardTotals[0].xp === 6020 && report.roomRewardTotals[0].dust === 1480 && report.roomRewardTotals[0].gold === 24770, 'chapter-one static room rewards changed without updating the simulator contract'],
  [report.sourceAttemptsPerChapter.steadyState.forge > 0.45 && report.sourceAttemptsPerChapter.steadyState.forge < 0.65, 'forge attempt rate left the expected current-baseline range'],
  [report.sourceAttemptsPerChapter.steadyState.ritual > 0.45 && report.sourceAttemptsPerChapter.steadyState.ritual < 0.65, 'ritual attempt rate left the expected current-baseline range'],
  [report.sourceAttemptsPerChapter.steadyState.warden > 5.1 && report.sourceAttemptsPerChapter.steadyState.warden < 5.6, 'warden attempt rate left the expected current-baseline range'],
  [report.sourceAttemptsPerChapter.steadyState.depth > 6.0 && report.sourceAttemptsPerChapter.steadyState.depth < 6.6, 'depth attempt rate left the expected current-baseline range'],
  [report.sourceAttemptsPerChapter.steadyState.hunt > 3.5 && report.sourceAttemptsPerChapter.steadyState.hunt < 4.2, 'hunt attempt rate left the expected current-baseline range'],
  [warningCodes.has('starter_copies_impossible'), 'simulator no longer detects impossible starter upgrades'],
  [warningCodes.has('equipment_source_skew'), 'simulator no longer detects equipment source skew'],
  [warningCodes.has('early_guaranteed_drops_have_empty_pools'), 'simulator no longer detects empty early source pools'],
  [warningCodes.has('unbounded_gift_overflow'), 'simulator no longer detects uncapped repeatable gifts'],
  [warningCodes.has('room20_is_special_reward_boss'), 'simulator no longer detects the room-20 reward asymmetry'],
  [warningCodes.has('guardian_crown_unbounded'), 'simulator no longer detects uncapped Guardian Crown growth'],
  [warningCodes.has('relic_source_skew'), 'simulator no longer detects relic source skew'],
  [warningCodes.has('player_growth_outpaces_enemy_attack'), 'simulator no longer detects long-run player growth outpacing the enemy curve'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Progression simulator audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Progression simulator audit passed: ${report.warnings.length} current baseline risks remain visible and the legacy upgrade path is absent.`);
