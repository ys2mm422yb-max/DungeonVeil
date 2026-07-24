import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [economy, preview, meta, store, forgeMarks, dropContract, inventory, legacyInventory, cloud] = await Promise.all([
  read('../src/game/equipmentUpgradeEconomy.ts'),
  read('../src/game/equipmentUpgradePreview.ts'),
  read('../src/game/metaProgression.ts'),
  read('../src/game/metaStoreV4.ts'),
  read('../src/game/forgeMarks.ts'),
  read('../src/game/equipmentDropContract.ts'),
  read('../src/components/screens/VeilChamberScreen.tsx'),
  read('../src/components/screens/VeilChamberScreenV4.tsx'),
  read('../src/game/persistentSaveBundle.ts'),
]);

const checks = [
  [economy.includes('1: { gold: 3500, copies: 1, dust: 120 }') && economy.includes('4: { gold: 85000, copies: 12, dust: 4200 }'), 'common V4 upgrade curve is missing'],
  [economy.includes('1: { gold: 6000, copies: 2, dust: 220 }') && economy.includes('4: { gold: 140000, copies: 16, dust: 7200 }'), 'rare V4 upgrade curve is missing'],
  [economy.includes('1: { gold: 10000, copies: 3, dust: 400 }') && economy.includes('4: { gold: 240000, copies: 24, dust: 12500 }'), 'epic V4 upgrade curve is missing'],
  [economy.includes('meta.gold < cost.gold') && economy.includes('meta.dust < cost.dust') && economy.includes('progress.copies < cost.copies'), 'upgrade validation does not require gold, dust and copies'],
  [economy.includes('meta.gold -= cost.gold') && economy.includes('meta.dust -= cost.dust') && economy.includes('progress.copies -= cost.copies') && economy.includes('progress.level += 1'), 'upgrade deduction is incomplete'],
  [!economy.includes('equipmentTargeting') && !economy.includes('WishItem'), 'retired wish cleanup remains connected to equipment upgrades'],
  [meta.includes("export * from './metaStoreV4'") && store.includes('version: 4'), 'V4 meta store is not canonical'],
  [forgeMarks.includes('FORGE_MARK_EXCHANGE_COST = 10'), 'Forge Mark exchange cost is not exactly ten'],
  [forgeMarks.includes("FORGE_MARK_DROP_CHANCES = Object.freeze({ hunt: 0.01, intermediateBoss: 0.025, chapterBoss: 0.075 })"), 'rare Forge Mark drop chances are missing'],
  [forgeMarks.includes("FORGE_MARK_CATEGORY_WEIGHTS") && forgeMarks.includes("bow: 40, quiver: 30, armor: 30"), 'Forge Mark category weights are missing'],
  [forgeMarks.includes("FORGE_MARK_RARITY_WEIGHTS") && forgeMarks.includes("common: 55, rare: 32, epic: 13"), 'Forge Mark rarity weights are missing'],
  [forgeMarks.includes('profile.marks < FORGE_MARK_EXCHANGE_COST') && forgeMarks.includes('marksBefore - FORGE_MARK_EXCHANGE_COST'), 'Forge Mark exchange does not validate and deduct exactly ten marks'],
  [forgeMarks.includes('exchangeExecuting') && forgeMarks.includes('exchangeReceipts.find(entry => entry.id === safeId)'), 'Forge Mark exchange lacks repeated-tap or retry idempotency'],
  [forgeMarks.includes('pendingExchange') && forgeMarks.includes('meta.rewardLedger.includes(transaction.rewardKey)') && forgeMarks.includes('recover(normalize(JSON.parse(raw)))'), 'Forge Mark exchange is not crash recoverable'],
  [forgeMarks.includes('ACTIVE_EQUIPMENT_IDS.filter') && forgeMarks.includes('unlockRank <= meta.rank') && forgeMarks.includes('unlockChapter <= safeChapter'), 'Forge Mark pool can include locked or invalid equipment'],
  [!dropContract.includes('SOURCE_WISH_CHANCE') && !dropContract.includes('CHAPTER_WISH_CHANCE') && !dropContract.includes('wishItem'), 'retired wish chance or pity remains in the real drop contract'],
  [dropContract.includes("rollForgeMarkReward(safeFloor === FINAL_BOSS_ROOM ? 'chapterBoss' : 'intermediateBoss'"), 'boss Forge Mark rolls are not wired to the real reward path'],
  [legacyInventory.includes('balancedEquipmentUpgradeCost(item.id, meta)'), 'inventory does not display the V4 cost'],
  [legacyInventory.includes('meta.dust >= cost.dust') && legacyInventory.includes('copies >= cost.copies'), 'inventory upgrade button does not require dust and copies'],
  [legacyInventory.includes('upgradeMetaItemBalanced(item.id)'), 'inventory upgrade button is not wired to V4 economy'],
  [legacyInventory.includes('data-testid="equipment-upgrade-costs"') && legacyInventory.includes('grid-cols-3'), 'inventory does not visibly separate three upgrade resources'],
  [legacyInventory.includes('meta.dust}/{cost.dust}') && legacyInventory.includes('copies}/{cost.copies}'), 'inventory does not display available and required resources'],
  [inventory.includes('data-testid="forge-mark-open"') && inventory.includes('data-testid="forge-mark-exchange"'), 'inventory omits Forge Mark balance or exchange controls'],
  [inventory.includes('exchangeForgeMarks(exchangeIdRef.current)') && inventory.includes('profile.marks < FORGE_MARK_EXCHANGE_COST'), 'inventory Forge Mark controls are not wired'],
  [inventory.includes('data-testid="forge-mark-reward-name"') && inventory.includes('data-testid="forge-mark-reward-category"') && inventory.includes('data-testid="forge-mark-reward-rarity"'), 'Forge Mark reward presentation omits name, category or rarity'],
  [preview.includes('equipmentCombatModifiers(cloneMetaAtLevel(meta, id, level))') && preview.includes('equipmentCombatModifiers(cloneMetaAtLevel(meta, id, level + 1))'), 'preview is not derived from real current and next modifiers'],
  [preview.includes("key: 'attackFlat'") && preview.includes("key: 'critChance'") && preview.includes("key: 'critDamageMultiplier'") && preview.includes("key: 'maxHp'") && preview.includes("key: 'defense'") && preview.includes("key: 'attackRange'") && preview.includes("key: 'attackSpeedPercent'"), 'preview omits V4 combat stats'],
  [preview.includes('.filter(row => Math.abs(row.delta) >= 0.05)'), 'preview shows unchanged stats'],
  [legacyInventory.includes('data-testid="equipment-upgrade-preview"') && legacyInventory.includes('LEVEL {level} → {level + 1}') && legacyInventory.includes('shown(row.delta'), 'inventory lacks current-to-next stat comparison'],
  [legacyInventory.includes('data-testid="equipment-upgrade-disabled-reason"') && legacyInventory.includes('ZU WENIG GOLD') && legacyInventory.includes('ZU WENIGE ITEMKOPIEN') && legacyInventory.includes('ZU WENIG SCHLEIERSTAUB'), 'disabled upgrade button does not explain the missing requirement'],
  [legacyInventory.includes('data-testid="equipment-upgrade-button"') && legacyInventory.includes('onPointerDown={event => { event.preventDefault(); event.stopPropagation(); }}') && legacyInventory.includes('onPointerUp={event => { event.preventDefault(); event.stopPropagation(); window.setTimeout(upgrade, 0); }}') && legacyInventory.includes('onClick={event => { event.preventDefault(); event.stopPropagation(); }}') && !legacyInventory.includes('armMobilePointerSafety'), 'upgrade action is not locally isolated from pointer navigation and follow-up clicks'],
  [legacyInventory.includes('upgradingRef.current') && legacyInventory.includes('setUpgrading(true)') && legacyInventory.includes("upgrading ? '…'"), 'upgrade action lacks repeated-tap guard or visible pending state'],
  [!inventory.includes('startNewGame(') && !inventory.includes('setUiState(') && !inventory.includes('markActiveRun('), 'inventory can directly start, restore or navigate into a run'],
  [legacyInventory.includes('ITEM VERBESSERT') && legacyInventory.includes('(next.owned[item.id]?.level ?? before) > before'), 'successful upgrade does not confirm an actual level change'],
  [cloud.includes("'dungeon-veil-forge-marks-v1'"), 'Forge Mark progression is missing from cloud saves'],
  [cloud.includes('forgeMarks.marks') || cloud.includes('number(forgeMarks.marks)'), 'cloud conflict weight ignores Forge Mark progress'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Upgrade economy audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Upgrade economy V4 audit passed: rarity curves, long-term copies, rare Forge Marks, atomic random equipment exchange, mobile-safe inventory upgrades and real stat previews are active.');
