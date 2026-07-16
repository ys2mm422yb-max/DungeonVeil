import type { GameEngine } from './runEngine';
import { skillRank } from './runSkills';

export type RunSynergyId =
  | 'inferno-lance'
  | 'shatterfrost'
  | 'arrow-storm'
  | 'veil-step'
  | 'elemental-storm-fusion'
  | 'arrow-storm-fusion'
  | 'veil-chain-fusion';

export type RunSynergyState = {
  announced: Set<RunSynergyId>;
  processedEffects: Set<string>;
  fusionEffects: Set<string>;
  elementalHitCount: number;
  lastAttackTime: number;
  attackChain: number;
  lastDodgeTime: number;
};

export function createRunSynergyState(): RunSynergyState {
  return {
    announced: new Set(),
    processedEffects: new Set(),
    fusionEffects: new Set(),
    elementalHitCount: 0,
    lastAttackTime: 0,
    attackChain: 0,
    lastDodgeTime: 0,
  };
}

function announce(state: RunSynergyState, id: RunSynergyId, title: string, text: string) {
  if (state.announced.has(id)) return;
  state.announced.add(id);
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'SYNERGIE ERWACHT', text: `${title} · ${text}`, tone: 'relic' } }));
}

function damageEnemy(engine: GameEngine, enemy: GameEngine['state']['enemies'][number], damage: number, time: number, color: string, id: string) {
  if (enemy.isDead || enemy.hp <= 0) return;
  const dealt = Math.max(1, Math.round(damage));
  enemy.hp -= dealt;
  enemy.flashUntil = time + 120;
  enemy.lastHitTime = time;
  const x = enemy.x + enemy.width / 2;
  engine.state.damageNumbers.push({ id: `${id}-${time}-${enemy.id}`, x, y: enemy.y - 8, value: `-${dealt}`, color, lifeTime: 0, maxLifeTime: 650, scale: 1.18 });
}

function effectEnd(effect: GameEngine['state']['effects'][number]) {
  const angle = effect.angle ?? 0;
  return {
    x: effect.x + Math.cos(angle) * effect.maxRadius,
    y: effect.y + Math.sin(angle) * effect.maxRadius,
  };
}

function nearestLivingEnemy(engine: GameEngine, x: number, y: number) {
  return engine.state.enemies
    .filter(enemy => enemy.hp > 0 && !enemy.isDead)
    .sort((a, b) => {
      const ax = a.x + a.width / 2;
      const ay = a.y + a.height / 2;
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      return Math.hypot(ax - x, ay - y) - Math.hypot(bx - x, by - y);
    })[0] ?? null;
}

function effectTime(id: string, prefix: string) {
  const remainder = id.slice(prefix.length);
  const finalDash = remainder.lastIndexOf('-');
  return finalDash > 0 ? remainder.slice(0, finalDash) : '';
}

