import type { Enemy, VisualEffect } from './entities';
import type { GameEngine } from './runEngine';
import { skillRank } from './runSkills';

const ARROW_STORM_EXTRA_ARROW_MULTIPLIER = 0.9;
const VEIL_CHAIN_FOLLOW_UP_MULTIPLIER = 1.1;
const ELEMENTAL_STORM_HITS_PER_BURST = 5;
const ELEMENTAL_STORM_DAMAGE_MULTIPLIER = 0.35;
const ELEMENTAL_STORM_RADIUS = 92;
const ELEMENTAL_STORM_MAX_TARGETS = 3;

type DamageEnemy = (
  enemy: Enemy,
  damage: number,
  time: number,
  fromX: number,
  fromY: number,
  element: VisualEffect['element'],
  scale?: number,
) => void;

type ApplyElementStatus = (enemy: Enemy, element: VisualEffect['element'], time: number) => void;
type BaseArrowDamage = (enemy: Enemy, multiplier?: number) => number;

type EngineInternals = {
  baseArrowDamage: BaseArrowDamage;
  damageEnemy: DamageEnemy;
  applyElementStatus: ApplyElementStatus;
};

export type RunFusionEffectState = {
  elementalHitCount: number;
};

export function createRunFusionEffectState(): RunFusionEffectState {
  return { elementalHitCount: 0 };
}

function hasFusion(engine: GameEngine, key: 'elementalStorm' | 'arrowStorm' | 'veilChain'): boolean {
  return skillRank(engine.state.runSkills, key) > 0;
}

function triggerElementalStormBurst(
  engine: GameEngine,
  originalDamageEnemy: DamageEnemy,
  source: Enemy,
  element: VisualEffect['element'],
  time: number,
): void {
  const x = source.x + source.width / 2;
  const y = source.y + source.height / 2;
  const damage = Math.max(1, Math.round(engine.state.player.attack * ELEMENTAL_STORM_DAMAGE_MULTIPLIER));
  const nearby = engine.state.enemies
    .filter(enemy => enemy.id !== source.id && enemy.hp > 0 && !enemy.isDead)
    .map(enemy => ({
      enemy,
      distance: Math.hypot(enemy.x + enemy.width / 2 - x, enemy.y + enemy.height / 2 - y),
    }))
    .filter(entry => entry.distance <= ELEMENTAL_STORM_RADIUS)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, ELEMENTAL_STORM_MAX_TARGETS);

  const color = element === 'ice' ? '#8be7ff' : '#ff8a55';
  engine.state.effects.push({
    id: `elemental-storm-${time}-${source.id}`,
    x,
    y,
    radius: 0,
    maxRadius: ELEMENTAL_STORM_RADIUS,
    color,
    lifeTime: 0,
    maxLifeTime: 420,
    type: 'circle',
    element,
  });
  engine.state.damageNumbers.push({
    id: `elemental-storm-label-${time}-${source.id}`,
    x,
    y: y - 22,
    value: 'ELEMENTARSTURM',
    color,
    lifeTime: 0,
    maxLifeTime: 900,
    scale: 1.1,
  });

  for (const { enemy } of nearby) {
    originalDamageEnemy.call(engine, enemy, damage, time, x, y, element, 0.9);
  }
}

export function installRunFusionEffects(engine: GameEngine, state = createRunFusionEffectState()): () => void {
  const internals = engine as unknown as EngineInternals;
  const originalBaseArrowDamage = internals.baseArrowDamage;
  const originalDamageEnemy = internals.damageEnemy;
  const originalApplyElementStatus = internals.applyElementStatus;

  if (typeof originalBaseArrowDamage !== 'function' || typeof originalDamageEnemy !== 'function' || typeof originalApplyElementStatus !== 'function') return () => {};

  const patchedBaseArrowDamage: BaseArrowDamage = function patchedBaseArrowDamage(enemy, multiplier = 1) {
    const adjusted = hasFusion(engine, 'arrowStorm') && Math.abs(multiplier - 0.82) < 0.0001
      ? ARROW_STORM_EXTRA_ARROW_MULTIPLIER
      : multiplier;
    return originalBaseArrowDamage.call(engine, enemy, adjusted);
  };

  const patchedDamageEnemy: DamageEnemy = function patchedDamageEnemy(enemy, damage, time, fromX, fromY, element, scale = 1) {
    const followUp = element === 'piercing' || element === 'arcane';
    const adjusted = hasFusion(engine, 'veilChain') && followUp
      ? Math.max(1, Math.round(damage * VEIL_CHAIN_FOLLOW_UP_MULTIPLIER))
      : damage;
    originalDamageEnemy.call(engine, enemy, adjusted, time, fromX, fromY, element, scale);
  };

  const patchedApplyElementStatus: ApplyElementStatus = function patchedApplyElementStatus(enemy, element, time) {
    originalApplyElementStatus.call(engine, enemy, element, time);
    if (!hasFusion(engine, 'elementalStorm') || (element !== 'fire' && element !== 'ice')) return;
    state.elementalHitCount += 1;
    if (state.elementalHitCount % ELEMENTAL_STORM_HITS_PER_BURST !== 0) return;
    triggerElementalStormBurst(engine, originalDamageEnemy, enemy, element, time);
  };

  internals.baseArrowDamage = patchedBaseArrowDamage;
  internals.damageEnemy = patchedDamageEnemy;
  internals.applyElementStatus = patchedApplyElementStatus;

  return () => {
    if (internals.baseArrowDamage === patchedBaseArrowDamage) internals.baseArrowDamage = originalBaseArrowDamage;
    if (internals.damageEnemy === patchedDamageEnemy) internals.damageEnemy = originalDamageEnemy;
    if (internals.applyElementStatus === patchedApplyElementStatus) internals.applyElementStatus = originalApplyElementStatus;
  };
}

export const RUN_FUSION_EFFECT_LIMITS = Object.freeze({
  arrowStormExtraArrowMultiplier: ARROW_STORM_EXTRA_ARROW_MULTIPLIER,
  veilChainFollowUpMultiplier: VEIL_CHAIN_FOLLOW_UP_MULTIPLIER,
  elementalStormHitsPerBurst: ELEMENTAL_STORM_HITS_PER_BURST,
  elementalStormDamageMultiplier: ELEMENTAL_STORM_DAMAGE_MULTIPLIER,
  elementalStormRadius: ELEMENTAL_STORM_RADIUS,
  elementalStormMaxTargets: ELEMENTAL_STORM_MAX_TARGETS,
});
