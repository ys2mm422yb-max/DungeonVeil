import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';
import { GameCanvasKayKit3D } from './GameCanvasKayKit3D';
import { CombatFeedbackOverlay } from './CombatFeedbackOverlay';

export function GameCanvas({ gameState }: { gameState: GameState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [rendererGeneration, setRendererGeneration] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let canvas: HTMLCanvasElement | null = null;
    let observer: MutationObserver | null = null;
    let recoveryTimer: number | null = null;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('Dungeon Veil WebGL context lost');
      if (recoveryTimer !== null) window.clearTimeout(recoveryTimer);
      recoveryTimer = window.setTimeout(() => {
        setRendererGeneration(generation => generation + 1);
      }, 120);
    };

    const bindCanvas = () => {
      const next = host.querySelector('canvas');
      if (next === canvas) return;
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas = next;
      canvas?.addEventListener('webglcontextlost', handleContextLost, { passive: false });
    };

    bindCanvas();
    observer = new MutationObserver(bindCanvas);
    observer.observe(host, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      if (recoveryTimer !== null) window.clearTimeout(recoveryTimer);
    };
  }, [rendererGeneration]);

  return (
    <div ref={hostRef} className="absolute inset-0">
      <GameCanvasKayKit3D key={rendererGeneration} gameState={gameState} />
      <CombatFeedbackOverlay gameState={gameState} />
    </div>
  );
}
