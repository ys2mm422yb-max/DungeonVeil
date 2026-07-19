import type { GameEngine } from './runEngine';
import { loadMetaProgression, type MetaProgression } from './metaProgression';
import {
  ACTIVE_EQUIPMENT,
  ACTIVE_EQUIPMENT_SLOTS,
  BASE_CRIT_CHANCE,
  BASE_CRIT_DAMAGE_MULTIPLIER,
  MAX_ATTACK_SPEED_PERCENT,
  MAX_CRIT_CHANCE,
  MAX_CRIT_DAMAGE_MULTIPLIER,
  MAX_EQUIPMENT_RANGE_BONUS,
  activeEquipmentLevelStats,
  isActiveEquipmentId,
} from './equipmentRedesign';

export type RedesignedEquipmentCombatModifiers = {
  attackFlat: number;
  attackPercent: number;
  critChance: number;
  critDamageMultiplier: number;
  maxHp: number;
  defense: number;
  speedPercent: number;
  attackRange: number;
  attackSpeedPercent: number;
  attackCooldownMultiplier: number;
  dodgeCooldownMultiplier: number;
  grantedSkills: Record<string, never>;
};

export type CriticalDamageResult = {
  damage: number;
  critical: boolean;
  multiplier: number;
};

export function redesignedEquipmentCombatModifiers(meta: MetaProgression = loadMetaProgression()): RedesignedEquipmentCombatModifiers {
  const result: RedesignedEquipmentCombatModifiers = {
    attackFlat: 0,
    attackPercent: 0,
    critChance: BASE_CRIT_CHANCE,
    critDamageMultiplier: BASE_CRIT_DAMAGE_MULTIPLIER,
    maxHp: 0,
    defense: 0,
    speedPercent: 0,
    attackRange: 0,
    attackSpeedPercent: 0,
    attackCooldownMultiplier: 1,
    dodgeCooldownMultiplier: 1,
    grantedSkills: {},
  };

  let critDamageBonus = 0;
  for (const slot of ACTIVE_EQUIPMENT_SLOTS) {
    const id = meta.equipped[slot];
    if (!isActiveEquipmentId(id) || ACTIVE_EQUIPMENT[id].slot !== slot) continue;
    const level = Math.max(1, Math.min(5, meta.owned[id]?.level ?? 1));
    const stats = activeEquipmentLevelStats(id, level);
    result.attackFlat += stats.attackFlat ?? 0;
    result.maxHp += stats.maxHp ?? 0;
    result.defense += stats.defense ?? 0;
    result.attackRange += stats.attackRange ?? 0;
    result.attackSpeedPercent += stats.attackSpeedPercent ?? 0;
    result.critChance += stats.critChance ?? 0;
    critDamageBonus += stats.critDamageBonus ?? 0;
  }

  result.attackRange = Math.min(MAX_EQUIPMENT_RANGE_BONUS, result.attackRange);
  result.attackSpeedPercent = Math.min(MAX_ATTACK_SPEED_PERCENT, result.attackSpeedPercent);
  result.critChance = Math.min(MAX_CRIT_CHANCE, result.critChance);
  result.critDamageMultiplier = Math.min(MAX_CRIT_DAMAGE_MULTIPLIER, BASE_CRIT_DAMAGE_MULTIPLIER + critDamageBonus);
  result.attackCooldownMultiplier = 1 / (1 + result.attackSpeedPercent);
  return result;
}

export function criticalDamage(
  baseDamage: number,
  modifiers = redesignedEquipmentCombatModifiers(),
  random: () => number = Math.random,
): CriticalDamageResult {
  const safeBase = Math.max(1, Math.round(Number(baseDamage) || 1));
  const critical = random() < modifiers.critChance;
  const multiplier = critical ? modifiers.critDamageMultiplier : 1;
  return { damage: Math.max(1, Math.round(safeBase * multiplier)), critical, multiplier };
}

export function defenseMitigation(defense: number, cap = 0.52): number {
  const safeDefense = Math.max(0, Number(defense) || 0);
  return Math.min(Math.max(0, cap), safeDefense / (safeDefense + 32));
}

export function mitigatedIncomingDamage(rawDamage: number, defense: number, cap = 0.52): number {
  const raw = Math.max(1, Math.round(Number(rawDamage) || 1));
  return Math.max(1, Math.round(raw * (1 - defenseMitigation(defense, cap))));
}

export function installCriticalHitRuntime(engine: GameEngine): () => void {
  const runtime = engine as GameEngine & { damageEnemy?: (...args: any[]) => void };
  const original = runtime.damageEnemy;
  if (typeof original !== 'function') return () => {};
  const bound = original.bind(engine);

  runtime.damageEnemy = (enemy: any, baseDamage: number, time: number, fromX: number, fromY: number, element: any, scale = 1) => {
    const result = criticalDamage(baseDamage);
    const before = engine.state.damageNumbers.length;
    bound(enemy, result.damage, time, fromX, fromY, element, result.critical ? Math.max(1.45, scale + 0.35) : scale);
    if (!result.critical) return;
    const number = engine.state.damageNumbers.at(-1);
    if (!number || engine.state.damageNumbers.length <= before) return;
    number.value = `KRIT -${result.damage}`;
    number.color = '#ffd86b';
    number.scale = Math.max(1.45, number.scale ?? 1.45);
    number.maxLifeTime = Math.max(number.maxLifeTime, 850);
    engine.state.effects.push({
      id: `critical-hit-${time}-${enemy?.id ?? 'enemy'}`,
      x: (enemy?.x ?? fromX) + (enemy?.width ?? 0) / 2,
      y: (enemy?.y ?? fromY) + (enemy?.height ?? 0) / 2,
      radius: 4,
      maxRadius: 38,
      color: '#ffd86b',
      lifeTime: 0,
      maxLifeTime: 220,
      type: 'flash',
      element: 'normal',
    });
  };

  return () => {
    runtime.damageEnemy = original;
  };
}
