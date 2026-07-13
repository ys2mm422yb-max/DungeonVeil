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
    <div className="absolute inset-x-0 bottom-0 h-[9vh] bg-gradient-to-t from-[#07090d] via-[#07090d]/20 to-transparent" />
    <span data-testid="ritual-arena-meaning" className="sr-only">Thronbogen, Aschensiegel und Schleiertor</span>
  </div>;
}
