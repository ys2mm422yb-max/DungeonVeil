import React, { useEffect, useRef } from 'react';
import { GameState } from '../game/engine';
import { Language } from '../i18n/translations';

export interface GamePausePanelProps {
  gameState: GameState;
  language: Language;
  paused: string;
  resume: string;
  settings: string;
  classNameText: string;
  onResume: () => void;
  onSave: () => void;
  onSettings: () => void;
  onMainMenu: () => void;
  onLanguage: (language: Language) => void;
}

function trigger(event: React.PointerEvent<HTMLButtonElement>, action: () => void): void {
  event.preventDefault();
  event.stopPropagation();
  action();
}

export function GamePausePanel(props: GamePausePanelProps) {
  const de = props.language === 'de';
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const hiddenControls = Array.from(document.querySelectorAll<HTMLElement>('[data-ui-control]'))
      .filter(control => control !== panel && !panel.contains(control));
    const previousDisplays = hiddenControls.map(control => control.style.display);

    hiddenControls.forEach(control => { control.style.display = 'none'; });
    return () => {
      hiddenControls.forEach((control, index) => { control.style.display = previousDisplays[index]; });
    };
  }, []);

  return (
    <div ref={panelRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm" data-ui-control>
      <h2 className="mb-2 font-serif text-4xl tracking-widest text-white">{props.paused}</h2>
      <p className="mb-10 font-mono text-xs tracking-widest text-white/30">{props.gameState.player.playerName} · {props.classNameText}</p>
      <div className="flex w-full max-w-xs flex-col gap-3 px-6">
        <button onPointerDown={e => trigger(e, props.onResume)} className="w-full rounded-xl border-2 border-primary bg-primary py-4 text-sm font-bold tracking-widest text-primary-foreground active:scale-95">{props.resume}</button>
        <button onPointerDown={e => trigger(e, props.onSave)} className="w-full rounded-xl border border-violet-300/30 bg-violet-500/10 py-3 text-sm font-bold tracking-widest text-violet-100 active:scale-95">{de ? 'SPEICHERN' : 'SAVE GAME'}</button>
        <button onPointerDown={e => trigger(e, props.onSettings)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold tracking-widest text-white/60 active:scale-95">{props.settings}</button>
        <button onPointerDown={e => trigger(e, props.onMainMenu)} className="w-full rounded-xl border border-white/8 bg-transparent py-3 text-xs font-bold tracking-widest text-white/30 active:scale-95">{de ? 'ZUM HAUPTMENÜ' : 'MAIN MENU'}</button>
      </div>
      <div className="mt-8 flex items-center gap-3">
        {(['en', 'de'] as Language[]).map(lang => (
          <button key={lang} onPointerDown={e => trigger(e, () => props.onLanguage(lang))} className={`rounded-lg border-2 px-4 py-2 text-xs font-bold tracking-widest active:scale-95 ${props.language === lang ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-white/30'}`}>
            {lang === 'en' ? '🇬🇧 EN' : '🇩🇪 DE'}
          </button>
        ))}
      </div>
    </div>
  );
}
