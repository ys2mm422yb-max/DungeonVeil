import { readFile } from 'node:fs/promises';
import { simulateBalancedEquipmentSources } from './balanced-equipment-source-simulator.mjs';

const [meta, economy, dropContract, rewardContract, worldLoot, baselineRaw] = await Promise.all([
  readFile(new URL('../src/game/metaProgression.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentDropContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/chapterRewardContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentWorldLoot.ts', import.meta.url), 'utf8'),
  readFile(new URL('../docs/progression-baseline.json', import.meta.url), 'utf8'),
]);

const publishedBaseline = JSON.parse(baselineRaw);
const report = simulateBalancedEquipmentSources({ seed: 0x5eed169, samples: 256, maxChapters: 120 });
const warningCodes = new Set(report.warnings.map(warning => warning.code));
const starterRows = Object.values(report.equipmentSources.starterCopiesForLevel5);

const checks = [
  [!meta.includes('const UPGRADE_COSTS'), 'legacy upgrade cost table still exists in metaProgression.ts'],
  [!meta.includes('function equipmentUpgradeCost') && !meta.includes('function upgradeMetaItem'), 'legacy upgrade functions still exist in metaProgression.ts'],
  [!meta.includes('type EquipmentUpgradeCost'), 'legacy upgrade cost type still exists in metaProgression.ts'],
  [economy.includes('export type BalancedEquipmentUpgradeCost = { gold: number; copies: number; dust: number };'), 'the active three-resource cost type is not owned by equipmentUpgradeEconomy.ts'],
  [publishedBaseline.baselineCommit === '68508484353162e987e20ade64bb259845250e1b', 'published baseline does not identify the PR #169 merge commit'],
  [publishedBaseline.scenario === 'chapter-50-reward-contract' && publishedBaseline.currentRules.chapterBossRewardRoom === 50, 'published pre-gift baseline no longer models room 50 as chapter reward boss'],
  [report.scenario === 'balanced-equipment-sources', 'live simulator does not use the balanced source scenario'],
  [report.currentRules.firstChapterGiftSelections === 11 && report.currentRules.laterChapterGiftSelections === 5, 'simulator lost the bounded 11/5 gift schedule'],
  [report.currentRules.hunterBlessingMaxRank === 3 && report.currentRules.vitalSparkMaxRank === 3, 'mastery caps are not represented in the simulator'],
  [report.currentRules.normalRoomEquipmentChance === 0, 'normal rooms still generate random equipment attempts'],
  [report.currentRules.huntEquipmentChance === 0.18, 'hunt equipment chance is not reduced to 18%'],
  [JSON.stringify(report.currentRules.guaranteedBossEquipmentRooms) === JSON.stringify([10, 20, 30, 40, 50]), 'the five boss rooms are not guaranteed equipment milestones'],
  [dropContract.includes('export const HUNT_EQUIPMENT_DROP_CHANCE = 0.18;'), 'runtime hunt equipment chance differs from the simulator'],
  [dropContract.includes("if (safeFloor === 20) return safeChapter >= 4 ? 'ritual' : 'hunt';"), 'early room-20 rewards do not avoid the empty ritual pool'],
  [dropContract.includes("if (safeFloor === 30) return safeChapter >= 3 ? 'warden' : 'depth';"), 'early room-30 rewards do not avoid the empty warden pool'],
  [dropContract.includes('if (source && item.dropSource !== source) return false;') && !dropContract.includes('isStarterItem'), 'starter items are still excluded from the active drop pool'],
  [dropContract.includes('(meta.owned[item.id]?.level ?? 0) < 5'), 'fully upgraded equipment is not excluded from active drop pools'],
  [rewardContract.includes('rollBossEquipmentReward(safeChapter, safeFloor)') && !rewardContract.includes('safeFloor >= 3 && Math.random() < 0.18'), 'active room rewards still use the old normal-room equipment chance'],
  [worldLoot.includes('rollHuntEquipmentReward(engine.state.chapter)') && !worldLoot.includes("rollMetaEquipmentDrop('hunt', 0.32)"), 'hunt targets still use the old 32% drop path'],
  [report.roomRewardTotals[0].xp === 6020 && report.roomRewardTotals[0].dust === 1480 && report.roomRewardTotals[0].gold === 24770, 'chapter-one currency rewards changed without updating the simulator contract'],
  [report.equipmentSources.dropsPerChapter.chapter1.median >= 6.5 && report.equipmentSources.dropsPerChapter.chapter1.median <= 8, 'chapter-one equipment volume is outside the 6.5-8 target range'],
  [report.equipmentSources.dropsPerChapter.steadyStateMean >= 6.5 && report.equipmentSources.dropsPerChapter.steadyStateMean <= 8, 'steady-state equipment volume is outside the 6.5-8 target range'],
  [report.equipmentSources.sourceSkew < 3, 'equipment sources remain more than threefold imbalanced'],
  [report.equipmentSources.emptyGuaranteedAttempts === 0, 'at least one guaranteed boss reward still has an empty eligible pool'],
  [starterRows.every(row => typeof row.median === 'number'), 'one or more starter items still cannot earn eleven copies'],
  [!warningCodes.has('starter_copies_impossible'), 'simulator still reports impossible starter upgrades'],
  [!warningCodes.has('equipment_source_skew'), 'simulator still reports the old source skew'],
  [!warningCodes.has('early_guaranteed_drops_have_empty_pools'), 'simulator still reports empty early source pools'],
  [warningCodes.has('targeted_copy_control_missing'), 'simulator does not preserve the remaining need for wish items and source marks'],
  [!warningCodes.has('unbounded_gift_overflow') && !warningCodes.has('player_growth_outpaces_enemy_attack'), 'bounded gifts regressed while balancing equipment sources'],
  [!warningCodes.has('room20_is_special_reward_boss'), 'room-50 reward ownership regressed while balancing equipment sources'],
  [warningCodes.has('guardian_crown_unbounded'), 'simulator no longer detects uncapped Guardian Crown growth'],
  [warningCodes.has('relic_source_skew'), 'simulator no longer detects relic source skew'],
  [report.giftGrowth.atChapter10.offensiveAttack === 29 && report.giftGrowth.atChapter10.defensiveMaxHealth === 206, 'capped mastery reference values changed during the equipment rebalance'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Progression simulator audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Progression simulator audit passed: equipment averages ${report.equipmentSources.dropsPerChapter.steadyStateMean} drops per chapter at ${report.equipmentSources.sourceSkew}x source skew, with ${report.warnings.length} remaining targeted/relic risks.`);
