import React from 'react';
import type { GameEngine } from '../game/runEngine';
import { WorldBossDedicatedStage } from './WorldBossDedicatedStage';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

export function WorldBossCombatBandStage(props: Props) {
  return <div className="pointer-events-none fixed inset-0 overflow-hidden">
    <div
      className="absolute inset-0"
      style={{
        transform: 'translateY(-1.4vh) scale(1.2)',
        transformOrigin: '50% 47%',
      }}
    >
      <WorldBossDedicatedStage {...props} />
    </div>
  </div>;
}
