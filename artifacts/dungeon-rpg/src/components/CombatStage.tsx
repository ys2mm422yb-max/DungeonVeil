import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';
import type { CoopPlayerPresence } from '../game/coopRealtimePresence';
import { GameCanvas } from './GameCanvas';
import { CoopTeammateOverlay } from './CoopTeammateOverlay';

const ROOM_NAMES = [
  'VERSORGUNGSPOSTEN', 'WACHSTUBE', 'SÄULENHALLE', 'BERGARBEITERLAGER', 'WERKSTATT',
  'SCHMIEDE', 'SCHLAFQUARTIER', 'MATERIALLAGER', 'RITUALKAMMER', 'GRABWÄCHTERHALLE',
  'KREUZGANG', 'GALERIE', 'GEFÄNGNISRING', 'KNOCHENHOF', 'RITUALARENA',
  'WÄCHTERPASSAGE', 'EINGESTÜRZTES GEWÖLBE', 'SCHLEIER-RISS', 'WÄCHTERVORHALLE', 'BOSSHEILIGTUM',
] as const;

type ViewportBox = { width: number; height: number; left: number; top: number };

type Props = {
  gameState: GameState;
  remotePlayer?: CoopPlayerPresence | null;
};

function readViewport(): ViewportBox {
  const viewport = window.visualViewport;
  return {
    width: Math.max(1, Math.round(viewport?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(viewport?.height ?? window.innerHeight)),
    left: Math.round(viewport?.offsetLeft ?? 0),
    top: Math.round(viewport?.offsetTop ?? 0),
  };
}

export function CombatStage({ gameState, remotePlayer = null }: Props) {
  const previousHpRef = useRef(gameState.player.hp);
  const previousFloorRef = useRef(gameState.floor);
  const lastDamageIdRef = useRef('');
  const shakeTimerRef = useRef<number | null>(null);
  const [shakeClass, setShakeClass] = useState('');
  const [hurtFlash, setHurtFlash] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [roomTitle, setRoomTitle] = useState(() => ROOM_NAMES[Math.max(0, Math.min(19, gameState.floor - 1))]);
  const [showRoomTitle, setShowRoomTitle] = useState(true);
  const [viewport, setViewport] = useState<ViewportBox>(() => readViewport());

  const triggerShake = (heavy: boolean) => {
    if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current);
    setShakeClass('');
    requestAnimationFrame(() => {
      setShakeClass(heavy ? 'dv-heavy-impact' : 'dv-light-impact');
      shakeTimerRef.current = window.setTimeout(() => setShakeClass(''), heavy ? 200 : 110);
    });
  };

  useEffect(() => {
    let frame = 0;
    const updateViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport(readViewport()));
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (previousFloorRef.current === gameState.floor) return undefined;
    previousFloorRef.current = gameState.floor;
    setRoomTitle(ROOM_NAMES[Math.max(0, Math.min(19, gameState.floor - 1))]);
    setShowRoomTitle(true);
    try { navigator.vibrate?.([12, 35, 18]); } catch {}
    const timer = window.setTimeout(() => setShowRoomTitle(false), 1050);
    return () => window.clearTimeout(timer);
  }, [gameState.floor]);

  useEffect(() => {
    const previousHp = previousHpRef.current;
    if (gameState.player.hp < previousHp) {
      setHurtFlash(true);
      triggerShake(true);
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
      triggerShake(isHeavy);
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
    const timer = window.setTimeout(() => setShowRoomTitle(false), 1050);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current);
  }, []);

  return (
    <div
      className="fixed overflow-hidden bg-black"
      style={{ left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height }}
      data-testid="run-visual-viewport"
      data-viewport-width={viewport.width}
      data-viewport-height={viewport.height}
    >
      <div className={`absolute inset-0 ${shakeClass}`}>
        <GameCanvas gameState={gameState} />
        <CoopTeammateOverlay gameState={gameState} remotePlayer={remotePlayer} />
      </div>
      <div className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-200 ${hurtFlash ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(185,22,27,.48)_100%)]" />
      </div>
      <div className={`pointer-events-none absolute inset-0 z-20 bg-white transition-opacity duration-75 ${hitFlash ? 'opacity-[.06]' : 'opacity-0'}`} />
      <div className={`pointer-events-none absolute inset-x-0 top-[22%] z-30 flex justify-center transition-all duration-400 ${showRoomTitle ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
        <div className="relative min-w-[220px] max-w-[78vw] overflow-hidden rounded-xl border border-amber-200/18 bg-black/62 px-5 py-3 text-center shadow-[0_14px_38px_rgba(0,0,0,.38)] backdrop-blur-md">
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/65 to-transparent" />
          <div className="text-[7px] font-black uppercase tracking-[.34em] text-amber-200/45">KAPITEL {gameState.chapter} · RAUM {gameState.floor}</div>
          <div className="mt-1 font-serif text-[16px] tracking-[.08em] text-[#f4ead5]">{roomTitle}</div>
        </div>
      </div>
      <style>{`
        @keyframes dvLightImpact { 0% { transform: translate3d(0,0,0) scale(1); } 22% { transform: translate3d(-2px,1px,0) scale(1.002); } 48% { transform: translate3d(2px,-1px,0) scale(1.002); } 100% { transform: translate3d(0,0,0) scale(1); } }
        @keyframes dvHeavyImpact { 0% { transform: translate3d(0,0,0) scale(1); } 14% { transform: translate3d(-7px,3px,0) scale(1.008); } 32% { transform: translate3d(6px,-3px,0) scale(1.008); } 52% { transform: translate3d(-4px,2px,0) scale(1.004); } 72% { transform: translate3d(2px,-1px,0) scale(1.002); } 100% { transform: translate3d(0,0,0) scale(1); } }
        .dv-light-impact { animation: dvLightImpact 105ms linear both; }
        .dv-heavy-impact { animation: dvHeavyImpact 195ms cubic-bezier(.22,.61,.36,1) both; }
      `}</style>
    </div>
  );
}
