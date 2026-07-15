import React, { useCallback, useEffect, useRef } from 'react';

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
  const worldBoss = variant === 'worldBoss';
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
    emitMove(
      Math.abs(normalizedX) < DEAD_ZONE ? 0 : normalizedX,
      Math.abs(normalizedY) < DEAD_ZONE ? 0 : normalizedY,
    );
  }, [emitMove]);

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

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up, { passive: false });
    window.addEventListener('pointercancel', up, { passive: false });
    window.addEventListener('blur', reset);
    window.addEventListener('pagehide', reset);
    window.addEventListener('dungeon-veil-reset-input', reset);
    document.addEventListener('visibilitychange', visibility);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', reset);
      window.removeEventListener('pagehide', reset);
      window.removeEventListener('dungeon-veil-reset-input', reset);
      document.removeEventListener('visibilitychange', visibility);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      onMove(0, 0);
    };
  }, [onMove, reset, updateFromPointer]);

  const placementClass = worldBoss
    ? 'bottom-[max(6.4rem,calc(env(safe-area-inset-bottom)+5.2rem))] left-[max(.9rem,env(safe-area-inset-left))] h-[116px] w-[116px]'
    : tabletLandscape
      ? 'bottom-[max(2rem,calc(env(safe-area-inset-bottom)+1.4rem))] left-[max(2rem,calc(env(safe-area-inset-left)+1.4rem))] h-[148px] w-[148px]'
      : 'bottom-[max(1.15rem,env(safe-area-inset-bottom))] left-[max(1.15rem,env(safe-area-inset-left))] h-[132px] w-[132px]';

  return (
    <div
      ref={baseRef}
      data-ui-control
      data-testid="run-joystick"
      onPointerDown={event => {
        if (pointerIdRef.current !== null) return;
        event.preventDefault();
        event.stopPropagation();
        pointerIdRef.current = event.pointerId;
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
        updateFromPointer(event.clientX, event.clientY);
      }}
      className={`pointer-events-auto fixed z-50 touch-none rounded-full border border-[#d7bc78]/35 bg-[radial-gradient(circle,rgba(224,198,132,.12),rgba(8,7,10,.58)_68%)] shadow-[0_14px_38px_rgba(0,0,0,.5),inset_0_0_30px_rgba(255,225,157,.05)] backdrop-blur-sm select-none ${placementClass}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="pointer-events-none absolute inset-[18%] rounded-full border border-white/8" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f3dca4]/30" />
      <div
        ref={knobRef}
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f4dfaa]/55 bg-[radial-gradient(circle_at_35%_30%,rgba(255,239,195,.45),rgba(154,121,61,.38))] shadow-[0_8px_22px_rgba(0,0,0,.55),inset_0_0_14px_rgba(255,241,201,.18)] will-change-transform ${worldBoss ? 'h-[40px] w-[40px]' : tabletLandscape ? 'h-[50px] w-[50px]' : 'h-[44px] w-[44px]'}`}
      />
    </div>
  );
}
