import type { GameEngine } from './runEngine';
import { makeHitSpark, distance } from './combat';
import { skillRank } from './runSkills';

const FIRE_DEATH_RADIUS = 72;
const FIRE_DEATH_DAMAGE = 12;
const ARCHER_BASE_COOLDOWN_MS = 270;
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

export type VeilRoomModifier = 'pressure' | 'blood' | 'storm' | null;

export type RunEffectSystemState = {
  processedFireBursts: Set<string>;
  finalizedBurns: Map<string, number>;
  processedDamageNumbers: Set<string>;
  processedTelegraphs: Set<string>;
  pressureBoosted: Set<string>;
  bloodFrenzy: Set<string>;
  bossPhaseTriggered: Set<string>;
  lastNormalizedShotTime: number;
  lastPlayerHp: number | null;
  lastGiftTime: number;
  healSequence: number;
  roomKey: string;
  nextRuneStormAt: number;
  runeStrikeAt: number;
  runeStrikeX: number;
  runeStrikeY: number;
};

export function veilModifierForRoom(room: number): VeilRoomModifier {
  if (room === 11 || room === 14 || room === 17) return 'pressure';
  if (room === 12 || room === 15 || room === 18) return 'blood';
  if (room === 13 || room === 16 || room === 19) return 'storm';
  return null;
}

export function veilModifierLabel(room: number): string | null {
  const modifier = veilModifierForRoom(room);
  if (modifier === 'pressure') return 'SCHLEIERDRUCK';
  if (modifier === 'blood') return 'BLUTSCHLEIER';
  if (modifier === 'storm') return 'RUNENSTURM';
  if (room === 20) return 'SCHLEIERKERN';
  return null;
}

export function createRunEffectSystemState(): RunEffectSystemState {
  return {
    processedFireBursts: new Set<string>(),
    finalizedBurns: new Map<string, number>(),
    processedDamageNumbers: new Set<string>(),
    processedTelegraphs: new Set<string>(),
    pressureBoosted: new Set<string>(),
    bloodFrenzy: new Set<string>(),
    bossPhaseTriggered: new Set<string>(),
    lastNormalizedShotTime: 0,
    lastPlayerHp: null,
    lastGiftTime: 0,
    healSequence: 0,
    roomKey: '',
    nextRuneStormAt: 0,
    runeStrikeAt: 0,
    runeStrikeX: 0,
    runeStrikeY: 0,
  };
}

function announceVeilRoom(engine: GameEngine, system: RunEffectSystemState, time: number): void {
  const roomKey = `${engine.state.chapter}:${engine.state.floor}`;
  if (system.roomKey === roomKey) return;
  system.roomKey = roomKey;
  system.nextRuneStormAt = time + 2600;
  system.runeStrikeAt = 0;
  system.pressureBoosted.clear();
  system.bloodFrenzy.clear();

  const modifier = veilModifierForRoom(engine.state.floor);
  if (!modifier) return;
  const p = engine.state.player;
  const x = p.x + p.width / 2;
  const y = p.y + p.height / 2;
  const title = modifier === 'pressure' ? 'SCHLEIERDRUCK' : modifier === 'blood' ? 'BLUTSCHLEIER' : 'RUNENSTURM';
  const text = modifier === 'pressure'
    ? 'Die Feinde werden vom Schleier beschleunigt.'
    : modifier === 'blood'
      ? 'Verwundete Feinde geraten in Raserei.'
      : 'Instabile Runen markieren tödliche Zonen.';
  const color = modifier === 'pressure' ? '#8e74ff' : modifier === 'blood' ? '#db4a55' : '#b793ff';

  engine.state.damageNumbers.push({ id: `veil-room-${roomKey}`, x, y: p.y - 24, value: title, color, lifeTime: 0, maxLifeTime: 2200, scale: 1.2 });
  engine.state.effects.push({ id: `veil-room-wave-${roomKey}`, x, y, radius: 0, maxRadius: 118, color, lifeTime: 0, maxLifeTime: 800, type: 'circle', element: 'arcane' });
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title, text, tone: modifier === 'blood' ? 'relic' : 'hunt' } }));
}

function applyVeilPressure(engine: GameEngine, system: RunEffectSystemState): void {
  if (veilModifierForRoom(engine.state.floor) !== 'pressure') return;
  for (const enemy of engine.state.enemies) {
    if (enemy.isDead || enemy.hp <= 0 || system.pressureBoosted.has(enemy.id)) continue;
    system.pressureBoosted.add(enemy.id);
    enemy.speed *= 1.14;
    enemy.nextAttackTime = Math.max(0, enemy.nextAttackTime - 160);
  }
}

