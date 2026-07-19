import React, { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { getWorldBossLoadFailure } from './worldBossMobileVisual3D';
import { WorldBossCohesiveStage } from './WorldBossCohesiveStage';
import { WorldBossMobileArenaGuard } from './WorldBossMobileArenaGuard';
import { WorldBossBalanceBridgeV4 } from './WorldBossBalanceBridgeV4';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
  onLoadError?: (message: string) => void;
};

export function WorldBossCombatBandStage({ engineRef, onReady, onLoadError }: Props) {
  const reportedRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    const inspect = () => {
      const failure = getWorldBossLoadFailure();
      if (failure && !reportedRef.current) {
        reportedRef.current = true;
        onLoadError?.(failure.message);
      }
      frame = requestAnimationFrame(inspect);
    };
    frame = requestAnimationFrame(inspect);
    return () => cancelAnimationFrame(frame);
  }, [onLoadError]);

  return <div data-testid="worldboss-combat-band" className="pointer-events-none fixed inset-0 overflow-hidden bg-[#151116]">
    <WorldBossCohesiveStage engineRef={engineRef} onReady={onReady} />
    <WorldBossMobileArenaGuard engineRef={engineRef} />
    <WorldBossBalanceBridgeV4 engineRef={engineRef} />
    <div className="absolute inset-x-0 bottom-0 h-[8vh] bg-gradient-to-t from-[#09070a] via-[#09070a]/20 to-transparent" />
    <span data-testid="ritual-arena-meaning" className="sr-only">Perspektivisches KayKit-Bossheiligtum mit erhöhter Aschenkönig-Plattform, Schleiertor, Säulen, Thron und räumlicher Dungeon-Architektur</span>
  </div>;
}
