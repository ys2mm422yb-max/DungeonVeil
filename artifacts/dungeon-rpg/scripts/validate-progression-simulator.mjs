import { readFile } from 'node:fs/promises';
import { simulateTargetedEquipmentProgression } from './targeted-equipment-progression-simulator.mjs';
import { simulateTenItemRelicGrind } from './ten-item-relic-grind-simulator.mjs';

const [meta, economy, forgeMarks, dropContract, rewardContract, worldLoot, inventory, cloud, redesign, relics] = await Promise.all([
  readFile(new URL('../src/game/metaProgression.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/forgeMarks.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentDropContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/chapterRewardContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentWorldLoot.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/VeilChamberScreen.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/persistentSaveBundle.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentRedesign.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/veilRelics.ts', import.meta.url), 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Progression simulator V4 audit failed: ${message}`);
}

const progression = simulateTargetedEquipmentProgression({ seed: 0x5eed169, samples: 4096, maxChapters: 120 });
const report = simulateTenItemRelicGrind();

assert(meta.includes("export * from './metaStoreV4'") && meta.includes("export * from './metaRuntimeV4'"), 'V4 meta store/runtime are not canonical');
assert(economy.includes('export type BalancedEquipmentUpgradeCost = { gold: number; copies: number; dust: number };'), 'three-resource upgrade contract missing');
assert(economy.includes('COMMON_COSTS') && economy.includes('RARE_COSTS') && economy.includes('EPIC_COSTS') && economy.includes("rarity === 'common' ? COMMON_COSTS : rarity === 'rare' ? RARE_COSTS : EPIC_COSTS"), 'rarity-specific upgrade curves missing');
assert(!economy.includes('equipmentTargeting') && !economy.includes('WishItem'), 'retired wish cleanup remains connected to upgrades');
assert(redesign.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']"), 'three-slot active equipment contract missing');
assert([...redesign.matchAll(/^\s{2}'([^']+)': \{/gm)].length === 10, 'active equipment catalog is not exactly ten items');

assert(forgeMarks.includes("FORGE_MARKS_KEY = 'dungeon-veil-forge-marks-v1'"), 'Forge Mark profile key is missing');
assert(forgeMarks.includes('FORGE_MARK_EXCHANGE_COST = 10'), 'Forge Mark exchange cost is not exactly ten');
assert(forgeMarks.includes("FORGE_MARK_DROP_CHANCES = Object.freeze({ hunt: 0.01, intermediateBoss: 0.025, chapterBoss: 0.075 })"), 'Forge Mark drop rates differ from the approved rare curve');
assert(forgeMarks.includes('bow: 40, quiver: 30, armor: 30'), 'Forge Mark category distribution is missing');
assert(forgeMarks.includes('common: 55, rare: 32, epic: 13'), 'Forge Mark rarity distribution is missing');
assert(forgeMarks.includes("LEGACY_KEYS = ['dungeon-veil-equipment-targeting-v2', 'dungeon-veil-equipment-targeting-v1']"), 'legacy source-mark migration inputs are missing');
assert(forgeMarks.includes('exchangeReceipts.find(entry => entry.id === safeId)') && forgeMarks.includes('exchangeExecuting'), 'exchange retry or rapid-tap protection is missing');
assert(forgeMarks.includes('pendingExchange') && forgeMarks.includes('meta.rewardLedger.includes(transaction.rewardKey)'), 'exchange crash recovery is missing');
assert(forgeMarks.includes('marksBefore - FORGE_MARK_EXCHANGE_COST'), 'atomic ten-mark deduction is missing');
assert(forgeMarks.includes('ACTIVE_EQUIPMENT_IDS.filter') && forgeMarks.includes('unlockRank <= meta.rank') && forgeMarks.includes('unlockChapter <= safeChapter'), 'Forge Mark reward pool can contain locked equipment');

assert(dropContract.includes('HUNT_EQUIPMENT_DROP_CHANCE = 0.08'), 'runtime hunt equipment chance is not 8%');
assert(dropContract.includes('50: 0.42'), 'room-50 milestone equipment chance is missing');
assert(dropContract.includes('UNOWNED_ITEM_PREFERENCE = 0.35') && dropContract.includes('random() < UNOWNED_ITEM_PREFERENCE'), 'bounded unowned-item preference missing');
assert(!dropContract.includes('SOURCE_WISH_CHANCE') && !dropContract.includes('CHAPTER_WISH_CHANCE') && !dropContract.includes('wishItem'), 'retired wish chance or pity remains in the drop contract');
assert(dropContract.includes("rollForgeMarkReward(safeFloor === FINAL_BOSS_ROOM ? 'chapterBoss' : 'intermediateBoss'"), 'boss Forge Mark rolls are not wired');
assert(dropContract.includes('(meta.owned[item.id]?.level ?? 0) < 5'), 'level-five items remain in active equipment drop pools');
assert(rewardContract.includes('rollBossEquipmentReward(safeChapter, safeFloor)'), 'boss equipment contract is not owned by chapter rewards');
assert(!rewardContract.includes('safeFloor >= 3 && Math.random() < 0.18'), 'legacy normal-room random equipment remains active');
assert(worldLoot.includes("rollForgeMarkReward('hunt'"), 'hunt Forge Mark roll is not wired to world loot');

assert(inventory.includes('data-testid="forge-mark-open"') && inventory.includes('data-testid="forge-mark-exchange"'), 'equipment screen lacks Forge Mark balance or exchange controls');
assert(inventory.includes('exchangeForgeMarks(exchangeIdRef.current)') && inventory.includes('profile.marks < FORGE_MARK_EXCHANGE_COST'), 'Forge Mark exchange controls are not wired');
assert(inventory.includes('data-testid="forge-mark-reward-name"') && inventory.includes('data-testid="forge-mark-reward-category"') && inventory.includes('data-testid="forge-mark-reward-rarity"'), 'Forge Mark reward presentation is incomplete');
assert(inventory.includes("'dungeon-veil-cloud-save-restored'") && inventory.includes('FORGE_MARK_EVENT'), 'equipment screen does not refresh after cloud or Forge Mark changes');
assert(cloud.includes("'dungeon-veil-forge-marks-v1'") && cloud.includes("'dungeon-veil-equipment-targeting-v2'") && cloud.includes("'dungeon-veil-equipment-targeting-v1'"), 'Forge Mark progress or legacy migration fallback is missing from cloud bundles');
assert(cloud.includes('forgeMarkWeight(forgeMarks.marks)'), 'cloud conflict weighting ignores Forge Marks');
assert(!cloud.includes("typeof targeting.wishItem === 'string'"), 'retired wish selection still affects cloud conflict weighting');

assert(progression.currentRules.firstChapterGiftSelections === 11 && progression.currentRules.laterChapterGiftSelections === 5, 'bounded 11/5 gift schedule regressed');
assert(progression.currentRules.hunterBlessingMaxRank === 3 && progression.currentRules.vitalSparkMaxRank === 3, 'gift mastery caps regressed');
assert(progression.giftGrowth.atChapter10.offensiveAttack === 29 && progression.giftGrowth.atChapter10.defensiveMaxHealth === 206, 'chapter-10 gift reference changed unexpectedly');
assert(Math.abs(progression.forgeMarks.expectedMarksPerChapter - 0.295) < 1e-9, 'Forge Mark expected chapter income is not 0.295');
const exchange = progression.forgeMarks.chaptersToFirstExchange;
assert(exchange.p10 >= 20 && exchange.p10 <= 25, `Forge Mark P10 outside approved band: ${exchange.p10}`);
assert(exchange.median >= 30 && exchange.median <= 36, `Forge Mark median outside approved band: ${exchange.median}`);
assert(exchange.p90 >= 44 && exchange.p90 <= 53, `Forge Mark P90 outside approved band: ${exchange.p90}`);
assert(exchange.p99 >= 57 && exchange.p99 <= 72, `Forge Mark P99 outside approved band: ${exchange.p99}`);
const categories = progression.forgeMarks.rewardDistribution.categoryRatios;
assert(Math.abs(categories.bow - 0.4) <= 0.02 && Math.abs(categories.quiver - 0.3) <= 0.02 && Math.abs(categories.armor - 0.3) <= 0.02, 'simulated Forge Mark category distribution drifted');
const rarities = progression.forgeMarks.rewardDistribution.rarityRatios;
assert(Math.abs(rarities.common - 0.55) <= 0.02 && Math.abs(rarities.rare - 0.32) <= 0.02 && Math.abs(rarities.epic - 0.13) <= 0.015, 'simulated Forge Mark rarity distribution drifted');

assert(report.samples >= 4096, 'V4 simulator uses fewer than 4096 deterministic samples');
assert(Object.keys(report.modes.solo).length === 10 && Object.keys(report.modes.duo).length === 10, 'all ten items are not simulated in Solo and Duo');
for (const mode of ['solo', 'duo']) {
  for (const [id, row] of Object.entries(report.modes[mode])) {
    assert(row.firstFindChapter.p99 <= report.maxChapters, `${mode}/${id} first-find P99 is not finite`);
    assert(row.level5Chapter.p99 <= report.maxChapters, `${mode}/${id} level-five P99 is not finite`);
    assert(row.level5Chapter.median >= row.firstFindChapter.median, `${mode}/${id} level five predates first find`);
  }
}
for (const id of Object.keys(report.modes.solo)) {
  const solo = report.modes.solo[id].level5Chapter.median;
  const duo = report.modes.duo[id].level5Chapter.median;
  assert(duo >= solo * 0.85, `${id}: Duo grind is materially faster than Solo`);
}
assert(report.relics.sixCoreRelicsChapter.p99 <= report.maxChapters, 'core relic collection P99 is not finite');
assert(relics.includes('RELIC_UNOWNED_PREFERENCE = 0.65') && relics.includes('hunt: 9, boss: 11'), 'bounded relic preference/pity missing');
assert(report.companionReserve.average >= 1.08 && report.companionReserve.maximum <= 1.12, 'companion reserve is outside 8-12%');
assert(report.companionReserve.requiredWithoutCompanion, 'base game is not complete without companions');

console.log(JSON.stringify({
  samples: report.samples,
  forgeMarks: progression.forgeMarks,
  soloItems: Object.keys(report.modes.solo).length,
  duoItems: Object.keys(report.modes.duo).length,
  relics: report.relics,
  companionReserve: report.companionReserve,
}, null, 2));
console.log('Progression simulator V4 audit passed: Forge Marks, long-term ten-item, relic, Solo/Duo and companion-reserve contracts are coherent.');
