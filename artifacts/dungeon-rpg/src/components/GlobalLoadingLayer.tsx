import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { consumeRunLoadingRemainingMs, LOADING_TIMING, waitForMinimum } from '../game/loadingTiming';
import { preloadKayKitDungeonRoom } from './kaykitRoom3D';
import { preloadKayKitRoomTheme } from './kaykitRoomThemes3D';
import { preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { LoadingScreen } from './LoadingScreen';

type RoomTransition = {
  key: string;
  floor: number;
  shownAt: number;
  minimumVisibleMs: number;
};

function currentLanguage(): 'de' | 'en' {
  try { return localStorage.getItem('dungeon-veil-language') === 'de' ? 'de' : 'en'; }
  catch { return 'en'; }
}

export function GlobalLoadingLayer() {
  const [booting, setBooting] = useState(true);
  const [roomTransition, setRoomTransition] = useState<RoomTransition | null>(null);
  const transitionRef = useRef<RoomTransition | null>(null);
  const firstRoomPreparationRef = useRef(true);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const language = currentLanguage();

  useEffect(() => {
    let active = true;
    const fontsReady = typeof document !== 'undefined' && document.fonts?.ready
      ? document.fonts.ready.catch(() => undefined)
      : Promise.resolve();
    const coreAssets = Promise.allSettled([
      preloadKayKitOuterWorld(),
      preloadKayKitDungeonRoom(1),
      preloadKayKitRoomTheme(1),
    ]);

    void Promise.all([
      waitForMinimum(LOADING_TIMING.bootMinimumMs),
      fontsReady,
      coreAssets,
    ]).finally(() => {
      if (active) setBooting(false);
    });
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    const clearTimer = (ref: React.MutableRefObject<number | null>) => {
      if (ref.current !== null) window.clearTimeout(ref.current);
      ref.current = null;
    };
    const clearTransition = (key?: string) => {
      setRoomTransition(current => {
        if (key && current?.key !== key) return current;
        transitionRef.current = null;
        return null;
      });
    };
    const showTransition = (transition: Omit<RoomTransition, 'shownAt'>) => {
      const next = { ...transition, shownAt: performance.now() };
      transitionRef.current = next;
      setRoomTransition(next);
    };

    const handlePreparing = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; floor?: number; reason?: string }>).detail ?? {};
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);
      clearTransition();

      const firstRoomPreparation = firstRoomPreparationRef.current;
      firstRoomPreparationRef.current = false;
      const key = detail.key ?? `room-${detail.floor ?? 1}`;
      const floor = detail.floor ?? 1;
      const recovery = detail.reason === 'webglcontextlost';
      const entryRemaining = firstRoomPreparation ? consumeRunLoadingRemainingMs() : 0;

      if (firstRoomPreparation && entryRemaining <= 0) return;

      const minimumVisibleMs = recovery
        ? LOADING_TIMING.recoveryMinimumVisibleMs
        : firstRoomPreparation
          ? entryRemaining
          : LOADING_TIMING.roomMinimumVisibleMs;
      const showDelayMs = recovery || firstRoomPreparation ? 0 : LOADING_TIMING.roomShowDelayMs;

      if (showDelayMs <= 0) {
        showTransition({ key, floor, minimumVisibleMs });
        return;
      }

      showTimerRef.current = window.setTimeout(() => {
        showTransition({ key, floor, minimumVisibleMs });
        showTimerRef.current = null;
      }, showDelayMs);
    };

    const handleReady = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail ?? {};
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);

      const current = transitionRef.current;
      if (!current || (detail.key && current.key !== detail.key)) return;
      const elapsed = performance.now() - current.shownAt;
      const remaining = Math.max(0, current.minimumVisibleMs - elapsed);
      hideTimerRef.current = window.setTimeout(() => {
        clearTransition(detail.key);
        hideTimerRef.current = null;
      }, remaining);
    };

    window.addEventListener('dungeon-veil-room-preparing', handlePreparing);
    window.addEventListener('dungeon-veil-room-ready', handleReady);
    return () => {
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);
      window.removeEventListener('dungeon-veil-room-preparing', handlePreparing);
      window.removeEventListener('dungeon-veil-room-ready', handleReady);
    };
  }, []);

  if (booting) return <LoadingScreen variant="boot" language={language} testId="app-boot-loading-screen" />;
  if (roomTransition) return <LoadingScreen
    variant="run"
    language={language}
    testId="run-room-loading-screen"
    title={language === 'de' ? `RAUM ${roomTransition.floor} WIRD VORBEREITET` : `PREPARING ROOM ${roomTransition.floor}`}
  />;
  return null;
}
