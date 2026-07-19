import { useEffect } from 'react';
import type React from 'react';
import type { GameEngine } from '../game/runEngine';
import { WORLD_BOSS_BALANCE_V4 } from '../game/buildBalanceV4';

export function WorldBossBalanceBridgeV4({ engineRef }: { engineRef: React.RefObject<GameEngine | null> }) {
  useEffect(() => {
    let frame = 0;
    let appliedBossId = '';
    const apply = () => {
      const engine = engineRef.current;
      const boss = engine?.state.enemies.find(enemy => enemy.enemyType === 'boss' && enemy.hp > 0);
      if (engine && boss && boss.id !== appliedBossId) {
        appliedBossId = boss.id;
        const ratio = boss.maxHp > 0 ? Math.max(0, Math.min(1, boss.hp / boss.maxHp)) : 1;
        boss.maxHp = WORLD_BOSS_BALANCE_V4.health;
        boss.hp = Math.max(1, Math.round(boss.maxHp * ratio));
        boss.attack = WORLD_BOSS_BALANCE_V4.clawDamage;
        Object.assign(boss, {
          balanceSeason: WORLD_BOSS_BALANCE_V4.balanceSeason,
          armorMitigationCap: WORLD_BOSS_BALANCE_V4.armorMitigationCap,
          fireBreathDamage: WORLD_BOSS_BALANCE_V4.fireBreathDamage,
          clawDamage: WORLD_BOSS_BALANCE_V4.clawDamage,
          slamDamage: WORLD_BOSS_BALANCE_V4.slamDamage,
        });
        window.dispatchEvent(new CustomEvent('dungeon-veil-worldboss-balance-v4', {
          detail: {
            season: WORLD_BOSS_BALANCE_V4.balanceSeason,
            health: WORLD_BOSS_BALANCE_V4.health,
            timeLimitSeconds: WORLD_BOSS_BALANCE_V4.timeLimitSeconds,
          },
        }));
      }
      frame = requestAnimationFrame(apply);
    };
    frame = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(frame);
  }, [engineRef]);

  return null;
}
