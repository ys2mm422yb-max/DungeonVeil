import React from 'react';
import type { GameState } from '../game/runEngine';
import { GameCanvasKayKit3D } from './GameCanvasKayKit3D';
import { CombatFeedbackOverlay } from './CombatFeedbackOverlay';

export function GameCanvas({ gameState }: { gameState: GameState }) {
  return (
    <>
      <GameCanvasKayKit3D gameState={gameState} />
      <CombatFeedbackOverlay gameState={gameState} />
    </>
  );
}
