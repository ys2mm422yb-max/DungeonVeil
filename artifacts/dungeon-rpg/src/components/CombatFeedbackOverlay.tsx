import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';

export function CombatFeedbackOverlay({ gameState }: { gameState: GameState }) {
  const lastHp = useRef(gameState.player.hp);
  const [playerHit, setPlayerHit] = useState(0);

  useEffect(() => {
    if (gameState.player.hp < lastHp.current) {
      setPlayerHit(value => value + 1);
      try { navigator.vibrate?.([24, 18, 36]); } catch {}
    }
    lastHp.current = gameState.player.hp;
  }, [gameState.player.hp]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[25] overflow-hidden">
      {playerHit > 0 && (
        <div
          key={`player-hit-${playerHit}`}
          className="absolute inset-0"
          style={{ animation: 'dvPlayerHit .34s ease-out both' }}
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
      `}</style>
    </div>
  );
}
