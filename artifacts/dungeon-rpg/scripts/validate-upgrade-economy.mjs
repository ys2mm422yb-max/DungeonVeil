import { readFile } from 'node:fs/promises';

const [economy, meta, targeting, dropContract, inventory, cloud] = await Promise.all([
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/metaProgression.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentTargeting.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentDropContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/VeilChamberScreen.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/persistentSaveBundle.ts', import.meta.url), 'utf8'),
]);

const checks = [
  [economy.includes('1: { gold: 2000, copies: 1, dust: 75 }'), 'level 1 upgrade does not cost 2000 gold, 1 copy and 75 dust'],
  [economy.includes('2: { gold: 6000, copies: 2, dust: 250 }'), 'level 2 upgrade does not cost 6000 gold, 2 copies and 250 dust'],
  [economy.includes('3: { gold: 15000, copies: 3, dust: 700 }'), 'level 3 upgrade does not cost 15000 gold, 3 copies and 700 dust'],
  [economy.includes('4: { gold: 35000, copies: 5, dust: 1800 }'), 'level 4 upgrade does not cost 35000 gold, 5 copies and 1800 dust'],
  [economy.includes('meta.gold < cost.gold') && economy.includes('meta.dust < cost.dust') && economy.includes('progress.copies < cost.copies'), 'upgrade validation does not require all three resources'],
  [economy.includes('meta.gold -= cost.gold') && economy.includes('meta.dust -= cost.dust') && economy.includes('progress.copies -= cost.copies') && economy.includes('progress.level += 1'), 'real upgrade deduction does not subtract gold, dust and copies'],
  [economy.includes('progress.level >= 5') && economy.includes('clearEquipmentWishItemIfMatches(id)'), 'level-five equipment remains selected as a wish item'],
  [!meta.includes('const UPGRADE_COSTS') && !meta.includes('function equipmentUpgradeCost') && !meta.includes('function upgradeMetaItem'), 'legacy gold-and-copy-only upgrade logic still exists'],
  [targeting.includes('export const EQUIPMENT_SOURCE_MARK_COST = 3;'), 'copy crafting does not require exactly three source marks'],
  [targeting.includes('profile.sourceMarks[source] < EQUIPMENT_SOURCE_MARK_COST') && targeting.includes('profile.sourceMarks[source] -= EQUIPMENT_SOURCE_MARK_COST'), 'copy crafting does not validate and deduct source marks atomically'],
  [targeting.includes('collectMetaEquipmentDrop(id)') && targeting.includes('newUnlock: !result.duplicate'), 'source marks cannot unlock or copy the selected equipment'],
  [targeting.includes('equipmentCanBeTargeted(id, meta)') && targeting.includes('level < 5'), 'locked or completed equipment can be crafted'],
  [dropContract.includes('export const HUNT_EQUIPMENT_DROP_CHANCE = 0.18;'), 'hunt equipment chance regressed while adding targeted copies'],
  [dropContract.includes('misses >= WISH_PITY_MISSES') && dropContract.includes('SOURCE_WISH_CHANCE') && dropContract.includes('CHAPTER_WISH_CHANCE'), 'wish chance and pity are not active in the real drop contract'],
  [dropContract.includes('profile.sourceMarks[source] += 1;'), 'source boss rewards do not grant crafting marks'],
  [inventory.includes('balancedEquipmentUpgradeCost(selected, meta)'), 'inventory is not displaying the balanced cost'],
  [inventory.includes('meta.dust >= cost.dust') && inventory.includes('selectedCopies >= cost.copies'), 'inventory upgrade button does not require dust and copies'],
  [inventory.includes('upgradeMetaItemBalanced(selected)'), 'inventory upgrade button still uses the legacy economy'],
  [inventory.includes('data-testid="equipment-upgrade-costs"') && inventory.includes('grid-cols-3'), 'inventory does not show three separate upgrade resources'],
  [inventory.includes('meta.dust}/{cost.dust}'), 'inventory does not display the available and required veil dust'],
  [inventory.includes('data-testid="equipment-source-marks"') && inventory.includes('data-testid="equipment-wish-item"') && inventory.includes('data-testid="equipment-craft-copy"'), 'inventory omits mark, wish or copy-crafting controls'],
  [inventory.includes('setEquipmentWishItem(wishActive ? null : selected)') && inventory.includes('craftEquipmentCopy(selected)'), 'inventory targeting buttons are not wired to real actions'],
  [cloud.includes("'dungeon-veil-equipment-targeting-v1'"), 'targeted equipment progression is missing from cloud saves'],
  [cloud.includes('sourceMarkWeight(targeting.sourceMarks)') && cloud.includes('targeting.wishItem'), 'cloud conflict weight ignores targeted equipment progress'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Upgrade economy audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Upgrade economy audit passed: the sole three-resource upgrade path remains active, while three source marks and bounded wish pity provide controlled copies.');
