import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SaveData } from '../../game/saveManager';

interface Props {
  saveData: SaveData | null;
  onNewGame: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

export function MainMenuScreen({ saveData, onNewGame, onContinue, onSettings, onCredits }: Props) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Ember = { x: number; y: number; size: number; vx: number; vy: number; alpha: number; hue: number };
    const embers: Ember[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.5,
      vx: Math.random() * 0.4 - 0.2,
      vy: -(Math.random() * 0.8 + 0.2),
      alpha: Math.random() * 0.55 + 0.1,
      hue: Math.random() * 30 + 20,
    }));

    let animId: number;
    const draw = () => {
      const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.4, 0, canvas.width / 2, canvas.height * 0.4, canvas.width);
      grad.addColorStop(0, '#0f1729');
      grad.addColorStop(1, '#050508');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      embers.forEach(e => {
        e.x += e.vx;
        e.y += e.vy;
        if (e.y < -10) { e.y = canvas.height + 10; e.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${e.hue}, 90%, 65%, ${e.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  const saveLabel = saveData
    ? t.lastSave.replace('{level}', String(saveData.level)).replace('{floor}', String(saveData.floor))
    : t.noSave;

  const hasSaveData = saveData !== null;

  const btn = (
    label: string,
    action: () => void,
    opts?: { disabled?: boolean; sub?: string; primary?: boolean }
  ) => (
    <button
      key={label}
      onClick={action}
      onTouchStart={e => { e.preventDefault(); if (!opts?.disabled) action(); }}
      disabled={opts?.disabled}
      className={[
        'w-full flex items-center gap-4 px-6 py-4 rounded-xl border-2 text-left transition-all active:scale-95',
        opts?.primary
          ? 'bg-primary/15 border-primary/60 hover:border-primary shadow-[0_0_20px_rgba(232,160,32,0.2)]'
          : 'bg-white/[0.03] border-white/10 hover:border-white/20',
        opts?.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0">
        <div className={`font-bold tracking-widest text-base ${opts?.primary ? 'text-primary' : 'text-white/90'}`}>
          {label}
        </div>
        {opts?.sub && (
          <div className="text-xs text-white/40 mt-0.5 font-mono truncate">{opts.sub}</div>
        )}
      </div>
      {!opts?.disabled && (
        <span className={`text-lg ${opts?.primary ? 'text-primary' : 'text-white/30'}`}>›</span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between select-none">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Logo area */}
      <div className="z-10 flex flex-col items-center pt-20 px-8">
        <h1 className="font-serif text-6xl text-primary font-black tracking-widest text-center leading-tight drop-shadow-[0_0_40px_rgba(232,160,32,0.35)]">
          DUNGEON<br />VEIL
        </h1>
        <p className="text-white/30 tracking-[0.35em] uppercase text-xs mt-3">
          {t.subtitle}
        </p>
      </div>

      {/* Menu buttons */}
      <div className="z-10 w-full max-w-xs px-6 pb-16 flex flex-col gap-3">
        {btn(t.newGame, onNewGame, { primary: true })}
        {btn(t.continueGame, onContinue, { disabled: !hasSaveData, sub: saveLabel })}
        {btn(t.settings, onSettings)}
        {btn(t.credits, onCredits)}
      </div>
    </div>
  );
}
