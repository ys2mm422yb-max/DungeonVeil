import type { Enemy, VisualEffect } from './entities';
import type { GameEngine } from './runEngine';
import { makeHitSpark } from './combat';

export type BossAttackContract = {
  room: 20 | 30 | 40 | 50;
  target: 'locked-ground' | 'boss-radius';
  radius: number;
  windupMs: number;
  color: string;
  element: NonNullable<VisualEffect['element']>;
  label: string;
  projectileWidth: number;
};

type BossAttackSnapshot = {
  startedAt: number;
  hitAt: number;
  targetX: number;
  targetY: number;
  contract: BossAttackContract;
};

type PatchedEngine = {
  updateEnemies: (dt: number, time: number) => void;
  resolveEnemyAttack: (enemy: Enemy, windup: { hitAt: number; range: number; archetype: string; index: number }, time: number) => void;
  enemyWindups: Map<string, { hitAt: number; range: number; archetype: string; index: number }>;
  shotPathBlocked: (fromX: number, fromY: number, toX: number, toY: number, padding?: number) => boolean;
};

const BOSS_ATTACK_CONTRACTS: Partial<Record<number, BossAttackContract>> = {
  20: { room: 20, target: 'locked-ground', radius: 92, windupMs: 720, color: '#b995ff', element: 'arcane', label: 'SCHLEIERSTURZ — RAUS!', projectileWidth: 9 },
  30: { room: 30, target: 'locked-ground', radius: 52, windupMs: 700, color: '#d9ef83', element: 'normal', label: 'PFEILSALVE — AUSWEICHEN!', projectileWidth: 5 },
  40: { room: 40, target: 'boss-radius', radius: 88, windupMs: 600, color: '#d17aff', element: 'arcane', label: 'SCHATTENSCHLAG — ABSTAND!', projectileWidth: 7 },
  50: { room: 50, target: 'locked-ground', radius: 96, windupMs: 720, color: '#ff7438', element: 'fire', label: 'GLUTSTURZ — RAUS!', projectileWidth: 10 },
};

export function bossAttackContract(room: number): BossAttackContract | null {
  return BOSS_ATTACK_CONTRACTS[Math.max(1, Math.min(50, room))] ?? null;
}

function bossCenter(enemy: Enemy) {
  return { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 };
}

function playerCenter(engine: GameEngine) {
  return { x: engine.state.player.x + engine.state.player.width / 2, y: engine.state.player.y + engine.state.player.height / 2 };
}

