import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';
import type { Language, UpgradeKey } from '../i18n/translations';
import { CHAPTER_ROOMS } from '../game/chapterRun';
import { isFusionKey, isInstantGift } from '../game/runSkills';
import { DailyQuestPanel } from './DailyQuestPanel';

export interface GamePausePanelProps {
  gameState: GameState;
  language: Language;
  paused: string;
  resume: string;
  settings: string;
  classNameText: string;
  onResume: () => void;
  onSettings: () => void;
  onMainMenu: () => void;
  onLanguage: (language: Language) => void;
  onRestartRoom: () => void;
}

const NAMES_DE: Record<UpgradeKey, string> = {
  multishot: 'MEHRFACHPFEIL', ricochet: 'ABPRALLER', fireArrow: 'FEUERPFEIL', iceArrow: 'FROSTPFEIL', attackSpeed: 'SCHNELLZUG', piercing: 'DURCHBOHREN',
  elementalStorm: 'ELEMENTARSTURM', arrowStorm: 'PFEILSTURM', veilChain: 'SCHLEIERKETTE',
  attack: 'JÄGERINSTINKT', maxHp: 'LEBENSKRAFT', speed: 'WINDLÄUFER', defense: 'WALDHAUT',
  heal: 'ERHOLUNG', hunterBlessing: 'JÄGERSEGEN', vitalSpark: 'LEBENSFUNKE', veilCache: 'SCHLEIERVORRAT', goldCache: 'JÄGERTRUHE',
};
const NAMES_EN: Record<UpgradeKey, string> = {
  multishot: 'MULTISHOT', ricochet: 'RICOCHET', fireArrow: 'FIRE ARROW', iceArrow: 'FROST ARROW', attackSpeed: 'QUICK DRAW', piercing: 'PIERCING',
  elementalStorm: 'ELEMENTAL STORM', arrowStorm: 'ARROW STORM', veilChain: 'VEIL CHAIN',
  attack: 'HUNTER INSTINCT', maxHp: 'VITALITY', speed: 'WINDRUNNER', defense: 'FOREST SKIN',
  heal: 'RECOVERY', hunterBlessing: 'HUNTER BLESSING', vitalSpark: 'VITAL SPARK', veilCache: 'VEIL CACHE', goldCache: 'HUNTER CACHE',
};
const roman = (rank: number) => rank === 1 ? 'I' : rank === 2 ? 'II' : rank === 3 ? 'III' : String(rank);

function trigger(event: React.PointerEvent<HTMLButtonElement>, action: () => void): void {
  event.preventDefault();
  event.stopPropagation();
  action();
}

export function GamePausePanel(props: GamePausePanelProps) {
  const de = props.language === 'de';
  const panelRef = useRef<HTMLDivElement>(null);
  const [restartArmed, setRestartArmed] = useState(false);
  const names = de ? NAMES_DE : NAMES_EN;
  const gifts = useMemo(() => Object.entries(props.gameState.runSkills)
    .filter(([key, value]) => !isInstantGift(key as UpgradeKey) && (value ?? 0) > 0)
    .sort(([a], [b]) => a.localeCompare(b)) as Array<[UpgradeKey, number]>, [props.gameState.runSkills]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const hiddenControls = Array.from(document.querySelectorAll<HTMLElement>('[data-ui-control]')).filter(control => control !== panel && !panel.contains(control));
    const previousDisplays = hiddenControls.map(control => control.style.display);
    hiddenControls.forEach(control => { control.style.display = 'none'; });
    return () => hiddenControls.forEach((control, index) => { control.style.display = previousDisplays[index]; });
  }, []);

  const restart = () => {
    if (!restartArmed) {
      setRestartArmed(true);
      window.setTimeout(() => setRestartArmed(false), 2200);
      return;
    }
    setRestartArmed(false);
    props.onRestartRoom();
  };

  return (
    <div ref={panelRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-black/80 px-5 py-5 backdrop-blur-sm" data-ui-control>
      <div className="w-full max-w-sm rounded-[26px] border border-white/10 bg-[#0a0908]/95 p-5 shadow-2xl">
        <h2 className="text-center font-serif text-4xl tracking-widest text-white">{props.paused}</h2>
        <p className="mt-2 text-center font-mono text-[10px] tracking-widest text-white/35">{props.gameState.player.playerName} · {props.classNameText} · {de ? 'RAUM' : 'ROOM'} {props.gameState.floor}/{CHAPTER_ROOMS}</p>

        <div className="mt-4"><DailyQuestPanel compact /></div>

        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.03] p-3">
          <div className="mb-2 text-[8px] font-black tracking-[.24em] text-amber-200/45">{de ? 'AKTIVE GABEN' : 'ACTIVE GIFTS'}</div>
          {gifts.length ? <div className="flex flex-wrap gap-2">{gifts.map(([key, rank]) => <span key={key} data-testid={`pause-gift-${key}`} className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[8px] font-black tracking-[.1em] text-white/70">{names[key]}{isFusionKey(key) ? '' : ` ${roman(rank)}`}</span>)}</div> : <div className="text-[10px] text-white/30">{de ? 'Noch keine Gaben' : 'No gifts yet'}</div>}
        </div>

        <div className="mt-3 rounded-xl border border-violet-300/15 bg-violet-500/[.06] px-3 py-2 text-center">
          <div className="text-[8px] font-black tracking-[.2em] text-violet-100/65">{de ? 'CHECKPOINT AKTIV' : 'CHECKPOINT ACTIVE'}</div>
          <div className="mt-1 text-[9px] text-white/35">{de ? 'Raumbeginn und Gaben werden automatisch gespeichert' : 'Room entry and gifts are saved automatically'}</div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <button onPointerDown={e => trigger(e, props.onResume)} className="w-full rounded-xl border-2 border-primary bg-primary py-3.5 text-sm font-bold tracking-widest text-primary-foreground active:scale-95">{props.resume}</button>
          <button onPointerDown={e => trigger(e, restart)} className={`w-full rounded-xl border py-3 text-[11px] font-bold tracking-[.12em] active:scale-95 ${restartArmed ? 'border-orange-300/70 bg-orange-500/20 text-orange-100' : 'border-orange-400/25 bg-orange-500/[.07] text-orange-200/75'}`}>{restartArmed ? (de ? 'NOCHMAL TIPPEN ZUM BESTÄTIGEN' : 'TAP AGAIN TO CONFIRM') : (de ? 'RAUM NEU STARTEN' : 'RESTART ROOM')}</button>
          <button onPointerDown={e => trigger(e, props.onSettings)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold tracking-widest text-white/60 active:scale-95">{props.settings}</button>
          <button onPointerDown={e => trigger(e, props.onMainMenu)} className="w-full rounded-xl border border-white/8 bg-transparent py-3 text-xs font-bold tracking-widest text-white/30 active:scale-95">{de ? 'ZUM HAUPTMENÜ' : 'MAIN MENU'}</button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">{(['en', 'de'] as Language[]).map(lang => <button key={lang} onPointerDown={e => trigger(e, () => props.onLanguage(lang))} className={`rounded-lg border-2 px-4 py-2 text-xs font-bold tracking-widest active:scale-95 ${props.language === lang ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-white/30'}`}>{lang === 'en' ? '🇬🇧 EN' : '🇩🇪 DE'}</button>)}</div>
      </div>
    </div>
  );
}
