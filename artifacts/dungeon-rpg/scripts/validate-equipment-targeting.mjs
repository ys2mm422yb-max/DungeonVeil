import { readFile } from 'node:fs/promises';
import { simulateEquipmentTargetPity } from './equipment-target-pity-simulator.mjs';

const [targeting, dropBalance, upgradeEconomy, saveBundle, inventory] = await Promise.all([
  readFile(new URL('../src/game/equipmentTargeting.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentDropBalance.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentUpgradeEconomy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/persistentSaveBundle.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/screens/VeilChamberScreen.tsx', import.meta.url), 'utf8'),
]);

const report = simulateEquipmentTargetPity({ seed: 0x1760177, samples: 20000 });
const sourceReports = Object.values(report.bySource);

const checks = [
  [targeting.includes('export const EQUIPMENT_TARGET_HARD_PITY = 2;'), 'target hard pity is not fixed at two source misses'],
  [targeting.includes('export const EQUIPMENT_TARGET_SOURCE_CHANCE = 0.5;'), 'matching-source target chance is not fixed at 50%'],
  [targeting.includes('if (guaranteed) return target;'), 'room-50 target guarantee incorrectly resets source pity or is missing'],
  [targeting.includes('state.misses >= EQUIPMENT_TARGET_HARD_PITY'), 'hard pity is not applied before the random target roll'],
  [targeting.includes('level < 5'), 'max-level equipment can still remain a valid target'],
  [dropBalance.includes('targetedEquipmentForAward(source, guaranteedTarget)'), 'equipment awards do not consult the target system'],
  [dropBalance.includes('safeFloor === FINAL_BOSS_ROOM'), 'room 50 does not request the guaranteed target award'],
  [upgradeEconomy.includes('clearEquipmentTargetIfMaxed(id)'), 'upgrading an item to level five does not clear its target'],
  [saveBundle.includes("'dungeon-veil-equipment-target-v1'"), 'equipment target state is absent from cloud saves'],
  [inventory.includes('equipment-target-toggle') && inventory.includes('toggleEquipmentTarget'), 'inventory does not expose the equipment target control'],
  [report.rules.targetAwardsToLevelFive === 12, 'target simulator does not model unlock plus eleven upgrade copies'],
  [report.rules.finalBossGuaranteedTarget && report.rules.finalBossResetsSourcePity === false, 'target simulator does not preserve source pity across room 50'],
  [sourceReports.every(result => result.mean >= 6.5 && result.mean <= 8), 'a target source leaves the intended six-and-a-half to eight chapter mean corridor'],
  [sourceReports.every(result => result.median >= 7 && result.median <= 8), 'a target source leaves the intended seven-to-eight chapter median corridor'],
  [sourceReports.every(result => result.p90 <= 9), 'a target source exceeds the nine-chapter p90 ceiling'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Equipment targeting audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`Equipment targeting audit passed: median ${Math.min(...sourceReports.map(result => result.median))}-${Math.max(...sourceReports.map(result => result.median))} chapters, worst p90 ${Math.max(...sourceReports.map(result => result.p90))}.`);
