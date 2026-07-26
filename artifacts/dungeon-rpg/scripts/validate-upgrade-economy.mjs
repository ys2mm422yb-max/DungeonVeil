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
  [economy.includes('UPGRADE_SUCCESS_CHANCES') && economy.includes('1: 1') && economy.includes('2: 0.85') && economy.includes('3: 0.7') && economy.includes('4: 0.55'), 'upgrade success chance curve is missing'],
  [economy.includes('meta.gold < cost.gold') && economy.includes('meta.dust < cost.dust') && economy.includes('progress.copies < cost.copies'), 'upgrade validation does not require gold, dust and copies'],
  [economy.includes('meta.gold -= cost.gold') && economy.includes('meta.dust -= cost.dust') && economy.includes('progress.copies -= cost.copies'), 'upgrade deduction is incomplete'],
  [economy.includes('const success =') && economy.includes('if (success) progress.level += 1'), 'probabilistic upgrade resolution is missing'],
  [economy.includes("dungeon-veil-equipment-upgrade-result") && economy.includes('success') && economy.includes('chance'), 'upgrade result event is missing'],
  [!economy.includes('equipmentTargeting') && !economy.includes('WishItem'), 'retired wish cleanup remains connected to equipment upgrades'],
  [meta.includes("export * from './metaStoreV4'") && store.includes('version: 4'), 'V4 meta store is not canonical'],
  [store.includes("const PLAYER_PROFILE_KEY = 'dungeon-veil-player-profile-v1'") && store.includes('function touchPlayerActivity()') && store.includes('profile.updatedAt = Date.now()') && store.includes('touchPlayerActivity();') && cloud.includes('number(profile.updatedAt)'), 'equipment upgrades can be overwritten by cloud reconciliation and reload the app to the main menu'],
  [forgeMarks.includes('FORGE_MARK_EXCHANGE_COST = 10'), 'Forge Mark exchange cost is not exactly ten'],
  [forgeMarks.includes('hunt: 0.01') && forgeMarks.includes('intermediateBoss: 0') && forgeMarks.includes('chapterBoss: 0.075'), 'Forge Mark drop chances do not exclude elite/intermediate bosses'],
  [forgeMarks.includes('FORGE_MARK_CATEGORY_WEIGHTS') && forgeMarks.includes('bow: 40, quiver: 30, armor: 30'), 'Forge Mark category weights are missing'],
  [forgeMarks.includes('FORGE_MARK_RARITY_WEIGHTS') && forgeMarks.includes('common: 55, rare: 32, epic: 13'), 'Forge Mark rarity weights are missing'],
  [forgeMarks.includes('profile.marks < FORGE_MARK_EXCHANGE_COST') && forgeMarks.includes('transaction.marksBefore - FORGE_MARK_EXCHANGE_COST'), 'Forge Mark exchange does not validate and deduct exactly ten marks'],
  [forgeMarks.includes('exchangeExecuting') && forgeMarks.includes('profile.exchangeReceipts.find(entry => entry.id === id)'), 'Forge Mark exchange lacks repeated-tap or retry idempotency'],
  [forgeMarks.includes('pendingExchange') && forgeMarks.includes('rewardLedger.includes(profile.pendingExchange.rewardKey)') && forgeMarks.includes('recover(normalize(JSON.parse(raw)))'), 'Forge Mark exchange is not crash recoverable'],
  [forgeMarks.includes('ACTIVE_EQUIPMENT_IDS.filter') && forgeMarks.includes('unlockRank <= meta.rank') && forgeMarks.includes('unlockChapter <= safeChapter'), 'Forge Mark pool can include locked or invalid equipment'],
  [!dropContract.includes('SOURCE_WISH_CHANCE') && !dropContract.includes('CHAPTER_WISH_CHANCE') && !dropContract.includes('wishItem'), 'retired wish chance or pity remains in the real drop contract'],
  [dropContract.includes("const markSource = safeFloor === FINAL_BOSS_ROOM ? 'chapterBoss' : 'intermediateBoss'") && dropContract.includes('rollForgeMarkReward(markSource,'), 'boss Forge Mark rolls are not wired to the real reward path'],
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
  [inventory.includes('onPointerDownCapture') && inventory.includes('equipment-upgrade-button') && inventory.includes('queueMicrotask') && inventory.includes('onPointerUpCapture'), 'upgrade action is not touch-atomic or protected from follow-up pointer navigation'],
  [inventory.includes('equipmentUpgradeSuccessChance') && inventory.includes('ERFOLG') && inventory.includes('upgradeChance'), 'visible upgrade success chance is missing'],
  [legacyInventory.includes('upgradingRef.current') && legacyInventory.includes('setUpgrading(true)') && legacyInventory.includes("upgrading ? '…'"), 'upgrade action lacks repeated-tap guard or visible pending state'],
  [!inventory.includes('startNewGame(') && !inventory.includes('setUiState(') && !inventory.includes('markActiveRun('), 'inventory can directly start, restore or navigate into a run'],
  [legacyInventory.includes('ITEM VERBESSERT') && legacyInventory.includes('(next.owned[item.id]?.level ?? before) > before'), 'successful upgrade does not confirm an actual level change'],
  [inventory.includes('UPGRADE FEHLGESCHLAGEN') && inventory.includes('dungeon-veil-equipment-upgrade-result'), 'failed upgrades do not show explicit feedback'],
  [cloud.includes("'dungeon-veil-forge-marks-v1'"), 'Forge Mark progression is missing from cloud saves'],
  [cloud.includes('forgeMarks.marks') || cloud.includes('number(forgeMarks.marks)'), 'cloud conflict weight ignores Forge Mark progress'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Upgrade economy audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Upgrade economy V4 audit passed: rarity curves, probabilistic touch-safe upgrades, cloud-safe persistence, Forge Marks without elite drops, atomic exchange and real stat previews are active.');
