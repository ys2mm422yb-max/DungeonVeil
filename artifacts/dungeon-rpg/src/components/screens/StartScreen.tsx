import React, { useEffect, useRef } from 'react';

interface Props {
  onStart: () => void;
}

export function StartScreen({ onStart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background particle effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      vx: Math.random() * 0.5 - 0.25,
      vy: Math.random() * -1 - 0.5,
      alpha: Math.random() * 0.5 + 0.1
    }));

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw subtle dungeon gradient
      const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width);
      grad.addColorStop(0, '#16213e');
      grad.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Embers
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 160, 32, ${p.alpha})`; // Amber
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground touch-none select-none">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center animate-in fade-in duration-1000 slide-in-from-bottom-8">
        <h1 className="font-serif text-6xl md:text-8xl text-primary font-black tracking-widest drop-shadow-[0_0_30px_rgba(232,160,32,0.4)] text-center mb-4">
          DUNGEON<br />ABYSS
        </h1>
        <p className="text-muted-foreground tracking-[0.3em] uppercase text-sm md:text-base mb-16 text-center px-4">
          Descend into the darkness
        </p>

        <button 
          onClick={onStart}
          onTouchStart={(e) => { e.preventDefault(); onStart(); }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 py-5 rounded-md text-xl tracking-widest uppercase shadow-[0_0_20px_rgba(232,160,32,0.3)] active:scale-95 transition-all border-2 border-primary/50"
        >
          Enter the Dungeon
        </button>
      </div>
    </div>
  );
}
