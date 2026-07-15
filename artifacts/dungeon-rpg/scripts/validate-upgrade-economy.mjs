import { readFile } from 'node:fs/promises';

const [economy, inventory] = await Promise.all([
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/VeilChamberScreen.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  [economy.includes('1: { gold: 1000, copies: 1 }'), 'level 1 upgrade does not cost 1000 gold'],
  [economy.includes('2: { gold: 2800, copies: 2 }'), 'level 2 upgrade does not cost 2800 gold'],
  [economy.includes('3: { gold: 6000, copies: 3 }'), 'level 3 upgrade does not cost 6000 gold'],
  [economy.includes('4: { gold: 11000, copies: 5 }'), 'level 4 upgrade does not cost 11000 gold'],
  [economy.includes('meta.gold -= cost.gold') && economy.includes('progress.level += 1'), 'real upgrade deduction is not using the balanced costs'],
  [inventory.includes('balancedEquipmentUpgradeCost(selected, meta)'), 'inventory is not displaying the balanced cost'],
  [inventory.includes('upgradeMetaItemBalanced(selected)'), 'inventory upgrade button still uses the legacy economy'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Upgrade economy audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Upgrade economy audit passed: display and real deduction use 1000 / 2800 / 6000 / 11000 gold while copy requirements remain unchanged.');
