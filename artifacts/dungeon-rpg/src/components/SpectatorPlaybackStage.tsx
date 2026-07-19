import { useEffect, useState } from 'react';
import type { RunGameState } from '../game/runEngine';
import { GameCanvasKayKit3D } from './GameCanvasKayKit3D';

type ViewportBox = { width: number; height: number; left: number; top: number };

function readViewport(): ViewportBox {
  const viewport = window.visualViewport;
  return {
    width: Math.max(1, Math.round(viewport?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(viewport?.height ?? window.innerHeight)),
    left: Math.round(viewport?.offsetLeft ?? 0),
    top: Math.round(viewport?.offsetTop ?? 0),
  };
}

export function SpectatorPlaybackStage({ stableState }: { stableState: RunGameState }) {
  const [viewport, setViewport] = useState<ViewportBox>(() => readViewport());

  useEffect(() => {
    let frame = 0;
    const updateViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport(readViewport()));
    };
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  return <div
    data-testid="spectator-playback-stage"
    data-render-contract="single-stable-three-state"
    className="fixed overflow-hidden bg-black"
    style={{ left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height }}
  >
    <GameCanvasKayKit3D gameState={stableState} />
  </div>;
}
