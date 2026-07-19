#!/usr/bin/env node
import './validate-combat-balance-v4.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulateTenItemRelicGrind } from './ten-item-relic-grind-simulator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const redesign = read('src/game/equipmentRedesign.ts');
const meta = read('src/game/metaProgression.ts');
const runtime = read('src/game/equipmentRuntimeBalance.ts');
const playerRuntime = read('src/game/equipmentPlayerRuntimeV4.ts');
const combat = read('src/game/equipmentCombatV4.ts');
const migration = read('src/game/metaMigrationV4.ts');
const targeting = read('src/game/equipmentTargeting.ts');
const drops = read('src/game/equipmentDropContract.ts');
const inventory = read('src/components/screens/VeilChamberScreenV4.tsx');
const relics = read('src/game/veilRelics.ts');

function assert(condition, message) {
  if (!condition) throw new Error(`Ten-item/relic audit failed: ${message}`);
}

const activeIds = [...redesign.matchAll(/^\s{2}'([^']+)': \{/gm)].map(match => match[1]);
assert(activeIds.length === 10, `expected exactly 10 active definitions, found ${activeIds.length}`);
assert(activeIds.filter(id => id.includes('bow')).length === 4, 'expected four active bows');
assert(activeIds.filter(id => id.includes('quiver')).length === 3, 'expected three active quivers');
assert(activeIds.filter(id => id.includes('armor') || id === 'ranger-cloak').length === 3, 'expected three active armors');
assert(redesign.includes("ACTIVE_EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor']"), 'active slot contract missing');
assert(meta.includes("export * from './metaStoreV4'"), 'V4 meta store is not canonical');
assert(meta.includes("export * from './metaRuntimeV4'"), 'V4 loadout runtime is not canonical');
assert(migration.includes('migrationCompensation'), 'migration compensation missing');
assert(migration.includes('legacyReplacementFor'), 'legacy replacement table not used');
assert(playerRuntime.includes('Math.floor(kills / 7)'), 'Marked Claw seven-kill trigger missing');
assert(playerRuntime.includes('Math.min(1.75'), 'shared attack-speed cap missing');
assert(playerRuntime.includes('1.03 / 1.04'), 'legacy crown correction missing');
assert(runtime.includes('installCriticalHitRuntime'), 'critical runtime is not wired');
assert(combat.includes('MAX_CRIT_CHANCE'), 'critical chance cap missing');
assert(combat.includes('KRIT -'), 'visible critical damage text missing');
assert(!runtime.includes('EQUIPMENT_SKILL_SETS') && !playerRuntime.includes('EQUIPMENT_SKILL_SETS'), 'legacy equipment skill sets remain active');
assert(!runtime.includes('setRank(engine') && !playerRuntime.includes('setRank(engine'), 'equipment still grants run-skill ranks');
assert(inventory.includes("const TABS: ChamberTab[] = ['bow', 'quiver', 'armor', 'relic']"), 'four-tab inventory contract missing');
assert(!inventory.includes('inventory-tab-talisman'), 'talisman tab remains visible');
assert(inventory.includes('critDamageMultiplier'), 'critical damage preview missing');
assert(targeting.includes('SOURCE_WISH_CHANCE = 0.18'), 'source wish chance not hardened');
assert(targeting.includes('CHAPTER_WISH_CHANCE = 0.24'), 'chapter wish chance not hardened');
assert(targeting.includes('WISH_PITY_MISSES = 7'), 'source pity not delayed');
assert(targeting.includes("rarity === 'common' ? 8 : rarity === 'rare' ? 11 : 15"), 'rarity-based mark costs missing');
assert(drops.includes('HUNT_EQUIPMENT_DROP_CHANCE = 0.08'), 'hunt equipment chance not reduced');
assert(drops.includes('50: 0.42'), 'room 50 milestone chance missing');
assert(relics.includes('RELIC_UNOWNED_PREFERENCE = 0.65'), 'bounded unowned relic preference missing');
assert(relics.includes('hunt: 9, boss: 11'), 'later relic pity missing');
assert(relics.includes('maximal vier Stapel'), 'bounded crown description missing');

