import type { GameEngine } from './runEngine';
import { skillRank } from './runSkills';

export type RunSynergyId = 'inferno-lance' | 'shatterfrost' | 'arrow-storm' | 'veil-step';

export type RunSynergyState = {
  announced: Set<RunSynergyId>;
  processedEffects: Set<string>;
  lastAttackTime: number;
  attackChain: number;
  lastDodgeTime: number;
};

export function createRunSynergyState(): RunSynergyState {
  return { announced: new Set(), processedEffects: new Set(), lastAttackTime: 0, attackChain: 0, lastDodgeTime: 0 };
}

function announce(state: RunSynergyState, id: RunSynergyId, title: string, text: string) {
  if (state.announced.has(id)) return;
  state.announced.add(id);
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'SYNERGIE ERWACHT', text: `${title} · ${text}`, tone: 'relic' } }));
}

function damageEnemy(engine: GameEngine, enemy: GameEngine['state']['enemies'][number], damage: number, time: number, color: string, id: string) {
  if (enemy.isDead || enemy.hp <= 0) return;
  enemy.hp -= damage;
  enemy.flashUntil = time + 120;
  enemy.lastHitTime = time;
  const x = enemy.x + enemy.width / 2;
  const y = enemy.y + enemy.height / 2;
  engine.state.damageNumbers.push({ id: `${id}-${time}-${enemy.id}`, x, y: enemy.y - 8, value: `-${damage}`, color, lifeTime: 0, maxLifeTime: 650, scale: 1.18 });
}

function infernoLance(engine: GameEngine, state: RunSynergyState, time: number) {
  if (skillRank(engine.state.runSkills, 'fireArrow') < 2 || skillRank(engine.state.runSkills, 'piercing') < 2) return;
  announce(state, 'inferno-lance', 'INFERNO-LANZE', 'Durchbohren entzündet eine Feuerbahn');
  for (const effect of engine.state.effects) {
    if (!effect.id.startsWith('pierce-') || state.processedEffects.has(effect.id)) continue;
    state.processedEffects.add(effect.id);
    const target = effect.toEnemyId ? engine.state.enemies.find(enemy => enemy.id === effect.toEnemyId) : null;
    if (!target) continue;
    const x = target.x + target.width / 2;
    const y = target.y + target.height / 2;
    engine.state.effects.push({ id: `inferno-${effect.id}`, x, y, radius: 0, maxRadius: 66, color: '#ff5b25', lifeTime: 0, maxLifeTime: 520, type: 'circle', element: 'fire' });
    for (const enemy of engine.state.enemies) {
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      if (Math.hypot(ex - x, ey - y) <= 58) damageEnemy(engine, enemy, 5 + skillRank(engine.state.runSkills, 'fireArrow') * 2, time, '#ff642c', 'inferno');
    }
  }
}

function shatterfrost(engine: GameEngine, state: RunSynergyState, time: number) {
  if (skillRank(engine.state.runSkills, 'iceArrow') < 2 || skillRank(engine.state.runSkills, 'ricochet') < 2) return;
  announce(state, 'shatterfrost', 'SPLITTERFROST', 'Abpraller zerplatzen in Frostsplittern');
  for (const effect of engine.state.effects) {
    if (!effect.id.startsWith('rico-') || state.processedEffects.has(effect.id)) continue;
    state.processedEffects.add(effect.id);
    const target = effect.toEnemyId ? engine.state.enemies.find(enemy => enemy.id === effect.toEnemyId) : null;
    if (!target) continue;
    const x = target.x + target.width / 2;
    const y = target.y + target.height / 2;
    engine.state.effects.push({ id: `shatter-${effect.id}`, x, y, radius: 0, maxRadius: 72, color: '#72dcff', lifeTime: 0, maxLifeTime: 520, type: 'circle', element: 'ice' });
    for (const enemy of engine.state.enemies) {
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      if (Math.hypot(ex - x, ey - y) > 64) continue;
      damageEnemy(engine, enemy, 4 + skillRank(engine.state.runSkills, 'iceArrow'), time, '#72dcff', 'shatter');
      enemy.frostUntil = Math.max(enemy.frostUntil ?? 0, time + 1200);
      enemy.frostSlow = Math.max(enemy.frostSlow ?? 0, 0.25);
    }
  }
}

function arrowStorm(engine: GameEngine, state: RunSynergyState, time: number) {
  if (skillRank(engine.state.runSkills, 'multishot') < 2 || skillRank(engine.state.runSkills, 'attackSpeed') < 2) return;
  announce(state, 'arrow-storm', 'PFEILHAGEL', 'Jeder fünfte Angriff entfesselt eine Extrasalve');
  const attackTime = engine.state.player.lastAttackTime;
  if (!attackTime || attackTime <= state.lastAttackTime) return;
  state.lastAttackTime = attackTime;
  state.attackChain++;
  if (state.attackChain % 5 !== 0) return;
  const targets = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead).sort((a, b) => a.hp - b.hp).slice(0, 3);
  for (const enemy of targets) {
    damageEnemy(engine, enemy, Math.max(4, Math.round(engine.state.player.attack * 0.7)), time, '#ffe8a8', 'arrow-storm');
    engine.state.effects.push({ id: `arrow-storm-${time}-${enemy.id}`, x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, radius: 0, maxRadius: 44, color: '#ffe8a8', lifeTime: 0, maxLifeTime: 360, type: 'circle', element: 'normal' });
  }
}

function veilStep(engine: GameEngine, state: RunSynergyState, time: number) {
  if (skillRank(engine.state.runSkills, 'speed') < 2) return;
  announce(state, 'veil-step', 'SCHLEIERSCHRITT', 'Dash hinterlässt einen verlangsamenden Nachhall');
  const dodgeTime = engine.state.player.lastDodgeTime;
  if (!dodgeTime || dodgeTime <= state.lastDodgeTime) return;
  state.lastDodgeTime = dodgeTime;
  const x = engine.state.player.x + engine.state.player.width / 2;
  const y = engine.state.player.y + engine.state.player.height / 2;
  engine.state.effects.push({ id: `veil-step-${dodgeTime}`, x, y, radius: 0, maxRadius: 86, color: '#b9a3ff', lifeTime: 0, maxLifeTime: 650, type: 'circle', element: 'arcane' });
  for (const enemy of engine.state.enemies) {
    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height / 2;
    if (Math.hypot(ex - x, ey - y) > 82) continue;
    enemy.frostUntil = Math.max(enemy.frostUntil ?? 0, time + 900);
    enemy.frostSlow = Math.max(enemy.frostSlow ?? 0, 0.32);
  }
}

export function updateRunSynergies(engine: GameEngine, state: RunSynergyState, time: number) {
  const activeEffects = new Set(engine.state.effects.map(effect => effect.id));
  for (const id of state.processedEffects) if (!activeEffects.has(id)) state.processedEffects.delete(id);
  infernoLance(engine, state, time);
  shatterfrost(engine, state, time);
  arrowStorm(engine, state, time);
  veilStep(engine, state, time);
}
