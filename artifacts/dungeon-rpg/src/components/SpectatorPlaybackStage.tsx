import { useEffect, useState } from 'react';
import type { RunGameState } from '../game/runEngine';
import { companionForOwnerV5 } from '../game/companionCollectionV5';
import { GameCanvasKayKit3D } from './GameCanvasKayKit3D';
import { CompanionScene3D } from './CompanionScene3D';

type ViewportBox = { width: number; height: number; left: number; top: number };
const SPECTATOR_FALLBACK_COMPANION = companionForOwnerV5('spectator-playback-fallback');

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
    data-render-contract="single-stable-three-state-with-companion"
    className="fixed overflow-hidden bg-black"
    style={{ left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height }}
  >
    <GameCanvasKayKit3D gameState={stableState} />
    <CompanionScene3D gameState={stableState} localCompanion={{ role: SPECTATOR_FALLBACK_COMPANION.id, level: SPECTATOR_FALLBACK_COMPANION.level }} />
    <span className="hidden" aria-hidden="true" data-testid="spectator-companion-contract" data-visible-cap="1" data-shared-renderer="true" data-model-source="procedural-distinct-companion-v5" />
  </div>;
}
