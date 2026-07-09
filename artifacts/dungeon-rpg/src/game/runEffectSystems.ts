import type { GameEngine } from './runEngine';
import { makeHitSpark, distance } from './combat';
import { skillRank } from './runSkills';

const FIRE_DEATH_RADIUS = 72;
const FIRE_DEATH_DAMAGE = 12;
const ARCHER_BASE_COOLDOWN_MS = 270;

export type RunEffectSystemState = {
  processedFireBursts: Set<string>;
  finalizedBurns: Map<string, number>;
  processedDamageNumbers: Set<string>;
  processedTelegraphs: Set<string>;
  lastNormalizedShotTime: number;
  lastPlayerHp: number | null;
  lastGiftTime: number;
  healSequence: number;
};

export function createRunEffectSystemState(): RunEffectSystemState {
  return {
    processedFireBursts: new Set<string>(),
    finalizedBurns: new Map<string, number>(),
    processedDamageNumbers: new Set<string>(),
    processedTelegraphs: new Set<string>(),
    lastNormalizedShotTime: 0,
    lastPlayerHp: null,
    lastGiftTime: 0,
    healSequence: 0,
  };
}

function cleanInstantEffectsFromBuild(engine: GameEngine): void {
  if (Object.prototype.hasOwnProperty.call(engine.state.runSkills, 'heal')) delete engine.state.runSkills.heal;
}

function normalizeQuickDraw(engine: GameEngine, system: RunEffectSystemState): void {
  const shotTime = engine.state.player.lastAttackTime;
  if (!shotTime || shotTime === system.lastNormalizedShotTime) return;
  system.lastNormalizedShotTime = shotTime;
  const rank = skillRank(engine.state.runSkills, 'attackSpeed');
  const speedMultipliers = [1, 1.16, 1.3, 1.42];
  engine.state.player.attackCooldown = ARCHER_BASE_COOLDOWN_MS / speedMultipliers[rank];
}

function giftColor(key: string | undefined): string {
  if (key === 'maxHp') return '#71ef9f';
  if (key === 'defense') return '#72d6a5';
  if (key === 'speed') return '#a7efff';
  if (key === 'attack') return '#ffc56f';
  if (key === 'attackSpeed') return '#ffef9b';
  if (key === 'fireArrow') return '#ff642c';
  if (key === 'iceArrow') return '#62d9ff';
  if (key === 'multishot') return '#91e6c0';
  if (key === 'piercing') return '#f3fbff';
  if (key === 'ricochet') return '#b693ff';
  return '#d8b6ff';
}

function showGiftPulse(engine: GameEngine, system: RunEffectSystemState): void {
  const giftTime = engine.state.player.lastGiftTime ?? 0;
  if (!giftTime || giftTime <= system.lastGiftTime) return;
  system.lastGiftTime = giftTime;

  const p = engine.state.player;
  const cx = p.x + p.width / 2;
  const cy = p.y + p.height / 2;
  const color = giftColor(p.lastGiftKey);
  engine.state.effects.push({
    id: `gift-pulse-${giftTime}-${p.lastGiftKey ?? 'unknown'}`,
    x: cx,
    y: cy,
    radius: 0,
    maxRadius: 84,
    color,
    lifeTime: 0,
    maxLifeTime: 620,
    type: 'circle',
    element: p.lastGiftKey === 'fireArrow' ? 'fire' : p.lastGiftKey === 'iceArrow' ? 'ice' : p.lastGiftKey === 'ricochet' ? 'arcane' : 'normal',
  });
  engine.state.particles.push(...makeHitSpark(cx, cy, color, p.lastGiftKey === 'fireArrow' || p.lastGiftKey === 'iceArrow' ? 14 : 10));
}

