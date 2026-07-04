import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Language } from '../../i18n/translations';

export function LanguageSelectScreen() {
  const { setLanguage } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      vx: Math.random() * 0.4 - 0.2,
      vy: Math.random() * -0.8 - 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
      grad.addColorStop(0, '#16213e');
      grad.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 160, 32, ${p.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  const choose = (lang: Language) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setLanguage(lang);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background touch-none select-none">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="z-10 flex flex-col items-center gap-8 px-8 w-full max-w-sm animate-in fade-in duration-700 slide-in-from-bottom-4">
        <h1 className="font-serif text-5xl text-primary font-black tracking-widest drop-shadow-[0_0_24px_rgba(232,160,32,0.4)] text-center">
          DUNGEON<br />VEIL
        </h1>

        <div className="w-full flex flex-col gap-4">
          <button
            onClick={choose('en')}
            onTouchStart={choose('en')}
            className="w-full flex items-center justify-between bg-card/70 border-2 border-primary/40 hover:border-primary active:border-primary text-card-foreground rounded-xl px-6 py-5 text-lg font-bold tracking-wide active:scale-95 transition-all shadow-lg"
            data-testid="button-language-en"
          >
            <span className="text-2xl">🇬🇧</span>
            <span className="flex-1 text-center text-xl font-serif tracking-widest text-foreground">English</span>
            <span className="text-primary font-mono text-sm opacity-70">EN</span>
          </button>

          <button
            onClick={choose('de')}
            onTouchStart={choose('de')}
            className="w-full flex items-center justify-between bg-card/70 border-2 border-primary/40 hover:border-primary active:border-primary text-card-foreground rounded-xl px-6 py-5 text-lg font-bold tracking-wide active:scale-95 transition-all shadow-lg"
            data-testid="button-language-de"
          >
            <span className="text-2xl">🇩🇪</span>
            <span className="flex-1 text-center text-xl font-serif tracking-widest text-foreground">Deutsch</span>
            <span className="text-primary font-mono text-sm opacity-70">DE</span>
          </button>
        </div>

        <p className="text-muted-foreground text-xs tracking-widest uppercase text-center opacity-60">
          You can change this anytime in settings
        </p>
      </div>
    </div>
  );
}
