import React, { useEffect, useRef, useState } from 'react';

type SaveToastState = {
  kind: 'saved' | 'recovered';
  savedAt: number;
};

export function SaveStatusToast() {
  const [state, setState] = useState<SaveToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const show = (next: SaveToastState) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      setState(next);
      timerRef.current = window.setTimeout(() => setState(null), next.kind === 'recovered' ? 3200 : 1450);
    };
    const saved = (event: Event) => {
      const detail = (event as CustomEvent<{ savedAt?: number }>).detail;
      show({ kind: 'saved', savedAt: detail?.savedAt ?? Date.now() });
    };
    const recovered = (event: Event) => {
      const detail = (event as CustomEvent<{ savedAt?: number }>).detail;
      show({ kind: 'recovered', savedAt: detail?.savedAt ?? Date.now() });
    };
    window.addEventListener('dungeon-veil-save-complete', saved);
    window.addEventListener('dungeon-veil-save-recovered', recovered);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      window.removeEventListener('dungeon-veil-save-complete', saved);
      window.removeEventListener('dungeon-veil-save-recovered', recovered);
    };
  }, []);

  if (!state) return null;
  return <div className="pointer-events-none fixed right-4 top-[max(78px,calc(env(safe-area-inset-top)+58px))] z-[95]">
    <div className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] shadow-[0_8px_30px_rgba(0,0,0,.45)] backdrop-blur-md ${state.kind === 'recovered' ? 'border-amber-200/25 bg-amber-950/80 text-amber-100' : 'border-emerald-200/20 bg-[#07110d]/82 text-emerald-200'}`}>
      {state.kind === 'recovered' ? '↻ BACKUP WIEDERHERGESTELLT' : '✓ GESPEICHERT'}
    </div>
  </div>;
}
