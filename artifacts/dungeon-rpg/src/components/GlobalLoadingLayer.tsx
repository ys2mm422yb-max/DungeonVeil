import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { preloadKayKitDungeonRoom } from './kaykitRoom3D';
import { preloadKayKitRoomTheme } from './kaykitRoomThemes3D';
import { preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { LoadingScreen } from './LoadingScreen';

type RoomTransition = { key: string; floor: number };

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

    void Promise.all([delay(720), fontsReady, coreAssets]).finally(() => {
      if (active) setBooting(false);
    });
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    const clearTimer = (ref: React.MutableRefObject<number | null>) => {
      if (ref.current !== null) window.clearTimeout(ref.current);
      ref.current = null;
    };
    const handlePreparing = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; floor?: number }>).detail ?? {};
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);
      showTimerRef.current = window.setTimeout(() => {
        setRoomTransition({ key: detail.key ?? `room-${detail.floor ?? 1}`, floor: detail.floor ?? 1 });
        showTimerRef.current = null;
      }, 90);
    };
    const handleReady = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail ?? {};
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);
      hideTimerRef.current = window.setTimeout(() => {
        setRoomTransition(current => !detail.key || current?.key === detail.key ? null : current);
        hideTimerRef.current = null;
      }, 140);
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
