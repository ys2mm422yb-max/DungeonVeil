import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';
import { GameCanvas } from './GameCanvas';

const ROOM_NAMES = [
  'VERSORGUNGSPOSTEN', 'WACHSTUBE', 'SÄULENHALLE', 'BERGARBEITERLAGER', 'WERKSTATT',
  'SCHMIEDE', 'SCHLAFQUARTIER', 'MATERIALLAGER', 'RITUALKAMMER', 'GRABWÄCHTERHALLE',
  'KREUZGANG', 'GALERIE', 'GEFÄNGNISRING', 'KNOCHENHOF', 'RITUALARENA',
  'WÄCHTERPASSAGE', 'EINGESTÜRZTES GEWÖLBE', 'SCHLEIER-RISS', 'WÄCHTERVORHALLE', 'BOSSHEILIGTUM',
] as const;

export function CombatStage({ gameState }: { gameState: GameState }) {
  const previousHpRef = useRef(gameState.player.hp);
  const previousFloorRef = useRef(gameState.floor);
  const lastDamageIdRef = useRef('');
  const shakeTimerRef = useRef<number | null>(null);
  const [shakeClass, setShakeClass] = useState('');
  const [hurtFlash, setHurtFlash] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [roomTitle, setRoomTitle] = useState(() => ROOM_NAMES[Math.max(0, Math.min(19, gameState.floor - 1))]);
  const [showRoomTitle, setShowRoomTitle] = useState(true);
  const [visualHeight, setVisualHeight] = useState(() => Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight)));

  const triggerShake = (heavy: boolean) => {
    if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current);
    setShakeClass('');
    requestAnimationFrame(() => {
      setShakeClass(heavy ? 'dv-heavy-impact' : 'dv-light-impact');
      shakeTimerRef.current = window.setTimeout(() => setShakeClass(''), heavy ? 200 : 110);
    });
  };

  useEffect(() => {
    const updateVisualHeight = () => setVisualHeight(Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight)));
    updateVisualHeight();
    window.addEventListener('resize', updateVisualHeight);
    window.visualViewport?.addEventListener('resize', updateVisualHeight);
    window.visualViewport?.addEventListener('scroll', updateVisualHeight);
    return () => {
      window.removeEventListener('resize', updateVisualHeight);
      window.visualViewport?.removeEventListener('resize', updateVisualHeight);
      window.visualViewport?.removeEventListener('scroll', updateVisualHeight);
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

  useEffect(() => {
    const compactSynergyBanner = () => {
      const labels = Array.from(document.querySelectorAll<HTMLElement>('div,span'))
        .filter(node => node.childElementCount === 0 && node.textContent?.trim().includes('SYNERGIE ERWACHT'));
      labels.forEach(label => {
        let panel: HTMLElement | null = label.parentElement;
        for (let depth = 0; panel && depth < 4; depth++) {
          const rect = panel.getBoundingClientRect();
          if (rect.width >= 240 && rect.height <= 210) break;
          panel = panel.parentElement;
        }
        if (!panel || panel.dataset.dvCompactSynergy === '1') return;
        panel.dataset.dvCompactSynergy = '1';
        panel.style.setProperty('left', '50%', 'important');
        panel.style.setProperty('right', 'auto', 'important');
        panel.style.setProperty('top', 'max(5.4rem, calc(env(safe-area-inset-top) + 4.4rem))', 'important');
        panel.style.setProperty('bottom', 'auto', 'important');
        panel.style.setProperty('width', 'min(86vw, 390px)', 'important');
        panel.style.setProperty('max-width', '390px', 'important');
        panel.style.setProperty('min-height', '0', 'important');
        panel.style.setProperty('padding', '10px 14px', 'important');
        panel.style.setProperty('transform', 'translateX(-50%)', 'important');
        panel.style.setProperty('border-radius', '16px', 'important');
        panel.style.setProperty('z-index', '46', 'important');
        panel.querySelectorAll<HTMLElement>('div,p,span').forEach(child => {
          child.style.setProperty('line-height', '1.25', 'important');
          if (child !== label && child.textContent && child.textContent.length > 24) {
            child.style.setProperty('font-size', '12px', 'important');
          }
        });
        label.style.setProperty('font-size', '7px', 'important');
      });
    };
    compactSynergyBanner();
    const observer = new MutationObserver(compactSynergyBanner);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="absolute left-0 top-0 w-full overflow-hidden" style={{ height: `${visualHeight}px` }} data-testid="run-visual-viewport">
      <div className={`absolute inset-0 ${shakeClass}`}>
        <GameCanvas gameState={gameState} />
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
