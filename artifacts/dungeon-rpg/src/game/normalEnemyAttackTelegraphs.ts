import type { Enemy } from './entities';
import type { GameEngine } from './runEngine';
import { installMageRangedCombat } from './mageRangedCombat';
import { installPlayerBowAttackSync } from './playerBowAttackSync';

type EnemyWindup = {
  hitAt: number;
  range: number;
  archetype: string;
  index: number;
};

type PatchedEngine = {
  updateEnemies: (dt: number, time: number) => void;
  enemyWindups: Map<string, EnemyWindup>;
};

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
    originalUpdateEnemies(dt, time);

    for (const enemy of engine.state.enemies) {
      if (enemy.enemyType === 'boss' || enemy.isDead || enemy.hp <= 0) continue;
      const previousAttackTime = previousAttackTimes.get(enemy.id) ?? 0;
      if (enemy.lastAttackTime <= previousAttackTime) continue;

      const windup = runtime.enemyWindups.get(enemy.id);
      if (!windup) continue;
      const effect = engine.state.effects.find(candidate => candidate.id === `telegraph-${enemy.lastAttackTime}-${enemy.id}`);
      if (!effect) continue;

      effect.radius = 0;
      effect.maxRadius = normalEnemyDamageRadius(windup.range);
      effect.maxLifeTime = Math.max(1, windup.hitAt - enemy.lastAttackTime);
    }
  };

  const disposeMageRangedCombat = installMageRangedCombat(engine);
  const disposePlayerBowAttackSync = installPlayerBowAttackSync(engine);

  return () => {
    disposePlayerBowAttackSync();
    disposeMageRangedCombat();
    runtime.updateEnemies = originalUpdateEnemies;
  };
}
