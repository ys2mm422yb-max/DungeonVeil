#!/usr/bin/env node

export const FUSION_CAPSTONE_RULES = Object.freeze({
  elementalHitsPerBurst: 5,
  elementalBurstDamage: 0.22,
  elementalMaximumTargets: 3,
  multishotSecondaryArrows: 3,
  multishotSecondaryDamage: 0.82,
  arrowStormSecondaryDamage: 0.9,
  ricochetHits: 3,
  ricochetDamage: 0.75,
  piercingHits: 3,
  piercingDamage: 0.8,
  veilChainFollowUpMultiplier: 1.1,
});

const round = (value, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const percent = value => round(value * 100, 2);

export function simulateFusionCapstones() {
  const rules = FUSION_CAPSTONE_RULES;

  const elementalSingleTargetUplift = rules.elementalBurstDamage / rules.elementalHitsPerBurst;
  const elementalDenseUplift = elementalSingleTargetUplift * rules.elementalMaximumTargets;

  const arrowBaseOutput = 1 + rules.multishotSecondaryArrows * rules.multishotSecondaryDamage;
  const arrowFusionOutput = 1 + rules.multishotSecondaryArrows * rules.arrowStormSecondaryDamage;
  const arrowUplift = arrowFusionOutput / arrowBaseOutput - 1;

  const veilBaseOutput = 1
    + rules.ricochetHits * rules.ricochetDamage
    + rules.piercingHits * rules.piercingDamage;
  const veilFusionOutput = 1
    + rules.ricochetHits * rules.ricochetDamage * rules.veilChainFollowUpMultiplier
    + rules.piercingHits * rules.piercingDamage * rules.veilChainFollowUpMultiplier;
  const veilUplift = veilFusionOutput / veilBaseOutput - 1;

  return {
    scenario: 'balanced-fusion-capstones-v2',
    rules,
    elementalStorm: {
      singleTargetUpliftPercent: percent(elementalSingleTargetUplift),
      maximumThreeTargetUpliftPercent: percent(elementalDenseUplift),
    },
    arrowStorm: {
      baseOutputPerAttack: round(arrowBaseOutput),
      fusionOutputPerAttack: round(arrowFusionOutput),
      upliftPercent: percent(arrowUplift),
    },
    veilChain: {
      baseOutputPerAttack: round(veilBaseOutput),
      fusionOutputPerAttack: round(veilFusionOutput),
      upliftPercent: percent(veilUplift),
    },
    persistentStatGrowth: 0,
    chapterMultiplier: 1,
  };
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) console.log(JSON.stringify(simulateFusionCapstones(), null, 2));
