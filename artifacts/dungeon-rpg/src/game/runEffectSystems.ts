import type { GameEngine } from './runEngine';
import { makeHitSpark } from './combat';
import { distance } from './combat';

const FIRE_DEATH_RADIUS = 72;
const FIRE_DEATH_DAMAGE = 12;

export type RunEffectSystemState = {
  processedFireBursts: Set<string>;
};

export function createRunEffectSystemState(): RunEffectSystemState {
  return { processedFireBursts: new Set<string>() };
}

export function updateRunEffectSystems(engine: GameEngine, system: RunEffectSystemState, time: number): void {
  const activeFireBursts = engine.state.effects.filter(effect => effect.id.startsWith('fire-death-'));
  const activeIds = new Set(activeFireBursts.map(effect => effect.id));

  for (const effectId of system.processedFireBursts) {
    if (!activeIds.has(effectId)) system.processedFireBursts.delete(effectId);
  }

  for (const effect of activeFireBursts) {
    if (system.processedFireBursts.has(effect.id)) continue;
    system.processedFireBursts.add(effect.id);

    for (const enemy of engine.state.enemies) {
      if (enemy.isDead || enemy.hp <= 0) continue;
      const enemyX = enemy.x + enemy.width / 2;
      const enemyY = enemy.y + enemy.height / 2;
      if (distance(effect.x, effect.y, enemyX, enemyY) > FIRE_DEATH_RADIUS) continue;

      const damage = Math.min(FIRE_DEATH_DAMAGE, Math.max(1, Math.ceil(enemy.maxHp * 0.12)));
      enemy.hp -= damage;
      enemy.flashUntil = time + 150;
      enemy.lastHitTime = time;
      enemy.hitFromX = effect.x;
      enemy.hitFromY = effect.y;
      engine.state.damageNumbers.push({
        id: `fire-burst-${effect.id}-${enemy.id}`,
        x: enemyX,
        y: enemy.y - 8,
        value: `-${damage}`,
        color: '#ff642c',
        lifeTime: 0,
        maxLifeTime: 700,
        scale: 1.08,
      });
      engine.state.particles.push(...makeHitSpark(enemyX, enemyY, '#ff642c', 10));
    }
  }
}
