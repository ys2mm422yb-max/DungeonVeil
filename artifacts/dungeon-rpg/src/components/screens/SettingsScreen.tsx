import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Language } from '../../i18n/translations';
import {
  loadAccessibilitySettings,
  saveAccessibilitySettings,
  type AccessibilitySettings,
  type ContrastMode,
} from '../../game/accessibilitySettings';
import { loadJoystickMode, saveJoystickMode, type JoystickMode } from '../../game/controlSettings';
import { clearSave } from '../../game/saveManager';
import { ProfileStorageSettings } from '../ProfileStorageSettings';

interface Props {
  onBack: () => void;
  onSaveDeleted?: () => void;
}

export function SettingsScreen({ onBack, onSaveDeleted }: Props) {
  const { t, language, setLanguage } = useLanguage();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [joystickMode, setJoystickMode] = useState<JoystickMode>(loadJoystickMode);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(loadAccessibilitySettings);
  const de = language === 'de';

  const handleDelete = () => {
    clearSave();
    setConfirmDelete(false);
    onSaveDeleted?.();
  };

  const chooseJoystickMode = (mode: JoystickMode) => setJoystickMode(saveJoystickMode(mode));
  const chooseContrast = (contrast: ContrastMode) => setAccessibility(saveAccessibilitySettings({ ...accessibility, contrast }));

  const optionButton = (active: boolean, label: string, detail: string, onSelect: () => void, testId: string) => <button
    data-testid={testId}
    type="button"
    onPointerDown={event => { event.preventDefault(); onSelect(); }}
    className={`rounded-xl border p-3 text-left active:scale-[.98] ${active ? 'border-amber-300/35 bg-amber-400/10 text-amber-100' : 'border-white/9 bg-black/24 text-white/52'}`}
  ><div className="text-[10px] font-black uppercase tracking-[.12em]">{label}</div><div className="mt-1 text-[7px] leading-relaxed opacity-70">{detail}</div>{active && <div className="mt-2 text-[6px] font-black uppercase tracking-[.14em] text-emerald-200">{de ? 'Aktiv' : 'Active'}</div>}</button>;

  return <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ touchAction: 'auto' }}>
    <div className="shrink-0 flex items-center gap-3 px-5 pt-safe-top pt-6 pb-4 border-b border-white/8">
      <button aria-label={de ? 'Zurück' : 'Back'} onPointerDown={event => { event.preventDefault(); onBack(); }} className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/70 active:scale-90 transition-transform text-xl">‹</button>
      <h1 className="font-serif text-xl text-white/90 tracking-widest">{t.settings}</h1>
    </div>

    <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
      <Section title={t.language}>
        <div className="flex gap-2">
          {(['en', 'de'] as Language[]).map(lang => <button key={lang} onPointerDown={event => { event.preventDefault(); setLanguage(lang); }} className={['flex-1 py-3 rounded-xl border-2 font-bold text-sm tracking-widest transition-all active:scale-95', language === lang ? 'bg-primary/15 border-primary text-primary shadow-[0_0_12px_rgba(232,160,32,0.25)]' : 'bg-white/3 border-white/10 text-white/55'].join(' ')}>{lang === 'en' ? '🇬🇧  English' : '🇩🇪  Deutsch'}</button>)}
        </div>
      </Section>

      <Section title={de ? 'LESBARKEIT' : 'READABILITY'}>
        <div data-testid="accessibility-settings" className="space-y-3 rounded-2xl border border-white/8 bg-white/[.025] p-3">
          <div><div className="text-[11px] font-black text-white/86">{de ? 'Kontrast' : 'Contrast'}</div><div className="mt-1 text-[9px] leading-relaxed text-white/48">{de ? 'Hoher Kontrast verstärkt schwache Texte, Rahmen und Eingabefelder.' : 'High contrast strengthens faint text, borders and form controls.'}</div></div>
          <div className="grid grid-cols-2 gap-2">
            {optionButton(accessibility.contrast === 'standard', de ? 'Standard' : 'Standard', de ? 'Originale Darstellung' : 'Original presentation', () => chooseContrast('standard'), 'contrast-mode-standard')}
            {optionButton(accessibility.contrast === 'high', de ? 'Hoch' : 'High', de ? 'Stärkere Konturen' : 'Stronger outlines', () => chooseContrast('high'), 'contrast-mode-high')}
          </div>
        </div>
      </Section>

      <Section title={de ? 'STEUERUNG' : 'CONTROLS'}>
        <div data-testid="joystick-mode-settings" className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
          <div className="text-[11px] font-black text-white/86">{de ? 'Joystick-Modus' : 'Joystick mode'}</div>
          <div className="mt-1 text-[9px] leading-relaxed text-white/48">{de ? 'Fest bleibt immer links unten. Dynamisch setzt den Joystick dort, wo dein Daumen im linken Steuerbereich aufsetzt.' : 'Fixed stays in the lower-left corner. Floating places the joystick where your thumb touches the left control area.'}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {optionButton(joystickMode === 'fixed', de ? 'Fest' : 'Fixed', de ? 'Immer gleiche Position' : 'Always same position', () => chooseJoystickMode('fixed'), 'joystick-mode-fixed')}
            {optionButton(joystickMode === 'floating', de ? 'Dynamisch' : 'Floating', de ? 'Folgt dem ersten Antippen' : 'Follows first touch', () => chooseJoystickMode('floating'), 'joystick-mode-floating')}
          </div>
        </div>
      </Section>

      <Section title={de ? 'STATISTIK & SPEICHER' : 'STATISTICS & STORAGE'}>
        <ProfileStorageSettings language={language} />
      </Section>

      <Section title={t.deleteSave}>
        {!confirmDelete ? <button onPointerDown={event => { event.preventDefault(); setConfirmDelete(true); }} className="w-full py-3 rounded-xl border-2 border-red-500/30 text-red-300/90 font-bold text-sm tracking-widest active:scale-95 transition-all bg-red-500/5">{t.deleteSave}</button> : <div className="space-y-3">
          <p className="text-white/60 text-xs text-center leading-relaxed">{t.deleteSaveConfirm}</p>
          <div className="flex gap-2">
            <button onPointerDown={event => { event.preventDefault(); setConfirmDelete(false); }} className="flex-1 py-3 rounded-xl border-2 border-white/15 text-white/60 font-bold text-sm tracking-widest active:scale-95 transition-all">{t.cancel}</button>
            <button onPointerDown={event => { event.preventDefault(); handleDelete(); }} className="flex-1 py-3 rounded-xl border-2 border-red-500 bg-red-500/15 text-red-300 font-bold text-sm tracking-widest active:scale-95 transition-all">{t.confirm}</button>
          </div>
        </div>}
      </Section>
    </div>

    <div className="shrink-0 py-4 text-center"><p className="text-white/30 text-xs font-mono tracking-widest">{t.version}</p></div>
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-white/40 text-[10px] tracking-widest uppercase font-mono mb-3">{title}</p>{children}</div>;
}