function damageForEffect(engine: GameEngine, effect: GameEngine['state']['effects'][number], prefix: string, targetId: string) {
  const timestamp = effectTime(effect.id, prefix);
  if (!timestamp) return 0;
  const damage = engine.state.damageNumbers.find(number => number.id.startsWith(`dmg-${timestamp}-${targetId}-`));
  if (!damage) return 0;
  const value = Math.abs(Number(String(damage.value).replace(/[^0-9.-]/g, '')));
  return Number.isFinite(value) ? value : 0;
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

function triggerElementalStorm(engine: GameEngine, state: RunSynergyState, effect: GameEngine['state']['effects'][number], time: number) {
  state.elementalHitCount++;
  if (state.elementalHitCount % 5 !== 0) return;
  const end = effectEnd(effect);
  const center = nearestLivingEnemy(engine, end.x, end.y);
  if (!center) return;
  const x = center.x + center.width / 2;
  const y = center.y + center.height / 2;
  const color = effect.element === 'ice' ? '#8be7ff' : '#ff8a55';
  const targets = engine.state.enemies
    .filter(enemy => enemy.hp > 0 && !enemy.isDead)
    .map(enemy => ({ enemy, distance: Math.hypot(enemy.x + enemy.width / 2 - x, enemy.y + enemy.height / 2 - y) }))
    .filter(entry => entry.distance <= 92)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
  const damage = engine.state.player.attack * 0.22;
  engine.state.effects.push({ id: `elemental-storm-${effect.id}`, x, y, radius: 0, maxRadius: 92, color, lifeTime: 0, maxLifeTime: 420, type: 'circle', element: effect.element });
  for (const { enemy } of targets) damageEnemy(engine, enemy, damage, time, color, 'elemental-storm');
}

function applyArrowStormCapstone(engine: GameEngine, effect: GameEngine['state']['effects'][number], time: number) {
  const shotIndex = Number(effect.id.slice(effect.id.lastIndexOf('-') + 1));
  if (!Number.isFinite(shotIndex) || shotIndex <= 0) return;
  const end = effectEnd(effect);
  const target = nearestLivingEnemy(engine, end.x, end.y);
  if (!target) return;
  const originalDamage = damageForEffect(engine, effect, 'shot-', target.id);
  if (originalDamage <= 0) return;
  const bonus = originalDamage * (0.9 / 0.82 - 1);
  damageEnemy(engine, target, bonus, time, '#ffe8a8', 'arrow-storm-fusion');
  engine.state.effects.push({ id: `arrow-storm-fusion-${effect.id}`, x: target.x + target.width / 2, y: target.y + target.height / 2, radius: 0, maxRadius: 30, color: '#ffe8a8', lifeTime: 0, maxLifeTime: 260, type: 'circle', element: 'normal' });
}

function applyVeilChainCapstone(engine: GameEngine, effect: GameEngine['state']['effects'][number], time: number) {
  const prefix = effect.id.startsWith('rico-') ? 'rico-' : 'pierce-';
  const target = effect.toEnemyId ? engine.state.enemies.find(enemy => enemy.id === effect.toEnemyId) : null;
  if (!target) return;
  const originalDamage = damageForEffect(engine, effect, prefix, target.id);
  if (originalDamage <= 0) return;
  damageEnemy(engine, target, originalDamage * 0.1, time, '#c7b6ff', 'veil-chain');
  engine.state.effects.push({ id: `veil-chain-${effect.id}`, x: target.x + target.width / 2, y: target.y + target.height / 2, radius: 0, maxRadius: 34, color: '#c7b6ff', lifeTime: 0, maxLifeTime: 280, type: 'circle', element: 'arcane' });
}

function fusionCapstones(engine: GameEngine, state: RunSynergyState, time: number) {
  const elemental = skillRank(engine.state.runSkills, 'elementalStorm') > 0;
  const arrows = skillRank(engine.state.runSkills, 'arrowStorm') > 0;
  const veil = skillRank(engine.state.runSkills, 'veilChain') > 0;
  if (elemental) announce(state, 'elemental-storm-fusion', 'ELEMENTARSTURM', 'Jeder fünfte Elementarpfeil entfesselt einen kleinen Flächenausbruch');
  if (arrows) announce(state, 'arrow-storm-fusion', 'PFEILSTURM', 'Zusatzpfeile verursachen 90 % statt 82 % Schaden');
  if (veil) announce(state, 'veil-chain-fusion', 'SCHLEIERKETTE', 'Abpraller und Durchschläge verursachen 10 % mehr Schaden');

  for (const effect of engine.state.effects) {
    if (state.fusionEffects.has(effect.id)) continue;
    let handled = false;
    if (effect.id.startsWith('shot-')) {
      if (elemental && (effect.element === 'fire' || effect.element === 'ice')) {
        triggerElementalStorm(engine, state, effect, time);
        handled = true;
      }
      if (arrows) {
        applyArrowStormCapstone(engine, effect, time);
        handled = true;
      }
    } else if (veil && (effect.id.startsWith('rico-') || effect.id.startsWith('pierce-'))) {
      applyVeilChainCapstone(engine, effect, time);
      handled = true;
    }
    if (handled) state.fusionEffects.add(effect.id);
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
  for (const id of state.fusionEffects) if (!activeEffects.has(id)) state.fusionEffects.delete(id);
  infernoLance(engine, state, time);
  shatterfrost(engine, state, time);
  arrowStorm(engine, state, time);
  fusionCapstones(engine, state, time);
  veilStep(engine, state, time);
}
