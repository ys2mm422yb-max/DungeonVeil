import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';
import { GameCanvasKayKit3D } from './GameCanvasKayKit3D';
import { CombatFeedbackOverlay } from './CombatFeedbackOverlay';

type RuntimeDiagnostics = {
  navigationType: string;
  pageShows: number;
  pageHides: number;
  webglContextLosses: number;
  rendererRecoveries: number;
  lastEvent: string;
  lastEventAt: number;
};

const DIAGNOSTICS_KEY = 'dungeon-veil-runtime-diagnostics';

function updateDiagnostics(event: string, patch: Partial<RuntimeDiagnostics> = {}) {
  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const current: RuntimeDiagnostics = JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) || '{}');
    const next: RuntimeDiagnostics = {
      navigationType: current.navigationType || navigation?.type || 'unknown',
      pageShows: current.pageShows || 0,
      pageHides: current.pageHides || 0,
      webglContextLosses: current.webglContextLosses || 0,
      rendererRecoveries: current.rendererRecoveries || 0,
      lastEvent: event,
      lastEventAt: Date.now(),
      ...patch,
    };
    localStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(next));
    console.info('[DungeonVeil runtime]', next);
  } catch {}
}

export function GameCanvas({ gameState }: { gameState: GameState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [rendererGeneration, setRendererGeneration] = useState(0);

  useEffect(() => {
    const onPageShow = () => {
      let pageShows = 1;
      try { pageShows = (JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) || '{}').pageShows || 0) + 1; } catch {}
      updateDiagnostics('pageshow', { pageShows });
    };
    const onPageHide = () => {
      let pageHides = 1;
      try { pageHides = (JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) || '{}').pageHides || 0) + 1; } catch {}
      updateDiagnostics('pagehide', { pageHides });
    };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);
    updateDiagnostics('game-canvas-mounted');
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let canvas: HTMLCanvasElement | null = null;
    let observer: MutationObserver | null = null;
    let recoveryTimer: number | null = null;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      let webglContextLosses = 1;
      try { webglContextLosses = (JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) || '{}').webglContextLosses || 0) + 1; } catch {}
      updateDiagnostics('webglcontextlost', { webglContextLosses });
      if (recoveryTimer !== null) window.clearTimeout(recoveryTimer);
      recoveryTimer = window.setTimeout(() => {
        let rendererRecoveries = 1;
        try { rendererRecoveries = (JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) || '{}').rendererRecoveries || 0) + 1; } catch {}
        updateDiagnostics('renderer-recovery', { rendererRecoveries });
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
