import type { GameEngine } from './runEngine';
import { loadMetaProgression, type EquipmentId } from './metaProgression';
import { skillRank } from './runSkills';

export type RunSynergyId = 'inferno-lance' | 'shatterfrost' | 'arrow-storm' | 'veil-step' | 'elemental-storm' | 'veil-chain';

export type RunSynergyState = {
  announced: Set<RunSynergyId>;
  processedEffects: Set<string>;
  fusionEffects: Set<string>;
  equipmentEffects: Set<string>;
  frostDeaths: Set<string>;
  frostApplications: Map<string, number>;
  equipmentIds: Set<EquipmentId>;
  equipmentRefreshAt: number;
  ritualRicochets: number;
  lastAttackTime: number;
  attackChain: number;
  elementalAttackTime: number;
  elementalChain: number;
  lastDodgeTime: number;
};

export function createRunSynergyState(): RunSynergyState {
  return {
    announced: new Set(),
    processedEffects: new Set(),
    fusionEffects: new Set(),
    equipmentEffects: new Set(),
    frostDeaths: new Set(),
    frostApplications: new Map(),
    equipmentIds: new Set(),
    equipmentRefreshAt: 0,
    ritualRicochets: 0,
    lastAttackTime: 0,
    attackChain: 0,
    elementalAttackTime: 0,
    elementalChain: 0,
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
  const y = enemy.y + enemy.height / 2;
  engine.state.damageNumbers.push({ id: `${id}-${time}-${enemy.id}`, x, y: enemy.y - 8, value: `-${dealt}`, color, lifeTime: 0, maxLifeTime: 650, scale: 1.18 });
}

function refreshEquipment(state: RunSynergyState, time: number) {
  if (time < state.equipmentRefreshAt) return;
  state.equipmentRefreshAt = time + 750;
  const meta = loadMetaProgression();
  state.equipmentIds = new Set(Object.values(meta.equipped));
}

function hasEquipment(state: RunSynergyState, id: EquipmentId) {
  return state.equipmentIds.has(id);
}

function markEquipmentEffect(state: RunSynergyState, key: string) {
  if (state.equipmentEffects.has(key)) return false;
  state.equipmentEffects.add(key);
  return true;
}

function equipmentFrostSet(engine: GameEngine, state: RunSynergyState, time: number) {
  const activeEnemyIds = new Set(engine.state.enemies.map(enemy => enemy.id));
  for (const id of state.frostApplications.keys()) if (!activeEnemyIds.has(id)) state.frostApplications.delete(id);

  if (hasEquipment(state, 'frost-quiver')) {
    for (const enemy of engine.state.enemies) {
      const current = enemy.frostUntil ?? 0;
      const previous = state.frostApplications.get(enemy.id) ?? 0;
      if (enemy.isDead || current <= time || current <= previous) continue;
      const extended = time + Math.round((current - time) * 1.2);
      enemy.frostUntil = extended;
      state.frostApplications.set(enemy.id, extended);
    }
  }

  if (!hasEquipment(state, 'frost-grimoire')) return;
  for (const enemy of engine.state.enemies) {
    if (!enemy.isDead || state.frostDeaths.has(enemy.id) || (enemy.frostUntil ?? 0) <= (enemy.deathTime ?? time)) continue;
    state.frostDeaths.add(enemy.id);
    const x = enemy.x + enemy.width / 2;
    const y = enemy.y + enemy.height / 2;
    const damage = Math.max(4, Math.round(engine.state.player.attack * 0.15));
    engine.state.effects.push({ id: `frost-grimoire-${enemy.id}`, x, y, radius: 0, maxRadius: 70, color: '#79ddff', lifeTime: 0, maxLifeTime: 520, type: 'circle', element: 'ice' });
    for (const target of engine.state.enemies) {
      const tx = target.x + target.width / 2;
      const ty = target.y + target.height / 2;
      if (Math.hypot(tx - x, ty - y) > 62) continue;
      damageEnemy(engine, target, damage, time, '#79ddff', 'frost-grimoire');
      target.frostUntil = Math.max(target.frostUntil ?? 0, time + 800);
      target.frostSlow = Math.max(target.frostSlow ?? 0, 0.18);
    }
  }
}

function equipmentProjectileSets(engine: GameEngine, state: RunSynergyState, time: number) {
  for (const effect of engine.state.effects) {
    const target = effect.toEnemyId ? engine.state.enemies.find(enemy => enemy.id === effect.toEnemyId) : null;
    if (!target) continue;

    if (effect.id.startsWith('rico-') && hasEquipment(state, 'rune-quiver') && markEquipmentEffect(state, `rune:${effect.id}`)) {
      const bonus = Math.max(1, Math.round(engine.state.player.attack * 0.08));
      damageEnemy(engine, target, bonus, time, '#b184ff', 'rune-quiver');
    }

    if (effect.id.startsWith('rico-') && hasEquipment(state, 'ritual-shard') && markEquipmentEffect(state, `ritual:${effect.id}`)) {
      state.ritualRicochets++;
      if (state.ritualRicochets % 3 === 0) {
        const x = target.x + target.width / 2;
        const y = target.y + target.height / 2;
        const damage = Math.max(3, Math.round(engine.state.player.attack * 0.12));
        engine.state.effects.push({ id: `ritual-pulse-${effect.id}`, x, y, radius: 0, maxRadius: 58, color: '#d684ff', lifeTime: 0, maxLifeTime: 440, type: 'circle', element: 'arcane' });
        for (const enemy of engine.state.enemies) {
          const ex = enemy.x + enemy.width / 2;
          const ey = enemy.y + enemy.height / 2;
          if (Math.hypot(ex - x, ey - y) <= 50) damageEnemy(engine, enemy, damage, time, '#d684ff', 'ritual-pulse');
        }
      }
    }

    if (effect.id.startsWith('pierce-') && hasEquipment(state, 'splinter-quiver') && markEquipmentEffect(state, `splinter:${effect.id}`)) {
      const bonus = Math.max(2, Math.round(engine.state.player.attack * 0.1));
      damageEnemy(engine, target, bonus, time, '#e0c089', 'splinter-quiver');
    }
  }
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

function elementalStorm(engine: GameEngine, state: RunSynergyState, time: number) {
  if (skillRank(engine.state.runSkills, 'elementalStorm') < 1) return;
  announce(state, 'elemental-storm', 'ELEMENTARSTURM', 'Jeder fünfte Angriff entfesselt einen Elementarburst');
  const attackTime = engine.state.player.lastAttackTime;
  if (!attackTime || attackTime <= state.elementalAttackTime) return;
  state.elementalAttackTime = attackTime;
  state.elementalChain++;
  if (state.elementalChain % 5 !== 0) return;

  const playerX = engine.state.player.x + engine.state.player.width / 2;
  const playerY = engine.state.player.y + engine.state.player.height / 2;
  const center = engine.state.enemies
    .filter(enemy => enemy.hp > 0 && !enemy.isDead)
    .sort((a, b) => Math.hypot(a.x - playerX, a.y - playerY) - Math.hypot(b.x - playerX, b.y - playerY))[0];
  if (!center) return;

  const burstIndex = state.elementalChain / 5;
  const fire = burstIndex % 2 === 1;
  const x = center.x + center.width / 2;
  const y = center.y + center.height / 2;
  const color = fire ? '#ff642c' : '#62d9ff';
  const element = fire ? 'fire' as const : 'ice' as const;
  const damage = Math.max(3, Math.round(engine.state.player.attack * 0.22));
  engine.state.effects.push({ id: `elemental-storm-${attackTime}`, x, y, radius: 0, maxRadius: 72, color, lifeTime: 0, maxLifeTime: 480, type: 'circle', element });

  for (const enemy of engine.state.enemies) {
    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height / 2;
    if (Math.hypot(ex - x, ey - y) > 64) continue;
    damageEnemy(engine, enemy, damage, time, color, 'elemental-storm');
    if (fire) {
      enemy.burnRanks = Math.max(enemy.burnRanks ?? 0, 1);
      enemy.burnDamage = Math.max(enemy.burnDamage ?? 0, 2);
      enemy.burnUntil = Math.max(enemy.burnUntil ?? 0, time + 1560);
      if (!enemy.nextBurnTick || enemy.nextBurnTick <= time) enemy.nextBurnTick = time + 520;
    } else {
      enemy.frostUntil = Math.max(enemy.frostUntil ?? 0, time + 1400);
      enemy.frostSlow = Math.max(enemy.frostSlow ?? 0, 0.2);
    }
  }
}

function arrowStorm(engine: GameEngine, state: RunSynergyState, time: number) {
  if (skillRank(engine.state.runSkills, 'multishot') < 2 || skillRank(engine.state.runSkills, 'attackSpeed') < 2) return;
  const fused = skillRank(engine.state.runSkills, 'arrowStorm') > 0;
  announce(state, 'arrow-storm', fused ? 'PFEILSTURM' : 'PFEILHAGEL', fused ? 'Jede fünfte Extrasalve trifft bis zu vier Ziele mit 90% Schaden' : 'Jeder fünfte Angriff entfesselt eine Extrasalve');
  const attackTime = engine.state.player.lastAttackTime;
  if (!attackTime || attackTime <= state.lastAttackTime) return;
  state.lastAttackTime = attackTime;
  state.attackChain++;
  if (state.attackChain % 5 !== 0) return;
  const targetCount = fused ? 4 : 3;
  const damageScale = fused ? 0.9 : 0.7;
  const targets = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead).sort((a, b) => a.hp - b.hp).slice(0, targetCount);
  for (const enemy of targets) {
    damageEnemy(engine, enemy, Math.max(4, Math.round(engine.state.player.attack * damageScale)), time, '#ffe8a8', 'arrow-storm');
    engine.state.effects.push({ id: `arrow-storm-${time}-${enemy.id}`, x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, radius: 0, maxRadius: fused ? 50 : 44, color: '#ffe8a8', lifeTime: 0, maxLifeTime: 360, type: 'circle', element: 'normal' });
  }
}

function veilChain(engine: GameEngine, state: RunSynergyState, time: number) {
  if (skillRank(engine.state.runSkills, 'veilChain') < 1) return;
  announce(state, 'veil-chain', 'SCHLEIERKETTE', 'Kettentreffer erhalten 10% zusätzlichen Angriffsschaden');
  for (const effect of engine.state.effects) {
    if ((!effect.id.startsWith('rico-') && !effect.id.startsWith('pierce-')) || state.fusionEffects.has(effect.id)) continue;
    state.fusionEffects.add(effect.id);
    const target = effect.toEnemyId ? engine.state.enemies.find(enemy => enemy.id === effect.toEnemyId) : null;
    if (!target) continue;
    const bonus = Math.max(2, Math.round(engine.state.player.attack * 0.1));
    const x = target.x + target.width / 2;
    const y = target.y + target.height / 2;
    damageEnemy(engine, target, bonus, time, '#c7b6ff', 'veil-chain');
    engine.state.effects.push({ id: `veil-chain-${effect.id}`, x, y, radius: 0, maxRadius: 34, color: '#c7b6ff', lifeTime: 0, maxLifeTime: 300, type: 'circle', element: 'arcane' });
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
  for (const key of state.equipmentEffects) {
    const effectId = key.slice(key.indexOf(':') + 1);
    if (!activeEffects.has(effectId)) state.equipmentEffects.delete(key);
  }
  refreshEquipment(state, time);
  equipmentFrostSet(engine, state, time);
  equipmentProjectileSets(engine, state, time);
  infernoLance(engine, state, time);
  shatterfrost(engine, state, time);
  elementalStorm(engine, state, time);
  arrowStorm(engine, state, time);
  veilChain(engine, state, time);
  veilStep(engine, state, time);
}
