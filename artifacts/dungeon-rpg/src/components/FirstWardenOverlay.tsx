import React, { useEffect, useState } from 'react';

type Stage = 'intro' | 'victory' | null;

export function FirstWardenOverlay() {
  const [stage, setStage] = useState<Stage>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer = 0;
    const show = (event: Event) => {
      const next = (event as CustomEvent<{ stage?: Stage }>).detail?.stage ?? null;
      if (!next) return;
      window.clearTimeout(timer);
      setStage(next);
      setVisible(true);
      timer = window.setTimeout(() => setVisible(false), next === 'intro' ? 2500 : 3400);
    };
    window.addEventListener('dungeon-veil-first-warden-stage', show as EventListener);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('dungeon-veil-first-warden-stage', show as EventListener);
    };
  }, []);

  if (!stage) return null;
  const intro = stage === 'intro';

  return (
    <div className={`pointer-events-none fixed inset-0 z-[80] flex items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`absolute inset-0 ${intro ? 'bg-[radial-gradient(circle_at_50%_45%,rgba(111,74,190,.18),rgba(0,0,0,.48)_64%)]' : 'bg-[radial-gradient(circle_at_50%_45%,rgba(231,195,122,.16),rgba(0,0,0,.38)_65%)]'}`} />
      <div className="relative mx-6 w-full max-w-sm text-center">
        <div className={`text-[8px] font-black uppercase tracking-[.45em] ${intro ? 'text-violet-200/60' : 'text-amber-200/60'}`}>{intro ? 'KAPITELBOSS · RAUM 50' : 'KAPITEL ABGESCHLOSSEN'}</div>
        <div className={`mt-3 font-serif text-[2.1rem] font-black leading-none tracking-[.08em] drop-shadow-[0_8px_28px_rgba(0,0,0,.85)] ${intro ? 'text-violet-100' : 'text-[#e7c37a]'}`}>{intro ? 'DER SCHLEIERWÄCHTER' : 'DER WÄCHTER IST GEFALLEN'}</div>
        <div className="mx-auto mt-4 h-px w-28 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        <div className="mt-3 text-[9px] font-black uppercase tracking-[.22em] text-white/45">{intro ? 'Der Schleierkern antwortet auf deinen Schritt.' : 'Berge die Kapitelbeute und betrete den nächsten Abschnitt.'}</div>
      </div>
    </div>
  );
}
