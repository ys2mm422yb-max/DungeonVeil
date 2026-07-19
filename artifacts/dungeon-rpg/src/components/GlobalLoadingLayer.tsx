import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { preloadKayKitDungeonRoom } from './kaykitRoom3D';
import { preloadKayKitRoomTheme } from './kaykitRoomThemes3D';
import { preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { LoadingScreen } from './LoadingScreen';

type RoomTransition = { key: string; floor: number; startedAt: number; shownAt?: number };

export const APP_BOOT_READY_EVENT = 'dungeon-veil-app-boot-ready';

const BOOT_SESSION_KEY = 'dungeon-veil-boot-complete';
const BOOT_LOADING_MIN_MS = 720;
const BOOT_LOADING_MAX_MS = 4_500;
const BOOT_REVEAL_MS = 180;
const ROOM_LOADING_SHOW_AFTER_MS = 760;
const ROOM_LOADING_MIN_VISIBLE_MS = 240;
const ROOM_LOADING_MAX_MS = 6_500;

function currentLanguage(): 'de' | 'en' {
  try { return localStorage.getItem('dungeon-veil-language') === 'de' ? 'de' : 'en'; }
  catch { return 'en'; }
}

function bootWasCompleted(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.dataset.dungeonVeilBootReady === '1') return true;
  try { return sessionStorage.getItem(BOOT_SESSION_KEY) === '1'; }
  catch { return false; }
}

function rememberBootComplete(): void {
  try { sessionStorage.setItem(BOOT_SESSION_KEY, '1'); } catch {}
}

function delay(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));
}

function bootPhase(language: 'de' | 'en', completed: number): string {
  if (completed <= 0) return language === 'de' ? 'Der Schleier erwacht' : 'The veil awakens';
  if (completed === 1) return language === 'de' ? 'Runen werden entzündet' : 'Igniting the runes';
  if (completed < 4) return language === 'de' ? 'Dungeon und Welt werden vorbereitet' : 'Preparing dungeon and world';
  return language === 'de' ? 'Profil und Spielstand werden verbunden' : 'Connecting profile and save';
}

function RoomVeilTransition({ floor, language }: { floor: number; language: 'de' | 'en' }) {
  return <div
    data-testid="run-room-loading-screen"
    data-transition-presentation="seamless-violet-veil"
    role="status"
    aria-live="polite"
    className="pointer-events-none fixed inset-0 z-[170] overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(91,48,180,.26),rgba(3,2,8,.2)_34%,rgba(0,0,0,.58)_100%)] text-white"
  >
    <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_50%_48%,transparent_0,transparent_22%,rgba(139,92,246,.14)_22.5%,transparent_24%,transparent_32%,rgba(196,181,253,.08)_32.5%,transparent_34%)]" />
    <div className="absolute left-1/2 top-1/2 h-44 w-32 -translate-x-1/2 -translate-y-1/2">
      <div className="absolute inset-0 animate-[spin_2.8s_linear_infinite] rounded-[50%] border border-violet-200/38 shadow-[0_0_48px_rgba(139,92,246,.42),inset_0_0_36px_rgba(109,40,217,.28)]" />
      <div className="absolute inset-3 animate-[spin_1.9s_linear_infinite_reverse] rounded-[50%] border border-dashed border-fuchsia-200/28" />
      <div className="absolute inset-7 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(8,4,24,.96),rgba(76,29,149,.5)_46%,rgba(167,139,250,.12)_70%,transparent_74%)] shadow-[inset_0_0_30px_rgba(0,0,0,.8)]" />
      <div className="absolute left-1/2 top-[-8px] h-4 w-4 -translate-x-1/2 rotate-45 border border-violet-100/45 bg-violet-400/18 shadow-[0_0_18px_rgba(167,139,250,.7)]" />
      <div className="absolute bottom-[-8px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border border-violet-100/45 bg-violet-400/18 shadow-[0_0_18px_rgba(167,139,250,.7)]" />
    </div>
    <div className="absolute inset-x-0 bottom-[max(24px,calc(env(safe-area-inset-bottom)+14px))] text-center">
      <div className="text-[7px] font-black uppercase tracking-[.42em] text-violet-100/42">DUNGEON VEIL</div>
      <div className="mt-2 font-serif text-[15px] font-black tracking-[.16em] text-violet-50/88">{language === 'de' ? `RAUM ${floor} · DER SCHLEIER ÖFFNET SICH` : `ROOM ${floor} · THE VEIL OPENS`}</div>
    </div>
  </div>;
}

