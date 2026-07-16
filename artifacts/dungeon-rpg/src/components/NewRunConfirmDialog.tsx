import React, { useEffect, useId } from 'react';

export function NewRunConfirmDialog({
  language,
  chapter,
  room,
  onCancel,
  onConfirm,
}: {
  language: 'de' | 'en';
  chapter: number;
  room: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const de = language === 'de';
  const titleId = useId();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return <div
    data-testid="new-run-confirm-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    className="fixed inset-0 z-[170] flex items-center justify-center bg-black/78 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] backdrop-blur-md"
    onPointerDown={onCancel}
  >
    <section
      className="w-full max-w-sm overflow-hidden rounded-[28px] border border-amber-300/25 bg-[radial-gradient(circle_at_50%_0%,rgba(145,78,28,.28),rgba(9,8,8,.98)_48%)] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,.82),0_0_34px_rgba(217,145,63,.12)]"
      onPointerDown={event => event.stopPropagation()}
    >
      <div className="text-[8px] font-black uppercase tracking-[.3em] text-amber-200/48">{de ? 'NEUER RUN' : 'NEW RUN'}</div>
      <h2 id={titleId} className="mt-2 font-serif text-[27px] font-black leading-tight tracking-[.03em] text-amber-100">
        {de ? 'Noch einmal in den Schleier?' : 'Enter the Veil again?'}
      </h2>
      <p className="mt-3 text-[11px] leading-relaxed text-white/58">
        {de
          ? 'Dein laufender Run wird beendet und durch ein neues Abenteuer ersetzt.'
          : 'Your active run will end and be replaced by a new adventure.'}
      </p>

      <div className="mt-4 rounded-2xl border border-white/9 bg-black/36 p-4 text-center">
        <div className="text-[7px] font-black uppercase tracking-[.2em] text-white/32">{de ? 'AKTUELLER RUN' : 'CURRENT RUN'}</div>
        <div className="mt-2 font-serif text-[22px] font-black tracking-[.06em] text-white/88">
          {de ? 'Kapitel' : 'Chapter'} {Math.max(1, chapter)}
        </div>
        <div className="mt-1 text-[9px] font-black uppercase tracking-[.18em] text-amber-100/68">
          {de ? 'Raum' : 'Room'} {Math.max(1, room)}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-emerald-300/12 bg-emerald-400/[.045] p-3">
        <div className="text-[7px] font-black uppercase tracking-[.18em] text-emerald-100/55">{de ? 'BLEIBT ERHALTEN' : 'KEPT PERMANENTLY'}</div>
        <div className="mt-2 text-[9px] leading-relaxed text-white/48">
          {de ? 'Rang · Ausrüstung · Gold · Staub · Sammlungen · Erfolge' : 'Rank · Equipment · Gold · Dust · Collections · Achievements'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          data-testid="new-run-confirm-cancel"
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-2xl border border-white/11 bg-black/34 px-3 text-[8px] font-black uppercase tracking-[.16em] text-white/58 active:scale-[.98]"
        >
          {de ? 'Abbrechen' : 'Cancel'}
        </button>
        <button
          data-testid="new-run-confirm-accept"
          type="button"
          onClick={onConfirm}
          className="min-h-12 rounded-2xl border border-amber-300/28 bg-amber-500/14 px-3 text-[8px] font-black uppercase tracking-[.13em] text-amber-100 shadow-[0_0_24px_rgba(217,145,63,.1)] active:scale-[.98]"
        >
          {de ? 'Neuen Run starten' : 'Start new run'}
        </button>
      </div>
    </section>
  </div>;
}
