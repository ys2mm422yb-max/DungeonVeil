import React from 'react';
import type { GameEngine } from '../game/runEngine';
import { WorldBossThreeAttackStage } from './WorldBossThreeAttackStage';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

export function WorldBossCombatBandStage(props: Props) {
  return <div data-testid="worldboss-combat-band" className="pointer-events-none fixed inset-0 overflow-hidden bg-[#120c0e]">
    <WorldBossThreeAttackStage {...props} />
    <div className="absolute inset-x-0 bottom-0 h-[7vh] bg-gradient-to-t from-[#120c0e] via-[#120c0e]/12 to-transparent" />
    <span data-testid="ritual-arena-meaning" className="sr-only">Breite steinerne Ritualhalle, dreiteiliger Feueratem, Klauenhieb und Flügelschlag</span>
  </div>;
}
