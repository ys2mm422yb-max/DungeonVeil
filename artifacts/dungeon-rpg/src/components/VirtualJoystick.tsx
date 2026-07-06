import React, { useEffect, useRef } from 'react';

interface Props {
  onMove: (x: number, y: number) => void;
}

const DEAD_ZONE = 0.08;
const LEFT_SIDE_LIMIT = 0.52;
const EDGE_PADDING = 16;

function normalizeAxis(value: number): number {
  return Math.abs(value) < DEAD_ZONE ? 0 : value;
}

function getJoystickRadius(): number {
  return Math.max(52, Math.min(72, window.innerWidth * 0.16));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function VirtualJoystick({ onMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const basePos = useRef({ x: 0, y: 0 });
  const radiusRef = useRef(60);
  const rafId = useRef<number | null>(null);
  const latestMove = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const emitMove = () => {
      rafId.current = null;
      onMove(latestMove.current.x, latestMove.current.y);
    };

    const scheduleMove = (x: number, y: number) => {
      latestMove.current = { x, y };
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(emitMove);
      }
    };

    const resetJoystick = () => {
      activePointerId.current = null;
      if (containerRef.current) {
        containerRef.current.style.opacity = '0';
      }
      if (knobRef.current) {
        knobRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
      }
      scheduleMove(0, 0);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (activePointerId.current !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.clientX > window.innerWidth * LEFT_SIDE_LIMIT) return;

      e.preventDefault();

      const radius = getJoystickRadius();
      const centerX = clamp(e.clientX, radius + EDGE_PADDING, window.innerWidth - radius - EDGE_PADDING);
      const centerY = clamp(e.clientY, radius + EDGE_PADDING, window.innerHeight - radius - EDGE_PADDING);

      activePointerId.current = e.pointerId;
      radiusRef.current = radius;
      basePos.current = { x: centerX, y: centerY };

      if (containerRef.current && knobRef.current) {
        const size = radius * 2;
        containerRef.current.style.width = `${size}px`;
        containerRef.current.style.height = `${size}px`;
        containerRef.current.style.left = `${centerX - radius}px`;
        containerRef.current.style.top = `${centerY - radius}px`;
        containerRef.current.style.opacity = '1';
        knobRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
      }

      scheduleMove(0, 0);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;
      e.preventDefault();

      const radius = radiusRef.current;
      let dx = e.clientX - basePos.current.x;
      let dy = e.clientY - basePos.current.y;
      const distance = Math.hypot(dx, dy);

      if (distance > radius) {
        dx = (dx / distance) * radius;
        dy = (dy / distance) * radius;
      }

      if (knobRef.current) {
        knobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0px)`;
      }

      scheduleMove(
        normalizeAxis(dx / radius),
        normalizeAxis(dy / radius),
      );
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId === activePointerId.current) {
        e.preventDefault();
        resetJoystick();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: false });
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    document.addEventListener('pointercancel', handlePointerUp, { passive: false });
    window.addEventListener('blur', resetJoystick);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', resetJoystick);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [onMove]);

  return (
    <div
      ref={containerRef}
      className="fixed rounded-full bg-black/40 border-2 border-white/10 opacity-0 pointer-events-none z-50 transition-opacity duration-100 shadow-[0_0_20px_rgba(0,0,0,0.5)] will-change-[opacity,transform]"
      style={{
        width: 120,
        height: 120,
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        ref={knobRef}
        className="absolute top-1/2 left-1/2 w-[34%] h-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30 border border-white/50 shadow-inner will-change-transform"
      />
    </div>
  );
}