const simulation = simulateTenItemRelicGrind();
assert(simulation.samplesPerCoreConfiguration >= 4096, 'core simulator must use at least 4096 deterministic samples per configuration');
assert(simulation.samplesPerMigrationConfiguration >= 2048, 'migration cohorts must use at least 2048 deterministic samples');
assert(JSON.stringify(simulation.wishPolicies) === JSON.stringify(['none', 'persistent', 'switching']), 'wish policy matrix is incomplete');
assert(Object.keys(simulation.playerProfiles).sort().join(',') === 'average,strong,weak', 'weak, average and strong player profiles are required');

for (const mode of ['solo', 'duo']) {
  assert(Object.keys(simulation.modes[mode]).length === 10, `${mode} baseline does not cover all ten items`);
  for (const policy of simulation.wishPolicies) {
    const rows = simulation.scenarioMatrix[mode][policy];
    assert(Object.keys(rows).length === 10, `${mode}/${policy} does not cover all ten items`);
    for (const [id, row] of Object.entries(rows)) {
      assert(Number.isFinite(row.firstFindChapter.p99) && row.firstFindChapter.p99 <= simulation.maxChapters, `${mode}/${policy}/${id} first-find P99 is not finite`);
      assert(Number.isFinite(row.level5Chapter.p99) && row.level5Chapter.p99 <= simulation.maxChapters, `${mode}/${policy}/${id} level-five P99 is not finite`);
      assert(row.level5Chapter.median >= row.firstFindChapter.median, `${mode}/${policy}/${id} reaches level five before first find`);
      assert(row.goldRequirement > 0 && row.dustRequirement > 0 && row.copyRequirement > 0 && row.markCostPerCopy > 0, `${mode}/${policy}/${id} resource requirements are incomplete`);
      assert(row.luckCases.extremeLuckLevel5Chapter <= row.luckCases.extremeBadLuckLevel5Chapter, `${mode}/${policy}/${id} luck bounds are inverted`);
      assert(['weak', 'average', 'strong'].every(profile => row.playerProfiles[profile]?.medianRunsToLevel5 > 0 && row.playerProfiles[profile]?.medianHoursToLevel5 > 0), `${mode}/${policy}/${id} player profile timing is incomplete`);
    }
  }
}

for (const fixture of ['legacyMidProgress', 'legacyAdvanced']) {
  assert(Object.keys(simulation.migratedSaves[fixture]).length === 10, `${fixture} does not cover all ten migrated items`);
  for (const row of Object.values(simulation.migratedSaves[fixture])) {
    assert(row.level5Chapter.p99 <= simulation.maxChapters, `${fixture} level-five P99 is not finite`);
  }
}

for (const mode of ['solo', 'duo']) {
  const relicReport = simulation.relics.modes[mode];
  assert(relicReport.sixCoreRelicsChapter.p99 <= simulation.maxChapters, `${mode} six-core relic P99 is not finite`);
  assert(relicReport.allSevenRelicsChapter.p99 <= simulation.maxChapters, `${mode} seven-relic P99 is not finite`);
  assert(relicReport.duplicateDustBeforeCollection.mean >= 0, `${mode} relic duplicate compensation is invalid`);
}
assert(simulation.duoParity.grindNotHalved === true && simulation.duoParity.duoToSoloRatio >= 0.75, 'Duo materially halves the long-term grind');
assert(simulation.companionReserve.average >= 1.08 && simulation.companionReserve.maximum <= 1.12, 'companion reserve must stay between 8% and 12%');
assert(simulation.companionReserve.requiredWithoutCompanion === true, 'base game must remain complete without companions');
assert(simulation.companionReserve.changesDropChapters === false, 'companions must not accelerate drop chapters');

console.log(JSON.stringify({
  activeItems: activeIds,
  samplesPerCoreConfiguration: simulation.samplesPerCoreConfiguration,
  samplesPerMigrationConfiguration: simulation.samplesPerMigrationConfiguration,
  wishPolicies: simulation.wishPolicies,
  duoParity: simulation.duoParity,
  relics: simulation.relics,
  companionReserve: simulation.companionReserve,
}, null, 2));
console.log('Ten-item equipment, migration, full wish matrix, player profiles, relics, Solo/Duo parity and companion reserve audit passed.');
