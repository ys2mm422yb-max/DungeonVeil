import React from 'react';
import { GameState } from '../game/engine';

// Unused legacy 2D canvas stub. The active renderer is GameCanvas3D.
export function ModernGameCanvas({ gameState }: { gameState: GameState }) {
  return <div className="hidden" data-game-state={gameState ? 'active' : 'inactive'} />;
}
