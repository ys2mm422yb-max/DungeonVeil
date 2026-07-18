import { readFile } from 'node:fs/promises';

const [economy, preview, meta, targeting, dropContract, inventory, cloud] = await Promise.all([
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentUpgradePreview.ts', import.meta.url), 'utf8'),
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
  [targeting.includes('collectBalancedEquipmentDrop(id)') && targeting.includes('newUnlock: !result.duplicate') && targeting.includes('convertedDust: result.convertedDust'), 'source marks cannot unlock, copy or safely convert the selected equipment'],
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
  [preview.includes('equipmentCombatModifiers(cloneMetaAtLevel(meta, id, level))') && preview.includes('equipmentCombatModifiers(cloneMetaAtLevel(meta, id, level + 1))'), 'upgrade preview is not derived from the real current and next equipment modifiers'],
  [preview.includes("key: 'attackFlat'") && preview.includes("key: 'attackPercent'") && preview.includes("key: 'maxHp'") && preview.includes("key: 'defense'") && preview.includes("key: 'attackRange'") && preview.includes("key: 'attackSpeedPercent'"), 'upgrade preview omits important combat stats'],
  [preview.includes('.filter(row => Math.abs(row.delta) >= 0.05)'), 'upgrade preview shows unchanged stats'],
  [inventory.includes('data-testid="equipment-upgrade-preview"') && inventory.includes('LVL {selectedLevel} → {selectedLevel + 1}') && inventory.includes('formatUpgradeValue(row.delta'), 'inventory lacks a visible current-to-next stat comparison'],
  [inventory.includes('data-testid="equipment-upgrade-disabled-reason"') && inventory.includes('ZU WENIG GOLD') && inventory.includes('ZU WENIGE ITEMKOPIEN') && inventory.includes('ZU WENIG SCHLEIERSTAUB'), 'disabled upgrade button does not explain its missing requirement'],
  [inventory.includes('data-testid="equipment-upgrade-button"') && inventory.includes('onClick={event =>') && inventory.includes('event.stopPropagation(); upgradeSelectedItem();'), 'upgrade action is not isolated from parent pointer navigation'],
  [inventory.includes('upgradingRef.current') && inventory.includes('setUpgrading(true)') && inventory.includes('WIRD VERBESSERT'), 'upgrade action lacks a repeated-tap guard or visible pending state'],
  [!inventory.includes('startNewGame(') && !inventory.includes('setUiState(') && !inventory.includes("markActiveRun("), 'inventory upgrade UI can directly start, restore or navigate into a run'],
  [inventory.includes('ITEM VERBESSERT') && inventory.includes('levelAfter > levelBefore'), 'successful upgrade does not confirm the actual changed item level'],
  [cloud.includes("'dungeon-veil-equipment-targeting-v1'"), 'targeted equipment progression is missing from cloud saves'],
  [cloud.includes('sourceMarkWeight(targeting.sourceMarks)') && cloud.includes('targeting.wishItem'), 'cloud conflict weight ignores targeted equipment progress'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Upgrade economy audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Upgrade economy audit passed: upgrades stay inside inventory, resist repeated taps, explain missing resources and preview every real next-level stat gain.');
