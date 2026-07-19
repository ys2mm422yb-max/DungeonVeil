import { useEffect, useRef } from 'react';
import type React from 'react';
import type { GameEngine } from '../game/runEngine';
import { getWorldBossLoadFailure } from './worldBossMobileVisual3D';

export function WorldBossRuntimeDiagnostics({ engineRef }: { engineRef: React.RefObject<GameEngine | null> }) {
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    let lastPaint = 0;
    const paint = (time: number) => {
      const host = hostRef.current;
      const engine = engineRef.current;
      if (host && engine && time - lastPaint >= 50) {
        lastPaint = time;
        const player = engine.state.player;
        const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
        host.dataset.playerX = player.x.toFixed(3);
        host.dataset.playerY = player.y.toFixed(3);
        host.dataset.playerState = player.state;
        host.dataset.playerLastDodge = String(player.lastDodgeTime || 0);
        host.dataset.joyX = engine.input.joyX.toFixed(3);
        host.dataset.joyY = engine.input.joyY.toFixed(3);
        host.dataset.engineStatus = engine.state.status;
        host.dataset.bossHp = String(Math.max(0, boss?.hp ?? 0));
        host.dataset.dragonLoadState = getWorldBossLoadFailure() ? 'error' : 'ok-or-loading';
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [engineRef]);

  return <span ref={hostRef} data-testid="worldboss-runtime-diagnostics" data-contract="movement-dash-v1" className="sr-only" />;
}
