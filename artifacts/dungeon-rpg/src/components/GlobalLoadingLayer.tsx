import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { preloadKayKitDungeonRoom } from './kaykitRoom3D';
import { preloadKayKitRoomTheme } from './kaykitRoomThemes3D';
import { preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { LoadingScreen } from './LoadingScreen';

type RoomTransition = { key: string; floor: number; startedAt: number };

const BOOT_LOADING_MIN_MS = 720;
const BOOT_LOADING_MAX_MS = 4_500;
const ROOM_LOADING_MIN_MS = 680;
const ROOM_LOADING_MAX_MS = 6_500;

function currentLanguage(): 'de' | 'en' {
  try { return localStorage.getItem('dungeon-veil-language') === 'de' ? 'de' : 'en'; }
  catch { return 'en'; }
}

function delay(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));
}

export function GlobalLoadingLayer() {
  const [booting, setBooting] = useState(true);
  const [roomTransition, setRoomTransition] = useState<RoomTransition | null>(null);
  const activeRef = useRef<RoomTransition | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
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
    const warmup = Promise.all([delay(BOOT_LOADING_MIN_MS), fontsReady, coreAssets]).then(() => undefined);
    void Promise.race([warmup, delay(BOOT_LOADING_MAX_MS)]).finally(() => {
      if (active) setBooting(false);
    });
    void warmup.catch(() => undefined);
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    const clearTimer = (ref: React.MutableRefObject<number | null>) => {
      if (ref.current !== null) window.clearTimeout(ref.current);
      ref.current = null;
    };
    const finish = (key?: string) => {
      const current = activeRef.current;
      if (!current || (key && key !== current.key)) return;
      clearTimer(hideTimerRef);
      const remaining = Math.max(0, ROOM_LOADING_MIN_MS - (performance.now() - current.startedAt));
      hideTimerRef.current = window.setTimeout(() => {
        if (activeRef.current?.key !== current.key) return;
        activeRef.current = null;
        setRoomTransition(null);
        delete document.documentElement.dataset.dungeonVeilRoomLoading;
        hideTimerRef.current = null;
        clearTimer(safetyTimerRef);
      }, remaining);
    };
    const handlePreparing = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; floor?: number }>).detail ?? {};
      const key = detail.key ?? `room-${detail.floor ?? 1}`;
      if (activeRef.current?.key === key) return;
      clearTimer(hideTimerRef);
      clearTimer(safetyTimerRef);
      const next = { key, floor: detail.floor ?? 1, startedAt: performance.now() };
      activeRef.current = next;
      setRoomTransition(next);
      document.documentElement.dataset.dungeonVeilRoomLoading = '1';
      safetyTimerRef.current = window.setTimeout(() => finish(key), ROOM_LOADING_MAX_MS);
    };
    const handleReady = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail ?? {};
      finish(detail.key);
    };

    window.addEventListener('dungeon-veil-room-preparing', handlePreparing);
    window.addEventListener('dungeon-veil-room-ready', handleReady);
    return () => {
      clearTimer(hideTimerRef);
      clearTimer(safetyTimerRef);
      activeRef.current = null;
      delete document.documentElement.dataset.dungeonVeilRoomLoading;
      window.removeEventListener('dungeon-veil-room-preparing', handlePreparing);
      window.removeEventListener('dungeon-veil-room-ready', handleReady);
    };
  }, []);

  if (booting) return <LoadingScreen variant="boot" language={language} testId="app-boot-loading-screen" />;
  if (roomTransition) {
    const boss = [10, 20, 30, 40, 50].includes(roomTransition.floor);
    return <LoadingScreen
      variant="run"
      language={language}
      testId="run-room-loading-screen"
      title={language === 'de' ? `RAUM ${roomTransition.floor} WIRD VORBEREITET` : `PREPARING ROOM ${roomTransition.floor}`}
      subtitle={language === 'de'
        ? `${boss ? 'Bossraum, ' : ''}Geometrie, Gegner, Kollisionen und Effekte werden vollständig geladen.`
        : `${boss ? 'Boss room: ' : ''}Loading geometry, enemies, collisions and effects completely.`}
    />;
  }
  return null;
}
