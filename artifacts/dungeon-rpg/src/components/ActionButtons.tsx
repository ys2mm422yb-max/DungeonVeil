import React, { useEffect, useState } from 'react';
import { Wind } from 'lucide-react';
import type { GameState } from '../game/runEngine';
import { CLASS_DEFS } from '../game/classes';

interface Props {
  gameState: GameState;
  onDodge: () => void;
}

export function ActionButtons({ gameState: g, onDodge }: Props) {
  const p = g.player;
  const def = CLASS_DEFS.archer;
  const [dash, setDash] = useState(0);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      setDash(Math.max(0, Math.min(1, p.dodgeCooldown / def.dodgeCooldownMs)));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [p, def.dodgeCooldownMs]);

  const ready = dash <= 0.001;
  const seconds = Math.max(0, dash * def.dodgeCooldownMs / 1000);

  return (
    <div
      className="fixed z-50 pointer-events-auto touch-none select-none"
      style={{ width: 68, height: 68, right: 'max(16px,env(safe-area-inset-right))', bottom: 'max(22px,calc(env(safe-area-inset-bottom) + 14px))' }}
      data-ui-control
    >
      <button
        type="button"
        aria-label="Dash"
        onPointerDown={event => {
          event.preventDefault();
          event.stopPropagation();
          if (!ready) return;
          try { navigator.vibrate?.(14); } catch {}
          onDodge();
        }}
        className={`absolute inset-0 grid place-items-center overflow-hidden rounded-full border backdrop-blur-md transition-all duration-150 ${ready ? 'border-amber-300/38 bg-black/58 shadow-[0_8px_20px_rgba(0,0,0,.48),0_0_10px_rgba(91,184,227,.08)] active:scale-90' : 'border-white/8 bg-black/66 opacity-70'}`}
      >
        <div className={`absolute inset-2 rounded-full border ${ready ? 'border-cyan-100/14 bg-[radial-gradient(circle_at_35%_28%,rgba(101,205,241,.72),rgba(16,58,82,.94)_58%,rgba(6,24,38,.98))]' : 'border-white/5 bg-[radial-gradient(circle_at_35%_28%,rgba(60,80,90,.62),rgba(12,25,32,.96))]'}`} />
        {ready && <div className="absolute inset-1 rounded-full border border-cyan-200/10 animate-[pulse_2.2s_ease-in-out_infinite]" />}
        <div className="relative z-10 flex flex-col items-center gap-0.5">
          <Wind size={18} strokeWidth={1.8} className={ready ? 'text-cyan-50' : 'text-white/35'} />
          <span className={`text-[8px] font-black tracking-[.16em] ${ready ? 'text-white/90' : 'text-white/35'}`}>DASH</span>
          {!ready && <span className="text-[7px] font-black tabular-nums text-cyan-100/50">{seconds.toFixed(1)}s</span>}
        </div>
        {dash > 0 && (
          <div
            className="absolute inset-2 rounded-full"
            style={{ background: `conic-gradient(rgba(0,0,0,.7) ${dash * 360}deg,transparent 0deg)`, transform: 'rotate(-90deg)' }}
          />
        )}
      </button>
    </div>
  );
}