function reinforceEnemyTelegraphs(engine: GameEngine, system: RunEffectSystemState): void {
  const telegraphs = engine.state.effects.filter(effect => effect.id.startsWith('telegraph-') && !effect.id.startsWith('telegraph-inner-'));
  const activeIds = new Set(telegraphs.map(effect => effect.id));
  for (const id of system.processedTelegraphs) {
    if (!activeIds.has(id)) system.processedTelegraphs.delete(id);
  }

  for (const effect of telegraphs) {
    if (system.processedTelegraphs.has(effect.id)) continue;
    system.processedTelegraphs.add(effect.id);
    engine.state.effects.push({
      id: `telegraph-inner-${effect.id}`,
      x: effect.x,
      y: effect.y,
      radius: 0,
      maxRadius: Math.max(18, effect.maxRadius * 0.56),
      color: effect.color,
      lifeTime: 0,
      maxLifeTime: effect.maxLifeTime,
      type: 'circle',
      element: effect.element,
    });
  }
}

function showHealing(engine: GameEngine, system: RunEffectSystemState, time: number): void {
  const hp = engine.state.player.hp;
  if (system.lastPlayerHp === null) {
    system.lastPlayerHp = hp;
    return;
  }

  const healed = Math.round(hp - system.lastPlayerHp);
  system.lastPlayerHp = hp;
  if (healed <= 0) return;

  const p = engine.state.player;
  const cx = p.x + p.width / 2;
  const cy = p.y + p.height / 2;
  const id = `heal-visible-${time}-${system.healSequence++}`;
  engine.state.damageNumbers.push({
    id,
    x: cx + (Math.random() - 0.5) * 8,
    y: p.y - 14,
    value: `+${healed}`,
    color: '#72f0a5',
    lifeTime: 0,
    maxLifeTime: 900,
    scale: healed >= 20 ? 1.72 : 1.5,
  });
  engine.state.particles.push(...makeHitSpark(cx, cy, '#72f0a5', healed >= 20 ? 12 : 8));
  engine.state.effects.push({
    id: `${id}-pulse`,
    x: cx,
    y: cy,
    radius: 0,
    maxRadius: healed >= 20 ? 72 : 54,
    color: '#72f0a5',
    lifeTime: 0,
    maxLifeTime: 480,
    type: 'circle',
    element: 'normal',
  });
}

function improveDamageNumberReadability(engine: GameEngine, system: RunEffectSystemState): void {
  const activeIds = new Set(engine.state.damageNumbers.map(number => number.id));
  for (const id of system.processedDamageNumbers) {
    if (!activeIds.has(id)) system.processedDamageNumbers.delete(id);
  }

  let stackIndex = 0;
  for (const number of engine.state.damageNumbers) {
    if (system.processedDamageNumbers.has(number.id)) continue;
    system.processedDamageNumbers.add(number.id);

    const isBurn = number.id.startsWith('burn-');
    const isBurst = number.id.startsWith('fire-burst-');
    const isHeal = number.id.startsWith('heal-') || number.id.startsWith('heal-visible-') || number.value.startsWith('+');
    const isPlayerHit = number.id.startsWith('hit-');

    if (isBurn) number.scale = Math.max(number.scale ?? 1, 1.02);
    else if (isBurst) number.scale = Math.max(number.scale ?? 1, 1.58);
    else if (isHeal) number.scale = Math.max(number.scale ?? 1, 1.55);
    else if (isPlayerHit) number.scale = Math.max(number.scale ?? 1, 1.48);
    else number.scale = Math.max(number.scale ?? 1, 1.38);

    const stagger = ((stackIndex % 3) - 1) * 8;
    number.x += stagger;
    number.y -= Math.floor(stackIndex / 3) * 5;
    stackIndex++;
  }
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
      scale: 1.02,
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
        scale: 1.58,
      });
      engine.state.particles.push(...makeHitSpark(enemyX, enemyY, '#ff642c', 10));
    }
  }
}

export function updateRunEffectSystems(engine: GameEngine, system: RunEffectSystemState, time: number): void {
  cleanInstantEffectsFromBuild(engine);
  normalizeQuickDraw(engine, system);
  showGiftPulse(engine, system);
  reinforceEnemyTelegraphs(engine, system);
  showHealing(engine, system, time);
  applyFinalBurnTicks(engine, system, time);
  applyFireDeathBursts(engine, system, time);
  improveDamageNumberReadability(engine, system);
}
