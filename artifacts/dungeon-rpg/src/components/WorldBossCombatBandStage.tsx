import React from 'react';
import type { GameEngine } from '../game/runEngine';
import { WorldBossDedicatedStage } from './WorldBossDedicatedStage';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

export function WorldBossCombatBandStage(props: Props) {
  return <div data-testid="worldboss-combat-band" className="pointer-events-none fixed inset-0 overflow-hidden bg-[#07090d]">
    <WorldBossDedicatedStage {...props} />
    <div className="absolute inset-x-0 bottom-0 h-[18vh] bg-gradient-to-t from-[#07090d] via-[#07090d]/35 to-transparent" />
    <div data-testid="ritual-arena-meaning" className="absolute inset-x-0 top-[22%] flex justify-center">
      <div className="rounded-full border border-orange-300/12 bg-black/20 px-3 py-1 text-[6px] font-black uppercase tracking-[.28em] text-orange-100/18">THRONBOGEN · ASCHENSIEGEL · SCHLEIERTOR</div>
    </div>
  </div>;
}