function applyBloodVeil(engine: GameEngine, system: RunEffectSystemState, time: number): void {
  if (veilModifierForRoom(engine.state.floor) !== 'blood') return;
  for (const enemy of engine.state.enemies) {
    if (enemy.isDead || enemy.hp <= 0 || enemy.hp > enemy.maxHp * 0.5 || system.bloodFrenzy.has(enemy.id)) continue;
    system.bloodFrenzy.add(enemy.id);
    enemy.attack = Math.max(enemy.attack + 2, Math.round(enemy.attack * 1.28));
    enemy.speed *= 1.18;
    enemy.nextAttackTime = time + 280;
    const x = enemy.x + enemy.width / 2;
    const y = enemy.y + enemy.height / 2;
    engine.state.damageNumbers.push({ id: `blood-rage-${enemy.id}`, x, y: enemy.y - 12, value: 'RASEREI', color: '#ff5968', lifeTime: 0, maxLifeTime: 1200, scale: 1.05 });
    engine.state.effects.push({ id: `blood-rage-wave-${enemy.id}`, x, y, radius: 0, maxRadius: 54, color: '#d93d50', lifeTime: 0, maxLifeTime: 520, type: 'circle', element: 'fire' });
    engine.state.particles.push(...makeHitSpark(x, y, '#ff5968', 10));
  }
}

function triggerFinalBossPhase(engine: GameEngine, system: RunEffectSystemState, time: number): void {
  if (engine.state.floor !== 20) return;
  const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss' && !enemy.isDead && enemy.hp > 0);
  if (!boss || boss.hp > boss.maxHp * 0.5 || system.bossPhaseTriggered.has(boss.id)) return;
  system.bossPhaseTriggered.add(boss.id);
  boss.attack = Math.round(boss.attack * 1.22);
  boss.speed *= 1.18;
  boss.nextAttackTime = time + 320;
  system.nextRuneStormAt = time + 1200;

  const x = boss.x + boss.width / 2;
  const y = boss.y + boss.height / 2;
  engine.state.damageNumbers.push({ id: `boss-phase-${boss.id}`, x, y: boss.y - 28, value: 'SCHLEIERBRUCH', color: '#c6a5ff', lifeTime: 0, maxLifeTime: 2400, scale: 1.55 });
  engine.state.effects.push({ id: `boss-phase-wave-${boss.id}`, x, y, radius: 0, maxRadius: 180, color: '#875dff', lifeTime: 0, maxLifeTime: 1050, type: 'circle', element: 'arcane' });
  engine.state.particles.push(...makeHitSpark(x, y, '#a77cff', 24));
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'DER SCHLEIER BRICHT', text: 'Der Wächter entfesselt den Kern. Runenstürme erwachen.', tone: 'relic' } }));
}

function updateRuneStorm(engine: GameEngine, system: RunEffectSystemState, time: number): void {
  const stormRoom = veilModifierForRoom(engine.state.floor) === 'storm';
  const finalBossStorm = engine.state.floor === 20 && system.bossPhaseTriggered.size > 0;
  if (!stormRoom && !finalBossStorm) return;

  if (system.runeStrikeAt > 0 && time >= system.runeStrikeAt) {
    const p = engine.state.player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;
    const hit = distance(px, py, system.runeStrikeX, system.runeStrikeY) <= 70;
    if (hit && time > p.invincibleUntil) {
      const damage = Math.min(24, 8 + Math.floor(engine.state.floor * 0.55));
      p.hp -= damage;
      p.lastHitTime = time;
      engine.state.damageNumbers.push({ id: `rune-hit-${time}`, x: px, y: p.y - 8, value: `-${damage}`, color: '#b68cff', lifeTime: 0, maxLifeTime: 850, scale: 1.45 });
      engine.state.particles.push(...makeHitSpark(px, py, '#b68cff', 14));
    }
    engine.state.effects.push({ id: `rune-impact-${time}`, x: system.runeStrikeX, y: system.runeStrikeY, radius: 0, maxRadius: 88, color: '#8b5cff', lifeTime: 0, maxLifeTime: 460, type: 'circle', element: 'arcane' });
    system.runeStrikeAt = 0;
    system.nextRuneStormAt = time + (finalBossStorm ? 3300 : 4600);
    return;
  }

  if (system.runeStrikeAt > 0 || time < system.nextRuneStormAt) return;
  const p = engine.state.player;
  system.runeStrikeX = p.x + p.width / 2;
  system.runeStrikeY = p.y + p.height / 2;
  system.runeStrikeAt = time + 900;
  engine.state.effects.push({
    id: `rune-warning-${time}`,
    x: system.runeStrikeX,
    y: system.runeStrikeY,
    radius: 0,
    maxRadius: 70,
    color: '#c2a2ff',
    lifeTime: 0,
    maxLifeTime: 900,
    type: 'circle',
    element: 'arcane',
  });
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
  if (IS_MOBILE) return;
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
    const isPlayerHit = number.id.startsWith('hit-') || number.id.startsWith('rune-hit-');

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
  announceVeilRoom(engine, system, time);
  cleanInstantEffectsFromBuild(engine);
  normalizeQuickDraw(engine, system);
  showGiftPulse(engine, system);
  reinforceEnemyTelegraphs(engine, system);
  showHealing(engine, system, time);
  applyVeilPressure(engine, system);
  applyBloodVeil(engine, system, time);
  triggerFinalBossPhase(engine, system, time);
  updateRuneStorm(engine, system, time);
  applyFinalBurnTicks(engine, system, time);
  applyFireDeathBursts(engine, system, time);
  improveDamageNumberReadability(engine, system);
}
