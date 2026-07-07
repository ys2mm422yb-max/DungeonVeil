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

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    type Ember = { x: number; y: number; size: number; vx: number; vy: number; alpha: number; hue: number };
    const embers: Ember[] = Array.from({ length: 110 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.5,
      vx: Math.random() * 0.4 - 0.2,
      vy: -(Math.random() * 0.8 + 0.2),
      alpha: Math.random() * 0.55 + 0.1,
      hue: Math.random() * 30 + 20,
    }));

    let animId = 0;
    const draw = () => {
      const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.4, 0, canvas.width / 2, canvas.height * 0.4, canvas.width);
      grad.addColorStop(0, '#0f1729');
      grad.addColorStop(1, '#050508');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const ember of embers) {
        ember.x += ember.vx;
        ember.y += ember.vy;
        if (ember.y < -10) {
          ember.y = canvas.height + 10;
          ember.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${ember.hue}, 90%, 65%, ${ember.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const saveLabel = saveData
    ? t.lastSave.replace('{level}', String(saveData.level)).replace('{floor}', String(saveData.floor))
    : t.noSave;
  const hasSaveData = saveData !== null;

  const btn = (
    label: string,
    action: () => void,
    opts?: { disabled?: boolean; sub?: string; primary?: boolean },
  ) => (
    <button
      key={label}
      onClick={action}
      disabled={opts?.disabled}
      className={[
        'flex w-full items-center gap-4 rounded-xl border-2 px-6 py-4 text-left transition-all active:scale-95',
        opts?.primary
          ? 'border-primary/60 bg-primary/15 shadow-[0_0_20px_rgba(232,160,32,0.2)]'
          : 'border-white/10 bg-white/[0.03]',
        opts?.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className={`text-base font-bold tracking-widest ${opts?.primary ? 'text-primary' : 'text-white/90'}`}>{label}</div>
        {opts?.sub ? <div className="mt-0.5 truncate font-mono text-xs text-white/40">{opts.sub}</div> : null}
      </div>
      {!opts?.disabled ? <span className={`text-lg ${opts?.primary ? 'text-primary' : 'text-white/30'}`}>›</span> : null}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex select-none flex-col items-center justify-between overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="z-10 flex w-full flex-col items-center px-5 pt-[max(4.5rem,env(safe-area-inset-top))]">
        <h1 className="max-w-full text-center font-serif text-[clamp(3.25rem,16vw,5rem)] font-black leading-[0.92] tracking-[0.08em] text-primary drop-shadow-[0_0_40px_rgba(232,160,32,0.35)]">
          <span className="block whitespace-nowrap">DUNGEON</span>
          <span className="mt-2 block">VEIL</span>
        </h1>
        <p className="mt-5 max-w-[88vw] text-center text-[10px] uppercase tracking-[0.28em] text-white/30">{t.subtitle}</p>
      </div>

      <div className="z-10 flex w-full max-w-sm flex-col gap-3 px-6 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))]">
        {btn(t.newGame, onNewGame, { primary: true })}
        {btn(t.continueGame, onContinue, { disabled: !hasSaveData, sub: saveLabel })}
        {btn(t.settings, onSettings)}
        {btn(t.credits, onCredits)}
      </div>
    </div>
  );
}
