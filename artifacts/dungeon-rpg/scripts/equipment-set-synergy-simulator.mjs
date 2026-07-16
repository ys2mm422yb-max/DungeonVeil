#!/usr/bin/env node

export const EQUIPMENT_SET_RULES = Object.freeze({
  frostDurationMultiplier: 1.2,
  frostDeathExplosionScale: 0.15,
  runeRicochetBonusScale: 0.08,
  ritualPulseEvery: 3,
  ritualPulseScale: 0.12,
  splinterPierceBonusScale: 0.1,
});

export function simulateEquipmentSetSynergies({ attacks = 300 } = {}) {
  const rules = EQUIPMENT_SET_RULES;
  const ricochets = Math.max(0, Math.floor(attacks));
  const ritualPulses = Math.floor(ricochets / rules.ritualPulseEvery);
  const runeBonusDamage = ricochets * rules.runeRicochetBonusScale;
  const ritualBonusDamage = ritualPulses * rules.ritualPulseScale;
  return {
    scenario: 'equipment-set-synergies',
    attacks: ricochets,
    rules,
    effectivePerHit: {
      runeRicochet: rules.runeRicochetBonusScale,
      ritualPulse: ritualBonusDamage / Math.max(1, ricochets),
      combinedRicochet: (runeBonusDamage + ritualBonusDamage) / Math.max(1, ricochets),
      splinterPierce: rules.splinterPierceBonusScale,
    },
  };
}

const direct = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (direct) console.log(JSON.stringify(simulateEquipmentSetSynergies(), null, 2));
