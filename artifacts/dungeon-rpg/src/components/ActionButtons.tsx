import React, { useEffect, useState } from 'react';
import { Wind } from 'lucide-react';
import type { GameState } from '../game/runEngine';
import { CLASS_DEFS } from '../game/classes';

interface Props {
  gameState: GameState;
  onDodge: () => void;
  variant?: 'default' | 'worldBoss';
}

export function ActionButtons({ gameState: g, onDodge, variant = 'default' }: Props) {
  const p = g.player;
  const def = CLASS_DEFS.archer;
  const [dash, setDash] = useState(0);
  const worldBoss = variant === 'worldBoss';
  const tabletLandscape = typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && navigator.maxTouchPoints > 1
    && window.innerWidth > window.innerHeight
    && Math.min(window.innerWidth, window.innerHeight) >= 650;

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
  const size = worldBoss ? 78 : tabletLandscape ? 90 : 78;
  const iconSize = worldBoss ? 21 : tabletLandscape ? 25 : 21;

  return <div
    data-ui-control
    data-testid="run-dash-control"
    className="pointer-events-auto fixed z-50 touch-none select-none"
    style={{
      width: size,
      height: size,
      right: tabletLandscape && !worldBoss
        ? 'max(34px,calc(env(safe-area-inset-right) + 24px))'
        : 'max(18px,calc(env(safe-area-inset-right) + 10px))',
      bottom: worldBoss
        ? 'max(110px,calc(env(safe-area-inset-bottom) + 90px))'
        : tabletLandscape
          ? 'max(34px,calc(env(safe-area-inset-bottom) + 24px))'
          : 'max(26px,calc(env(safe-area-inset-bottom) + 18px))',
    }}
  >
    <button
      data-testid="run-dash-button"
      type="button"
      aria-label={ready ? 'Dash bereit' : `Dash in ${seconds.toFixed(1)} Sekunden`}
      aria-disabled={!ready}
      onPointerDown={event => {
        event.preventDefault();
        event.stopPropagation();
        if (!ready) return;
        try { navigator.vibrate?.(14); } catch {}
        onDodge();
      }}
      className={`absolute inset-0 grid place-items-center overflow-hidden rounded-full border-2 backdrop-blur-md transition-[transform,opacity,border-color,background-color] duration-150 ${ready ? 'border-cyan-100/45 bg-black/68 shadow-[0_10px_28px_rgba(0,0,0,.58),0_0_18px_rgba(91,184,227,.18)] active:scale-88' : 'border-white/10 bg-black/76 opacity-78'}`}
    >
      <div className={`absolute inset-[9px] rounded-full border ${ready ? 'border-cyan-100/18 bg-[radial-gradient(circle_at_35%_28%,rgba(116,216,247,.78),rgba(16,58,82,.96)_58%,rgba(6,24,38,.99))]' : 'border-white/6 bg-[radial-gradient(circle_at_35%_28%,rgba(60,80,90,.64),rgba(12,25,32,.98))]'}`} />
      {ready && <div className="absolute inset-[5px] rounded-full border border-cyan-200/14 animate-[pulse_2.2s_ease-in-out_infinite]" />}
      <div className="relative z-10 flex flex-col items-center gap-0.5">
        <Wind size={iconSize} strokeWidth={1.9} className={ready ? 'text-cyan-50 drop-shadow-[0_1px_3px_#000]' : 'text-white/38'} />
        <span className={`font-black tracking-[.14em] ${tabletLandscape && !worldBoss ? 'text-[9px]' : 'text-[8px]'} ${ready ? 'text-white/95' : 'text-white/40'}`}>DASH</span>
        <span data-testid="run-dash-state" className={`text-[6px] font-black uppercase tracking-[.12em] ${ready ? 'text-emerald-100/72' : 'tabular-nums text-cyan-100/54'}`}>{ready ? 'BEREIT' : `${seconds.toFixed(1)}s`}</span>
      </div>
      {dash > 0 && <div className="absolute inset-[9px] rounded-full" style={{ background: `conic-gradient(rgba(0,0,0,.74) ${dash * 360}deg,transparent 0deg)`, transform: 'rotate(-90deg)' }} />}
    </button>
  </div>;
}
