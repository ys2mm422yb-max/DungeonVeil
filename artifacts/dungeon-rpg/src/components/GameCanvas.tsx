import React from 'react';
import type { GameState } from '../game/runEngine';
import { GameCanvasVerticalSlice3D } from './GameCanvasVerticalSlice3D';
import { CombatFeedbackOverlay } from './CombatFeedbackOverlay';

export function GameCanvas({ gameState }: { gameState: GameState }) {
  return (
    <>
      <GameCanvasVerticalSlice3D gameState={gameState} />
      <CombatFeedbackOverlay gameState={gameState} />
    </>
  );
}
