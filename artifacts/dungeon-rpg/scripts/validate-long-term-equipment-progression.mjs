import { readFile } from 'node:fs/promises';
import { simulateLongTermEquipmentProgression } from './long-term-equipment-progression-simulator.mjs';

const [gates, rankCurve, rewards, chamber, duplicateEconomy, worldLoot, upgradeEconomy] = await Promise.all([
  readFile(new URL('../src/game/equipmentChapterGates.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/rankProgression.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/chapterRewardContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/VeilChamberScreen.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentDuplicateEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentWorldLoot.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
]);

const report = simulateLongTermEquipmentProgression();
const ranks = report.chapterResults.map(result => result.rank);
const unlockCounts = report.chapterResults.map(result => result.newUnlocks);
const cumulative = report.chapterResults.map(result => result.cumulativeUnlocks);

const checks = [
  [report.scenario === 'long-term-equipment-progression', 'long-term simulator scenario is missing'],
  [report.totalEquipment === 26, 'long-term unlock table does not contain all 26 equipment items'],
  [report.allEquipmentUnlockedChapter === 8, 'last equipment unlock is not placed in chapter 8'],
  [JSON.stringify(unlockCounts) === JSON.stringify([5, 4, 4, 4, 3, 3, 2, 1]), 'chapter unlock distribution left the 5/4/4/4/3/3/2/1 contract'],
  [JSON.stringify(cumulative) === JSON.stringify([5, 9, 13, 17, 20, 23, 25, 26]), 'cumulative equipment discovery curve is inconsistent'],
  [JSON.stringify(ranks.slice(0, 4)) === JSON.stringify([4, 6, 8, 10]), 'rank curve no longer reaches ranks 4/6/8/10 after chapters 1-4'],
  [rankCurve.includes('VEIL_RANK_XP_BASE = 1500') && rankCurve.includes('VEIL_RANK_XP_STEP = 350'), 'active rank curve is not 1500 base plus 350 per rank'],
  [rewards.includes('xpForNextVeilRank(meta.rank)') && !rewards.includes('xpForNextRank(meta.rank)'), 'chapter rewards do not use the long-term rank curve'],
  [chamber.includes('xpForNextVeilRank(meta.rank)'), 'inventory XP bar does not show the active long-term rank requirement'],
  [gates.includes("'veil-eye': 8") && gates.includes("'veil-bow': 7") && gates.includes("'depth-armor': 6"), 'late equipment gates are not distributed through chapters 6-8'],
  [duplicateEconomy.includes('common: 60') && duplicateEconomy.includes('rare: 90') && duplicateEconomy.includes('epic: 140'), 'max-level duplicate dust values are not 60/90/140'],
  [duplicateEconomy.includes('existing?.level === 5') && duplicateEconomy.includes('converted: true'), 'max-level duplicate drops are not converted immediately'],
  [worldLoot.includes('collectBalancedEquipmentDrop') && worldLoot.includes('STAUB +${result.dustAwarded}'), 'world loot does not use or display max-level duplicate conversion'],
  [upgradeEconomy.includes('convertMaxLevelCopies(meta, id)'), 'surplus copies are not recycled when an item reaches level five'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Long-term equipment progression audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`Long-term equipment progression audit passed: rank ${ranks[0]}/${ranks[1]}/${ranks[2]}/${ranks[3]} after chapters 1-4, all 26 items by chapter 8.`);
