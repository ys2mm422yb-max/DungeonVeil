import { readFile } from 'node:fs/promises';
import { simulateEquipmentDropBalance } from './equipment-drop-balance-simulator.mjs';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [rules, roller, contract, worldLoot, meta] = await Promise.all([
  read('../src/game/equipmentDropBalance.ts'),
  read('../src/game/equipmentDropRoller.ts'),
  read('../src/game/chapterRewardContract.ts'),
  read('../src/game/equipmentWorldLoot.ts'),
  read('../src/game/metaProgression.ts'),
]);
const report = simulateEquipmentDropBalance({ seed: 0x5eed169, samples: 256, maxChapters: 120 });
const warningCodes = new Set(report.warnings.map(warning => warning.code));

const checks = [
  [rules.includes('NORMAL_ROOM_EQUIPMENT_CHANCE = 0.03') && rules.includes('HUNT_EQUIPMENT_CHANCE = 0.12'), 'normal-room or hunt equipment rates left the balanced contract'],
  [rules.includes("safeFloor === 10) return { chance: 1, sources: fallbackOrder('forge')") && rules.includes("safeFloor === 20) return { chance: 1, sources: fallbackOrder('ritual')"), 'rooms 10 and 20 do not own forge and ritual primary sources'],
  [rules.includes("safeFloor === 30) return { chance: 1, sources: fallbackOrder('warden')") && rules.includes("safeFloor === 40) return { chance: 1, sources: fallbackOrder('depth')"), 'rooms 30 and 40 do not own warden and depth primary sources'],
  [rules.includes("safeFloor === 50) return { chance: 1, sources: BALANCED_NON_HUNT_SOURCES, mode: 'wildcard'"), 'room 50 is not a guaranteed non-hunt wildcard drop'],
  [rules.includes("safeFloor < 3 || isBossRoom(safeFloor)") && rules.includes('chance: NORMAL_ROOM_EQUIPMENT_CHANCE'), 'normal room drops can leak into opening or boss rooms'],
  [roller.includes('item.dropSource === source') && roller.includes('item.unlockRank <= meta.rank') && roller.includes('equipmentUnlockedForCurrentProgress(item.id)'), 'balanced roller ignores source, rank or chapter unlocks'],
  [!roller.includes('isStarterItem') && !roller.includes('!item.starter') && !roller.includes('!isStarter'), 'balanced roller still excludes starter copies'],
  [roller.includes('const unowned = pool.filter') && roller.includes('const candidates = unowned.length ? unowned : pool'), 'balanced roller no longer prioritizes unowned items'],
  [roller.includes("rule.mode === 'wildcard'") && roller.includes('choosePrimaryWithFallback'), 'wildcard and primary-fallback modes are not separated'],
  [contract.includes('rollBalancedEquipmentDrop(equipmentDropRuleForRoom(safeFloor))') && !contract.includes('rollMetaEquipmentDrop'), 'active room rewards still use the legacy equipment roller'],
  [worldLoot.includes("rollBalancedSourceDrop('hunt', HUNT_EQUIPMENT_CHANCE)") && !worldLoot.includes('rollMetaEquipmentDrop'), 'active hunt rewards still use the legacy equipment roller'],
  [meta.includes("function isStarterItem") && meta.includes('function availableDrops'), 'legacy drop helpers unexpectedly disappeared instead of remaining isolated for migration safety'],
  [report.scenario === 'balanced-equipment-drop-sources', 'equipment simulator is not using the balanced scenario'],
  [report.currentRules.starterItemsIncluded === true && report.currentRules.primarySourceFallback === true, 'simulator does not model starter copies and early source fallback'],
  [report.equipmentDropsPerChapter.expectedTotal >= 7 && report.equipmentDropsPerChapter.expectedTotal <= 8, 'expected equipment volume left the 7-8 drops per chapter band'],
  [report.balancedSourceAwardRatio <= 1.15, 'steady-state source awards differ by more than 15%'],
  [!warningCodes.has('starter_copies_impossible'), 'starter-copy impossibility warning remains after activating starter-safe drops'],
  [!warningCodes.has('equipment_source_skew'), 'equipment source skew warning remains after source balancing'],
  [!warningCodes.has('early_guaranteed_drops_have_empty_pools'), 'early guaranteed drop warning remains despite primary-source fallback'],
  [warningCodes.has('targeted_copy_control_missing'), 'simulator no longer keeps wishlist and pity work visible for the next block'],
  [warningCodes.has('guardian_crown_unbounded') && warningCodes.has('relic_source_skew'), 'unrelated relic risks were accidentally hidden'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Equipment drop balance audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Equipment drop balance audit passed: ${report.equipmentDropsPerChapter.expectedTotal} expected drops per chapter with a ${report.balancedSourceAwardRatio}x steady-state source spread and starter copies enabled.`);
