import { readFile } from 'node:fs/promises';
import { simulateEquipmentSetSynergies } from './equipment-set-synergy-simulator.mjs';

const [synergies, presentation] = await Promise.all([
  readFile(new URL('../src/game/runSynergies.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentPresentation.ts', import.meta.url), 'utf8'),
]);

const report = simulateEquipmentSetSynergies({ attacks: 300 });
const effective = report.effectivePerHit;

const checks = [
  [synergies.includes("hasEquipment(state, 'frost-quiver')") && synergies.includes('(current - time) * 1.2'), 'Frost Quiver does not extend active frost by 20%'],
  [synergies.includes("hasEquipment(state, 'frost-grimoire')") && synergies.includes('player.attack * 0.15') && synergies.includes('frost-grimoire-'), 'Frost Grimoire does not create bounded frozen-death explosions'],
  [synergies.includes("hasEquipment(state, 'rune-quiver')") && synergies.includes('player.attack * 0.08'), 'Rune Quiver does not add 8% ricochet damage'],
  [synergies.includes("hasEquipment(state, 'ritual-shard')") && synergies.includes('state.ritualRicochets % 3 === 0') && synergies.includes('player.attack * 0.12'), 'Ritual Shard does not pulse every third ricochet'],
  [synergies.includes("hasEquipment(state, 'splinter-quiver')") && synergies.includes('player.attack * 0.1'), 'Splinter Quiver does not add 10% piercing damage'],
  [presentation.includes('Frost hält 20 % länger') && presentation.includes('gefrorene Tode explodieren'), 'frost equipment descriptions do not explain the new interactions'],
  [presentation.includes('Kettentreffer verursachen 8 % Zusatzschaden') && presentation.includes('jeder dritte Kettentreffer erzeugt einen Ritualimpuls'), 'ricochet equipment descriptions do not explain the new interactions'],
  [presentation.includes('Durchschlagstreffer verursachen 10 % Zusatzschaden'), 'piercing equipment description does not explain the new interaction'],
  [effective.runeRicochet === 0.08 && effective.ritualPulse === 0.04 && effective.combinedRicochet === 0.12, 'ricochet set leaves the intended 8%/4%/12% effective corridor'],
  [effective.splinterPierce === 0.1, 'piercing set leaves the intended 10% bonus'],
  [effective.combinedRicochet <= 0.15, 'combined ricochet equipment exceeds the 15% capstone corridor'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Equipment set synergy audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`Equipment set synergy audit passed: ricochet ${Math.round(effective.combinedRicochet * 100)}%, piercing ${Math.round(effective.splinterPierce * 100)}%, frost duration +20%.`);
