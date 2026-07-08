import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';
import { GameCanvas } from './GameCanvas';

export function CombatStage({ gameState }: { gameState: GameState }) {
  const previousHpRef = useRef(gameState.player.hp);
  const lastDamageIdRef = useRef('');
  const [shakeKey, setShakeKey] = useState(0);
  const [heavy, setHeavy] = useState(false);
  const [hurtFlash, setHurtFlash] = useState(false);

  useEffect(() => {
    const previousHp = previousHpRef.current;
    if (gameState.player.hp < previousHp) {
      setHeavy(true);
      setHurtFlash(true);
      setShakeKey(key => key + 1);
      try { navigator.vibrate?.([24, 18, 40]); } catch {}
      const timer = window.setTimeout(() => setHurtFlash(false), 220);
      previousHpRef.current = gameState.player.hp;
      return () => window.clearTimeout(timer);
    }
    previousHpRef.current = gameState.player.hp;

    const latest = gameState.damageNumbers[gameState.damageNumbers.length - 1];
    if (!latest || latest.id === lastDamageIdRef.current || latest.id.startsWith('clear-')) return;
    lastDamageIdRef.current = latest.id;
    const isPlayerHit = latest.id.startsWith('hit-');
    const isHeavy = latest.scale >= 1.3;
    if (!isPlayerHit) {
      setHeavy(isHeavy);
      setShakeKey(key => key + 1);
      if (isHeavy) {
        try { navigator.vibrate?.(28); } catch {}
      }
    }
  }, [gameState.damageNumbers, gameState.player.hp]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        key={shakeKey}
        className={`absolute inset-0 ${heavy ? 'dv-heavy-impact' : 'dv-light-impact'}`}
      >
        <GameCanvas gameState={gameState} />
      </div>
      <div className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-200 ${hurtFlash ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(185,22,27,.44)_100%)]" />
      </div>
      <style>{`
        @keyframes dvLightImpact {
          0% { transform: translate3d(0,0,0) scale(1); }
          22% { transform: translate3d(-2px,1px,0) scale(1.002); }
          48% { transform: translate3d(2px,-1px,0) scale(1.002); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes dvHeavyImpact {
          0% { transform: translate3d(0,0,0) scale(1); }
          14% { transform: translate3d(-6px,3px,0) scale(1.006); }
          32% { transform: translate3d(5px,-3px,0) scale(1.006); }
          52% { transform: translate3d(-3px,2px,0) scale(1.003); }
          72% { transform: translate3d(2px,-1px,0) scale(1.002); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        .dv-light-impact { animation: dvLightImpact 105ms linear both; }
        .dv-heavy-impact { animation: dvHeavyImpact 185ms cubic-bezier(.22,.61,.36,1) both; }
      `}</style>
    </div>
  );
}
