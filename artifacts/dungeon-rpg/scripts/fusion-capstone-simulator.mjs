#!/usr/bin/env node

export const FUSION_CAPSTONE_RULES = Object.freeze({
  elementalTriggerEvery: 5,
  elementalBurstDamage: 0.22,
  elementalReferenceTargets: 3,
  arrowTriggerEvery: 5,
  arrowBaseTargets: 3,
  arrowBaseDamage: 0.7,
  arrowFusionTargets: 4,
  arrowFusionDamage: 0.9,
  multishotSecondaryArrows: 3,
  multishotSecondaryDamage: 0.82,
  ricochetHits: 3,
  ricochetDamage: 0.75,
  piercingHits: 3,
  piercingDamage: 0.8,
  veilChainBonusDamage: 0.1,
});

const percent = value => Math.round(value * 10_000) / 100;

export function simulateFusionCapstones() {
  const rules = FUSION_CAPSTONE_RULES;
  const elementalSingleTarget = rules.elementalBurstDamage / rules.elementalTriggerEvery;
  const elementalDense = elementalSingleTarget * rules.elementalReferenceTargets;

  const arrowBasePerAttack = 1
    + rules.multishotSecondaryArrows * rules.multishotSecondaryDamage
    + rules.arrowBaseTargets * rules.arrowBaseDamage / rules.arrowTriggerEvery;
  const arrowFusionPerAttack = 1
    + rules.multishotSecondaryArrows * rules.multishotSecondaryDamage
    + rules.arrowFusionTargets * rules.arrowFusionDamage / rules.arrowTriggerEvery;
  const arrowUplift = arrowFusionPerAttack / arrowBasePerAttack - 1;

  const veilBasePerAttack = 1
    + rules.ricochetHits * rules.ricochetDamage
    + rules.piercingHits * rules.piercingDamage;
  const veilFusionPerAttack = veilBasePerAttack
    + (rules.ricochetHits + rules.piercingHits) * rules.veilChainBonusDamage;
  const veilUplift = veilFusionPerAttack / veilBasePerAttack - 1;

  return {
    scenario: 'balanced-fusion-capstones',
    rules,
    elementalStorm: {
      singleTargetUpliftPercent: percent(elementalSingleTarget),
      threeTargetUpliftPercent: percent(elementalDense),
    },
    arrowStorm: {
      previousOutputPerAttack: Math.round(arrowBasePerAttack * 1000) / 1000,
      fusionOutputPerAttack: Math.round(arrowFusionPerAttack * 1000) / 1000,
      upliftPercent: percent(arrowUplift),
    },
    veilChain: {
      previousOutputPerAttack: Math.round(veilBasePerAttack * 1000) / 1000,
      fusionOutputPerAttack: Math.round(veilFusionPerAttack * 1000) / 1000,
      upliftPercent: percent(veilUplift),
    },
    persistentStatGrowth: 0,
    chapterMultiplier: 1,
  };
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) console.log(JSON.stringify(simulateFusionCapstones(), null, 2));
