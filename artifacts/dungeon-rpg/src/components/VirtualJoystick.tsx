import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CONTROL_SETTINGS_EVENT, loadJoystickMode, type JoystickMode } from '../game/controlSettings';

interface Props {
  onMove: (x: number, y: number) => void;
  variant?: 'default' | 'worldBoss';
}

const DEAD_ZONE = 0.08;

function clampStick(x: number, y: number, radius: number) {
  const distance = Math.hypot(x, y);
  if (distance <= radius || distance === 0) return { x, y };
  return { x: x / distance * radius, y: y / distance * radius };
}

export function VirtualJoystick({ onMove, variant = 'default' }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const latestMoveRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [mode, setMode] = useState<JoystickMode>(loadJoystickMode);
  const worldBoss = variant === 'worldBoss';
  const floating = mode === 'floating' && !worldBoss;
  const tabletLandscape = typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && navigator.maxTouchPoints > 1
    && window.innerWidth > window.innerHeight
    && Math.min(window.innerWidth, window.innerHeight) >= 650;

  const emitMove = useCallback((x: number, y: number) => {
    latestMoveRef.current = { x, y };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      onMove(latestMoveRef.current.x, latestMoveRef.current.y);
    });
  }, [onMove]);

  const reset = useCallback(() => {
    pointerIdRef.current = null;
    latestMoveRef.current = { x: 0, y: 0 };
    if (knobRef.current) knobRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
    emitMove(0, 0);
  }, [emitMove]);

  const positionFloatingBase = useCallback((clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const half = tabletLandscape ? 74 : 66;
    const maxX = Math.max(half + 8, Math.min(window.innerWidth * 0.54 - half, window.innerWidth - half - 8));
    const minY = Math.max(half + 8, window.innerHeight * 0.42);
    const x = Math.max(half + 8, Math.min(maxX, clientX));
    const y = Math.max(minY, Math.min(window.innerHeight - half - Math.max(12, 12 + Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0')), clientY));
    base.style.left = `${x}px`;
    base.style.top = `${y}px`;
    base.style.right = 'auto';
    base.style.bottom = 'auto';
    base.style.transform = 'translate3d(-50%, -50%, 0)';
  }, [tabletLandscape]);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.34;
    const next = clampStick(clientX - centerX, clientY - centerY, radius);
    if (knobRef.current) knobRef.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0px)`;
    const normalizedX = next.x / radius;
    const normalizedY = next.y / radius;
    emitMove(Math.abs(normalizedX) < DEAD_ZONE ? 0 : normalizedX, Math.abs(normalizedY) < DEAD_ZONE ? 0 : normalizedY);
  }, [emitMove]);

  const beginPointer = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (pointerIdRef.current !== null) return;
    event.preventDefault();
    event.stopPropagation();
    pointerIdRef.current = event.pointerId;
    if (floating) positionFloatingBase(event.clientX, event.clientY);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
    window.requestAnimationFrame(() => updateFromPointer(event.clientX, event.clientY));
  }, [floating, positionFloatingBase, updateFromPointer]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointerIdRef.current) return;
      event.preventDefault();
      updateFromPointer(event.clientX, event.clientY);
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointerIdRef.current) return;
      event.preventDefault();
      reset();
    };
    const visibility = () => { if (document.hidden) reset(); };
    const settings = (event: Event) => {
      reset();
      const next = (event as CustomEvent<{ joystickMode?: JoystickMode }>).detail?.joystickMode;
      setMode(next === 'floating' ? 'floating' : loadJoystickMode());
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up, { passive: false });
    window.addEventListener('pointercancel', up, { passive: false });
    window.addEventListener('blur', reset);
    window.addEventListener('pagehide', reset);
    window.addEventListener('dungeon-veil-reset-input', reset);
    window.addEventListener(CONTROL_SETTINGS_EVENT, settings);
    document.addEventListener('visibilitychange', visibility);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', reset);
      window.removeEventListener('pagehide', reset);
      window.removeEventListener('dungeon-veil-reset-input', reset);
      window.removeEventListener(CONTROL_SETTINGS_EVENT, settings);
      document.removeEventListener('visibilitychange', visibility);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      onMove(0, 0);
    };
  }, [onMove, reset, updateFromPointer]);

  useEffect(() => {
    if (!floating || !baseRef.current) return;
    positionFloatingBase(tabletLandscape ? 104 : 82, window.innerHeight - (tabletLandscape ? 104 : 86));
  }, [floating, positionFloatingBase, tabletLandscape]);

  const placementClass = worldBoss
    ? 'bottom-[max(6.4rem,calc(env(safe-area-inset-bottom)+5.2rem))] left-[max(.9rem,env(safe-area-inset-left))] h-[116px] w-[116px]'
    : tabletLandscape
      ? 'bottom-[max(2rem,calc(env(safe-area-inset-bottom)+1.4rem))] left-[max(2rem,calc(env(safe-area-inset-left)+1.4rem))] h-[148px] w-[148px]'
      : 'bottom-[max(1.15rem,env(safe-area-inset-bottom))] left-[max(1.15rem,env(safe-area-inset-left))] h-[132px] w-[132px]';
  const sizeClass = worldBoss ? 'h-[116px] w-[116px]' : tabletLandscape ? 'h-[148px] w-[148px]' : 'h-[132px] w-[132px]';

  const base = <div
    ref={baseRef}
    data-ui-control
    data-testid="run-joystick"
    data-joystick-mode={floating ? 'floating' : 'fixed'}
    onPointerDown={floating ? undefined : beginPointer}
    className={`${floating ? 'pointer-events-none' : 'pointer-events-auto'} fixed z-50 touch-none rounded-full border border-[#d7bc78]/35 bg-[radial-gradient(circle,rgba(224,198,132,.12),rgba(8,7,10,.58)_68%)] shadow-[0_14px_38px_rgba(0,0,0,.5),inset_0_0_30px_rgba(255,225,157,.05)] backdrop-blur-sm select-none ${floating ? sizeClass : placementClass}`}
    style={{ WebkitTapHighlightColor: 'transparent' }}
  >
    <div className="pointer-events-none absolute inset-[18%] rounded-full border border-white/8" />
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f3dca4]/30" />
    <div ref={knobRef} className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f4dfaa]/55 bg-[radial-gradient(circle_at_35%_30%,rgba(255,239,195,.45),rgba(154,121,61,.38))] shadow-[0_8px_22px_rgba(0,0,0,.55),inset_0_0_14px_rgba(255,241,201,.18)] will-change-transform ${worldBoss ? 'h-[40px] w-[40px]' : tabletLandscape ? 'h-[50px] w-[50px]' : 'h-[44px] w-[44px]'}`} />
  </div>;

  if (!floating) return base;
  return <><div data-testid="run-joystick-floating-zone" data-ui-control onPointerDown={beginPointer} className="pointer-events-auto fixed bottom-0 left-0 z-40 h-[62vh] w-[56vw] touch-none" style={{ WebkitTapHighlightColor: 'transparent' }} />{base}</>;
}
