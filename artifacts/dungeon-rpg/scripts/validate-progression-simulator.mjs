import { readFile } from 'node:fs/promises';
import { simulateTargetedEquipmentProgression } from './targeted-equipment-progression-simulator.mjs';

const [meta, economy, targeting, dropContract, rewardContract, worldLoot, inventory, cloud, baselineRaw] = await Promise.all([
  readFile(new URL('../src/game/metaProgression.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentTargeting.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentDropContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/chapterRewardContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentWorldLoot.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/VeilChamberScreen.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/persistentSaveBundle.ts', import.meta.url), 'utf8'),
  readFile(new URL('../docs/progression-baseline.json', import.meta.url), 'utf8'),
]);

const publishedBaseline = JSON.parse(baselineRaw);
const report = simulateTargetedEquipmentProgression({ seed: 0x5eed169, samples: 256, maxChapters: 120 });
const warningCodes = new Set(report.warnings.map(warning => warning.code));
const starterRows = Object.values(report.equipmentSources.starterCopiesForLevel5);
const targetRows = Object.values(report.targetedEquipment).map(entry => entry.eligibleChaptersToLevelFiveCopies);

const checks = [
  [!meta.includes('const UPGRADE_COSTS'), 'legacy upgrade cost table still exists in metaProgression.ts'],
  [!meta.includes('function equipmentUpgradeCost') && !meta.includes('function upgradeMetaItem'), 'legacy upgrade functions still exist in metaProgression.ts'],
  [!meta.includes('type EquipmentUpgradeCost'), 'legacy upgrade cost type still exists in metaProgression.ts'],
  [economy.includes('export type BalancedEquipmentUpgradeCost = { gold: number; copies: number; dust: number };'), 'the active three-resource cost type is not owned by equipmentUpgradeEconomy.ts'],
  [economy.includes('clearEquipmentWishItemIfMatches(id)') && economy.includes('progress.level >= 5'), 'a completed level-five wish item is not cleared automatically'],
  [publishedBaseline.baselineCommit === '68508484353162e987e20ade64bb259845250e1b', 'published baseline does not identify the PR #169 merge commit'],
  [publishedBaseline.scenario === 'chapter-50-reward-contract' && publishedBaseline.currentRules.chapterBossRewardRoom === 50, 'published pre-gift baseline no longer models room 50 as chapter reward boss'],
  [report.scenario === 'targeted-equipment-progression', 'live simulator does not use the targeted equipment scenario'],
  [report.currentRules.firstChapterGiftSelections === 11 && report.currentRules.laterChapterGiftSelections === 5, 'simulator lost the bounded 11/5 gift schedule'],
  [report.currentRules.hunterBlessingMaxRank === 3 && report.currentRules.vitalSparkMaxRank === 3, 'mastery caps are not represented in the simulator'],
  [report.currentRules.normalRoomEquipmentChance === 0, 'normal rooms still generate random equipment attempts'],
  [report.currentRules.huntEquipmentChance === 0.18, 'hunt equipment chance is not reduced to 18%'],
  [JSON.stringify(report.currentRules.guaranteedBossEquipmentRooms) === JSON.stringify([10, 20, 30, 40, 50]), 'the five boss rooms are not guaranteed equipment milestones'],
  [report.currentRules.sourceMarkCost === 3, 'source mark crafting does not cost three marks'],
  [report.currentRules.sourceWishChance === 0.35 && report.currentRules.chapterWishChance === 0.5, 'source or room-50 wish chance differs from the approved curve'],
  [report.currentRules.wishPityMisses === 2, 'wish pity does not guarantee the next reward after two misses'],
  [targeting.includes("const TARGETING_KEY = 'dungeon-veil-equipment-targeting-v1';"), 'targeting profile does not use its isolated persistent key'],
  [targeting.includes('export const EQUIPMENT_SOURCE_MARK_COST = 3;') && targeting.includes('export const SOURCE_WISH_CHANCE = 0.35;') && targeting.includes('export const CHAPTER_WISH_CHANCE = 0.5;'), 'runtime targeting constants differ from the simulator'],
  [targeting.includes('huntMarkLedger: string[];') && targeting.includes('huntWishLedger: string[];'), 'hunt mark or one-per-chapter wish ledger is missing'],
  [targeting.includes('profile.sourceMarks[source] -= EQUIPMENT_SOURCE_MARK_COST') && targeting.includes('collectMetaEquipmentDrop(id)'), 'three source marks do not craft the selected item or copy'],
  [targeting.includes('equipmentCanBeTargeted(id, meta)') && targeting.includes('level < 5'), 'locked or completed equipment can still be targeted'],
  [dropContract.includes('export const HUNT_EQUIPMENT_DROP_CHANCE = 0.18;'), 'runtime hunt equipment chance differs from the simulator'],
  [dropContract.includes("if (safeFloor === 20) return safeChapter >= 4 ? 'ritual' : 'hunt';"), 'early room-20 rewards do not avoid the empty ritual pool'],
  [dropContract.includes("if (safeFloor === 30) return safeChapter >= 3 ? 'warden' : 'depth';"), 'early room-30 rewards do not avoid the empty warden pool'],
  [dropContract.includes('profile.sourceMarks[source] += 1;'), 'source-specific boss rewards do not grant source marks'],
  [dropContract.includes('misses >= WISH_PITY_MISSES') && dropContract.includes('receivedWish ? 0 : misses + 1'), 'matching misses do not advance and reset pity correctly'],
  [dropContract.includes("`${runId}:${safeChapter}:hunt-wish`") && dropContract.includes('!profile.huntWishLedger.includes(wishKey)'), 'hunt wish pity can trigger more than once per chapter'],
  [dropContract.includes('if (source && item.dropSource !== source) return false;') && !dropContract.includes('isStarterItem'), 'starter items are still excluded from the active drop pool'],
  [dropContract.includes('(meta.owned[item.id]?.level ?? 0) < 5'), 'fully upgraded equipment is not excluded from active drop pools'],
  [rewardContract.includes('rollBossEquipmentReward(safeChapter, safeFloor)') && !rewardContract.includes('safeFloor >= 3 && Math.random() < 0.18'), 'active room rewards still use the old normal-room equipment chance'],
  [worldLoot.includes('grantHuntEquipmentSourceMark(engine.state.chapter)') && worldLoot.includes('rollHuntEquipmentReward(engine.state.chapter)'), 'hunt targets do not grant their chapter mark and targeted equipment roll'],
  [inventory.includes('data-testid="equipment-wish-item"') && inventory.includes('data-testid="equipment-craft-copy"') && inventory.includes('data-testid="equipment-source-marks"'), 'inventory does not expose wish, craft and source-mark controls'],
  [inventory.includes('setEquipmentWishItem') && inventory.includes('craftEquipmentCopy') && inventory.includes('equipmentCanBeTargeted'), 'inventory controls are not wired to the targeting profile'],
  [inventory.includes("'dungeon-veil-cloud-save-restored'") && inventory.includes("'dungeon-veil-equipment-targeting-changed'"), 'inventory does not refresh after cloud restore or targeting changes'],
  [cloud.includes("'dungeon-veil-equipment-targeting-v1'"), 'targeting progress is missing from cloud bundles'],
  [cloud.includes('sourceMarkWeight(targeting.sourceMarks)') && cloud.includes("typeof targeting.wishItem === 'string'"), 'cloud conflict weighting ignores marks or the active wish item'],
  [report.roomRewardTotals[0].xp === 6020 && report.roomRewardTotals[0].dust === 1480 && report.roomRewardTotals[0].gold === 24770, 'chapter-one currency rewards changed without updating the simulator contract'],
  [report.equipmentSources.dropsPerChapter.chapter1.median >= 6.5 && report.equipmentSources.dropsPerChapter.chapter1.median <= 8, 'chapter-one equipment volume is outside the 6.5-8 target range'],
  [report.equipmentSources.dropsPerChapter.steadyStateMean >= 6.5 && report.equipmentSources.dropsPerChapter.steadyStateMean <= 8, 'steady-state equipment volume is outside the 6.5-8 target range'],
  [report.equipmentSources.sourceSkew < 3, 'equipment sources remain more than threefold imbalanced'],
  [report.equipmentSources.emptyGuaranteedAttempts === 0, 'at least one guaranteed boss reward still has an empty eligible pool'],
  [starterRows.every(row => typeof row.median === 'number'), 'one or more starter items still cannot earn eleven copies'],
  [targetRows.every(row => typeof row.median === 'number' && row.median >= 7 && row.median <= 9), 'a representative wish item falls outside the 7-9 median eligible-chapter target'],
  [targetRows.every(row => typeof row.p90 === 'number' && row.p90 <= 11), 'a representative wish item exceeds the P90 protection target of eleven eligible chapters'],
  [!warningCodes.has('starter_copies_impossible'), 'simulator still reports impossible starter upgrades'],
  [!warningCodes.has('equipment_source_skew'), 'simulator still reports the old source skew'],
  [!warningCodes.has('early_guaranteed_drops_have_empty_pools'), 'simulator still reports empty early source pools'],
  [!warningCodes.has('targeted_copy_control_missing'), 'simulator still reports missing wish-item or source-mark control'],
  [!warningCodes.has('unbounded_gift_overflow') && !warningCodes.has('player_growth_outpaces_enemy_attack'), 'bounded gifts regressed while adding targeted equipment'],
  [!warningCodes.has('room20_is_special_reward_boss'), 'room-50 reward ownership regressed while adding targeted equipment'],
  [warningCodes.has('guardian_crown_unbounded'), 'simulator no longer detects uncapped Guardian Crown growth'],
  [warningCodes.has('relic_source_skew'), 'simulator no longer detects relic source skew'],
  [report.warnings.length === 2, 'targeted equipment progression should leave only the two independent relic warnings'],
  [report.giftGrowth.atChapter10.offensiveAttack === 29 && report.giftGrowth.atChapter10.defensiveMaxHealth === 206, 'capped mastery reference values changed during targeted equipment work'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Progression simulator audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

const medians = Object.fromEntries(Object.entries(report.targetedEquipment).map(([id, entry]) => [id, entry.eligibleChaptersToLevelFiveCopies.median]));
console.log(`Progression simulator audit passed: targeted level-five copies reach median eligible chapters ${JSON.stringify(medians)}, leaving only Guardian Crown and relic-source risks.`);
