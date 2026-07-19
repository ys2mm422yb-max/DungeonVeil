import { readFile } from 'node:fs/promises';
import { simulateTargetedEquipmentProgression } from './targeted-equipment-progression-simulator.mjs';
import { simulateTenItemRelicGrind } from './ten-item-relic-grind-simulator.mjs';

const [meta, economy, targeting, dropContract, rewardContract, worldLoot, inventory, cloud, redesign, relics] = await Promise.all([
  readFile(new URL('../src/game/metaProgression.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentTargeting.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentDropContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/chapterRewardContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentWorldLoot.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/VeilChamberScreenV4.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/persistentSaveBundle.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentRedesign.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/veilRelics.ts', import.meta.url), 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Progression simulator V4 audit failed: ${message}`);
}

const gifts = simulateTargetedEquipmentProgression({ seed: 0x5eed169, samples: 32, maxChapters: 20 });
const report = simulateTenItemRelicGrind();

assert(meta.includes("export * from './metaStoreV4'") && meta.includes("export * from './metaRuntimeV4'"), 'V4 meta store/runtime are not canonical');
assert(economy.includes('export type BalancedEquipmentUpgradeCost = { gold: number; copies: number; dust: number };'), 'three-resource upgrade contract missing');
assert(economy.includes('COMMON_COSTS') && economy.includes('RARE_COSTS') && economy.includes('EPIC_COSTS') && economy.includes("rarity === 'common' ? COMMON_COSTS : rarity === 'rare' ? RARE_COSTS : EPIC_COSTS"), 'rarity-specific upgrade curves missing');
assert(economy.includes('clearEquipmentWishItemIfMatches(id)') && economy.includes('progress.level >= 5'), 'completed wish items are not cleared');
assert(redesign.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']"), 'three-slot active equipment contract missing');
assert([...redesign.matchAll(/^\s{2}'([^']+)': \{/gm)].length === 10, 'active equipment catalog is not exactly ten items');

assert(targeting.includes("const TARGETING_KEY = 'dungeon-veil-equipment-targeting-v1';"), 'targeting profile lost its isolated persistent key');
assert(targeting.includes('SOURCE_WISH_CHANCE = 0.18') && targeting.includes('CHAPTER_WISH_CHANCE = 0.24'), 'V4 wish chances differ from the approved long-term curve');
assert(targeting.includes('WISH_PITY_MISSES = 7') && targeting.includes('CHAPTER_WISH_PITY_MISSES = 9'), 'V4 source/global pity thresholds are missing');
assert(targeting.includes("rarity === 'common' ? 8 : rarity === 'rare' ? 11 : 15"), 'rarity-specific mark costs missing');
assert(targeting.includes('huntMarkLedger: string[];') && targeting.includes('huntWishLedger: string[];'), 'hunt duplicate guards missing');
assert(targeting.includes('collectBalancedEquipmentDrop(id)'), 'crafted copies do not use the balanced collection contract');

assert(dropContract.includes('HUNT_EQUIPMENT_DROP_CHANCE = 0.08'), 'runtime hunt equipment chance is not 8%');
assert(dropContract.includes('50: 0.42'), 'room-50 milestone chance is missing');
assert(dropContract.includes('UNOWNED_ITEM_PREFERENCE = 0.35'), 'bounded unowned-item preference missing');
assert(dropContract.includes('receivedWish ? 0 : misses + 1'), 'wish misses do not advance/reset correctly');
assert(dropContract.includes("`${runId}:${safeChapter}:hunt-wish`"), 'hunt wish attempt is not chapter-bounded');
assert(dropContract.includes('(meta.owned[item.id]?.level ?? 0) < 5'), 'level-five items remain in active drop pools');
assert(rewardContract.includes('rollBossEquipmentReward(safeChapter, safeFloor)'), 'boss equipment contract is not owned by chapter rewards');
assert(!rewardContract.includes('safeFloor >= 3 && Math.random() < 0.18'), 'legacy normal-room random equipment remains active');
assert(worldLoot.includes('grantHuntEquipmentSourceMark(engine.state.chapter)') && worldLoot.includes('rollHuntEquipmentReward(engine.state.chapter)'), 'hunt mark/drop contract is not wired to world loot');

assert(inventory.includes('data-testid="equipment-wish-item"') && inventory.includes('data-testid="equipment-craft-copy"') && inventory.includes('data-testid="equipment-source-marks"'), 'V4 inventory lacks wish, craft or source-mark controls');
assert(inventory.includes('setEquipmentWishItem') && inventory.includes('craftEquipmentCopy') && inventory.includes('equipmentSourceMarkCost'), 'V4 inventory controls are not wired');
assert(inventory.includes("'dungeon-veil-cloud-save-restored'") && inventory.includes("'dungeon-veil-equipment-targeting-changed'"), 'V4 inventory does not refresh after cloud/targeting changes');
assert(cloud.includes("'dungeon-veil-equipment-targeting-v1'") && cloud.includes("'dungeon-veil-meta'"), 'equipment or targeting progress is missing from cloud bundles');
assert(cloud.includes('sourceMarkWeight(targeting.sourceMarks)') && cloud.includes("typeof targeting.wishItem === 'string'"), 'cloud conflict weighting ignores marks or wish item');

assert(gifts.currentRules.firstChapterGiftSelections === 11 && gifts.currentRules.laterChapterGiftSelections === 5, 'bounded 11/5 gift schedule regressed');
assert(gifts.currentRules.hunterBlessingMaxRank === 3 && gifts.currentRules.vitalSparkMaxRank === 3, 'gift mastery caps regressed');
assert(gifts.giftGrowth.atChapter10.offensiveAttack === 29 && gifts.giftGrowth.atChapter10.defensiveMaxHealth === 206, 'chapter-10 gift reference changed unexpectedly');

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

console.log(JSON.stringify({ samples: report.samples, soloItems: Object.keys(report.modes.solo).length, duoItems: Object.keys(report.modes.duo).length, relics: report.relics, companionReserve: report.companionReserve }, null, 2));
console.log('Progression simulator V4 audit passed: long-term ten-item, relic, Solo/Duo and companion-reserve contracts are coherent.');
