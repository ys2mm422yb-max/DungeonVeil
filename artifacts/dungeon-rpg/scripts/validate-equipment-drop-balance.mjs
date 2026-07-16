import { readFile } from 'node:fs/promises';
import { simulateEquipmentDropBalance } from './equipment-drop-balance-simulator.mjs';

const [dropBalance, rewardContract, worldLoot] = await Promise.all([
  readFile(new URL('../src/game/equipmentDropBalance.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/chapterRewardContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentWorldLoot.ts', import.meta.url), 'utf8'),
]);

const report = simulateEquipmentDropBalance({ seed: 0x173d0f, samples: 20000 });
const sourceAwards = Object.values(report.sourceAwardsPerChapter);

const checks = [
  [dropBalance.includes('export const NORMAL_ROOM_EQUIPMENT_CHANCE = 0.03;'), 'normal-room equipment chance is not fixed at 3%'],
  [dropBalance.includes('export const HUNT_EQUIPMENT_CHANCE = 0.12;'), 'hunt equipment chance is not fixed at 12%'],
  [dropBalance.includes("10: 'forge'") && dropBalance.includes("20: 'ritual'") && dropBalance.includes("30: 'warden'") && dropBalance.includes("40: 'depth'"), 'boss rooms do not cover forge, ritual, warden and depth exactly once'],
  [dropBalance.includes("'ash-bow'") && dropBalance.includes("'ranger-quiver'") && dropBalance.includes("'veil-key'") && dropBalance.includes("'ranger-cloak'"), 'starter equipment is not present in the fallback copy pool'],
  [dropBalance.includes('requested.length ? requested : starterFallbackPool(meta)'), 'empty early source pools do not fall back to starter copies'],
  [rewardContract.includes('rollBalancedRoomEquipmentDrop(safeFloor)') && !rewardContract.includes('Math.random() < 0.18'), 'room rewards still use the old 18% equipment lottery'],
  [worldLoot.includes('rollBalancedHuntEquipmentDrop()') && !worldLoot.includes("rollMetaEquipmentDrop('hunt', 0.32)"), 'hunt rewards still use the old 32% equipment roll'],
  [report.scenario === 'fair-equipment-drop-sources', 'equipment simulator is not running the fair-source scenario'],
  [report.guaranteedBossDropsPerChapter === 5, 'a complete chapter does not guarantee exactly five boss equipment awards'],
  [report.dropsPerChapter.mean >= 7.5 && report.dropsPerChapter.mean <= 8.0, 'mean equipment awards left the 7.5-8.0 target corridor'],
  [report.dropsPerChapter.median === 8 && report.dropsPerChapter.p90 <= 10, 'equipment award spread is outside the intended median/p90 corridor'],
  [report.sourceAwardRatio <= 1.2 && Math.min(...sourceAwards) >= 1.35, 'equipment sources are still materially skewed'],
  [report.starterCopiesPossible && report.firstChapterStarterFallbacksPerChapter >= 2.4, 'starter upgrades are not reliably reachable in chapter one'],
  [report.emptyAwardRate === 0, 'a guaranteed equipment award can still resolve empty'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Equipment drop balance audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`Equipment drop balance audit passed: ${report.guaranteedBossDropsPerChapter} guaranteed boss awards, ${report.dropsPerChapter.mean} mean awards, source ratio ${report.sourceAwardRatio}.`);
