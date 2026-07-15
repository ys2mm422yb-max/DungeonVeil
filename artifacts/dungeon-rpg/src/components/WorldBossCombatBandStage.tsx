import React, { useCallback, useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { LOADING_TIMING } from '../game/loadingTiming';
import { WorldBossCohesiveStage } from './WorldBossCohesiveStage';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

export function WorldBossCombatBandStage({ engineRef, onReady }: Props) {
  const mountedAtRef = useRef(Date.now());
  const readyScheduledRef = useRef(false);
  const readyTimerRef = useRef<number | null>(null);

  const handleReady = useCallback(() => {
    if (readyScheduledRef.current) return;
    readyScheduledRef.current = true;
    const elapsed = Date.now() - mountedAtRef.current;
    const remaining = Math.max(0, LOADING_TIMING.worldBossMinimumMs - elapsed);
    readyTimerRef.current = window.setTimeout(onReady, remaining);
  }, [onReady]);

  useEffect(() => () => {
    if (readyTimerRef.current !== null) window.clearTimeout(readyTimerRef.current);
  }, []);

  return <div data-testid="worldboss-combat-band" className="pointer-events-none fixed inset-0 overflow-hidden bg-[#151116]">
    <WorldBossCohesiveStage engineRef={engineRef} onReady={handleReady} />
    <div className="absolute inset-x-0 bottom-0 h-[8vh] bg-gradient-to-t from-[#09070a] via-[#09070a]/20 to-transparent" />
    <span data-testid="ritual-arena-meaning" className="sr-only">Perspektivisches KayKit-Bossheiligtum mit erhöhter Aschenkönig-Plattform, Schleiertor, Säulen, Thron und räumlicher Dungeon-Architektur</span>
  </div>;
}
