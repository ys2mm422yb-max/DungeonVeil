#!/usr/bin/env node
import { simulateBoundedGiftProgression } from './bounded-gift-progression-simulator.mjs';

export const EQUIPMENT_DROP_BALANCE_RULES = Object.freeze({
  normalRoomChance: 0.03,
  eligibleNormalRooms: 43,
  huntEquipmentChance: 0.12,
  steadyHuntsPerChapter: 12.04,
  guaranteedBossDrops: 5,
  fixedBossSources: { 10: 'forge', 20: 'ritual', 30: 'warden', 40: 'depth' },
  finalBossMode: 'wildcard',
  starterItemsIncluded: true,
  primarySourceFallback: true,
});

const round = (value, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function simulateEquipmentDropBalance(options = {}) {
  const report = simulateBoundedGiftProgression(options);
  const rules = EQUIPMENT_DROP_BALANCE_RULES;
  const normalDrops = rules.eligibleNormalRooms * rules.normalRoomChance;
  const huntDrops = rules.steadyHuntsPerChapter * rules.huntEquipmentChance;
  const expectedDrops = rules.guaranteedBossDrops + normalDrops + huntDrops;

  const normalPrimaryRooms = { forge: 12, ritual: 10, warden: 12, depth: 9 };
  const wildcardShare = 1 / 4;
  const nonHunt = Object.fromEntries(Object.entries(normalPrimaryRooms).map(([source, rooms]) => [
    source,
    round(1 + rooms * rules.normalRoomChance + wildcardShare),
  ]));
  const sourceAwardsPerChapter = {
    forge: nonHunt.forge,
    ritual: nonHunt.ritual,
    warden: nonHunt.warden,
    depth: nonHunt.depth,
    hunt: round(huntDrops),
  };
  const awards = Object.values(sourceAwardsPerChapter);
  const sourceRatio = Math.max(...awards) / Math.min(...awards);
  const removedWarnings = new Set([
    'starter_copies_impossible',
    'equipment_source_skew',
    'early_guaranteed_drops_have_empty_pools',
  ]);

  return {
    ...report,
    simulatorVersion: `${report.simulatorVersion}+equipment-drops-1`,
    scenario: 'balanced-equipment-drop-sources',
    currentRules: { ...report.currentRules, ...rules },
    equipmentDropsPerChapter: {
      guaranteedBossDrops: rules.guaranteedBossDrops,
      expectedNormalDrops: round(normalDrops),
      expectedHuntDrops: round(huntDrops),
      expectedTotal: round(expectedDrops),
    },
    balancedSourceAwardsPerChapter: sourceAwardsPerChapter,
    balancedSourceAwardRatio: round(sourceRatio),
    warnings: [
      ...report.warnings.filter(warning => !removedWarnings.has(warning.code)),
      {
        code: 'targeted_copy_control_missing',
        severity: 'warning',
        message: 'Drop sources are balanced, but wishlist, source marks and hard pity are still required for predictable level-five targeting.',
      },
    ],
  };
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) console.log(JSON.stringify(simulateEquipmentDropBalance(), null, 2));
