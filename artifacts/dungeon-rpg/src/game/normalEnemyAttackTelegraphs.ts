import type { Enemy } from './entities';
import { enemyVisualProfile } from './enemyRegionalIdentity';
import type { GameEngine } from './runEngine';
import { installMageRangedCombat } from './mageRangedCombat';

type EnemyWindup = {
  hitAt: number;
  range: number;
  archetype: string;
  index: number;
};

type PatchedEngine = {
  updateEnemies: (dt: number, time: number) => void;
  enemyWindups: Map<string, EnemyWindup>;
  shotPathBlocked: (fromX: number, fromY: number, toX: number, toY: number, padding?: number) => boolean;
};

type AttackTimingEnemy = Enemy & { attackResolveAt?: number };

type ResolvingRangerShot = {
  enemyId: string;
  windup: EnemyWindup;
};

function enemySpawnIndex(enemy: Enemy): number {
  const parsed = Number(enemy.id.split('-').at(-1));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRangerRole(engine: GameEngine, enemy: Enemy): boolean {
  if (enemy.enemyType === 'boss') return false;
  return enemyVisualProfile(engine.state.floor, enemy.enemyType, enemySpawnIndex(enemy)).role === 'ranger';
}

function captureResolvingRangerShots(engine: GameEngine, runtime: PatchedEngine, time: number): ResolvingRangerShot[] {
  const shots: ResolvingRangerShot[] = [];
  for (const [enemyId, windup] of runtime.enemyWindups) {
    if (time < windup.hitAt) continue;
    const enemy = engine.state.enemies.find(candidate => candidate.id === enemyId);
    if (!enemy || enemy.isDead || enemy.hp <= 0 || !isRangerRole(engine, enemy)) continue;
    shots.push({ enemyId, windup });
  }
  return shots;
}

function addRangerReleaseProjectile(engine: GameEngine, runtime: PatchedEngine, shot: ResolvingRangerShot, time: number): void {
  const enemy = engine.state.enemies.find(candidate => candidate.id === shot.enemyId);
  if (!enemy || enemy.isDead || enemy.hp <= 0 || engine.state.roomClearReady) return;

  const player = engine.state.player;
  const fromX = enemy.x + enemy.width / 2;
  const fromY = enemy.y + enemy.height / 2;
  const targetX = player.x + player.width / 2;
  const targetY = player.y + player.height / 2;
  const distance = Math.hypot(targetX - fromX, targetY - fromY);
  if (distance > shot.windup.range * 1.18) return;
  if (runtime.shotPathBlocked(fromX, fromY, targetX, targetY, 0.08)) return;

  const angle = Math.atan2(targetY - fromY, targetX - fromX);
  const duration = Math.max(110, Math.min(260, Math.round(distance / 420 * 1000)));
  engine.state.effects.push({
    id: `shot-ranger-${time}-${enemy.id}`,
    x: fromX,
    y: fromY,
    radius: 5,
    maxRadius: Math.max(24, distance),
    color: '#ead7a1',
    lifeTime: 0,
    maxLifeTime: duration,
    type: 'beam',
    angle,
    width: 5,
    element: 'normal',
    fromEnemyId: enemy.id,
  });
}

export function normalEnemyDamageRadius(range: number): number {
  // This is the existing runtime hit reach from GameEngine. Keeping the same
  // factor means this module changes presentation only, never combat balance.
  return range * 1.18;
}

export function installNormalEnemyAttackTelegraphs(engine: GameEngine): () => void {
  const runtime = engine as unknown as PatchedEngine;
  const originalUpdateEnemies = runtime.updateEnemies.bind(engine);

  runtime.updateEnemies = (dt, time) => {
    const previousAttackTimes = new Map(engine.state.enemies.map(enemy => [enemy.id, enemy.lastAttackTime]));
    const resolvingRangerShots = captureResolvingRangerShots(engine, runtime, time);
    originalUpdateEnemies(dt, time);

    for (const shot of resolvingRangerShots) addRangerReleaseProjectile(engine, runtime, shot, time);

    for (const enemy of engine.state.enemies) {
      if (enemy.enemyType === 'boss' || enemy.isDead || enemy.hp <= 0) continue;
      const previousAttackTime = previousAttackTimes.get(enemy.id) ?? 0;
      if (enemy.lastAttackTime <= previousAttackTime) continue;

      const windup = runtime.enemyWindups.get(enemy.id);
      if (!windup) continue;
      (enemy as AttackTimingEnemy).attackResolveAt = windup.hitAt;
      const effect = engine.state.effects.find(candidate => candidate.id === `telegraph-${enemy.lastAttackTime}-${enemy.id}`);
      if (!effect) continue;

      effect.radius = 0;
      effect.maxRadius = normalEnemyDamageRadius(windup.range);
      effect.maxLifeTime = Math.max(1, windup.hitAt - enemy.lastAttackTime);
    }
  };

  const disposeMageRangedCombat = installMageRangedCombat(engine);

  return () => {
    disposeMageRangedCombat();
    runtime.updateEnemies = originalUpdateEnemies;
  };
}
