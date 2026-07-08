import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';
import { GameCanvas } from './GameCanvas';

const ROOM_NAMES = [
  'WAFFENKAMMER',
  'ARKANES ARCHIV',
  'SCHREINHALLE',
  'FALLENKAMMER',
  'KERKER',
  'KRIEGSSAAL',
  'RITUALKAMMER',
  'VORRATSGEWÖLBE',
  'VERLASSENE KAPELLE',
  'HALLE DES WÄCHTERS',
] as const;

export function CombatStage({ gameState }: { gameState: GameState }) {
  const previousHpRef = useRef(gameState.player.hp);
  const previousFloorRef = useRef(gameState.floor);
  const lastDamageIdRef = useRef('');
  const [shakeKey, setShakeKey] = useState(0);
  const [heavy, setHeavy] = useState(false);
  const [hurtFlash, setHurtFlash] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [roomTitle, setRoomTitle] = useState(() => ROOM_NAMES[Math.max(0, Math.min(9, gameState.floor - 1))]);
  const [showRoomTitle, setShowRoomTitle] = useState(true);

  useEffect(() => {
    if (previousFloorRef.current === gameState.floor) return undefined;
    previousFloorRef.current = gameState.floor;
    setRoomTitle(ROOM_NAMES[Math.max(0, Math.min(9, gameState.floor - 1))]);
    setShowRoomTitle(true);
    try { navigator.vibrate?.([12, 35, 18]); } catch {}
    const timer = window.setTimeout(() => setShowRoomTitle(false), 1350);
    return () => window.clearTimeout(timer);
  }, [gameState.floor]);

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
    if (!latest || latest.id === lastDamageIdRef.current || latest.id.startsWith('clear-')) return undefined;
    lastDamageIdRef.current = latest.id;
    const isPlayerHit = latest.id.startsWith('hit-');
    const isHeavy = (latest.scale ?? 1) >= 1.3;
    if (!isPlayerHit) {
      setHeavy(isHeavy);
      setShakeKey(key => key + 1);
      setHitFlash(true);
      const flashTimer = window.setTimeout(() => setHitFlash(false), isHeavy ? 100 : 55);
      if (isHeavy) {
        try { navigator.vibrate?.(28); } catch {}
      }
      return () => window.clearTimeout(flashTimer);
    }

    return undefined;
  }, [gameState.damageNumbers, gameState.player.hp]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowRoomTitle(false), 1350);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        key={shakeKey}
        className={`absolute inset-0 ${heavy ? 'dv-heavy-impact' : 'dv-light-impact'}`}
      >
        <GameCanvas gameState={gameState} />
      </div>

      <div className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-200 ${hurtFlash ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(185,22,27,.48)_100%)]" />
      </div>

      <div className={`pointer-events-none absolute inset-0 z-20 bg-white transition-opacity duration-75 ${hitFlash ? 'opacity-[.06]' : 'opacity-0'}`} />

      <div className={`pointer-events-none absolute inset-x-0 top-[19%] z-30 flex justify-center transition-all duration-500 ${showRoomTitle ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}>
        <div className="relative min-w-[255px] overflow-hidden rounded-2xl border border-amber-200/20 bg-black/65 px-7 py-4 text-center shadow-[0_20px_55px_rgba(0,0,0,.45)] backdrop-blur-md">
          <div className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          <div className="text-[8px] font-black uppercase tracking-[.42em] text-amber-200/45">KAPITEL {gameState.chapter} · RAUM {gameState.floor}</div>
          <div className="mt-1.5 font-serif text-[20px] tracking-[.1em] text-[#f4ead5]">{roomTitle}</div>
        </div>
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
          14% { transform: translate3d(-7px,3px,0) scale(1.008); }
          32% { transform: translate3d(6px,-3px,0) scale(1.008); }
          52% { transform: translate3d(-4px,2px,0) scale(1.004); }
          72% { transform: translate3d(2px,-1px,0) scale(1.002); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        .dv-light-impact { animation: dvLightImpact 105ms linear both; }
        .dv-heavy-impact { animation: dvHeavyImpact 195ms cubic-bezier(.22,.61,.36,1) both; }
      `}</style>
    </div>
  );
}
