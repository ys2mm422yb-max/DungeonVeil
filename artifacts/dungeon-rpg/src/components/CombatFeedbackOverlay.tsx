import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';

export function CombatFeedbackOverlay({ gameState }: { gameState: GameState }) {
  const lastHp = useRef(gameState.player.hp);
  const seenEnemyHits = useRef(new Map<string, number>());
  const [playerHit, setPlayerHit] = useState(0);
  const [impact, setImpact] = useState<{ id: number; x: number; y: number; heavy: boolean } | null>(null);

  useEffect(() => {
    if (gameState.player.hp < lastHp.current) {
      setPlayerHit(value => value + 1);
      try { navigator.vibrate?.([24, 18, 36]); } catch {}
    }
    lastHp.current = gameState.player.hp;

    const latest = gameState.enemies
      .filter(enemy => enemy.flashUntil > (seenEnemyHits.current.get(enemy.id) ?? 0))
      .sort((a, b) => b.flashUntil - a.flashUntil)[0];

    if (latest) {
      seenEnemyHits.current.set(latest.id, latest.flashUntil);
      const px = ((latest.x + latest.width / 2) / 40) / Math.max(1, gameState.map.width);
      const py = ((latest.y + latest.height / 2) / 40) / Math.max(1, gameState.map.height);
      setImpact({
        id: latest.flashUntil,
        x: Math.max(8, Math.min(92, px * 100)),
        y: Math.max(12, Math.min(82, py * 100)),
        heavy: latest.enemyType === 'boss',
      });
    }
  }, [gameState]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[25] overflow-hidden">
      {playerHit > 0 && (
        <div
          key={`player-hit-${playerHit}`}
          className="absolute inset-0"
          style={{ animation: 'dvPlayerHit .34s ease-out both' }}
        />
      )}
      {impact && (
        <div
          key={impact.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            left: `${impact.x}%`,
            top: `${impact.y}%`,
            width: impact.heavy ? 92 : 54,
            height: impact.heavy ? 92 : 54,
            borderColor: impact.heavy ? 'rgba(255,102,61,.9)' : 'rgba(255,224,138,.9)',
            boxShadow: impact.heavy ? '0 0 40px rgba(255,76,35,.75)' : '0 0 24px rgba(255,211,96,.55)',
            animation: impact.heavy ? 'dvHeavyImpact .3s ease-out both' : 'dvImpact .2s ease-out both',
          }}
        />
      )}
      <style>{`
        @keyframes dvPlayerHit {
          0% { opacity: 0; box-shadow: inset 0 0 0 rgba(255,45,45,0); transform: translateX(0); }
          20% { opacity: 1; box-shadow: inset 0 0 95px rgba(255,45,45,.5); transform: translateX(-5px); }
          38% { transform: translateX(5px); }
          55% { transform: translateX(-3px); }
          100% { opacity: 0; box-shadow: inset 0 0 20px rgba(255,45,45,0); transform: translateX(0); }
        }
        @keyframes dvImpact {
          0% { opacity: 1; transform: translate(-50%,-50%) scale(.25); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.8); }
        }
        @keyframes dvHeavyImpact {
          0% { opacity: 1; transform: translate(-50%,-50%) scale(.2) rotate(-8deg); }
          55% { opacity: .9; transform: translate(-50%,-50%) scale(1.25) rotate(5deg); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(2.2) rotate(0); }
        }
      `}</style>
    </div>
  );
}
