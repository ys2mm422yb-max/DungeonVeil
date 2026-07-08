import type { GameEngine } from './runEngine';
import { makeHitSpark, distance } from './combat';

const FIRE_DEATH_RADIUS = 72;
const FIRE_DEATH_DAMAGE = 12;

export type RunEffectSystemState = {
  processedFireBursts: Set<string>;
  finalizedBurns: Map<string, number>;
};

export function createRunEffectSystemState(): RunEffectSystemState {
  return {
    processedFireBursts: new Set<string>(),
    finalizedBurns: new Map<string, number>(),
  };
}

function cleanInstantEffectsFromBuild(engine: GameEngine): void {
  if (!Object.prototype.hasOwnProperty.call(engine.state.runSkills, 'heal')) return;
  delete engine.state.runSkills.heal;
  engine.saveNow('ability-cleanup');
}

function applyFinalBurnTicks(engine: GameEngine, system: RunEffectSystemState, time: number): void {
  const activeEnemyIds = new Set(engine.state.enemies.map(enemy => enemy.id));
  for (const enemyId of system.finalizedBurns.keys()) {
    if (!activeEnemyIds.has(enemyId)) system.finalizedBurns.delete(enemyId);
  }

  for (const enemy of engine.state.enemies) {
    if (enemy.isDead || enemy.hp <= 0 || !enemy.burnUntil || !enemy.nextBurnTick || !enemy.burnDamage) continue;
    if (time < enemy.burnUntil || enemy.nextBurnTick > enemy.burnUntil) continue;
    if (system.finalizedBurns.get(enemy.id) === enemy.burnUntil) continue;

    system.finalizedBurns.set(enemy.id, enemy.burnUntil);
    enemy.nextBurnTick = enemy.burnUntil + 1;
    enemy.hp -= enemy.burnDamage;
    const enemyX = enemy.x + enemy.width / 2;
    const enemyY = enemy.y + enemy.height / 2;
    engine.state.damageNumbers.push({
      id: `burn-final-${enemy.id}-${enemy.burnUntil}`,
      x: enemyX,
      y: enemy.y - 5,
      value: `-${enemy.burnDamage}`,
      color: '#ff6a2c',
      lifeTime: 0,
      maxLifeTime: 550,
      scale: 0.78,
    });
    engine.state.particles.push(...makeHitSpark(enemyX, enemyY, '#ff6a2c', 4));
  }
}

function applyFireDeathBursts(engine: GameEngine, system: RunEffectSystemState, time: number): void {
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
      const lethal = enemy.hp - damage <= 0;
      enemy.hp -= damage;
      if (lethal) enemy.burnRanks = 0;
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

export function updateRunEffectSystems(engine: GameEngine, system: RunEffectSystemState, time: number): void {
  cleanInstantEffectsFromBuild(engine);
  applyFinalBurnTicks(engine, system, time);
  applyFireDeathBursts(engine, system, time);
}