function warningEffects(enemy: Enemy, snapshot: BossAttackSnapshot): VisualEffect[] {
  const source = bossCenter(enemy);
  const x = snapshot.contract.target === 'boss-radius' ? source.x : snapshot.targetX;
  const y = snapshot.contract.target === 'boss-radius' ? source.y : snapshot.targetY;
  const effects: VisualEffect[] = [
    {
      id: `telegraph-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x,
      y,
      radius: 0,
      maxRadius: snapshot.contract.radius,
      color: snapshot.contract.color,
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'circle',
      element: snapshot.contract.element,
    },
    {
      id: `telegraph-inner-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x,
      y,
      radius: 4,
      maxRadius: snapshot.contract.radius * 0.62,
      color: '#fff2c2',
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'circle',
      element: snapshot.contract.element,
    },
  ];
  if (snapshot.contract.target === 'locked-ground') {
    effects.push({
      id: `shot-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x: source.x,
      y: source.y,
      radius: 0,
      maxRadius: Math.hypot(snapshot.targetX - source.x, snapshot.targetY - source.y),
      color: snapshot.contract.color,
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'beam',
      angle: Math.atan2(snapshot.targetY - source.y, snapshot.targetX - source.x),
      width: snapshot.contract.projectileWidth,
      element: snapshot.contract.element,
    });
  }
  return effects;
}

function addBossImpact(engine: GameEngine, enemy: Enemy, snapshot: BossAttackSnapshot, time: number) {
  const source = bossCenter(enemy);
  const center = snapshot.contract.target === 'boss-radius' ? source : { x: snapshot.targetX, y: snapshot.targetY };
  engine.state.effects.push({
    id: `boss-impact-${snapshot.contract.room}-${time}-${enemy.id}`,
    x: center.x,
    y: center.y,
    radius: 8,
    maxRadius: snapshot.contract.radius,
    color: snapshot.contract.color,
    lifeTime: 0,
    maxLifeTime: 640,
    type: 'circle',
    element: snapshot.contract.element,
  });
  engine.state.effects.push({
    id: `boss-impact-inner-${snapshot.contract.room}-${time}-${enemy.id}`,
    x: center.x,
    y: center.y,
    radius: 0,
    maxRadius: snapshot.contract.radius * 0.55,
    color: '#fff0bd',
    lifeTime: 0,
    maxLifeTime: 420,
    type: 'circle',
    element: snapshot.contract.element,
  });
}

function damagePlayer(engine: GameEngine, enemy: Enemy, snapshot: BossAttackSnapshot, time: number) {
  const player = engine.state.player;
  if (time <= player.invincibleUntil) return;
  const playerPosition = playerCenter(engine);
  const source = bossCenter(enemy);
  const center = snapshot.contract.target === 'boss-radius' ? source : { x: snapshot.targetX, y: snapshot.targetY };
  if (Math.hypot(playerPosition.x - center.x, playerPosition.y - center.y) > snapshot.contract.radius) return;
  const raw = enemy.attack - player.defense + Math.floor(Math.random() * 3);
  const damage = Math.max(1, raw);
  player.hp -= damage;
  player.lastHitTime = time;
  if ((engine.state.runSkills.defense ?? 0) > 0) player.lastGuardTime = time;
  engine.state.damageNumbers.push({
    id: `boss-hit-${snapshot.contract.room}-${time}-${enemy.id}`,
    x: playerPosition.x + (Math.random() - 0.5) * 14,
    y: player.y - 8,
    value: `-${damage}`,
    color: '#e34b43',
    lifeTime: 0,
    maxLifeTime: 800,
    scale: 1.4,
  });
  engine.state.particles.push(...makeHitSpark(playerPosition.x, playerPosition.y, snapshot.contract.color, 14));
}

export function installBossAttackTelegraphs(engine: GameEngine): () => void {
  const runtime = engine as unknown as PatchedEngine;
  const originalUpdateEnemies = runtime.updateEnemies.bind(engine);
  const originalResolveEnemyAttack = runtime.resolveEnemyAttack.bind(engine);
  const attacks = new Map<string, BossAttackSnapshot>();

  runtime.resolveEnemyAttack = (enemy, windup, time) => {
    const contract = enemy.enemyType === 'boss' ? bossAttackContract(engine.state.floor) : null;
    if (!contract) {
      originalResolveEnemyAttack(enemy, windup, time);
      return;
    }
    const fallbackTarget = playerCenter(engine);
    const snapshot = attacks.get(enemy.id) ?? {
      startedAt: enemy.lastAttackTime || time,
      hitAt: time,
      targetX: fallbackTarget.x,
      targetY: fallbackTarget.y,
      contract,
    };
    const source = bossCenter(enemy);
    const blocked = contract.target === 'locked-ground'
      && runtime.shotPathBlocked(source.x, source.y, snapshot.targetX, snapshot.targetY, 0.08);
    addBossImpact(engine, enemy, snapshot, time);
    if (!blocked) damagePlayer(engine, enemy, snapshot, time);
    attacks.delete(enemy.id);
  };

  runtime.updateEnemies = (dt, time) => {
    const previous = new Map(engine.state.enemies.map(enemy => [enemy.id, enemy.lastAttackTime]));
    originalUpdateEnemies(dt, time);

    for (const enemy of engine.state.enemies) {
      const contract = enemy.enemyType === 'boss' ? bossAttackContract(engine.state.floor) : null;
      if (!contract || enemy.isDead || enemy.hp <= 0) continue;
      const oldAttack = previous.get(enemy.id) ?? 0;
      if (enemy.lastAttackTime <= oldAttack) continue;
      const windup = runtime.enemyWindups.get(enemy.id);
      if (!windup) continue;
      const oldWindupMs = Math.max(1, windup.hitAt - enemy.lastAttackTime);
      windup.hitAt = enemy.lastAttackTime + contract.windupMs;
      enemy.nextAttackTime += Math.max(0, contract.windupMs - oldWindupMs);
      const target = playerCenter(engine);
      const snapshot: BossAttackSnapshot = {
        startedAt: enemy.lastAttackTime,
        hitAt: windup.hitAt,
        targetX: target.x,
        targetY: target.y,
        contract,
      };
      attacks.set(enemy.id, snapshot);
      engine.state.effects = engine.state.effects.filter(effect => effect.id !== `telegraph-${enemy.lastAttackTime}-${enemy.id}`);
      engine.state.effects.push(...warningEffects(enemy, snapshot));
      const textPosition = contract.target === 'boss-radius' ? bossCenter(enemy) : target;
      engine.state.damageNumbers.push({
        id: `boss-warning-${contract.room}-${enemy.lastAttackTime}-${enemy.id}`,
        x: textPosition.x,
        y: textPosition.y - 34,
        value: contract.label,
        color: contract.color,
        lifeTime: 0,
        maxLifeTime: contract.windupMs,
        scale: 1.05,
      });
    }

    for (const [enemyId] of attacks) {
      if (!engine.state.enemies.some(enemy => enemy.id === enemyId && !enemy.isDead && enemy.hp > 0)) attacks.delete(enemyId);
    }
  };

  return () => {
    runtime.updateEnemies = originalUpdateEnemies;
    runtime.resolveEnemyAttack = originalResolveEnemyAttack;
    attacks.clear();
  };
}
