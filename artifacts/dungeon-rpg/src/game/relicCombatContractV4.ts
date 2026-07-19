import type { VeilRelicId } from './veilRelics';

export type RelicCombatModeV4 = 'solo' | 'duo' | 'worldboss';

export const RELIC_COMBAT_V4 = Object.freeze({
  ashEye: Object.freeze({ earlierFloorOffset: 2, chapterHuntBonusCap: 1 }),
  markedClaw: Object.freeze({ killsPerProc: 7, attackSpeedBonus: 0.14, durationMs: 2_500 }),
  nightHuntSigil: Object.freeze({ dustMultiplier: 1.5 }),
  veilHeart: Object.freeze({ restoreHealthFraction: 0.25, invincibilityMs: 1_000, usesPerRun: 1 }),
  guardianCrown: Object.freeze({ attackPerStack: 0.03, maxStacks: 4, maximumAttackBonus: 0.12 }),
  depthRuneShard: Object.freeze({ runeDamageReduction: 0.18 }),
  worldCore: Object.freeze({ attackBonus: 0.04, maximumHealthBonus: 0.07 }),
});

export const RELIC_MODE_POLICY_V4: Readonly<Record<VeilRelicId, Readonly<Record<RelicCombatModeV4, boolean>>>> = Object.freeze({
  'ash-eye': Object.freeze({ solo: true, duo: true, worldboss: false }),
  'marked-claw': Object.freeze({ solo: true, duo: true, worldboss: false }),
  'night-hunt-sigil': Object.freeze({ solo: true, duo: true, worldboss: false }),
  'veil-heart': Object.freeze({ solo: true, duo: true, worldboss: true }),
  'broken-guardian-crown': Object.freeze({ solo: true, duo: true, worldboss: false }),
  'depth-rune-shard': Object.freeze({ solo: true, duo: true, worldboss: false }),
  'world-core': Object.freeze({ solo: true, duo: true, worldboss: true }),
});

export function markedClawAttackCooldownV4(baseCooldownMs: number, active: boolean): number {
  if (!active) return Math.max(120, baseCooldownMs);
  return Math.max(120, baseCooldownMs / (1 + RELIC_COMBAT_V4.markedClaw.attackSpeedBonus));
}

export function guardianCrownAttackMultiplierV4(stacks: number): number {
  const normalized = Math.max(0, Math.min(RELIC_COMBAT_V4.guardianCrown.maxStacks, Math.floor(Number(stacks) || 0)));
  return 1 + normalized * RELIC_COMBAT_V4.guardianCrown.attackPerStack;
}

export function depthRuneDamageV4(rawDamage: number, defense: number, equipped: boolean): number {
  const reduced = Math.max(0, rawDamage) * (equipped ? 1 - RELIC_COMBAT_V4.depthRuneShard.runeDamageReduction : 1);
  return Math.max(1, Math.round(reduced - Math.max(0, defense) * 0.5));
}

export function worldCoreRunStatsV4(attack: number, maximumHealth: number) {
  const attackGain = Math.max(1, Math.round(Math.max(1, attack) * RELIC_COMBAT_V4.worldCore.attackBonus));
  const healthGain = Math.max(1, Math.round(Math.max(1, maximumHealth) * RELIC_COMBAT_V4.worldCore.maximumHealthBonus));
  return { attackGain, healthGain } as const;
}

export function veilHeartRestoreV4(maximumHealth: number): number {
  return Math.max(1, Math.round(Math.max(1, maximumHealth) * RELIC_COMBAT_V4.veilHeart.restoreHealthFraction));
}

export function relicModeEnabledV4(id: VeilRelicId, mode: RelicCombatModeV4): boolean {
  return RELIC_MODE_POLICY_V4[id][mode];
}

export type RelicAuditRowV4 = Readonly<{
  id: VeilRelicId;
  category: 'hunt' | 'survival' | 'boss' | 'hazard' | 'universal';
  maximumCombatReserve: number;
  solo: boolean;
  duo: boolean;
  worldboss: boolean;
}>;

export const RELIC_AUDIT_ROWS_V4: readonly RelicAuditRowV4[] = Object.freeze([
  { id: 'ash-eye', category: 'hunt', maximumCombatReserve: 0, ...RELIC_MODE_POLICY_V4['ash-eye'] },
  { id: 'marked-claw', category: 'hunt', maximumCombatReserve: RELIC_COMBAT_V4.markedClaw.attackSpeedBonus, ...RELIC_MODE_POLICY_V4['marked-claw'] },
  { id: 'night-hunt-sigil', category: 'hunt', maximumCombatReserve: 0, ...RELIC_MODE_POLICY_V4['night-hunt-sigil'] },
  { id: 'veil-heart', category: 'survival', maximumCombatReserve: 0, ...RELIC_MODE_POLICY_V4['veil-heart'] },
  { id: 'broken-guardian-crown', category: 'boss', maximumCombatReserve: RELIC_COMBAT_V4.guardianCrown.maximumAttackBonus, ...RELIC_MODE_POLICY_V4['broken-guardian-crown'] },
  { id: 'depth-rune-shard', category: 'hazard', maximumCombatReserve: 0, ...RELIC_MODE_POLICY_V4['depth-rune-shard'] },
  { id: 'world-core', category: 'universal', maximumCombatReserve: RELIC_COMBAT_V4.worldCore.attackBonus, ...RELIC_MODE_POLICY_V4['world-core'] },
]);