export function GlobalLoadingLayer() {
  const language = currentLanguage();
  const initialBootReady = bootWasCompleted();
  const [booting, setBooting] = useState(() => !initialBootReady);
  const [bootProgress, setBootProgress] = useState(() => initialBootReady ? 100 : 10);
  const [bootStatus, setBootStatus] = useState(() => bootPhase(language, 0));
  const [roomTransition, setRoomTransition] = useState<RoomTransition | null>(null);
  const activeRef = useRef<RoomTransition | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    let revealTimer = 0;
    let completed = 0;
    const alreadyReady = bootWasCompleted();
    if (alreadyReady) {
      document.documentElement.dataset.dungeonVeilBootReady = '1';
      queueMicrotask(() => window.dispatchEvent(new Event(APP_BOOT_READY_EVENT)));
    }
    const markTaskComplete = () => {
      if (!active || alreadyReady) return;
      completed = Math.min(4, completed + 1);
      setBootProgress(Math.min(92, 14 + completed * 19));
      setBootStatus(bootPhase(language, completed));
    };
    const tracked = (work: () => Promise<unknown>) => Promise.resolve()
      .then(work)
      .catch(() => undefined)
      .finally(markTaskComplete);
    const fontsTask = tracked(() => typeof document !== 'undefined' && document.fonts?.ready
      ? document.fonts.ready
      : Promise.resolve());
    const assetTasks = [
      tracked(() => preloadKayKitOuterWorld()),
      tracked(() => preloadKayKitDungeonRoom(1)),
      tracked(() => preloadKayKitRoomTheme(1)),
    ];
    const warmup = Promise.all([delay(alreadyReady ? 0 : BOOT_LOADING_MIN_MS), fontsTask, ...assetTasks]).then(() => undefined);
    if (!alreadyReady) {
      void Promise.race([warmup, delay(BOOT_LOADING_MAX_MS)]).finally(() => {
        if (!active) return;
        setBootProgress(100);
        setBootStatus(language === 'de' ? 'Der Schleier ist bereit' : 'The veil is ready');
        revealTimer = window.setTimeout(() => {
          if (!active) return;
          document.documentElement.dataset.dungeonVeilBootReady = '1';
          rememberBootComplete();
          setBooting(false);
          window.dispatchEvent(new Event(APP_BOOT_READY_EVENT));
        }, BOOT_REVEAL_MS);
      });
    }
    void warmup.catch(() => undefined);
    return () => {
      active = false;
      window.clearTimeout(revealTimer);
    };
  }, [language]);

  useLayoutEffect(() => {
    const clearTimer = (ref: React.MutableRefObject<number | null>) => {
      if (ref.current !== null) window.clearTimeout(ref.current);
      ref.current = null;
    };
    const clearTransition = (key: string) => {
      if (activeRef.current?.key !== key) return;
      activeRef.current = null;
      setRoomTransition(null);
      delete document.documentElement.dataset.dungeonVeilRoomLoading;
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);
      clearTimer(safetyTimerRef);
    };
    const finish = (key?: string) => {
      const current = activeRef.current;
      if (!current || (key && key !== current.key)) return;
      clearTimer(showTimerRef);
      clearTimer(safetyTimerRef);
      if (!current.shownAt) {
        clearTransition(current.key);
        return;
      }
      const remaining = Math.max(0, ROOM_LOADING_MIN_VISIBLE_MS - (performance.now() - current.shownAt));
      clearTimer(hideTimerRef);
      hideTimerRef.current = window.setTimeout(() => clearTransition(current.key), remaining);
    };
    const handlePreparing = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; floor?: number }>).detail ?? {};
      const key = detail.key ?? `room-${detail.floor ?? 1}`;
      if (activeRef.current?.key === key) return;
      if (activeRef.current) clearTransition(activeRef.current.key);
      const next: RoomTransition = { key, floor: detail.floor ?? 1, startedAt: performance.now() };
      activeRef.current = next;
      showTimerRef.current = window.setTimeout(() => {
        const current = activeRef.current;
        if (!current || current.key !== key) return;
        const visible = { ...current, shownAt: performance.now() };
        activeRef.current = visible;
        setRoomTransition(visible);
        document.documentElement.dataset.dungeonVeilRoomLoading = '1';
      }, ROOM_LOADING_SHOW_AFTER_MS);
      safetyTimerRef.current = window.setTimeout(() => finish(key), ROOM_LOADING_MAX_MS);
    };
    const handleReady = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail ?? {};
      finish(detail.key);
    };

    window.addEventListener('dungeon-veil-room-preparing', handlePreparing);
    window.addEventListener('dungeon-veil-room-ready', handleReady);
    return () => {
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);
      clearTimer(safetyTimerRef);
      activeRef.current = null;
      delete document.documentElement.dataset.dungeonVeilRoomLoading;
      window.removeEventListener('dungeon-veil-room-preparing', handlePreparing);
      window.removeEventListener('dungeon-veil-room-ready', handleReady);
    };
  }, []);

  if (booting) return <LoadingScreen variant="boot" language={language} testId="app-boot-loading-screen" progress={bootProgress} phase={bootStatus} />;
  if (roomTransition) return <RoomVeilTransition floor={roomTransition.floor} language={language} />;
  return null;
}
