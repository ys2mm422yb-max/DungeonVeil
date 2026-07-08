import React from 'react';
import type { GameState } from '../game/runEngine';
import { GameCanvasClearForest3D } from './GameCanvasClearForest3D';
import { CombatFeedbackOverlay } from './CombatFeedbackOverlay';

export function GameCanvas({ gameState }: { gameState: GameState }) {
  return (
    <>
      <GameCanvasClearForest3D gameState={gameState} />
      <CombatFeedbackOverlay gameState={gameState} />
    </>
  );
}
