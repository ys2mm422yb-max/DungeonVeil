import React, { useRef, useEffect } from 'react';

interface Props {
  onMove: (x: number, y: number) => void;
}

export function VirtualJoystick({ onMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouchId = useRef<number | null>(null);
  
  const basePos = useRef({ x: 0, y: 0 });
  const maxRadius = 60;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only handle touches on the left half of the screen
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX < window.innerWidth / 2 && activeTouchId.current === null) {
          activeTouchId.current = touch.identifier;
          
          if (containerRef.current && knobRef.current) {
            containerRef.current.style.opacity = '1';
            containerRef.current.style.left = `${touch.clientX - maxRadius}px`;
            containerRef.current.style.top = `${touch.clientY - maxRadius}px`;
            
            knobRef.current.style.transform = `translate(0px, 0px)`;
            basePos.current = { x: touch.clientX, y: touch.clientY };
            onMove(0, 0);
          }
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (activeTouchId.current === null) return;
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId.current) {
          e.preventDefault();
          
          let dx = touch.clientX - basePos.current.x;
          let dy = touch.clientY - basePos.current.y;
          
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > maxRadius) {
            dx = (dx / distance) * maxRadius;
            dy = (dy / distance) * maxRadius;
          }
          
          if (knobRef.current) {
            knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
          }
          
          onMove(dx / maxRadius, dy / maxRadius);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (activeTouchId.current === null) return;
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId.current) {
          activeTouchId.current = null;
          if (containerRef.current) {
            containerRef.current.style.opacity = '0';
          }
          onMove(0, 0);
        }
      }
    };

    // Attach to document to catch touches outside the container area
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onMove]);

  return (
    <div 
      ref={containerRef}
      className="fixed w-[120px] h-[120px] rounded-full bg-black/40 border-2 border-white/10 opacity-0 pointer-events-none z-50 transition-opacity duration-200 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
      style={{ touchAction: 'none' }}
    >
      <div 
        ref={knobRef}
        className="absolute top-1/2 left-1/2 w-10 h-10 -ml-5 -mt-5 rounded-full bg-white/30 border border-white/50 shadow-inner"
      />
    </div>
  );
}
