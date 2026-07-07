import React, { useEffect, useRef } from 'react';
import { GameState } from '../game/engine';
import { renderGameScene } from '../game/overworldSprites';

export function ModernGameCanvas({ gameState }: { gameState: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const timer = window.setInterval(() => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const state = stateRef.current;
      renderGameScene(ctx, state, Date.now(), canvas.width, canvas.height, state.camera.x, state.camera.y);
    }, 33);
    return () => window.clearInterval(timer);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ imageRendering: 'pixelated' }} />;
}
