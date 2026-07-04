import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Language } from '../../i18n/translations';
import { clearSave } from '../../game/saveManager';

interface Props {
  onBack: () => void;
  onSaveDeleted?: () => void;
}

export function SettingsScreen({ onBack, onSaveDeleted }: Props) {
  const { t, language, setLanguage } = useLanguage();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    clearSave();
    setConfirmDelete(false);
    onSaveDeleted?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      style={{ touchAction: 'auto' }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 pt-safe-top pt-6 pb-4 border-b border-white/8">
        <button
          onClick={onBack}
          onTouchStart={e => { e.preventDefault(); onBack(); }}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/60 active:scale-90 transition-transform text-xl"
        >
          ‹
        </button>
        <h1 className="font-serif text-xl text-white/90 tracking-widest">{t.settings}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {/* Language */}
        <Section title={t.language}>
          <div className="flex gap-2">
            {(['en', 'de'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                onTouchStart={e => { e.preventDefault(); setLanguage(lang); }}
                className={[
                  'flex-1 py-3 rounded-xl border-2 font-bold text-sm tracking-widest transition-all active:scale-95',
                  language === lang
                    ? 'bg-primary/15 border-primary text-primary shadow-[0_0_12px_rgba(232,160,32,0.25)]'
                    : 'bg-white/3 border-white/10 text-white/50',
                ].join(' ')}
              >
                {lang === 'en' ? '🇬🇧  English' : '🇩🇪  Deutsch'}
              </button>
            ))}
          </div>
        </Section>

        {/* Save data */}
        <Section title={t.deleteSave}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              onTouchStart={e => { e.preventDefault(); setConfirmDelete(true); }}
              className="w-full py-3 rounded-xl border-2 border-red-500/30 text-red-400/80 font-bold text-sm tracking-widest active:scale-95 transition-all bg-red-500/5"
            >
              {t.deleteSave}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-white/50 text-xs text-center leading-relaxed">{t.deleteSaveConfirm}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  onTouchStart={e => { e.preventDefault(); setConfirmDelete(false); }}
                  className="flex-1 py-3 rounded-xl border-2 border-white/15 text-white/50 font-bold text-sm tracking-widest active:scale-95 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleDelete}
                  onTouchStart={e => { e.preventDefault(); handleDelete(); }}
                  className="flex-1 py-3 rounded-xl border-2 border-red-500 bg-red-500/15 text-red-400 font-bold text-sm tracking-widest active:scale-95 transition-all"
                >
                  {t.confirm}
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Version */}
      <div className="shrink-0 py-4 text-center">
        <p className="text-white/20 text-xs font-mono tracking-widest">{t.version}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/30 text-[10px] tracking-widest uppercase font-mono mb-3">{title}</p>
      {children}
    </div>
  );
}
