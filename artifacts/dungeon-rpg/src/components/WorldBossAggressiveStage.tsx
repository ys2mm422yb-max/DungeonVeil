import React, { useCallback, useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { WorldBossPerspectiveStage } from './WorldBossPerspectiveStage';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

const RELEASE_DELAY_MS = 320;
const PURSUIT_SPEED = 82;
const ATTACK_READY_WINDOW_MS = 720;

export function WorldBossAggressiveStage({ engineRef, onReady }: Props) {
  const releasedAtRef = useRef(0);
  const frameRef = useRef(0);

  const handleReady = useCallback(() => {
    releasedAtRef.current = performance.now() + RELEASE_DELAY_MS;
    onReady();
  }, [onReady]);

  useEffect(() => {
    let disposed = false;

    const enforceBossPressure = (now: number) => {
      if (disposed) return;
      const engine = engineRef.current;
      const boss = engine?.state.enemies.find(enemy => enemy.enemyType === 'boss' && enemy.hp > 0);

      if (boss && releasedAtRef.current > 0 && now >= releasedAtRef.current) {
        boss.speed = Math.max(boss.speed, PURSUIT_SPEED);
        const player = engine!.state.player;
        const distance = Math.hypot(
          player.x + player.width / 2 - (boss.x + boss.width / 2),
          player.y + player.height / 2 - (boss.y + boss.height / 2),
        );

        if (distance > 112 && boss.state !== 'attacking') boss.state = 'chase';
        if (boss.nextAttackTime > now + ATTACK_READY_WINDOW_MS) {
          boss.nextAttackTime = now + ATTACK_READY_WINDOW_MS;
        }
      }

      frameRef.current = requestAnimationFrame(enforceBossPressure);
    };

    frameRef.current = requestAnimationFrame(enforceBossPressure);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
    };
  }, [engineRef]);

  return <WorldBossPerspectiveStage engineRef={engineRef} onReady={handleReady} />;
}
