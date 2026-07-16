import { readFile } from 'node:fs/promises';

const [economy, inventory] = await Promise.all([
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/VeilChamberScreen.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  [economy.includes('1: { gold: 2000, copies: 1, dust: 75 }'), 'level 1 upgrade does not cost 2000 gold, 1 copy and 75 dust'],
  [economy.includes('2: { gold: 6000, copies: 2, dust: 250 }'), 'level 2 upgrade does not cost 6000 gold, 2 copies and 250 dust'],
  [economy.includes('3: { gold: 15000, copies: 3, dust: 700 }'), 'level 3 upgrade does not cost 15000 gold, 3 copies and 700 dust'],
  [economy.includes('4: { gold: 35000, copies: 5, dust: 1800 }'), 'level 4 upgrade does not cost 35000 gold, 5 copies and 1800 dust'],
  [economy.includes('meta.gold < cost.gold') && economy.includes('meta.dust < cost.dust') && economy.includes('progress.copies < cost.copies'), 'upgrade validation does not require all three resources'],
  [economy.includes('meta.gold -= cost.gold') && economy.includes('meta.dust -= cost.dust') && economy.includes('progress.copies -= cost.copies') && economy.includes('progress.level += 1'), 'real upgrade deduction does not subtract gold, dust and copies'],
  [inventory.includes('balancedEquipmentUpgradeCost(selected, meta)'), 'inventory is not displaying the balanced cost'],
  [inventory.includes('meta.dust >= cost.dust') && inventory.includes('selectedCopies >= cost.copies'), 'inventory upgrade button does not require dust and copies'],
  [inventory.includes('upgradeMetaItemBalanced(selected)'), 'inventory upgrade button still uses the legacy economy'],
  [inventory.includes('data-testid="equipment-upgrade-costs"') && inventory.includes('grid-cols-3'), 'inventory does not show three separate upgrade resources'],
  [inventory.includes('meta.dust}/{cost.dust}'), 'inventory does not display the available and required veil dust'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Upgrade economy audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Upgrade economy audit passed: upgrades require 2000/6000/15000/35000 gold, unchanged copy gates and 75/250/700/1800 Veil Dust.');
