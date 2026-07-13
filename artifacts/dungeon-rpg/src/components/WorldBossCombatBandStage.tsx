import React from 'react';
import type { GameEngine } from '../game/runEngine';
import { WorldBossCohesiveStage } from './WorldBossCohesiveStage';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

export function WorldBossCombatBandStage(props: Props) {
  return <div data-testid="worldboss-combat-band" className="pointer-events-none fixed inset-0 overflow-hidden bg-[#151116]">
    <WorldBossCohesiveStage {...props} />
    <div className="absolute inset-x-0 bottom-0 h-[8vh] bg-gradient-to-t from-[#09070a] via-[#09070a]/20 to-transparent" />
    <span data-testid="ritual-arena-meaning" className="sr-only">Perspektivisches KayKit-Bossheiligtum mit erhöhter Aschenkönig-Plattform, Schleiertor, Säulen, Thron und räumlicher Dungeon-Architektur</span>
  </div>;
}
