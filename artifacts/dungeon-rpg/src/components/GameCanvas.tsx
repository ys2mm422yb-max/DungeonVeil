import React, { useEffect, useRef, useState } from 'react';
import type { EnemyType } from '../game/entities';
import type { GameState } from '../game/runEngine';
import { CHAPTER_ROOMS, isBossRoom } from '../game/chapterRun';
import { getEncounterPlan } from '../game/encounterPlan';
import { reportProductionAudit } from '../game/productionAudit';
import { GameCanvasKayKit3D } from './GameCanvasKayKit3D';
import { CombatFeedbackOverlay } from './CombatFeedbackOverlay';
import { preloadKayKitDungeonRoom } from './kaykitRoom3D';
import { preloadKayKitRoomTheme } from './kaykitRoomThemes3D';
import { preloadKayKitEnemyVisuals } from './kaykitEnemy3D';

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
const LOW_GPU_KEY = 'dungeon-veil-low-gpu';
const DOUBLE_TAP_ZOOM_WINDOW_MS = 360;
const DOUBLE_TAP_ZOOM_DISTANCE_PX = 44;

function roomKey(state: GameState) {
  return `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;
}

function uniqueEnemyTypes(types: readonly EnemyType[]) {
  return [...new Set(types)];
}

function currentRoomEnemyTypes(state: GameState) {
  return uniqueEnemyTypes(state.enemies.map(enemy => enemy.enemyType));
}

function plannedRoomEnemyTypes(floor: number): EnemyType[] {
  return isBossRoom(floor) ? ['boss'] : uniqueEnemyTypes(getEncounterPlan(floor));
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));
}

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
  const latestStateRef = useRef(gameState);
  latestStateRef.current = gameState;
  const renderedRoomKeyRef = useRef('');
  const transitionTokenRef = useRef(0);
  const preloadKeyRef = useRef('');
  const recoveringRef = useRef(false);
  const recoveryReadyTimerRef = useRef<number | null>(null);
  const [renderState, setRenderState] = useState(gameState);
  const [rendererGeneration, setRendererGeneration] = useState(0);
  const liveRoomKey = roomKey(gameState);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let lastTouchEndedAt = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;

    const preventBrowserZoom = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    const preventPinchZoom = (event: TouchEvent) => {
      if (event.touches.length > 1 && event.cancelable) event.preventDefault();
    };
    const preventDoubleTapZoom = (event: TouchEvent) => {
      if (event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const now = performance.now();
      const closeToLastTap = Math.hypot(touch.clientX - lastTouchX, touch.clientY - lastTouchY) <= DOUBLE_TAP_ZOOM_DISTANCE_PX;
      if (now - lastTouchEndedAt <= DOUBLE_TAP_ZOOM_WINDOW_MS && closeToLastTap && event.cancelable) {
        event.preventDefault();
      }
      lastTouchEndedAt = now;
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
    };

    host.addEventListener('touchmove', preventPinchZoom, { passive: false });
    host.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
    host.addEventListener('dblclick', preventBrowserZoom, { passive: false });
    document.addEventListener('gesturestart', preventBrowserZoom, { passive: false });
    document.addEventListener('gesturechange', preventBrowserZoom, { passive: false });
    document.addEventListener('gestureend', preventBrowserZoom, { passive: false });

    return () => {
      host.removeEventListener('touchmove', preventPinchZoom);
      host.removeEventListener('touchend', preventDoubleTapZoom);
      host.removeEventListener('dblclick', preventBrowserZoom);
      document.removeEventListener('gesturestart', preventBrowserZoom);
      document.removeEventListener('gesturechange', preventBrowserZoom);
      document.removeEventListener('gestureend', preventBrowserZoom);
    };
  }, []);

  useEffect(() => {
    if (liveRoomKey === renderedRoomKeyRef.current) setRenderState(gameState);
  }, [gameState, liveRoomKey]);

  useEffect(() => {
    if (liveRoomKey === renderedRoomKeyRef.current) return undefined;
    const token = ++transitionTokenRef.current;
    let cancelled = false;
    const requiredEnemyTypes = currentRoomEnemyTypes(gameState);
    window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', {
      detail: { key: liveRoomKey, floor: gameState.floor, enemyTypes: requiredEnemyTypes },
    }));

    const stageRoom = async () => {
      let attempt = 0;
      while (!cancelled && token === transitionTokenRef.current) {
        try {
          await Promise.all([
            preloadKayKitDungeonRoom(gameState.floor),
            preloadKayKitRoomTheme(gameState.floor),
            preloadKayKitEnemyVisuals(requiredEnemyTypes),
          ]);
          if (cancelled || token !== transitionTokenRef.current) return;
          const latest = latestStateRef.current;
          if (roomKey(latest) !== liveRoomKey) return;
          renderedRoomKeyRef.current = liveRoomKey;
          setRenderState(latest);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            if (cancelled || token !== transitionTokenRef.current) return;
            window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', {
              detail: { key: liveRoomKey, floor: latest.floor, enemyTypes: requiredEnemyTypes },
            }));
          }));
          return;
        } catch (error) {
          attempt += 1;
          console.error(`Dungeon Veil room staging attempt ${attempt} failed; keeping previous room visible`, error);
          await wait(Math.min(4_000, 500 * attempt));
        }
      }
    };

    void stageRoom();
    return () => {
      cancelled = true;
    };
  }, [liveRoomKey, gameState.floor]);

  useEffect(() => {
    if (!gameState.roomClearReady) return;
    const nextFloor = gameState.floor >= CHAPTER_ROOMS ? 1 : gameState.floor + 1;
    const nextChapter = gameState.floor >= CHAPTER_ROOMS ? gameState.chapter + 1 : gameState.chapter;
    const key = `${nextChapter}:${nextFloor}`;
    if (preloadKeyRef.current === key) return;
    preloadKeyRef.current = key;
    void Promise.all([
      preloadKayKitDungeonRoom(nextFloor),
      preloadKayKitRoomTheme(nextFloor),
      preloadKayKitEnemyVisuals(plannedRoomEnemyTypes(nextFloor)),
    ]).catch(error => {
      preloadKeyRef.current = '';
      console.error('Dungeon Veil next room preload failed', error);
    });
  }, [gameState.roomClearReady, gameState.floor, gameState.chapter]);

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
    if (import.meta.env.DEV) reportProductionAudit();
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

    const finishRecoveryWhenCanvasIsBack = () => {
      if (!recoveringRef.current) return;
      if (recoveryReadyTimerRef.current !== null) window.clearTimeout(recoveryReadyTimerRef.current);
      recoveryReadyTimerRef.current = window.setTimeout(() => {
        recoveringRef.current = false;
        recoveryReadyTimerRef.current = null;
        window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { key: roomKey(latestStateRef.current), floor: latestStateRef.current.floor, recovered: true } }));
      }, 900);
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      let webglContextLosses = 1;
      try { webglContextLosses = (JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) || '{}').webglContextLosses || 0) + 1; } catch {}
      updateDiagnostics('webglcontextlost', { webglContextLosses });
      recoveringRef.current = true;
      window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { reason: 'webglcontextlost', floor: latestStateRef.current.floor } }));
      try { sessionStorage.setItem(LOW_GPU_KEY, '1'); } catch {}
      window.dispatchEvent(new CustomEvent('dungeon-veil-renderer-lost', { detail: { webglContextLosses } }));
      if (recoveryTimer !== null) window.clearTimeout(recoveryTimer);
      recoveryTimer = window.setTimeout(() => {
        let rendererRecoveries = 1;
        try { rendererRecoveries = (JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) || '{}').rendererRecoveries || 0) + 1; } catch {}
        updateDiagnostics('renderer-recovery', { rendererRecoveries });
        setRendererGeneration(generation => generation + 1);
      }, 240);
    };

    const bindCanvas = () => {
      const next = host.querySelector('canvas');
      if (next === canvas) return;
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas = next;
      canvas?.addEventListener('webglcontextlost', handleContextLost, { passive: false });
      if (canvas) finishRecoveryWhenCanvasIsBack();
    };

    bindCanvas();
    observer = new MutationObserver(bindCanvas);
    observer.observe(host, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      if (recoveryTimer !== null) window.clearTimeout(recoveryTimer);
      if (recoveryReadyTimerRef.current !== null) window.clearTimeout(recoveryReadyTimerRef.current);
    };
  }, [rendererGeneration]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 overflow-hidden"
      data-testid="run-canvas-host"
      style={{ width: '100%', height: '100%', touchAction: 'none', WebkitUserSelect: 'none' }}
    >
      <GameCanvasKayKit3D key={rendererGeneration} gameState={renderState} />
      <CombatFeedbackOverlay gameState={gameState} />
    </div>
  );
}
