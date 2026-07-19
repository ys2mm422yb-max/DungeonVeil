import type { Enemy, Player, VisualEffect } from './entities';
import { GameEngine } from './runEngine';
import {
  BASE_CRIT_CHANCE,
  BASE_CRIT_DAMAGE,
  MAX_TOTAL_CRIT_CHANCE,
  MAX_TOTAL_CRIT_DAMAGE,
} from './equipmentCore';

export type CriticalDamageResult = {
  damage: number;
  critical: boolean;
  chance: number;
  multiplier: number;
};

type DamageEnemyMethod = (
  enemy: Enemy,
  damage: number,
  time: number,
  fromX: number,
  fromY: number,
  element: VisualEffect['element'],
  scale?: number,
) => void;

type CombatPrototype = {
  damageEnemy: DamageEnemyMethod;
};

let installed = false;

function boundedChance(player: Player): number {
  return Math.max(0, Math.min(MAX_TOTAL_CRIT_CHANCE, Number(player.critChance) || BASE_CRIT_CHANCE));
}

function boundedMultiplier(player: Player): number {
  return Math.max(1, Math.min(MAX_TOTAL_CRIT_DAMAGE, Number(player.critDamage) || BASE_CRIT_DAMAGE));
}

export function resolvePrimaryArrowCritical(
  player: Player,
  damage: number,
  scale: number,
  random: () => number = Math.random,
): CriticalDamageResult {
  const chance = boundedChance(player);
  const multiplier = boundedMultiplier(player);
  const primaryArrow = scale >= 1.18;
  const critical = primaryArrow && random() < chance;
  return {
    damage: critical ? Math.max(1, Math.round(damage * multiplier)) : Math.max(1, Math.round(damage)),
    critical,
    chance,
    multiplier,
  };
}

export function installCriticalCombat(): void {
  if (installed) return;
  installed = true;
  const prototype = GameEngine.prototype as unknown as CombatPrototype;
  const original = prototype.damageEnemy;
  if (typeof original !== 'function') return;

  prototype.damageEnemy = function criticalDamageEnemy(
    this: GameEngine,
    enemy,
    damage,
    time,
    fromX,
    fromY,
    element,
    scale = 1,
  ): void {
    const result = resolvePrimaryArrowCritical(this.state.player, damage, scale);
    original.call(this, enemy, result.damage, time, fromX, fromY, element, result.critical ? Math.max(1.5, scale + 0.38) : scale);
    if (!result.critical) return;

    const number = [...this.state.damageNumbers].reverse().find(entry => (
      entry.id.startsWith(`dmg-${time}-${enemy.id}-`)
    ));
    if (number) {
      number.value = `KRIT · -${result.damage}`;
      number.color = '#ffd45f';
      number.scale = Math.max(1.55, number.scale ?? 1);
      number.maxLifeTime = Math.max(850, number.maxLifeTime);
    }
  };
}
