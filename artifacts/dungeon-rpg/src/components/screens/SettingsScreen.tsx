import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Language } from '../../i18n/translations';
import { loadJoystickMode, saveJoystickMode, type JoystickMode } from '../../game/controlSettings';
import { clearSave } from '../../game/saveManager';

interface Props {
  onBack: () => void;
  onSaveDeleted?: () => void;
}

export function SettingsScreen({ onBack, onSaveDeleted }: Props) {
  const { t, language, setLanguage } = useLanguage();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [joystickMode, setJoystickMode] = useState<JoystickMode>(loadJoystickMode);
  const de = language === 'de';

  const handleDelete = () => {
    clearSave();
    setConfirmDelete(false);
    onSaveDeleted?.();
  };

  const chooseJoystickMode = (mode: JoystickMode) => {
    setJoystickMode(saveJoystickMode(mode));
  };

  return <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ touchAction: 'auto' }}>
    <div className="shrink-0 flex items-center gap-3 px-5 pt-safe-top pt-6 pb-4 border-b border-white/8">
      <button onPointerDown={event => { event.preventDefault(); onBack(); }} className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/60 active:scale-90 transition-transform text-xl">‹</button>
      <h1 className="font-serif text-xl text-white/90 tracking-widest">{t.settings}</h1>
    </div>

    <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
      <Section title={t.language}>
        <div className="flex gap-2">
          {(['en', 'de'] as Language[]).map(lang => <button key={lang} onPointerDown={event => { event.preventDefault(); setLanguage(lang); }} className={['flex-1 py-3 rounded-xl border-2 font-bold text-sm tracking-widest transition-all active:scale-95', language === lang ? 'bg-primary/15 border-primary text-primary shadow-[0_0_12px_rgba(232,160,32,0.25)]' : 'bg-white/3 border-white/10 text-white/50'].join(' ')}>{lang === 'en' ? '🇬🇧  English' : '🇩🇪  Deutsch'}</button>)}
        </div>
      </Section>

      <Section title={de ? 'STEUERUNG' : 'CONTROLS'}>
        <div data-testid="joystick-mode-settings" className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
          <div className="text-[11px] font-black text-white/82">{de ? 'Joystick-Modus' : 'Joystick mode'}</div>
          <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Fest bleibt immer links unten. Dynamisch setzt den Joystick dort, wo dein Daumen im linken Steuerbereich aufsetzt.' : 'Fixed stays in the lower-left corner. Floating places the joystick where your thumb touches the left control area.'}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              ['fixed', de ? 'Fest' : 'Fixed', de ? 'Immer gleiche Position' : 'Always same position'],
              ['floating', de ? 'Dynamisch' : 'Floating', de ? 'Folgt dem ersten Antippen' : 'Follows first touch'],
            ] as Array<[JoystickMode, string, string]>).map(([mode, label, detail]) => <button
              data-testid={`joystick-mode-${mode}`}
              key={mode}
              type="button"
              onPointerDown={event => { event.preventDefault(); chooseJoystickMode(mode); }}
              className={`rounded-xl border p-3 text-left active:scale-[.98] ${joystickMode === mode ? 'border-amber-300/35 bg-amber-400/10 text-amber-100' : 'border-white/9 bg-black/24 text-white/48'}`}
            ><div className="text-[10px] font-black uppercase tracking-[.12em]">{label}</div><div className="mt-1 text-[7px] leading-relaxed opacity-60">{detail}</div>{joystickMode === mode && <div className="mt-2 text-[6px] font-black uppercase tracking-[.14em] text-emerald-200">{de ? 'Aktiv' : 'Active'}</div>}</button>)}
          </div>
        </div>
      </Section>

      <Section title={t.deleteSave}>
        {!confirmDelete ? <button onPointerDown={event => { event.preventDefault(); setConfirmDelete(true); }} className="w-full py-3 rounded-xl border-2 border-red-500/30 text-red-400/80 font-bold text-sm tracking-widest active:scale-95 transition-all bg-red-500/5">{t.deleteSave}</button> : <div className="space-y-3">
          <p className="text-white/50 text-xs text-center leading-relaxed">{t.deleteSaveConfirm}</p>
          <div className="flex gap-2">
            <button onPointerDown={event => { event.preventDefault(); setConfirmDelete(false); }} className="flex-1 py-3 rounded-xl border-2 border-white/15 text-white/50 font-bold text-sm tracking-widest active:scale-95 transition-all">{t.cancel}</button>
            <button onPointerDown={event => { event.preventDefault(); handleDelete(); }} className="flex-1 py-3 rounded-xl border-2 border-red-500 bg-red-500/15 text-red-400 font-bold text-sm tracking-widest active:scale-95 transition-all">{t.confirm}</button>
          </div>
        </div>}
      </Section>
    </div>

    <div className="shrink-0 py-4 text-center"><p className="text-white/20 text-xs font-mono tracking-widest">{t.version}</p></div>
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-white/30 text-[10px] tracking-widest uppercase font-mono mb-3">{title}</p>{children}</div>;
}
