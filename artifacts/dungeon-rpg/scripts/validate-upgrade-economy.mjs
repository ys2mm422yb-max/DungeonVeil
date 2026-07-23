import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [economy, preview, meta, store, targeting, dropContract, inventory, cloud] = await Promise.all([
  read('../src/game/equipmentUpgradeEconomy.ts'),
  read('../src/game/equipmentUpgradePreview.ts'),
  read('../src/game/metaProgression.ts'),
  read('../src/game/metaStoreV4.ts'),
  read('../src/game/equipmentTargeting.ts'),
  read('../src/game/equipmentDropContract.ts'),
  read('../src/components/screens/VeilChamberScreenV4.tsx'),
  read('../src/game/persistentSaveBundle.ts'),
]);

const checks = [
  [economy.includes('1: { gold: 3500, copies: 1, dust: 120 }') && economy.includes('4: { gold: 85000, copies: 12, dust: 4200 }'), 'common V4 upgrade curve is missing'],
  [economy.includes('1: { gold: 6000, copies: 2, dust: 220 }') && economy.includes('4: { gold: 140000, copies: 16, dust: 7200 }'), 'rare V4 upgrade curve is missing'],
  [economy.includes('1: { gold: 10000, copies: 3, dust: 400 }') && economy.includes('4: { gold: 240000, copies: 24, dust: 12500 }'), 'epic V4 upgrade curve is missing'],
  [economy.includes('meta.gold < cost.gold') && economy.includes('meta.dust < cost.dust') && economy.includes('progress.copies < cost.copies'), 'upgrade validation does not require gold, dust and copies'],
  [economy.includes('meta.gold -= cost.gold') && economy.includes('meta.dust -= cost.dust') && economy.includes('progress.copies -= cost.copies') && economy.includes('progress.level += 1'), 'upgrade deduction is incomplete'],
  [economy.includes('progress.level >= 5') && economy.includes('clearEquipmentWishItemIfMatches(id)'), 'level-five equipment remains selected as a wish item'],
  [meta.includes("export * from './metaStoreV4'") && store.includes('version: 4'), 'V4 meta store is not canonical'],
  [targeting.includes("rarity === 'common' ? 8 : rarity === 'rare' ? 11 : 15"), 'rarity-based source mark costs are missing'],
  [targeting.includes('profile.sourceMarks[source] < cost') && targeting.includes('profile.sourceMarks[source] -= cost'), 'copy crafting does not atomically validate and deduct marks'],
  [targeting.includes('collectBalancedEquipmentDrop(id)') && targeting.includes('newUnlock: !result.duplicate') && targeting.includes('convertedDust: result.convertedDust'), 'source marks cannot unlock, copy or safely convert selected equipment'],
  [targeting.includes('equipmentCanBeTargeted(id, meta)') && targeting.includes('level < 5'), 'locked or completed equipment can be targeted'],
  [dropContract.includes('HUNT_EQUIPMENT_DROP_CHANCE = 0.08'), 'V4 hunt equipment chance is not active'],
  [dropContract.includes('misses >= pity') && dropContract.includes('SOURCE_WISH_CHANCE') && dropContract.includes('CHAPTER_WISH_CHANCE'), 'wish chance and pity are not active in the real drop contract'],
  [dropContract.includes('random() <= 0.45') && dropContract.includes('profile.sourceMarks[source] += 1'), 'source boss marks are not probabilistic'],
  [inventory.includes('balancedEquipmentUpgradeCost(item.id, meta)'), 'inventory does not display the V4 cost'],
  [inventory.includes('meta.dust >= cost.dust') && inventory.includes('copies >= cost.copies'), 'inventory upgrade button does not require dust and copies'],
  [inventory.includes('upgradeMetaItemBalanced(item.id)'), 'inventory upgrade button is not wired to V4 economy'],
  [inventory.includes('data-testid="equipment-upgrade-costs"') && inventory.includes('grid-cols-3'), 'inventory does not visibly separate three upgrade resources'],
  [inventory.includes('meta.dust}/{cost.dust}') && inventory.includes('copies}/{cost.copies}'), 'inventory does not display available and required resources'],
  [inventory.includes('data-testid="equipment-source-marks"') && inventory.includes('data-testid="equipment-wish-item"') && inventory.includes('data-testid="equipment-craft-copy"'), 'inventory omits mark, wish or copy-crafting controls'],
  [inventory.includes('setEquipmentWishItem(targeting.wishItem === item.id ? null : item.id)') && inventory.includes('craftEquipmentCopy(item.id)'), 'inventory targeting controls are not wired'],
  [preview.includes('equipmentCombatModifiers(cloneMetaAtLevel(meta, id, level))') && preview.includes('equipmentCombatModifiers(cloneMetaAtLevel(meta, id, level + 1))'), 'preview is not derived from real current and next modifiers'],
  [preview.includes("key: 'attackFlat'") && preview.includes("key: 'critChance'") && preview.includes("key: 'critDamageMultiplier'") && preview.includes("key: 'maxHp'") && preview.includes("key: 'defense'") && preview.includes("key: 'attackRange'") && preview.includes("key: 'attackSpeedPercent'"), 'preview omits V4 combat stats'],
  [preview.includes('.filter(row => Math.abs(row.delta) >= 0.05)'), 'preview shows unchanged stats'],
  [inventory.includes('data-testid="equipment-upgrade-preview"') && inventory.includes('LEVEL {level} → {level + 1}') && inventory.includes('shown(row.delta'), 'inventory lacks current-to-next stat comparison'],
  [inventory.includes('data-testid="equipment-upgrade-disabled-reason"') && inventory.includes('ZU WENIG GOLD') && inventory.includes('ZU WENIGE ITEMKOPIEN') && inventory.includes('ZU WENIG SCHLEIERSTAUB'), 'disabled upgrade button does not explain the missing requirement'],
  [inventory.includes('data-testid="equipment-upgrade-button"') && inventory.includes('onPointerDown={event => { event.preventDefault(); event.stopPropagation(); }}') && inventory.includes('onPointerUp={event => { event.preventDefault(); event.stopPropagation(); armMobilePointerSafety(); window.setTimeout(upgrade, 0); }}') && inventory.includes('onClick={event => { event.preventDefault(); event.stopPropagation(); }}'), 'upgrade action is not isolated from pointer navigation and follow-up ghost clicks'],
  [inventory.includes('upgradingRef.current') && inventory.includes('setUpgrading(true)') && inventory.includes("upgrading ? '…'"), 'upgrade action lacks repeated-tap guard or visible pending state'],
  [!inventory.includes('startNewGame(') && !inventory.includes('setUiState(') && !inventory.includes('markActiveRun('), 'inventory can directly start, restore or navigate into a run'],
  [inventory.includes('ITEM VERBESSERT') && inventory.includes('(next.owned[item.id]?.level ?? before) > before'), 'successful upgrade does not confirm an actual level change'],
  [cloud.includes("'dungeon-veil-equipment-targeting-v2'") || cloud.includes("'dungeon-veil-equipment-targeting-v1'"), 'targeted equipment progression is missing from cloud saves'],
  [cloud.includes('sourceMarkWeight(targeting.sourceMarks)') && cloud.includes('targeting.wishItem'), 'cloud conflict weight ignores targeted equipment progress'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Upgrade economy audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Upgrade economy V4 audit passed: rarity curves, long-term copies, item-specific marks, mobile-safe inventory upgrades and real stat previews are active.');