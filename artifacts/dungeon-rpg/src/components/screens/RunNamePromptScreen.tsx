import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { rememberRunName, sanitizeRunName } from '../../game/runIdentity';

export function RunNamePromptScreen({ onConfirm, onBack }: { onConfirm: (name: string) => void | Promise<void>; onBack: () => void }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [name, setName] = useState('');
  const cleanName = sanitizeRunName(name);
  const valid = cleanName.length >= 2;

  const submit = async () => {
    if (!valid) return;
    await onConfirm(rememberRunName(cleanName));
  };

  return <div data-testid="run-name-prompt" className="fixed inset-0 z-[160] grid place-items-center bg-[radial-gradient(circle_at_50%_32%,rgba(151,100,34,.23),rgba(5,5,6,.98)_48%)] px-5 text-white">
    <section className="w-full max-w-sm rounded-[2rem] border border-amber-200/22 bg-black/72 p-5 shadow-[0_24px_80px_rgba(0,0,0,.72)] backdrop-blur-xl">
      <button type="button" onClick={onBack} aria-label={de ? 'Zurück' : 'Back'} className="grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-black/45 text-xl text-white/70 active:scale-90">‹</button>
      <div className="mt-5 text-[8px] font-black uppercase tracking-[.34em] text-amber-200/45">DUNGEON VEIL</div>
      <h1 className="mt-2 font-serif text-[22px] font-black tracking-[.1em] text-amber-100">{de ? 'WIE SOLL DEIN SCHÜTZE HEISSEN?' : 'NAME YOUR RANGER'}</h1>
      <p className="mt-2 text-[10px] leading-relaxed text-white/42">{de ? 'Diese Frage erscheint nur beim ersten Offline-Run. Mit einem Online-Konto wird automatisch dein Profilname verwendet.' : 'This is only asked for the first offline run. Signed-in players automatically use their profile name.'}</p>
      <input data-testid="run-name-input" autoFocus value={name} onChange={event => setName(event.target.value.slice(0, 18))} onKeyDown={event => { if (event.key === 'Enter') void submit(); }} placeholder={de ? 'Spielername' : 'Player name'} maxLength={18} className="mt-5 w-full rounded-xl border border-amber-200/18 bg-black/60 px-4 py-3 text-[16px] font-bold text-amber-50 outline-none placeholder:text-white/22 focus:border-amber-300/48" />
      <button data-testid="run-name-confirm" type="button" disabled={!valid} onClick={() => void submit()} className="mt-3 w-full rounded-xl border border-amber-300/30 bg-amber-500/16 py-3 text-[9px] font-black uppercase tracking-[.18em] text-amber-100 active:scale-[.98] disabled:border-white/8 disabled:bg-white/[.03] disabled:text-white/22">{de ? 'RUN STARTEN' : 'START RUN'}</button>
    </section>
  </div>;
}
