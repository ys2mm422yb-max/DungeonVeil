import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  onBack: () => void;
}

export function CreditsScreen({ onBack }: Props) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.5 + 0.1,
    }));

    let animId: number;
    const draw = () => {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      style={{ touchAction: 'auto' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Header */}
      <div className="z-10 shrink-0 flex items-center gap-3 px-5 pt-safe-top pt-6 pb-4 border-b border-white/8">
        <button
          onClick={onBack}
          onTouchStart={e => { e.preventDefault(); onBack(); }}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/60 active:scale-90 transition-transform text-xl"
        >
          ‹
        </button>
        <h1 className="font-serif text-xl text-white/90 tracking-widest">{t.creditsTitle}</h1>
      </div>

      <div className="z-10 flex-1 overflow-y-auto px-8 py-12 flex flex-col items-center gap-10">
        {/* Logo */}
        <div className="text-center">
          <h2 className="font-serif text-4xl text-primary font-black tracking-widest drop-shadow-[0_0_20px_rgba(232,160,32,0.3)]">
            {t.creditsGame}
          </h2>
          <p className="text-white/30 text-sm tracking-widest mt-2">{t.creditsTagline}</p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-primary/30" />

        {/* Credits entries */}
        <div className="space-y-8 text-center w-full">
          <CreditEntry label={t.creditsDesign} value="Replit AI" />
          <CreditEntry label={t.creditsBuiltWith} value="React · TypeScript · Vite · Canvas API" />
          <CreditEntry label="Font" value="Cinzel by Natanael Gama" />
        </div>

        <div className="w-16 h-px bg-white/10" />

        <div className="text-center">
          <p className="text-white/30 text-xs tracking-widest uppercase font-mono mb-2">
            {t.creditsSpecialThanks}
          </p>
          <p className="text-white/50 text-sm italic leading-relaxed max-w-xs mx-auto">
            "{t.creditsThanksText}"
          </p>
        </div>

        <div className="pb-8">
          <p className="text-white/15 text-xs font-mono tracking-widest text-center">{t.version}</p>
        </div>
      </div>
    </div>
  );
}

function CreditEntry({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white/25 text-[10px] tracking-widest uppercase font-mono mb-1">{label}</p>
      <p className="text-white/70 text-sm font-bold tracking-wide">{value}</p>
    </div>
  );
}
